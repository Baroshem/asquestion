import { createError, readBody } from 'h3'
import type { ServerEvent } from '../../../../shared/types'
import { addQuestion, addVote, closeRoom, deleteQuestion, getRoom, selectQuestion } from '../../../services/room.service'
import { ensureUserIdentity, isModerator } from '../../../utils/auth'
import { requireRoomCode } from '../../../utils/validation'
import { parseClientEvent } from '../../../websocket/events'
import { broadcast } from '../../../websocket/room-manager'

export default defineEventHandler(async (event) => {
  const code = requireRoomCode(getRouterParam(event, 'code'))
  const identity = ensureUserIdentity(event)
  const input = await readBody<unknown>(event)
  const action = parseClientEvent(input)

  if (!action || action.type === 'room:join') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid action' })
  }

  const room = await getRoom(code)
  const moderator = isModerator(event, room)
  let events: ServerEvent[]

  switch (action.type) {
    case 'question:create':
      events = [{ type: 'question:created', question: await addQuestion(code, identity, action.content) }]
      break
    case 'question:vote':
      events = [{ type: 'question:updated', question: await addVote(code, action.questionId, identity) }]
      break
    case 'question:select':
      if (!moderator) throw createError({ statusCode: 403, statusMessage: 'Moderator access required' })
      events = [{ type: 'question:selected', question: await selectQuestion(code, action.questionId) }]
      break
    case 'question:delete': {
      if (!moderator) throw createError({ statusCode: 403, statusMessage: 'Moderator access required' })
      const wasActive = room.activeQuestionId === action.questionId
      await deleteQuestion(code, action.questionId)
      events = [{ type: 'question:deleted', questionId: action.questionId }]
      if (wasActive) events.push({ type: 'question:selected', question: null })
      break
    }
    case 'room:close':
      if (!moderator) throw createError({ statusCode: 403, statusMessage: 'Moderator access required' })
      await closeRoom(code)
      events = [{ type: 'room:closed' }]
      break
  }

  for (const serverEvent of events) broadcast(code, serverEvent)
  return { events }
})
