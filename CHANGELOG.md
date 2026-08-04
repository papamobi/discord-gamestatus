# Fork changelog (papamobi)

## 2026/08

### Added

- **Fixed `/gamelist` slash command**: previously only showed the first of three embeds; now paginates through all matching games via followUp messages. Also fixed the per-embed match counters that were undercounting.
- **Auto-delete inactive statuses**: statuses continuously offline for 30+ days are automatically removed. A weekly sweeper marks offline servers, clears the mark when they come back online, and deletes both the DB row and Discord message once the threshold is reached. Posts a `⚫ Status for X was removed after 30 days offline` notification in the channel before deletion. Schema v7 adds `first_offline_at` timestamp.
- **`showPlayers` boolean option**: hide the player list for a compact status embed (just title, description, footer). Set via `/statusmod set <id> showPlayers false`. Schema v6.
- **Value autocomplete for boolean settings** in `/statusmod set`: `connectUpdate`, `disconnectUpdate`, and `showPlayers` now suggest `true`/`false` when selected.
- **Bumped to v2.4.3**.


## 2026/07

### Added

- **`👥 Players` header**: gamedig player list uses Discord field-name rendering for the header, giving consistent spacing on desktop and mobile.
- **`\n` escape support in `/statusmod set`**: slash command values can include literal `\n` which becomes a real newline (workaround for Discord's single-line option fields).
- **`{qlstats}` placeholder**: for Quake Live statuses, renders as clickable ［📈］ linking to the server's qlstats.net page. Added to the default description template; opt-in for existing custom templates.
- **`/statuscheck` command** (and `!statuscheck`): one-shot server query without persisting. Available to all users; slash reply is ephemeral.
- **`!statusmoveup` / `!statusmovedown` commands** (slash and message): reorder a status within its channel. Adds a `position` column to the `statuses` table (schema v5, backfilled from id) and reposts every message in the affected channel sequentially in the new order so Discord's visual order matches DB position. Includes a 60s per-channel refresh lock preventing scheduler-driven updates from racing with the repost.
- **`!statusrefresh` now reposts in position order**: previously reposted in parallel (arbitrary order); now sorts by `position` and reposts sequentially.
- **`{flag}` placeholder**: resolves to the server's country flag emoji via IP geolocation (ip-api.com, 24h cache).
- **Game name in embed footer**: standard renders show the game name (bundles 321-name mapping for gamedig 4.3.1 protocols).
- **`/status` game autocomplete**: slash command now suggests matching game IDs from gamedig's 321 supported protocols as the user types.
- **Tr1ckHouse roster integration** (tr1ckhouse branch): enriched embed rendering for participating QL servers with per-team scores, K/D, damage, gametype-aware layouts, and spectator lists. Fetched from a central HTTPS registry populated by the [tr1ckhouse_roster minqlx plugin](https://github.com/papamobi/tr1ckhouse-minqlx-plugins/tree/main/tr1ckhouse_roster).
- **Custom team emojis** (tr1ckhouse branch): configurable RED/BLUE team emojis via `TR1CKHOUSE_EMOJI_RED` and `TR1CKHOUSE_EMOJI_BLUE` env vars, with Unicode square fallback.
- **HTTPS `{connect}` redirector** support via `CONNECT_REDIRECT_URL` env var. Discord no longer renders `steam://` schemes as clickable in embeds; the bot now wraps `{connect}` as a `[ip:port](url)` link pointing at a redirector page.
- **`!statusexport` command**: dump status configs as a copy-pasteable script of `!status` + `!statusmod set` commands.
- **`!statusmove` message-command version**: previously a "todo" stub, now fully implemented for parity with the slash command.
- **Slash command registration fixed** for discord.js v13. Submitted upstream as [PR #119](https://github.com/discord-gamestatus/discord-gamestatus/pull/119).
- **OpenArena protocol support**: decodes personal score from gamedig's packed `raw.frags` field.
- **Privacy policy and terms** at [tr1ckhouse.net/gamestatus/](https://tr1ckhouse.net/gamestatus/privacy.html).

### Changed

- **Removed score column from gamedig player list**: server-reported scores are unreliable across many protocols — QL Valve packets misattribute frags to spectators via slot-based reporting, and other games have similar quirks. Player names now sort alphabetically. Column widths bumped to 30/24/22 chars for 1/2/3 columns since the score column no longer takes space. Original score handling preserved on `feature/gamedig-scores` branch for future revival.
- **Player list header** now uses Discord's field-name slot instead of prefixing content, eliminating column gaps on mobile.
- **Default embed title** simplified from `{name} server status` to just `{name}`.
- **Docker base images**: `node:22-alpine` (upstream was `node:18-alpine`, EOL April 2025) and `rust:1-alpine` for the scheduler.
- **Help text**: improved `!statusmove` docs with usage examples; added fork GitHub link alongside upstream docs in `!help`.

---

# Upstream changelog

# 2.X.Y - YYYY/MM/DD

## Changes

## Breaking changes

- Moved all bot code into the `bot` folder

# 2.3.0 - 2023/11/08

## Changes

- Added SQL linting/formatting
- Updated dependencies (including gamedig)
- Added CONTRIBUTING.md
- Added CHANGELOG.md
- Add local IP range blocklist (and CLI option to disable `--dont-block-local-addresses`)
- Use dotenv when starting to source environment variables
- Various SQL fixes
- Improve docker build and compose
- Fixed commands timing out while accessing database by deferring the response
- Prefixed imports from nodes standard library with `node:`
- Added issue templates

## Breaking changes:

- Add a scheduler that is needed to tell the bot when to update status messages
- `Renamed bin/discord-gamestatus` to `bin/discord-gamestatus.js`

# Older

For older changelogs see the [github releases](https://github.com/discord-gamestatus/discord-gamestatus/releases)
