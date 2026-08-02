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
import { GAMEDIG_GAME_NAMES } from "../../gamedigNames";
import Update from "../Update";
import { UpdateOptions } from "./UpdateOptions";
import { FORMAT_PROPERTIES } from "../../constants";
import { State } from "../../query";
import { countryCode } from "../../geoip";
import { codeToFlag } from "../../geoip";
function serverFormat(str: string, server: State, flag: string = "", qlstats: string = "") {
  for (const prop of <[keyof State]>FORMAT_PROPERTIES) {
    str = str.replace(
      new RegExp(`\\{${prop}\\}`, "gi"),
      server[prop]?.toString() || ""
    );
  }
  str = str.replace(/\{flag\}/gi, flag);
  str = str.replace(/\{qlstats\}/gi, qlstats);
  return str;
}
const stripGameColors = (s: string) =>
  s
    // Quake 3 / Quake Live / Doom 3 / Savage 2
    // ^X + 6-hex (long form) or ^ + single char (short form)
    .replace(/\^(X.{6}|.)/g, "")
    // Nadeo / Trackmania — $ + 3-hex or single letter
    .replace(/\$([0-9a-f]{3}|[a-z])/gi, "")
    // Armagetron — 0xRRGGBB
    .replace(/0x[0-9a-f]{6}/g, "")
    // Unreal 2 / Gamespy 2 (armygame) — escape codes and control chars
    .replace(/\x1b...|[\x00-\x1a]/g, "");
// Extract clean name from a gamedig player object.
//
// OpenArena embeds a "<score> <ping> <name>" prefix in the name field;
// strip that so we display just the actual player name.
function extractPlayerName(p: Player): string {
  const r = (p.raw as Record<string, unknown>) ?? {};
  let name = p.name ?? "";
  const isOpenArena = r.frags !== undefined && r.frags !== null;
  if (isOpenArena) {
    const oaMatch = name.match(/^-?\d+\s+\d+(?:\.\d+)?\s+(.+)$/);
    if (oaMatch) name = oaMatch[1];
  }
  return name;
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
  const gameType = (update as unknown as { type?: string }).type;
  const qlstats =
    gameType === "quakelive" && ipPort
      ? `［[📈](https://qlstats.net/server/${ipPort})］`
      : "";
  const embed = new MessageEmbed({
    title: serverFormat(
      update.getOption(OPT_TITLE[isOffline]) as string,
      server,
      flag,
      qlstats,
    ),
    description: serverFormat(
      update.getOption(OPT_DESCRIPTION[isOffline]) as string,
      server,
      flag,
      qlstats,
    ),
    color: update.getOption(OPT_COLOR[isOffline]) as number,
    timestamp: Date.now(),
  });
  const dots = update.getOption("dots") as string[];
  const gameId = (update as unknown as { type?: string }).type;
  const gameName = gameId ? GAMEDIG_GAME_NAMES[gameId] || gameId : null;
  embed.setFooter({
    text: gameName
      ? `${dots[tick % dots.length]}  •  ${gameName}`
      : dots[tick % dots.length],
  });
  const image = update.getOption(OPT_IMAGE[isOffline]) as string;
  if (image.length > 0) embed.setThumbnail(image);

  const players = server.realPlayers === null ? [] : server.realPlayers;
  const enriched = players.map((p) => ({
    player: p,
    name: extractPlayerName(p),
  }));
  // Sort alphabetically since server-reported scores are unreliable
  // (slot-based reporting misattributes frags to specs on some protocols).
  enriched.sort((a, b) => a.name.localeCompare(b.name));

  const columns = update.getOption("columns") as number;
  const rows = Math.ceil(enriched.length / columns);
  const nameLimit = columns <= 1 ? 30 : columns === 2 ? 24 : 20;
  const invisibleTitle = "\u200B";
  for (let i = 0; i < columns; i++) {
    const column = enriched.splice(0, rows);
    if (column.length > 0) {
      const lines = column.map((e) => {
        const name = stripGameColors(e.name);
        return name.length > nameLimit ? name.slice(0, nameLimit - 1) + "…" : name;
      });
      const content = lines.join("\n");
      embed.addField(invisibleTitle, content, true);
    }
  }
  return truncateEmbed(embed);
}