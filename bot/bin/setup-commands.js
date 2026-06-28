#!/usr/bin/env node
"use strict";
const fs = require("fs/promises");
const path = require("path");
const { Client, Intents } = require("discord.js");

async function parseCommands() {
  const DIR = path.join(__dirname, "../dist/commands");
  return (await fs.readdir(DIR))
    .map((file) => {
      const command = require(path.join(DIR, file));
      if (command.disableSlash) return undefined;
      const nl = command.help.indexOf("\n");
      return {
        name: command.name,
        description: command.help.substring(
          0,
          Math.min(nl > 1 ? nl : command.help.length, 100)
        ),
        options: command.options,
        type: "CHAT_INPUT",
      };
    })
    .filter((c) => c !== undefined);
}

(async () => {
  if (!process.env.DISCORD_API_KEY) {
    console.error("Set DISCORD_API_KEY");
    process.exit(1);
  }
  const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
  await client.login(process.env.DISCORD_API_KEY);
  const commands = await parseCommands();
  console.log("Registering " + commands.length + " commands...");
  const result = await client.application.commands.set(commands);
  console.log("Registered " + result.size + " commands: " +
    [...result.values()].map(c => c.name).join(", "));
  client.destroy();
})().catch((e) => { console.error(e); process.exit(1); });