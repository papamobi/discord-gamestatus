/*
discord-gamestatus: Game server monitoring via discord API
Copyright (C) 2026 papamobi
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
*/
import { ApplicationCommandOptionData } from "discord.js-light";
import Update from "../structs/Update";
import { AddressBlockedError, isValidGame, query } from "../query";
import { generateEmbed } from "../structs/Update/UpdateEmbed";
import { Type } from "gamedig";
import {
  CommandContext,
  CommandInteractionContext,
  MessageContext,
} from "../structs/CommandContext";

export const name = "statuscheck";
export const help =
  "Query a game server without saving it. Result is only visible to you.\ne.g. `!statuscheck quakelive 192.168.0.1:27960` or `/statuscheck game:quakelive ip:192.168.0.1:27960`";

export const options: ApplicationCommandOptionData[] = [
  {
    type: "STRING",
    name: "game",
    description: "Game type for query",
    autocomplete: true,
    required: true,
  },
  {
    type: "STRING",
    name: "ip",
    description: "Server IP (and port)",
    required: true,
  },
];

interface CheckOptions {
  type: "options";
  game: string;
  host: string;
}

interface CheckOptionsError {
  type: "error";
  error: string;
}

function getParameters(
  context: CommandContext
): CheckOptions | CheckOptionsError {
  if (context instanceof MessageContext) {
    const parts = context.options().filter((s) => s.length > 0);
    if (parts.length < 2) {
      return {
        type: "error",
        error: `Provide a game type and IP, e.g. \`${
          context.client().config.prefix
        }statuscheck quakelive 192.168.0.1:27960\``,
      };
    }
    return {
      type: "options",
      game: parts[0],
      host: parts[1],
    };
  }
  if (context instanceof CommandInteractionContext) {
    const opts = context.inner().options;
    return {
      type: "options",
      game: opts.getString(options[0].name, true),
      host: opts.getString(options[1].name, true),
    };
  }
  throw new Error("unreachable");
}

export async function call(context: CommandContext): Promise<void> {
  const parameters = getParameters(context);
  if (parameters.type === "error") {
    await context.reply({ content: parameters.error, ephemeral: true });
    return;
  }

  if (!isValidGame(parameters.game)) {
    await context.reply({
      content: `\`${parameters.game}\` is not a valid game. Check \`${
        context.client().config.prefix
      }gamelist\`.`,
      ephemeral: true,
    });
    return;
  }

  await context.deferReply({ content: "Querying...", ephemeral: true });

  // Build a throwaway Update object — used only to render the embed.
  const update = new Update({
    type: parameters.game,
    ip: parameters.host,
  });
  update._dontAutoSave = true;

  let state;
  try {
    state = await query.bind(context.client())(
      parameters.game as Type,
      parameters.host
    );
  } catch (e) {
    let errorMessage = "Unknown error";
    if (e instanceof AddressBlockedError) {
      errorMessage = e.message;
    } else if (e instanceof Error) {
      errorMessage = e.name;
    }
    await context.editReply({
      content: `Error querying the server:\n${errorMessage}`,
    });
    return;
  }

  if (state?.offline === true) {
    await context.editReply({
      content: `\`${parameters.host}\` is offline or unreachable.`,
    });
    return;
  }

  if (!state.offline) update.name = state.name;

  const embed = await generateEmbed(update, state, 0);

  await context.editReply({
    content: "_ _",
    embeds: [embed],
  });
}
