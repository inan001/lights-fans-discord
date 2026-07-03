import { formatStatusSummary } from '../humanize.js';

export async function statusCommand(message, _args, backend) {
  const devices = await backend.getDevices();
  await message.reply(formatStatusSummary(devices));
}
