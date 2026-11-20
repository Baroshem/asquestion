export interface Room {
  id: string
  code: string
  name: string
  activeQuestionId: string | null
  isOpen: boolean
  createdAt: string
}

export interface Question {
  id: string
  roomId: string
  authorId: string
  content: string
  createdAt: string
  voteCount: number
}

export interface RoomState {
  room: Room
  questions: Question[]
  isModerator: boolean
  votedQuestionIds: string[]
}

export type ClientEvent =
  | { type: 'room:join'; roomCode: string }
  | { type: 'question:create'; content: string }
  | { type: 'question:vote'; questionId: string }
  | { type: 'question:select'; questionId: string | null }
  | { type: 'question:delete'; questionId: string }
  | { type: 'room:close' }

export type ServerEvent =
  | { type: 'room:state'; state: RoomState }
  | { type: 'question:created'; question: Question }
  | { type: 'question:updated'; question: Question }
  | { type: 'question:deleted'; questionId: string }
  | { type: 'question:selected'; question: Question | null }
  | { type: 'room:closed' }
  | { type: 'error'; message: string }
