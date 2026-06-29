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

function serverFormat(str: string, server: State) {
  for (const prop of <[keyof State]>FORMAT_PROPERTIES) {
    str = str.replace(
      new RegExp(`\\{${prop}\\}`, "gi"),
      server[prop]?.toString() || ""
    );
  }
  return str;
}

const stripQ3Colors = (s: string) => s.replace(/\^[0-9]/g, "");

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
  const players = server.realPlayers === null ? [] : server.realPlayers;

  const isOffline = server.offline ? 1 : 0;

  const embed = new MessageEmbed({
    title: serverFormat(
      update.getOption(OPT_TITLE[isOffline]) as string,
      server
    ),
    description: serverFormat(
      update.getOption(OPT_DESCRIPTION[isOffline]) as string,
      server
    ),
    color: update.getOption(OPT_COLOR[isOffline]) as number,
    timestamp: Date.now(),
  });

  const dots = update.getOption("dots") as string[];
  embed.setFooter({ text: dots[tick % dots.length] });

  const image = update.getOption(OPT_IMAGE[isOffline]) as string;
  if (image.length > 0) embed.setThumbnail(image);

  // Sort players by score descending (highest score at top)
  const sorted = [...players].sort((a, b) => {
    const sa = Number((a.raw as Record<string, unknown>)?.score ?? 0);
    const sb = Number((b.raw as Record<string, unknown>)?.score ?? 0);
    return sb - sa;
  });

  const columns = update.getOption("columns") as number;
  const rows = Math.ceil(sorted.length / columns);

  // Auto-scale name length budget based on how many columns the embed splits into.
  const nameLimit = columns <= 1 ? 30 : columns === 2 ? 20 : 14;

  // Detect if any player in this update actually has a score field;
  // if not, use a simpler "Player" header.
  const anyScore = sorted.some((p) => {
    const r = (p.raw as Record<string, unknown>) ?? {};
    return r.score !== undefined && r.score !== null;
  });

  // Build the header line. Embed field titles don't honor Discord's small-text (-#)
  // markdown, but field *content* does — so we put the header as the first line of
  // column 1's content with the small-text prefix, and use an invisible title on
  // every column. Result: one small header at the top on both desktop and mobile,
  // no gaps between columns when stacked on mobile.
  const headerLine = anyScore ? "**`SCR` · Player**\n" : "**Player**\n";
  const invisibleTitle = "\u200B";

  for (let i = 0; i < columns; i++) {
    const column = sorted.splice(0, rows);
    if (column.length > 0) {
      // Determine widest score in this column for tight padding
      const widestScore = column.reduce((max, p) => {
        const r = (p.raw as Record<string, unknown>) ?? {};
        if (r.score === undefined || r.score === null) return max;
        return Math.max(max, String(r.score).length);
      }, 1);

      const lines = column.map((p) => {
        const r = (p.raw as Record<string, unknown>) ?? {};
        const hasScore = r.score !== undefined && r.score !== null;
        const score = hasScore
          ? String(r.score).padStart(widestScore, " ")
          : "";
        const name = stripQ3Colors(p.name ?? "");
        const trimmed =
          name.length > nameLimit ? name.slice(0, nameLimit - 1) + "…" : name;
        return hasScore ? `\`${score}\` · ${trimmed}` : trimmed;
      });

      // Header only on column 1; columns 2/3 just show their data.
      const content = (i === 0 ? headerLine : "") + lines.join("\n");
      embed.addField(invisibleTitle, content, true);
    }
  }

  return truncateEmbed(embed);
}