import { formatRoomSummary } from '../humanize.js';

const allowedRooms = new Set(['work1', 'work2', 'drawing']);

export async function roomCommand(message, args, backend) {
  const room = args.join('').toLowerCase();

  if (!allowedRooms.has(room)) {
    await message.reply('I can check `work1`, `work2`, or `drawing`. Try `!room drawing`.');
    return;
  }

  const devices = await backend.getRoom(room);
  await message.reply(formatRoomSummary(room, devices));
}
