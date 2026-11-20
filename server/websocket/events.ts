import type { ClientEvent, ServerEvent } from '../../shared/types'

export function parseClientEvent(value: unknown): ClientEvent | null {
  if (!value || typeof value !== 'object' || !('type' in value)) return null
  const event = value as Record<string, unknown>
  switch (event.type) {
    case 'room:join':
      return typeof event.roomCode === 'string' && /^[A-Z0-9]{4,12}$/i.test(event.roomCode)
        ? { type: 'room:join', roomCode: event.roomCode.toUpperCase() }
        : null
    case 'question:create':
      return typeof event.content === 'string' && event.content.trim().length > 0 && event.content.trim().length <= 500
        ? { type: 'question:create', content: event.content.trim() }
        : null
    case 'question:vote':
    case 'question:delete':
      return typeof event.questionId === 'string' && event.questionId.length <= 64
        ? { type: event.type, questionId: event.questionId }
        : null
    case 'question:select':
      return event.questionId === null || (typeof event.questionId === 'string' && event.questionId.length <= 64)
        ? { type: 'question:select', questionId: event.questionId as string | null }
        : null
    case 'room:close':
      return { type: 'room:close' }
    default:
      return null
  }
}

export function sendEvent(peer: { send(data: unknown): unknown }, event: ServerEvent): void {
  peer.send(JSON.stringify(event))
}
