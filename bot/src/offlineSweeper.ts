import Client from "./structs/Client";
import { warnLog, infoLog } from "./debug";
const CHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
const OFFLINE_DAYS_LIMIT = 30;
export function startOfflineSweeper(client: Client): void {
  const sweep = async () => {
    try {
      const save = (client.updateCache.saveInterface as unknown as { rawQuery: (q: string) => Promise<{ rows: unknown[] }> });
      // 1. Mark newly-offline statuses
      await save.rawQuery(
        `UPDATE statuses SET first_offline_at = NOW() WHERE (state->>'offline')::boolean = true AND first_offline_at IS NULL`
      );
      // 2. Clear timestamp when server is back online
      await save.rawQuery(
        `UPDATE statuses SET first_offline_at = NULL WHERE (state->>'offline')::boolean = false AND first_offline_at IS NOT NULL`
      );
      // 3. Delete statuses that have been offline > 30 days
      const cutoff = new Date(Date.now() - OFFLINE_DAYS_LIMIT * 24 * 60 * 60 * 1000);
      const result = await save.rawQuery(
        `SELECT id, guild_id, channel_id, message_id, name, ip FROM statuses WHERE first_offline_at IS NOT NULL AND first_offline_at < '${cutoff.toISOString()}'`
      );
      for (const raw of result.rows) {
        const row = raw as { id: number; guild_id: string; channel_id: string; message_id: string; name: string; ip: string };
        try {
          const channel = await client.channels.fetch(row.channel_id);
          if (channel && "send" in channel) {
            await (channel as unknown as { send: (m: string) => Promise<unknown> }).send(
              `⚫ Status for **${row.name}** (\`${row.ip}\`) was removed after ${OFFLINE_DAYS_LIMIT} days offline.`
            );
            const msg = await (channel as unknown as { messages: { fetch: (id: string) => Promise<{ delete: () => Promise<unknown> }> } }).messages.fetch(row.message_id);
            if (msg) await msg.delete();
          }
        } catch (e) {
          warnLog(`[OfflineSweeper] Failed to delete Discord message for status ${row.id}:`, e);
        }
        await save.rawQuery(`DELETE FROM statuses WHERE id = ${row.id}`);
        infoLog(`[OfflineSweeper] Deleted status ${row.id} (${row.name}, ${row.ip})`);
      }
    } catch (e) {
      warnLog("[OfflineSweeper] Error during sweep:", e);
    }
  };
  setTimeout(sweep, 10 * 1000);
  setInterval(sweep, CHECK_INTERVAL_MS);
  infoLog("[OfflineSweeper] Started (1w interval, 30-day threshold)");
}