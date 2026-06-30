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

Upstream `master` is at https://github.com/discord-gamestatus/discord-gamestatus.

## Changelog
See [CHANGELOG](./CHANGELOG.md)

## Contributing
If you would like to request a new feature, report a bug, or even fix or improve our code we welcome your contribution.
Open an issue to make a request, or a PR to submit your code for review.

Before contributing please read [CONTRIBUTING](./CONTRIBUTING.md)

## LICENSE
[Licensed under GPL-3.0](./LICENSE)
