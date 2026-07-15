/*
discord-gamestatus: Game server monitoring via discord API
Copyright (C) 2019-2022 Douile

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
*/

import { MessageEmbed } from "discord.js-light";
import { truncateEmbed } from "@douile/bot-utilities";
import { Player } from "gamedig";

import Update from "../Update";
import { UpdateOptions } from "./UpdateOptions";
import { FORMAT_PROPERTIES } from "../../constants";
import { State } from "../../query";
import { countryCode } from "../../geoip";
import { codeToFlag } from "../../geoip";

function serverFormat(str: string, server: State, flag: string = "") {
  for (const prop of <[keyof State]>FORMAT_PROPERTIES) {
    str = str.replace(
      new RegExp(`\\{${prop}\\}`, "gi"),
      server[prop]?.toString() || ""
    );
  }
  str = str.replace(/\{flag\}/gi, flag);
  return str;
}

const stripQ3Colors = (s: string) => s.replace(/\^[0-9]/g, "");

// Figure space — a non-whitespace Unicode character that renders at the width
// of a digit in monospace fonts. Used instead of regular spaces inside inline
// code spans so Discord's mobile renderer doesn't trim them.
const FIGURE_SPACE = "\u2007";

// Extract score and clean name from a gamedig player object.
//
// - Quake Live's quake3 protocol returns score in raw.score and a clean name.
// - OpenArena's protocol drops the score and instead packs personal score
//   into raw.frags as (score * 10 + extra_digit), and embeds a prefix in the
//   name field as "<captures_or_kills> <time> <real name>".
//   We detect OA by the presence of raw.frags (QL doesn't have it), strip the
//   name prefix, and recover the personal score with Math.floor(frags / 10).
function extractScoreAndName(p: Player): { score: number | null; name: string } {
  const r = (p.raw as Record<string, unknown>) ?? {};
  let score: number | null = null;
  let name = p.name ?? "";

  const isOpenArena = r.frags !== undefined && r.frags !== null;

  if (isOpenArena) {
    // Strip OA's "<int> <float> " name prefix
    const oaMatch = name.match(/^-?\d+\s+\d+(?:\.\d+)?\s+(.+)$/);
    if (oaMatch) name = oaMatch[1];

    // Recover personal score from packed frags field
    score = Math.floor(Number(r.frags) / 10);
  } else if (r.score !== undefined && r.score !== null) {
    // QL and other quake3-family protocols with clean score field
    score = Number(r.score);
  }

  return { score, name };
}

const OPT_TITLE: (keyof UpdateOptions)[] = ["title", "offlineTitle"];
const OPT_DESCRIPTION: (keyof UpdateOptions)[] = [
  "description",
  "offlineDescription",
];
const OPT_COLOR: (keyof UpdateOptions)[] = ["color", "offlineColor"];
const OPT_IMAGE: (keyof UpdateOptions)[] = ["image", "offlineImage"];

export async function generateEmbed(
  update: Update,
  server: State,
  tick: number
): Promise<MessageEmbed> {
  const isOffline = server.offline ? 1 : 0;

  // Look up country flag once for the whole embed
  const ipPort = (update as unknown as { ip?: string }).ip;
  const ipOnly = ipPort ? ipPort.split(":")[0] : null;
  const flag = ipOnly ? codeToFlag(await countryCode(ipOnly)) : "";

  const embed = new MessageEmbed({
    title: serverFormat(
      update.getOption(OPT_TITLE[isOffline]) as string,
      server,
      flag,
    ),
    description: serverFormat(
      update.getOption(OPT_DESCRIPTION[isOffline]) as string,
      server,
      flag,
    ),
    color: update.getOption(OPT_COLOR[isOffline]) as number,
    timestamp: Date.now(),
  });

  const dots = update.getOption("dots") as string[];
  embed.setFooter({ text: dots[tick % dots.length] });

  const image = update.getOption(OPT_IMAGE[isOffline]) as string;
  if (image.length > 0) embed.setThumbnail(image);
  
  const players = server.realPlayers === null ? [] : server.realPlayers;

  // Pre-extract score and clean name once per player
  const enriched = players.map((p) => ({
    player: p,
    ...extractScoreAndName(p),
  }));

  // Sort by score descending; players with no score sink to the bottom.
  enriched.sort((a, b) => {
    const sa = a.score ?? -Infinity;
    const sb = b.score ?? -Infinity;
    return sb - sa;
  });

  const columns = update.getOption("columns") as number;
  const rows = Math.ceil(enriched.length / columns);

  // Auto-scale name length budget based on column count
  const nameLimit = columns <= 1 ? 30 : columns === 2 ? 20 : 14;

  // Detect if any player actually has a score; if not, simpler header.
  const anyScore = enriched.some((e) => e.score !== null);

  // Auto-width the score column across ALL columns so they align on mobile.
  const widestScore = enriched.reduce((max, e) => {
    if (e.score === null) return max;
    return Math.max(max, String(e.score).length);
  }, 1);

  // Header lives as a bold first line inside column 1's content.
  const headerLine = anyScore ? "**`SCR` · Player**\n" : "**Player**\n";
  const invisibleTitle = "\u200B";

  for (let i = 0; i < columns; i++) {
    const column = enriched.splice(0, rows);
    if (column.length > 0) {
      const lines = column.map((e) => {
        const hasScore = e.score !== null;
        const score = hasScore
          ? String(e.score).padStart(widestScore, FIGURE_SPACE)
          : "";
        const name = stripQ3Colors(e.name);
        const trimmed =
          name.length > nameLimit ? name.slice(0, nameLimit - 1) + "…" : name;
        return hasScore ? `\`${score}\` · ${trimmed}` : trimmed;
      });

      const content = (i === 0 ? headerLine : "") + lines.join("\n");
      embed.addField(invisibleTitle, content, true);
    }
  }

  return truncateEmbed(embed);
}