/*
discord-gamestatus: Game server monitoring via discord API
Copyright (C) 2026 papamobi
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

import Update from "./structs/Update";
import { EMBED_COLOR } from "./constants";
import { CommandContext } from "./structs/CommandContext";

export type MoveDirection = "up" | "down";

/**
 * Shared implementation of !statusmoveup / !statusmovedown.
 *
 * Behaviour:
 *   - Resolves the target status by guild-wide index (same scheme as !statusmod).
 *   - Finds its in-channel neighbour (previous when moving up, next when moving down).
 *   - Swaps their `position` values in the DB.
 *   - Deletes all messages in the affected channel and reposts them
 *     sequentially in the new position order so Discord displays them in the
 *     intended order (Discord shows messages by creation time).
 */
export async function moveStatusByIndex(
  context: CommandContext,
  index: number,
  direction: MoveDirection
): Promise<void> {
  const guildContext = context.intoGuildContext();
  if (!guildContext) return;

  await context.deferReply({ content: "Loading...", ephemeral: true });

  let statuses = await context.client().updateCache.get({
    guild: guildContext.guild().id,
  });
  if (statuses === undefined) {
    statuses = [];
  } else if (!Array.isArray(statuses)) {
    statuses = [statuses];
  }

  const target = statuses[index];
  if (!target) {
    await context.editReply({
      embeds: [
        {
          title: "Invalid status ID",
          description: `The status ID you provided (\`${index}\`) doesn't appear to exist`,
          color: 0xff0000,
        },
      ],
    });
    return;
  }

  // Filter to statuses in the same channel and sort by their DB position.
  const inChannel = statuses
    .filter((s: Update) => s.channel === target.channel)
    .sort((a: Update, b: Update) => (a.position ?? 0) - (b.position ?? 0));

  const idx = inChannel.indexOf(target);
  if (idx === -1) {
    await context.editReply({
      embeds: [
        {
          title: "Error",
          description: "Could not locate status within its channel",
          color: 0xff0000,
        },
      ],
    });
    return;
  }

  const neighbourIdx = direction === "up" ? idx - 1 : idx + 1;
  if (neighbourIdx < 0 || neighbourIdx >= inChannel.length) {
    await context.editReply({
      embeds: [
        {
          title: "Already at edge",
          description: `Status #${index} is already at the ${
            direction === "up" ? "top" : "bottom"
          } of its channel.`,
          color: 0xff0000,
        },
      ],
    });
    return;
  }

  const neighbour = inChannel[neighbourIdx];

  // Swap positions in memory and persist.
  const targetPos = target.position ?? 0;
  const neighbourPos = neighbour.position ?? 0;
  target.position = neighbourPos;
  neighbour.position = targetPos;

  await context.client().updateCache.update(target);
  await context.client().updateCache.update(neighbour);

  // Reorder our local array to reflect the new positions, then delete + repost
  // sequentially so Discord's creation-time order matches our position order.
  const reordered = [...inChannel].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );

  for (const status of reordered) {
    await status.deleteMessage(context.client());
    await status.setMessage(context.client(), undefined);
  }

  for (const status of reordered) {
    await status.send(context.client(), 0);
  }

  await context.editReply({
    embeds: [
      {
        title: "Done",
        description: `Moved status #${index} ${direction}. ${reordered.length} statuses in the channel have been reposted in the new order.`,
        color: EMBED_COLOR,
      },
    ],
  });
}
