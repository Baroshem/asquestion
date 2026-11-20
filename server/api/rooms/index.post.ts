import { readBody } from 'h3'
import { createRoom } from '../../services/room.service'
import { setModeratorCookie } from '../../utils/auth'
import { requireString } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: unknown }>(event)
  const name = requireString(body?.name, 'Room name', 80)
  const { room, moderatorToken } = await createRoom(name)
  setModeratorCookie(event, room.code, moderatorToken)
  const { ownerTokenHash: _secret, ...publicRoom } = room
  return { room: publicRoom }
})
