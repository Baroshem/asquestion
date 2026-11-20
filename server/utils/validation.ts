import { createError } from 'h3'

export function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, statusMessage: `${field} must be a string` })
  }
  const normalized = value.trim()
  if (!normalized || normalized.length > maxLength) {
    throw createError({ statusCode: 400, statusMessage: `${field} must be between 1 and ${maxLength} characters` })
  }
  return normalized
}

export function requireRoomCode(value: unknown): string {
  const code = requireString(value, 'Room code', 12).toUpperCase()
  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid room code' })
  }
  return code
}
