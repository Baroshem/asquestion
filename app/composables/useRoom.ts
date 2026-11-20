import type { ClientEvent, Question, RoomState, ServerEvent } from '../../shared/types'

export function useRoom(code: string) {
  const state = useState<RoomState | null>(`room:${code}`, () => null)
  const connected = useState<boolean>(`room:${code}:connected`, () => false)
  const loading = useState<boolean>(`room:${code}:loading`, () => true)
  const toast = useToast()
  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let attempts = 0
  let stopped = false
  let pendingVote: string | null = null

  function notifyError(message: string) {
    toast.add({ title: 'Something went wrong', description: message, color: 'error' })
  }

  function applyEvent(event: ServerEvent) {
    if (!state.value) return
    switch (event.type) {
      case 'room:state':
        state.value = event.state
        pendingVote = null
        break
      case 'question:created':
        state.value.questions = [event.question, ...state.value.questions.filter(q => q.id !== event.question.id)]
        break
      case 'question:updated':
        state.value.questions = state.value.questions.map(question => question.id === event.question.id ? event.question : question)
        if (pendingVote === event.question.id) {
          state.value.votedQuestionIds = [...new Set([...state.value.votedQuestionIds, event.question.id])]
          pendingVote = null
        }
        break
      case 'question:deleted':
        state.value.questions = state.value.questions.filter(question => question.id !== event.questionId)
        state.value.votedQuestionIds = state.value.votedQuestionIds.filter(id => id !== event.questionId)
        if (state.value.room.activeQuestionId === event.questionId) state.value.room.activeQuestionId = null
        break
      case 'question:selected':
        state.value.room.activeQuestionId = event.question?.id ?? null
        break
      case 'room:closed':
        state.value.room.isOpen = false
        break
      case 'error':
        if (pendingVote) {
          const question = state.value.questions.find(item => item.id === pendingVote)
          if (question) question.voteCount = Math.max(0, question.voteCount - 1)
          state.value.votedQuestionIds = state.value.votedQuestionIds.filter(id => id !== pendingVote)
          pendingVote = null
        }
        notifyError(event.message)
        break
    }
  }

  function send(event: ClientEvent): boolean {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      notifyError('The live connection is reconnecting. Please try again.')
      return false
    }
    socket.send(JSON.stringify(event))
    return true
  }

  function connect() {
    if (stopped || !import.meta.client) return
    const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    socket = new WebSocket(`${scheme}//${window.location.host}/api/ws?code=${encodeURIComponent(code)}`)
    socket.onopen = () => {
      attempts = 0
      connected.value = true
    }
    socket.onmessage = (message) => {
      try {
        applyEvent(JSON.parse(String(message.data)) as ServerEvent)
      } catch {
        notifyError('Received an unreadable update from the server.')
      }
    }
    socket.onerror = () => socket?.close()
    socket.onclose = () => {
      connected.value = false
      if (!stopped) {
        attempts++
        reconnectTimer = setTimeout(connect, Math.min(1000 * 2 ** Math.min(attempts, 5), 10_000))
      }
    }
  }

  async function load() {
    loading.value = true
    try {
      state.value = await $fetch<RoomState>(`/api/rooms/${encodeURIComponent(code)}`)
      connect()
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'statusMessage' in error
        ? String(error.statusMessage)
        : 'Could not load this room.'
      notifyError(message)
      throw error
    } finally {
      loading.value = false
    }
  }

  function vote(question: Question) {
    if (!state.value || state.value.votedQuestionIds.includes(question.id) || pendingVote) return
    pendingVote = question.id
    state.value.votedQuestionIds.push(question.id)
    question.voteCount++
    if (!send({ type: 'question:vote', questionId: question.id })) {
      question.voteCount--
      state.value.votedQuestionIds = state.value.votedQuestionIds.filter(id => id !== question.id)
      pendingVote = null
    }
  }

  function destroy() {
    stopped = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    socket?.close()
  }

  onScopeDispose(destroy)

  return { state, connected, loading, load, send, vote }
}
