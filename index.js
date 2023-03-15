import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { Client, Intents, Collection } from 'discord.js';
import { Player } from 'discord-player';

import { fs } from 'node:fs';
import { path } from 'node:path';

require('dotenv').config();

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS_VOICE_STATES],
});

// Load all the commands
const commands = [];
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSynch(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  client.commands.set(command.data.name, command);
  commands.push(command);
}

client.player = new Player(client, {
  ytdlOptions: {
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
  },
});

client.on('ready', () => {
  const guildIds = client.guilds.cache.map((guild) => guild.id);

  const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);
  for (const guildId of guildIds) {
    rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), {
      body: commands,
    })
      .then(() => console.log(`Added commands to ${guildId}`))
      .catch(console.error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute({ client, interaction });
  } catch {
    console.error(err); // eslint-disable-line no-console
    await interaction.reply("An error occured while executing that command.");
  }
});

client.login(process.env.TOKEN);
