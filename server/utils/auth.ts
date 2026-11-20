import { createHash, randomBytes } from 'node:crypto'
import { getCookie, setCookie, type H3Event } from 'h3'
import type { RoomRecord } from '../services/room.service'

export const USER_COOKIE = 'qa_user'

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function moderatorCookieName(code: string): string {
  return `qa_mod_${code.toLowerCase()}`
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  }
}

export function ensureUserIdentity(event: H3Event): string {
  let identity = getCookie(event, USER_COOKIE)
  if (!identity || !/^[a-f0-9]{64}$/.test(identity)) {
    identity = randomToken()
    setCookie(event, USER_COOKIE, identity, cookieOptions())
  }
  return identity
}

export function setModeratorCookie(event: H3Event, code: string, token: string): void {
  setCookie(event, moderatorCookieName(code), token, cookieOptions())
}

export function isModerator(event: H3Event, room: RoomRecord): boolean {
  const token = getCookie(event, moderatorCookieName(room.code))
  return Boolean(token && hashToken(token) === room.ownerTokenHash)
}
