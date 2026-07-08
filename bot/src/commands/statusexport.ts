/*
discord-gamestatus: Game server monitoring via discord API

statusexport - dump status configuration as a recreation script
*/

import { MessageAttachment } from "discord.js-light";

import Update from "../structs/Update";
import { isAdmin } from "../checks";
import { UpdateOptions } from "../structs/Update/UpdateOptions";
import {
  ApplicationCommandOptionData,
} from "discord.js-light";
import {
  CommandContext,
  GuildCommandContext,
  CommandInteractionContext,
  MessageContext,
} from "../structs/CommandContext";
import { warnLog } from "../debug";

export const name = "statusexport";
export const check = isAdmin;
export const help = `Export status configuration as a script for recreation.
Use cases:
  - Export all statuses in current guild: \`!statusexport\`
  - Export a specific status by ID: \`!statusexport 3\`

Produces a script of !status + !statusmod commands using \`<new_id>\` as a
placeholder for the new status's ID. Long exports are attached as a file.`;

export const options: ApplicationCommandOptionData[] = [
  {
    type: "INTEGER",
    name: "status-id",
    description: "Optional status ID to export only that one",
    required: false,
    minValue: 0,
  },
];

// Options we care about exporting. Order matches how a human would recreate.
const EXPORT_KEYS: (keyof UpdateOptions)[] = [
  "title",
  "offlineTitle",
  "description",
  "offlineDescription",
  "color",
  "offlineColor",
  "image",
  "offlineImage",
  "columns",
  "maxEdits",
  "dots",
  "connectUpdate",
  "disconnectUpdate",
];

interface ParsedOptions {
  index?: number;
  error?: string;
}

function parseOptions(context: GuildCommandContext): ParsedOptions {
  try {
    if (context instanceof MessageContext) {
      const args = context.options();
      if (args.length === 0) return {};
      const index = parseInt(args[0].replace(/^#/, ""));
      if (isNaN(index)) return { error: "Status ID must be an integer" };
      return { index };
    }
    if (context instanceof CommandInteractionContext) {
      const idx = context.inner().options.getInteger("status-id", false);
      return idx === null ? {} : { index: idx };
    }
  } catch (e) {
    warnLog(`Error parsing command "${name}"`, e);
    return { error: "Unexpected error parsing command options" };
  }
  return {};
}

function formatColor(n: number): string {
  return "#" + n.toString(16).toUpperCase().padStart(6, "0");
}

function formatValue(key: keyof UpdateOptions, value: unknown): string {
  if (value === null || value === undefined) return "";

  // Colors: render as #RRGGBB for readability
  if ((key === "color" || key === "offlineColor") && typeof value === "number") {
    return formatColor(value);
  }

  if (typeof value === "string") {
    // Escape newlines and backslashes so the value stays on one line
    return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    // dots is a string[] — join with commas per bot convention
    return value.map(String).join(",");
  }
  return JSON.stringify(value);
}

function formatStatusRecipe(status: Update, prefix: string): string {
  const lines: string[] = [];
  const name = status.name || status.ip;
  lines.push(`# ${name} [${status.type}]`);
  lines.push(`${prefix}status ${status.type} ${status.ip}`);

  const opts = status.getOptions();
  for (const key of EXPORT_KEYS) {
    const value = opts[key];
    if (value === null || value === undefined) continue;
    // Skip empty strings / arrays
    if (typeof value === "string" && value.length === 0) continue;
    if (Array.isArray(value) && value.length === 0) continue;

    const formatted = formatValue(key, value);
    lines.push(`${prefix}statusmod set <new_id> ${key} ${formatted}`);
  }
  return lines.join("\n");
}

export async function call(context: CommandContext): Promise<void> {
  const guildContext = context.intoGuildContext();
  if (!guildContext) return;

  const parsed = parseOptions(guildContext);
  if (parsed.error) {
    await context.reply({ content: `Error: ${parsed.error}`, ephemeral: true });
    return;
  }

  await context.deferReply({ content: "Exporting...", ephemeral: true });

  let statuses = await context.client().updateCache.get({
    guild: guildContext.guild().id,
  });
  if (statuses === undefined) statuses = [];
  else if (!Array.isArray(statuses)) statuses = [statuses];

  if (statuses.length === 0) {
    await context.editReply({ content: "No statuses in this guild to export." });
    return;
  }

  const prefix = context.client().config.prefix;

  let toExport: Update[];
  if (parsed.index !== undefined) {
    const one = statuses[parsed.index];
    if (!one) {
      await context.editReply({
        embeds: [
          {
            title: "Invalid status ID",
            description: `Status ID \`${parsed.index}\` doesn't exist.`,
            color: 0xff0000,
          },
        ],
      });
      return;
    }
    toExport = [one];
  } else {
    toExport = statuses;
  }

  const header = `# Exported ${toExport.length} status(es) — ${new Date().toISOString()}\n# Replace <new_id> with the ID printed by !statusmod list after !status runs.\n`;
  const body = toExport
    .map((s: Update) => formatStatusRecipe(s, prefix))
    .join("\n\n");
  const full = header + "\n" + body + "\n";

  // 1900 char threshold to leave room for code block wrapper
  if (full.length < 1900) {
    await context.editReply({
      content: "```\n" + full + "\n```",
    });
    return;
  }

  // Too large — attach as file
  const attachment = new MessageAttachment(
    Buffer.from(full, "utf-8"),
    `statuses-${guildContext.guild().id}.txt`
  );

  const channel = context.channel();
  if (channel && "send" in channel) {
    await (channel as any).send({
      content: `Exported ${toExport.length} statuses:`,
      files: [attachment],
    });
    await context.editReply({ content: "See attached file above." });
  } else {
    await context.editReply({
      content: "Export is too large to display inline, and I couldn't send an attachment.",
    });
  }
}