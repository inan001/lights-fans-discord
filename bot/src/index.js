import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { backendClient } from './backendClient.js';
import { formatAlert } from './humanize.js';
import { statusCommand } from './commands/status.js';
import { roomCommand } from './commands/room.js';
import { usageCommand } from './commands/usage.js';

const PREFIX = '!';
const ALERT_POLL_MS = 2 * 60 * 1000;

const commands = {
  status: statusCommand,
  room: roomCommand,
  usage: usageCommand,
};

const discordToken = process.env.DISCORD_TOKEN;

if (!discordToken) {
  console.error('DISCORD_TOKEN is missing. Add it to .env before starting the bot.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, () => {
  console.log(`Office bot is online as ${client.user.tag}`);
  startAlertWatcher();
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const [commandName, ...args] = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = commands[commandName?.toLowerCase()];

  if (!command) return;

  try {
    await command(message, args, backendClient);
  } catch (error) {
    console.error(error);
    await message.reply('I tried to check the live office data, but the backend did not answer cleanly. Please try again in a moment.');
  }
});

client.login(discordToken).catch((error) => {
  console.error('Failed to log in to Discord:', error);
  process.exit(1);
});

function startAlertWatcher() {
  const channelId = process.env.ALERT_CHANNEL_ID;

  if (!channelId) {
    console.warn('ALERT_CHANNEL_ID is not set. Alert watcher is disabled.');
    return;
  }

  const seenAlertIds = new Set();
  let seeded = false;

  async function pollAlerts() {
    try {
      const alerts = await backendClient.getAlerts();

      if (!seeded) {
        alerts.forEach((alert) => seenAlertIds.add(alert.id));
        seeded = true;
        return;
      }

      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased()) {
        console.warn(`ALERT_CHANNEL_ID ${channelId} is not a text channel.`);
        return;
      }

      for (const alert of alerts) {
        if (seenAlertIds.has(alert.id)) continue;

        seenAlertIds.add(alert.id);
        await channel.send(formatAlert(alert));
      }
    } catch (error) {
      console.error('Alert watcher could not fetch live alerts:', error);
    }
  }

  pollAlerts();
  setInterval(pollAlerts, ALERT_POLL_MS);
}
