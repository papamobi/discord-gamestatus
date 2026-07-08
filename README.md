# discord-gamestatus

A open-source discord bot that actively monitors your game server and updates a discord message with the
current status.

- [Invite link](https://discordapp.com/oauth2/authorize?client_id=659050996730822665&permissions=126144&scope=bot)
- [Command documentation](https://gamestatus.douile.com/docs/user)
- [Self-hosting documentation (WIP)](https://gamestatus.douile.com/docs/admin)
- [Terms of usage (for public bot)](https://gamestatus.douile.com/TERMS)
- [Privacy policy (for public bot)](https://gamestatus.douile.com/PRIVACY)

## Fork notes

This is a fork maintained by [papamobi](https://github.com/papamobi). It
differs from upstream in the following ways:

- **Slash command registration fixed** for discord.js v13 (also submitted
  upstream as [PR #119](https://github.com/discord-gamestatus/discord-gamestatus/pull/119))
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

- `CONNECT_REDIRECT_URL` — optional HTTPS URL for the {connect} embed placeholder on Steam/Valve-protocol servers.
  Discord no longer renders steam:// schemes as clickable
  in embeds, so those links have been effectively dead. Set
  this to a page that accepts `?ip=<ip>&port=<port>` and emits a
  `steam://connect/...` launch, and `{connect}` becomes a clean clickable
  `[ip:port](url)` link. Unset falls back to plain `ip:port` text.

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
