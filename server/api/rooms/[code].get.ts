import { getRoom, getRoomState } from '../../services/room.service'
import { ensureUserIdentity, isModerator } from '../../utils/auth'
import { requireRoomCode } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const code = requireRoomCode(getRouterParam(event, 'code'))
  const room = await getRoom(code)
  const identity = ensureUserIdentity(event)
  const moderator = isModerator(event, room)
  const state = await getRoomState(code, identity, moderator)
  return state
})
