/*
Country geolocation for game server IPs. Cache-first, fetch fallback via
ip-api.com. Small in-memory cache keyed by IP with 24h TTL.

Silently returns null on any failure (missing IP, API down, invalid
response). Callers should treat null as "no flag to show".
*/

const CACHE_MS = 24 * 60 * 60 * 1000; // 24h
const TIMEOUT_MS = 2000;

interface Entry {
  code: string | null;
  fetchedAt: number;
}
const cache = new Map<string, Entry>();

export async function countryCode(ip: string): Promise<string | null> {
  if (!ip) return null;

  const cached = cache.get(ip);
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return cached.code;
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      cache.set(ip, { code: null, fetchedAt: Date.now() });
      return null;
    }
    const data = (await res.json()) as { countryCode?: string };
    const code: string | null = data.countryCode || null;
    cache.set(ip, { code, fetchedAt: Date.now() });
    return code;
  } catch {
    // Cache failures too to avoid hammering API on outage
    cache.set(ip, { code: null, fetchedAt: Date.now() });
    return null;
  }
}

// Convert 2-letter country code to regional-indicator emoji: "FR" → 🇫🇷
export function codeToFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}