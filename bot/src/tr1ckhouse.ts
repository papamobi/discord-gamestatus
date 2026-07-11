/*
tr1ckhouse roster API client — fetches enriched per-server data from the
central tr1ckhouse registry (https://tr1ckhouse.net/rosters) and matches
statuses to their roster snapshot by "ip:port".

Falls back gracefully when the API is unreachable, misconfigured, or the
server isn't part of the tr1ckhouse fleet.
*/

export interface Tr1ckhousePlayer {
  steam_id: string;
  name: string;
  score: number;
  kills: number;
  deaths: number;
  damage: number;
  ping: number;
}

export interface Tr1ckhouseRoster {
  net_ip: string;
  net_port: number;
  hostname: string;
  gametype: string;
  instagib: number;
  map: string;
  score_red: number;
  score_blue: number;
  teams: {
    red: Tr1ckhousePlayer[];
    blue: Tr1ckhousePlayer[];
    spectator: Tr1ckhousePlayer[];
    free: Tr1ckhousePlayer[];
  };
  updated: number;
}

interface RegistryResponse {
  generated_at: number;
  count: number;
  rosters: Record<string, Tr1ckhouseRoster>;
}

const API_URL = process.env.TR1CKHOUSE_ROSTER_API_URL;
const API_KEY = process.env.TR1CKHOUSE_ROSTER_API_KEY;
const TIMEOUT_MS = Number(process.env.TR1CKHOUSE_ROSTER_TIMEOUT_MS ?? 2000);
const CACHE_MS = Number(process.env.TR1CKHOUSE_ROSTER_CACHE_MS ?? 30_000);

let cache: { fetchedAt: number; data: RegistryResponse } | null = null;
let inflight: Promise<RegistryResponse | null> | null = null;

let lastWarn = 0;
const WARN_THROTTLE_MS = 60_000;

function warnThrottled(msg: string): void {
  const now = Date.now();
  if (now - lastWarn > WARN_THROTTLE_MS) {
    console.warn(`[tr1ckhouse] ${msg}`);
    lastWarn = now;
  }
}

async function fetchRegistry(): Promise<RegistryResponse | null> {
  if (!API_URL || !API_KEY) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      headers: { "X-Tr1ckhouse-Key": API_KEY },
      signal: controller.signal,
    });
    if (!res.ok) {
      warnThrottled(`registry returned ${res.status}`);
      return null;
    }
    return (await res.json()) as RegistryResponse;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    warnThrottled(`registry fetch failed: ${msg}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getRegistryPayload(): Promise<RegistryResponse | null> {
  if (!API_URL || !API_KEY) return null;

  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_MS) {
    return cache.data;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    const data = await fetchRegistry();
    if (data) cache = { fetchedAt: Date.now(), data };
    return data;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/**
 * Look up a tr1ckhouse roster by server ip:port. Returns null if the server
 * is not part of the tr1ckhouse fleet, or the registry is unavailable.
 */
export async function getRoster(
  ipPort: string
): Promise<Tr1ckhouseRoster | null> {
  const payload = await getRegistryPayload();
  if (!payload) return null;
  return payload.rosters[ipPort] ?? null;
}