import { createError } from 'h3'
import { addQuestion, addVote, closeRoom, deleteQuestion, getRoom, getRoomState, selectQuestion } from '../../services/room.service'
import { hashToken, moderatorCookieName, USER_COOKIE } from '../../utils/auth'
import { parseClientEvent, sendEvent } from '../../websocket/events'
import { broadcast, joinRoom, leaveRoom } from '../../websocket/room-manager'

const counters = new Map<string, { startedAt: number, count: number }>()

export default defineWebSocketHandler({
  upgrade(request) {
    const origin = request.headers.get('origin')
    if (origin) {
      try {
        const requestUrl = new URL(request.url, `http://${request.headers.get('host') || 'localhost'}`)
        if (new URL(origin).host !== requestUrl.host) {
          throw createError({ statusCode: 403, statusMessage: 'Origin not allowed' })
        }
      } catch {
        throw createError({ statusCode: 403, statusMessage: 'Origin not allowed' })
      }
    }
  },
  async open(peer) {
    try {
      const url = new URL(peer.request.url, 'http://localhost')
      const code = (url.searchParams.get('code') || '').toUpperCase()
      if (!/^[A-Z0-9]{4,12}$/.test(code)) throw new Error('Invalid room code')
      const room = await getRoom(code)
      const cookieHeader = peer.request.headers.get('cookie') || ''
      const cookies = Object.fromEntries(cookieHeader.split(';').map((part) => {
        const index = part.indexOf('=')
        return index < 0 ? ['', ''] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]
      }))
      const identity = cookies[USER_COOKIE]
      if (!identity || !/^[a-f0-9]{64}$/.test(identity)) throw new Error('Join the room before connecting')
      const moderatorToken = cookies[moderatorCookieName(code)]
      const moderator = Boolean(moderatorToken && hashToken(moderatorToken) === room.ownerTokenHash)
      peer.context.identity = identity
      peer.context.moderator = moderator
      joinRoom(code, peer)
      sendEvent(peer, { type: 'room:state', state: await getRoomState(code, identity, moderator) })
    } catch (error) {
      sendEvent(peer, { type: 'error', message: error instanceof Error ? error.message : 'Could not join this room' })
      peer.close(1008, 'Could not join room')
    }
  },
  async message(peer, message) {
    const code = peer.context.roomCode
    const identity = peer.context.identity
    if (typeof code !== 'string' || typeof identity !== 'string') return

    const now = Date.now()
    const counter = counters.get(identity)
    if (!counter || now - counter.startedAt > 10_000) counters.set(identity, { startedAt: now, count: 1 })
    else if (++counter.count > 40) {
      sendEvent(peer, { type: 'error', message: 'Too many actions. Please wait a moment.' })
      return
    }

    try {
      let input: unknown
      try {
        input = message.json<unknown>()
      } catch {
        sendEvent(peer, { type: 'error', message: 'Invalid message format' })
        return
      }
      const action = parseClientEvent(input)
      if (!action || action.type === 'room:join') {
        sendEvent(peer, { type: 'error', message: 'Invalid action' })
        return
      }
      const room = await getRoom(code)
      const moderatorToken = getCookieFromHeader(peer.request.headers.get('cookie') || '', moderatorCookieName(code))
      const isModerator = Boolean(moderatorToken && hashToken(moderatorToken) === room.ownerTokenHash)

      switch (action.type) {
        case 'question:create': {
          const question = await addQuestion(code, identity, action.content)
          broadcast(code, { type: 'question:created', question })
          break
        }
        case 'question:vote': {
          const question = await addVote(code, action.questionId, identity)
          broadcast(code, { type: 'question:updated', question })
          break
        }
        case 'question:select': {
          if (!isModerator) throw createError({ statusCode: 403, statusMessage: 'Moderator access required' })
          const question = await selectQuestion(code, action.questionId)
          broadcast(code, { type: 'question:selected', question })
          break
        }
        case 'question:delete': {
          if (!isModerator) throw createError({ statusCode: 403, statusMessage: 'Moderator access required' })
          await deleteQuestion(code, action.questionId)
          broadcast(code, { type: 'question:deleted', questionId: action.questionId })
          if (room.activeQuestionId === action.questionId) broadcast(code, { type: 'question:selected', question: null })
          break
        }
        case 'room:close': {
          if (!isModerator) throw createError({ statusCode: 403, statusMessage: 'Moderator access required' })
          await closeRoom(code)
          broadcast(code, { type: 'room:closed' })
          break
        }
      }
    } catch (error) {
      const message = error && typeof error === 'object' && 'statusMessage' in error
        ? String(error.statusMessage)
        : 'Action could not be completed'
      sendEvent(peer, { type: 'error', message })
    }
  },
  close(peer) {
    leaveRoom(peer)
  },
})

function getCookieFromHeader(header: string, name: string): string | undefined {
  const item = header.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`))
  if (!item) return undefined
  try {
    return decodeURIComponent(item.slice(name.length + 1))
  } catch {
    return undefined
  }
}
