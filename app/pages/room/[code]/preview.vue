<script setup lang="ts">
const route = useRoute()
const code = computed(() => String(route.params.code).toUpperCase())
const { state, connected, loading, load } = useRoom(code.value)
onMounted(() => load().catch(() => undefined))
const activeQuestion = computed(() => state.value?.questions.find(question => question.id === state.value?.room.activeQuestionId) ?? null)
</script>

<template>
  <main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-950 px-6 py-12 text-white sm:px-12 lg:px-20">
    <div class="absolute left-6 top-6 flex items-center gap-2 text-sm text-gray-400 sm:left-10 sm:top-10">
      <span class="size-2 rounded-full" :class="connected ? 'bg-green-400' : 'bg-amber-400'" />
      {{ connected ? 'Live' : 'Reconnecting' }}
    </div>
    <div class="absolute right-6 top-6 font-mono text-sm tracking-[0.25em] text-gray-500 sm:right-10 sm:top-10">{{ state?.room.code }}</div>
    <div class="w-full max-w-6xl text-center">
      <template v-if="loading">
        <USkeleton class="mx-auto mb-8 h-5 w-36 bg-gray-800" />
        <USkeleton class="mx-auto h-28 w-4/5 bg-gray-800" />
      </template>
      <template v-else-if="activeQuestion">
        <p class="mb-8 text-sm font-medium uppercase tracking-[0.3em] text-primary-300 sm:text-base">{{ state?.room.name }} · Question</p>
        <h1 class="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl lg:text-7xl">{{ activeQuestion.content }}</h1>
      </template>
      <template v-else>
        <div class="mx-auto mb-8 flex size-16 items-center justify-center rounded-2xl bg-white/5 text-gray-400 sm:size-20"><UIcon name="i-lucide-messages-square" class="size-8 sm:size-10" /></div>
        <p class="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-gray-500">{{ state?.room.name || 'Live Q&A' }}</p>
        <h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">The next great question<br class="hidden sm:block"> could be yours.</h1>
        <p class="mt-5 text-lg text-gray-400">Submit and upvote questions at <span class="font-semibold text-white">{{ state?.room.code }}</span></p>
      </template>
    </div>
    <div class="absolute bottom-6 left-0 right-0 text-center text-xs tracking-wide text-gray-600">ASQUESTION · LIVE QUESTIONS</div>
  </main>
</template>
