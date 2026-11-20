<script setup lang="ts">
import type { Question } from '#shared/types'

const route = useRoute()
const code = computed(() => String(route.params.code).toUpperCase())
const { state, connectionStatus, loading, load, send, vote } = useRoom(code.value)
const draft = ref('')
const sortBy = ref<'popular' | 'newest'>('popular')
const submitting = ref(false)
const sortedQuestions = computed(() => {
  const questions = [...(state.value?.questions ?? [])]
  return questions.sort((a, b) => sortBy.value === 'popular'
    ? b.voteCount - a.voteCount || Date.parse(b.createdAt) - Date.parse(a.createdAt)
    : Date.parse(b.createdAt) - Date.parse(a.createdAt))
})
onMounted(() => load().catch(() => undefined))

async function submitQuestion() {
  const content = draft.value.trim()
  if (!content || content.length > 500) return
  submitting.value = true
  if (send({ type: 'question:create', content })) draft.value = ''
  submitting.value = false
}

async function removeQuestion(question: Question) {
  if (!window.confirm('Remove this question? This cannot be undone.')) return
  send({ type: 'question:delete', questionId: question.id })
}

function closeRoom() {
  if (window.confirm('Close this room? Participants will no longer be able to submit or vote.')) {
    send({ type: 'room:close' })
  }
}
</script>

<template>
  <main class="min-h-screen px-4 py-5 sm:px-6 sm:py-8">
    <div class="mx-auto max-w-3xl">
      <header class="mb-8 flex items-center justify-between gap-3">
        <NuxtLink to="/" class="flex items-center gap-2 text-sm font-semibold text-white">
          <span class="flex size-8 items-center justify-center rounded-lg bg-primary text-white"><UIcon name="i-lucide-message-square-text" class="size-4" /></span>
          asquestion
        </NuxtLink>
        <UBadge :color="connectionStatus === 'connected' ? 'success' : 'neutral'" variant="subtle" class="gap-1.5">
          <span class="size-1.5 rounded-full" :class="connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'polling' ? 'bg-blue-500' : 'bg-gray-400'" />
          {{ connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'polling' ? 'Live · polling' : 'Connecting' }}
        </UBadge>
      </header>

      <template v-if="loading">
        <USkeleton class="mb-4 h-10 w-2/3" />
        <USkeleton class="mb-8 h-5 w-1/3" />
        <USkeleton class="mb-3 h-28 w-full" />
        <USkeleton class="h-28 w-full" />
      </template>
      <template v-else-if="state">
        <section class="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div class="mb-2 flex flex-wrap items-center gap-2">
              <h1 class="text-3xl font-semibold tracking-tight text-white">{{ state.room.name }}</h1>
              <UBadge :color="state.room.isOpen ? 'success' : 'neutral'" variant="subtle">{{ state.room.isOpen ? 'Open' : 'Closed' }}</UBadge>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span>Room code <strong class="font-mono tracking-widest text-white">{{ state.room.code }}</strong></span>
            </div>
          </div>
          <div v-if="state.isModerator" class="flex flex-wrap gap-2">
            <UButton :to="`/room/${code}/preview`" target="_blank" color="neutral" variant="outline" size="sm"><UIcon name="i-lucide-presentation" class="size-4" /> Presentation</UButton>
            <UButton v-if="state.room.isOpen" color="error" variant="ghost" size="sm" @click="closeRoom">Close room</UButton>
          </div>
        </section>

        <UCard v-if="state.room.isOpen" class="mb-6">
          <form @submit.prevent="submitQuestion">
            <label for="question" class="mb-2 block text-sm font-medium">Ask a question</label>
            <UTextarea id="question" v-model="draft" :rows="3" :maxlength="500" autoresize placeholder="What would you like to ask?" class="w-full" />
            <div class="mt-3 flex items-center justify-between gap-3">
              <span class="text-xs text-gray-500">{{ draft.length }}/500</span>
              <UButton type="submit" :disabled="!draft.trim() || submitting" :loading="submitting">Submit question <UIcon name="i-lucide-arrow-up-right" class="size-4" /></UButton>
            </div>
          </form>
        </UCard>
        <UAlert v-else color="neutral" variant="subtle" title="This room is closed" description="You can still read the questions, but new questions and votes are disabled." class="mb-6" />

        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold">Questions <span class="ml-1 text-sm font-normal text-gray-500">{{ state.questions.length }}</span></h2>
          <div class="flex rounded-lg border border-gray-200 bg-white p-1">
            <UButton size="xs" :color="sortBy === 'popular' ? 'primary' : 'neutral'" :variant="sortBy === 'popular' ? 'solid' : 'ghost'" @click="sortBy = 'popular'">Most popular</UButton>
            <UButton size="xs" :color="sortBy === 'newest' ? 'primary' : 'neutral'" :variant="sortBy === 'newest' ? 'solid' : 'ghost'" @click="sortBy = 'newest'">Newest</UButton>
          </div>
        </div>

        <div v-if="sortedQuestions.length" class="space-y-3">
          <UCard v-for="question in sortedQuestions" :key="question.id" class="transition-colors" :class="question.id === state.room.activeQuestionId ? 'border-primary/50 bg-primary/2' : ''">
            <div class="flex items-start gap-3 sm:gap-4">
              <UButton
                class="mt-0.5 min-w-12 flex-col gap-0.5 px-2 py-2"
                size="sm"
                :color="state.votedQuestionIds.includes(question.id) ? 'primary' : 'neutral'"
                :variant="state.votedQuestionIds.includes(question.id) ? 'subtle' : 'outline'"
                :disabled="!state.room.isOpen || state.votedQuestionIds.includes(question.id)"
                :aria-label="`Upvote, ${question.voteCount} votes`"
                @click="vote(question)"
              >
                <UIcon name="i-lucide-chevron-up" class="size-4" />
                <span class="text-xs font-semibold">{{ question.voteCount }}</span>
              </UButton>
              <div class="min-w-0 flex-1">
                <p class="whitespace-pre-wrap wrap-break-word leading-6 text-white">{{ question.content }}</p>
                <p class="mt-3 text-xs text-gray-500">{{ new Date(question.createdAt).toLocaleString() }}</p>
              </div>
              <div v-if="state.isModerator" class="flex shrink-0 flex-col gap-1 sm:flex-row">
                <UButton
                  size="xs"
                  :color="question.id === state.room.activeQuestionId ? 'success' : 'primary'"
                  :variant="question.id === state.room.activeQuestionId ? 'subtle' : 'ghost'"
                  :aria-label="question.id === state.room.activeQuestionId ? 'Question is on screen' : 'Present question'"
                  :disabled="question.id === state.room.activeQuestionId"
                  @click="send({ type: 'question:select', questionId: question.id })"
                >
                  <UIcon :name="question.id === state.room.activeQuestionId ? 'i-lucide-monitor-check' : 'i-lucide-monitor-up'" class="size-4" />
                  <span>{{ question.id === state.room.activeQuestionId ? 'On screen' : 'Present' }}</span>
                </UButton>
                <UButton v-if="question.id === state.room.activeQuestionId" size="xs" color="neutral" variant="outline" aria-label="Clear active question" @click="send({ type: 'question:select', questionId: null })">Clear</UButton>
                <UButton size="xs" color="error" variant="ghost" aria-label="Remove question" @click="removeQuestion(question)"><UIcon name="i-lucide-trash-2" class="size-4" /></UButton>
              </div>
            </div>
          </UCard>
        </div>
        <UCard v-else class="border-dashed text-center">
          <div class="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-gray-100 text-gray-500"><UIcon name="i-lucide-message-circle" class="size-5" /></div>
          <p class="font-medium">No questions yet</p>
          <p class="mt-1 text-sm text-gray-500">Be the first to start the conversation.</p>
        </UCard>
      </template>
    </div>
  </main>
</template>
