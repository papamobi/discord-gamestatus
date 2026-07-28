/*
discord-gamestatus: Game server monitoring via discord API
Copyright (C) 2026 papamobi
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

import { ApplicationCommandOptionData } from "discord.js-light";
import { isAdmin } from "../checks";
import {
  CommandContext,
  CommandInteractionContext,
  MessageContext,
} from "../structs/CommandContext";
import { moveStatusByIndex } from "../statusmove_shared";
import { warnLog } from "../debug";

export const name = "statusmovedown";
export const check = isAdmin;
export const help =
  "Move a status one position down within its channel.\nUsage: `/statusmovedown <id>` (find IDs with `/statusmod list`).";

const KEY_ID = "status-id";

export const options: ApplicationCommandOptionData[] = [
  {
    type: "INTEGER",
    name: KEY_ID,
    description: "ID of the status to move down",
    required: true,
    minValue: 0,
  },
];

function parseIndex(context: CommandContext): number | undefined {
  try {
    if (context instanceof MessageContext) {
      const args = context.options();
      if (args.length === 0) return undefined;
      const n = parseInt(args[0].replace(/^#/, ""));
      return isNaN(n) ? undefined : n;
    }
    if (context instanceof CommandInteractionContext) {
      return context.inner().options.getInteger(KEY_ID, true);
    }
  } catch (e) {
    warnLog(`Error parsing command "${name}"`, e);
  }
  return undefined;
}

export async function call(context: CommandContext): Promise<void> {
  const index = parseIndex(context);
  if (index === undefined) {
    await context.reply({
      content: "Usage: `!statusmovedown <id>` (find IDs with `!statusmod`).",
      ephemeral: true,
    });
    return;
  }
  await moveStatusByIndex(context, index, "down");
}
