/*
discord-gamestatus: Game server monitoring via discord API
Copyright (C) 2026 papamobi
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

/**
 * Short-lived per-channel lock to suppress scheduler-driven updates while
 * a command (e.g. !statusrefresh or !statusmoveup) is deleting and reposting
 * every message in the channel.
 *
 * The scheduler reads the DB independently and may already be mid-send with
 * stale message_ids when a refresh happens. Without a lock, those stale sends
 * would fail their edit + create fresh messages, resulting in duplicates.
 *
 * Locks expire automatically (default 15 s) so a crashed command can't wedge
 * a channel permanently.
 */

const locks = new Map<string, number>();

export function markChannelRefreshing(
  channelId: string,
  durationMs = 60000
): void {
  console.log(`[LOCK] Marking channel ${channelId} refreshing for ${durationMs}ms`);
  locks.set(channelId, Date.now() + durationMs);
}

export function clearChannelRefresh(channelId: string): void {
  console.log(`[LOCK] Clearing channel ${channelId}`);
  locks.delete(channelId);
}

export function isChannelRefreshing(channelId: string | undefined): boolean {
  if (!channelId) return false;
  const expiry = locks.get(channelId);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    console.log(`[LOCK] Channel ${channelId} expired`);
    locks.delete(channelId);
    return false;
  }
  console.log(`[LOCK] Channel ${channelId} still locked, blocking update`);
  return true;
}
