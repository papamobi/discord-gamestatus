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
import {
  getRoster,
  Tr1ckhousePlayer,
  Tr1ckhouseRoster,
} from "../../tr1ckhouse";
import { countryCode, codeToFlag } from "../../geoip";
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
// Figure space — a non-whitespace Unicode character that renders at the width
// of a digit in monospace fonts. Used instead of regular spaces inside inline
// code spans so Discord's mobile renderer doesn't trim them.
const FIGURE_SPACE = "\u2007";
const EMOJI_RED = process.env.TR1CKHOUSE_EMOJI_RED || "🟥";
const EMOJI_BLUE = process.env.TR1CKHOUSE_EMOJI_BLUE || "🟦";
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
  const roster = ipPort ? await getRoster(ipPort) : null;
  if (roster && !server.offline) {
    renderTr1ckhouseRoster(embed, roster);
    // Fold gametype into footer for tr1ckhouse servers so it doesn't eat
    // a whole embed row.
    embed.setFooter({
      text: `${dots[tick % dots.length]}  •  Quake Live  •  ${gametypeLabel(roster)}`,
    });
  } else {
    renderGamedigPlayers(embed, update, server);
  }
  return truncateEmbed(embed);
}
// -----------------------------------------------------------------------------
// tr1ckhouse enriched rendering
// -----------------------------------------------------------------------------
type PrimaryMode = "score" | "kd";
type SortKey = "kills" | "score";
interface LayoutConfig {
  primary: PrimaryMode;
  showDamage: boolean;
  sortBy: SortKey;
}
const GAMETYPE_LAYOUTS: Record<string, LayoutConfig> = {
  "0":  { primary: "kd",    showDamage: true,  sortBy: "kills" }, // FFA
  "1":  { primary: "kd",    showDamage: true,  sortBy: "kills" }, // Duel
  "2":  { primary: "score", showDamage: false, sortBy: "score" }, // Race
  "3":  { primary: "kd",    showDamage: true,  sortBy: "kills" }, // TDM
  "4":  { primary: "kd",    showDamage: true,  sortBy: "kills" }, // Clan Arena
  "5":  { primary: "kd",    showDamage: true,  sortBy: "kills" }, // CTF
  "6":  { primary: "kd",    showDamage: true,  sortBy: "kills" }, // One Flag CTF
  "7":  { primary: "kd",    showDamage: true,  sortBy: "kills" }, // Overload
  "8":  { primary: "kd",    showDamage: true,  sortBy: "kills" }, // Harvester
  "9":  { primary: "kd",    showDamage: true,  sortBy: "kills" }, // FreezeTag
  "10": { primary: "kd",    showDamage: true,  sortBy: "kills" }, // Domination
  "11": { primary: "kd",    showDamage: true,  sortBy: "kills" }, // A&D
  "12": { primary: "kd",    showDamage: true,  sortBy: "kills" }, // Red Rover
};
const DEFAULT_LAYOUT: LayoutConfig = {
  primary: "score",
  showDamage: true,
  sortBy: "score",
};
const GAMETYPE_NAMES: Record<string, string> = {
  "0":  "Free For All",
  "1":  "Duel",
  "2":  "Race",
  "3":  "Team Deathmatch",
  "4":  "Clan Arena",
  "5":  "Capture the Flag",
  "6":  "One Flag CTF",
  "7":  "Overload",
  "8":  "Harvester",
  "9":  "FreezeTag",
  "10": "Domination",
  "11": "Attack & Defend",
  "12": "Red Rover",
};
const formatDamage = (dmg: number) => `${(dmg / 1000).toFixed(1)}k`;
const formatKd = (p: Tr1ckhousePlayer) => `${p.kills}/${p.deaths}`;
const formatScore = (p: Tr1ckhousePlayer) => String(p.score);
function resolveLayout(roster: Tr1ckhouseRoster): LayoutConfig {
  const base = GAMETYPE_LAYOUTS[roster.gametype] ?? DEFAULT_LAYOUT;
  // Instagib: damage is meaningless (1 shot = 1 frag).
  if (roster.instagib) {
    return { ...base, showDamage: false };
  }
  return base;
}
function gametypeLabel(roster: Tr1ckhouseRoster): string {
  const base = GAMETYPE_NAMES[roster.gametype] ?? `Gametype ${roster.gametype}`;
  return roster.instagib ? `Instagib ${base}` : base;
}
function sortPlayers(
  players: Tr1ckhousePlayer[],
  layout: LayoutConfig
): Tr1ckhousePlayer[] {
  return [...players].sort((a, b) => b[layout.sortBy] - a[layout.sortBy]);
}
function renderTr1ckhouseRoster(
  embed: MessageEmbed,
  roster: Tr1ckhouseRoster
): void {
  const layout = resolveLayout(roster);
  const isTeamGametype =
    roster.teams.red.length + roster.teams.blue.length > 0 ||
    roster.teams.free.length === 0;
  if (isTeamGametype) {
    const red = sortPlayers(roster.teams.red, layout);
    const blue = sortPlayers(roster.teams.blue, layout);
    const widths = computeColumnWidths([...red, ...blue], layout);
    embed.addField(
      `${EMOJI_RED} RED — ${roster.score_red}`,
      formatTeam(red, layout, widths),
      true
    );
    embed.addField(
      `${EMOJI_BLUE} BLUE — ${roster.score_blue}`,
      formatTeam(blue, layout, widths),
      true
    );
  } else {
    const players = sortPlayers(roster.teams.free, layout);
    const widths = computeColumnWidths(players, layout);
    embed.addField(
      `Players (${players.length})`,
      formatTeam(players, layout, widths),
      false
    );
  }
  if (roster.teams.spectator.length > 0) {
    const names = roster.teams.spectator
      .map((p) => stripGameColors(p.name))
      .join(", ");
    embed.addField(
      `Spectators (${roster.teams.spectator.length})`,
      names,
      false
    );
  }
}
interface ColumnWidths {
  primary: number;
  dmg: number;
}
function computeColumnWidths(
  players: Tr1ckhousePlayer[],
  layout: LayoutConfig
): ColumnWidths {
  const primaryLens =
    layout.primary === "kd"
      ? players.map((p) => formatKd(p).length)
      : players.map((p) => formatScore(p).length);
  const dmgLens = layout.showDamage
    ? players.map((p) => formatDamage(p.damage).length)
    : [];
  return {
    primary: Math.max(1, ...primaryLens),
    dmg: Math.max(1, ...dmgLens),
  };
}
function formatTeam(
  players: Tr1ckhousePlayer[],
  layout: LayoutConfig,
  widths: ColumnWidths
): string {
  if (players.length === 0) return "_empty_";
  const nameLimit = 14;
  // Header row showing what the columns represent
  const headerParts: string[] = [];
  if (layout.primary === "kd") {
    headerParts.push("_k/d_");
  } else {
    headerParts.push("_scr_");
  }
  headerParts.push("_player_");
  if (layout.showDamage) {
    headerParts.push("_dmg_");
  }
  const header = "-# " + headerParts.join("\u2007·\u2007");
  const rows = players
    .map((p) => {
      const name = stripGameColors(p.name);
      const trimmed =
        name.length > nameLimit ? name.slice(0, nameLimit - 1) + "…" : name;
      const parts: string[] = [];
      if (layout.primary === "kd") {
        const kd = formatKd(p).padStart(widths.primary, FIGURE_SPACE);
        parts.push(`\`${kd}\``);
      } else {
        const score = formatScore(p).padStart(widths.primary, FIGURE_SPACE);
        parts.push(`\`${score}\``);
      }
      parts.push(trimmed);
      if (layout.showDamage) {
        parts.push(`\`${formatDamage(p.damage).padStart(widths.dmg, FIGURE_SPACE)}\``);
      }
      return parts.join("\u2007");
    })
    .join("\n");
  return `${header}\n${rows}`;
}
// -----------------------------------------------------------------------------
// gamedig fallback rendering
// -----------------------------------------------------------------------------
function renderGamedigPlayers(
  embed: MessageEmbed,
  update: Update,
  server: State
): void {
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
      
	  const columnPrefix = i === 0 ? "**👥 Players**\n" : "\u200B\n";
      const content = columnPrefix + lines.join("\n");
      embed.addField(invisibleTitle, content, true);
    }
  }
}