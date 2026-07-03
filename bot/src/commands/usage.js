import { formatUsage } from '../humanize.js';

export async function usageCommand(message, _args, backend) {
  const usage = await backend.getUsage();
  await message.reply(formatUsage(usage));
}
