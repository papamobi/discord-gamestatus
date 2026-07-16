# discord-gamestatus

A open-source discord bot that actively monitors your game server and updates a discord message with the
current status.

- [Invite link](https://discord.com/oauth2/authorize?client_id=1278673992634470463&permissions=126144&scope=bot%20applications.commands)
- [Command documentation](https://gamestatus.douile.com/docs/user)
- [Self-hosting documentation (WIP)](https://gamestatus.douile.com/docs/admin)
- [Terms of usage (for public bot)](https://tr1ckhouse.net/gamestatus/terms.html)
- [Privacy policy (for public bot)](https://tr1ckhouse.net/gamestatus/privacy.html)

## Quick Start

1. Invite [GameStatus](https://discord.com/oauth2/authorize?client_id=1278673992634470463&permissions=126144&scope=bot%20applications.commands) to your guild, or `git clone` + `docker-compose up -d` to self-host. Read self-hosting documentation above for more information.
2. Copy `.env.example` to `.env`, fill in `DISCORD_API_KEY` and `DATABASE_PASS`.
3. Run `!status <game> <ip>` or `/status game:<game> ip:<ip>` in Discord to create a status message.

For QL-specific features (enriched rosters), see the [`tr1ckhouse` branch](https://github.com/papamobi/discord-gamestatus/tree/tr1ckhouse).

## Fork notes

This is a fork maintained by [papamobi](https://github.com/papamobi). It
differs from upstream in the following ways:

- **Slash command registration fixed** for discord.js v13 (also submitted
  upstream as [PR #119](https://github.com/discord-gamestatus/discord-gamestatus/pull/119))
- **`/status` game autocomplete**: slash command suggests matching games from gamedig's 321 supported protocols as you type.
- **Country flag in embeds**: `{flag}` placeholder resolves to the server's country flag emoji via IP geolocation.
- **Game name in embed footer**: standard embeds show the game name (e.g. "Team Fortress 2") next to the tick dot.
- **Player list embed rewrite** in `UpdateEmbed.ts`: players sorted by score,
  monospace score column with figure-space padding (mobile-safe), Q3 color
  codes stripped, dynamic name-length scaling by column count, single bold
  header row
- **OpenArena protocol support**: decodes personal score from gamedig's
  packed `raw.frags` field and strips the name prefix
- **Bot built locally** from this fork rather than pulling the upstream
  prebuilt image
- **Pinned dependencies** via `npm ci` + `bot/package-lock.json` for
  reproducible builds
- **Updated base images**: `node:22-alpine` (upstream was `node:18-alpine`,
  EOL April 2025) and `rust:1-alpine` for the scheduler

### Env vars added by this fork

- `CONNECT_REDIRECT_URL` — optional HTTPS URL wrapped around the `{connect}`
  embed placeholder on Steam/Valve-protocol servers. Discord no longer
  renders `steam://` schemes as clickable in embeds, so those links have
  been effectively dead. The bot appends `?ip=<ip>&port=<port>` to this
  URL and renders `{connect}` as a clickable `[ip:port](url)` link. The
  page at the URL is expected to handle the query params however it
  likes — typically by emitting a `steam://connect/...` launch. If unset,
  falls back to plain `ip:port` text.

  We use a lightly-branded copy of [GModJoiner](https://github.com/SetCr4/GModJoiner)
  by [SetCr4](https://github.com/SetCr4) at [tr1ckhouse.net/steam](https://tr1ckhouse.net/steam/),
  which already accepts the expected params and works for any Steam server. To
  self-host, clone the GModJoiner repo, drop it under your web root, and point
  `CONNECT_REDIRECT_URL` at your instance.

The `tr1ckhouse` branch adds a few more env vars for QL-specific features
(`TR1CKHOUSE_ROSTER_API_URL`, `TR1CKHOUSE_ROSTER_API_KEY`,
`TR1CKHOUSE_EMOJI_RED`, `TR1CKHOUSE_EMOJI_BLUE`) — see `.env.example`.

Upstream `master` is at https://github.com/discord-gamestatus/discord-gamestatus.

## Changelog
See [CHANGELOG](./CHANGELOG.md)

## Contributing
If you would like to request a new feature, report a bug, or even fix or improve our code we welcome your contribution.
Open an issue to make a request, or a PR to submit your code for review.

Before contributing please read [CONTRIBUTING](./CONTRIBUTING.md)

## LICENSE
[Licensed under GPL-3.0](./LICENSE)
