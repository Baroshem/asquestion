import { randomUUID } from 'node:crypto'
import { createError } from 'h3'
import type { Question, Room, RoomState } from '../../shared/types'
import { hashToken, randomToken } from '../utils/auth'

export interface RoomRecord extends Room {
  ownerTokenHash: string
}

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const roomPrefix = (code: string) => `rooms:${code}`
const roomKey = (code: string) => `${roomPrefix(code)}:record`
const questionIndexKey = (code: string) => `${roomPrefix(code)}:questions`
const questionKey = (code: string, id: string) => `${roomPrefix(code)}:question:${id}`
const votePrefix = (code: string, id: string) => `${roomPrefix(code)}:votes:${id}:`

export async function getRoom(code: string): Promise<RoomRecord> {
  const room = await useStorage('data').getItem<RoomRecord>(roomKey(code))
  if (!room) throw createError({ statusCode: 404, statusMessage: 'Room not found' })
  return room
}

export async function createRoom(name: string): Promise<{ room: RoomRecord, moderatorToken: string }> {
  const storage = useStorage('data')
  let code = ''
  for (let attempt = 0; attempt < 8; attempt++) {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
    if (!await storage.hasItem(roomKey(code))) break
    code = ''
  }
  if (!code) throw createError({ statusCode: 503, statusMessage: 'Could not allocate a room code. Try again.' })

  const moderatorToken = randomToken()
  const room: RoomRecord = {
    id: randomUUID(),
    code,
    name,
    ownerTokenHash: hashToken(moderatorToken),
    activeQuestionId: null,
    isOpen: true,
    createdAt: new Date().toISOString(),
  }
  await storage.setItem(roomKey(code), room)
  await storage.setItem(questionIndexKey(code), [] as string[])
  return { room, moderatorToken }
}

export async function getQuestions(code: string): Promise<Question[]> {
  const storage = useStorage('data')
  const ids = await storage.getItem<string[]>(questionIndexKey(code)) ?? []
  const questions = await Promise.all(ids.map(async (id) => {
    const question = await storage.getItem<Omit<Question, 'voteCount'>>(questionKey(code, id))
    if (!question) return null
    const voteKeys = await storage.getKeys(votePrefix(code, id))
    return { ...question, voteCount: voteKeys.length } satisfies Question
  }))
  return questions.filter((question): question is Question => question !== null)
}

export async function getQuestion(code: string, id: string): Promise<Question | null> {
  const storage = useStorage('data')
  const question = await storage.getItem<Omit<Question, 'voteCount'>>(questionKey(code, id))
  if (!question) return null
  const voteKeys = await storage.getKeys(votePrefix(code, id))
  return { ...question, voteCount: voteKeys.length }
}

export async function getRoomState(code: string, identity: string, moderator: boolean): Promise<RoomState> {
  const room = await getRoom(code)
  const questions = await getQuestions(code)
  const storage = useStorage('data')
  const votedQuestionIds: string[] = []
  if (identity) {
    for (const question of questions) {
      if (await storage.hasItem(`${votePrefix(code, question.id)}${identity}`)) votedQuestionIds.push(question.id)
    }
  }
  const { ownerTokenHash: _secret, ...publicRoom } = room
  return { room: publicRoom, questions, isModerator: moderator, votedQuestionIds }
}

export async function addQuestion(code: string, identity: string, content: string): Promise<Question> {
  const storage = useStorage('data')
  const room = await getRoom(code)
  if (!room.isOpen) throw createError({ statusCode: 409, statusMessage: 'This room is closed' })
  const id = randomUUID()
  const question: Omit<Question, 'voteCount'> = {
    id,
    roomId: room.id,
    authorId: identity,
    content,
    createdAt: new Date().toISOString(),
  }
  const ids = await storage.getItem<string[]>(questionIndexKey(code)) ?? []
  await storage.setItem(questionKey(code, id), question)
  await storage.setItem(questionIndexKey(code), [...ids, id])
  return { ...question, voteCount: 0 }
}

export async function addVote(code: string, questionId: string, identity: string): Promise<Question> {
  const room = await getRoom(code)
  if (!room.isOpen) throw createError({ statusCode: 409, statusMessage: 'This room is closed' })
  const question = await getQuestion(code, questionId)
  if (!question) throw createError({ statusCode: 404, statusMessage: 'Question not found' })
  const storage = useStorage('data')
  const voteKey = `${votePrefix(code, questionId)}${identity}`
  if (!await storage.hasItem(voteKey)) await storage.setItem(voteKey, '1')
  return (await getQuestion(code, questionId))!
}

export async function deleteQuestion(code: string, questionId: string): Promise<void> {
  const storage = useStorage('data')
  const room = await getRoom(code)
  const indexKey = questionIndexKey(code)
  const ids = await storage.getItem<string[]>(indexKey) ?? []
  if (!ids.includes(questionId)) throw createError({ statusCode: 404, statusMessage: 'Question not found' })
  await storage.removeItem(questionKey(code, questionId))
  await storage.setItem(indexKey, ids.filter(id => id !== questionId))
  for (const key of await storage.getKeys(votePrefix(code, questionId))) await storage.removeItem(key)
  if (room.activeQuestionId === questionId) {
    room.activeQuestionId = null
    await storage.setItem(roomKey(code), room)
  }
}

export async function selectQuestion(code: string, questionId: string | null): Promise<Question | null> {
  const storage = useStorage('data')
  const room = await getRoom(code)
  if (questionId && !await storage.hasItem(questionKey(code, questionId))) {
    throw createError({ statusCode: 404, statusMessage: 'Question not found' })
  }
  room.activeQuestionId = questionId
  await storage.setItem(roomKey(code), room)
  return questionId ? getQuestion(code, questionId) : null
}

export async function closeRoom(code: string): Promise<void> {
  const storage = useStorage('data')
  const room = await getRoom(code)
  room.isOpen = false
  await storage.setItem(roomKey(code), room)
}
