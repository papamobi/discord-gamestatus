# Fork changelog (papamobi)

## 2026/07

### Added

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

- **Player list rendering** rewritten: players sorted by score, monospace score column with figure-space padding (mobile-safe), Q3 color codes stripped, dynamic name-length scaling by column count, single bold header row.
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
