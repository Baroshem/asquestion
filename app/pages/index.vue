<script setup lang="ts">
const roomName = ref('')
const roomCode = ref('')
const creating = ref(false)
const joining = ref(false)
const toast = useToast()

async function createRoom() {
  if (!roomName.value.trim()) return
  creating.value = true
  try {
    const result = await $fetch<{ room: { code: string } }>('/api/rooms', {
      method: 'POST',
      body: { name: roomName.value.trim() },
    })
    await navigateTo(`/room/${result.room.code}`)
  } catch (error: unknown) {
    toast.add({ title: 'Could not create room', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' })
  } finally {
    creating.value = false
  }
}

async function joinRoom() {
  const code = roomCode.value.trim().toUpperCase()
  if (!code) return
  joining.value = true
  try {
    await navigateTo(`/room/${encodeURIComponent(code)}`)
  } finally {
    joining.value = false
  }
}
</script>

<template>
  <main class="min-h-screen px-4 py-10 sm:px-6 sm:py-16">
    <div class="mx-auto max-w-5xl">
      <header class="mb-16 flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-white">
          <UIcon name="i-lucide-message-square-text" class="size-5" />
        </div>
        <span class="text-lg font-semibold tracking-tight">asquestion</span>
      </header>

      <section class="mb-12 max-w-2xl">
        <UBadge color="primary" variant="subtle" class="mb-5">Live Q&amp;A, made simple</UBadge>
        <h1 class="text-4xl font-semibold tracking-tight text-white sm:text-6xl">Good questions deserve the spotlight.</h1>
        <p class="mt-5 max-w-xl text-lg leading-8 text-gray-600">Create a room for your event. Let everyone ask and vote, then put the best questions on screen.</p>
      </section>

      <div class="grid gap-5 md:grid-cols-2">
        <UCard class="h-full">
          <div class="mb-7 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-plus" class="size-5" />
          </div>
          <h2 class="text-xl font-semibold">Create a room</h2>
          <p class="mt-2 text-sm text-gray-500">Start a new Q&amp;A for your event.</p>
          <form class="mt-6 space-y-4" @submit.prevent="createRoom">
            <UInput v-model="roomName" size="lg" placeholder="e.g. Product team town hall" aria-label="Room name" maxlength="80" />
            <UButton type="submit" size="lg" block :loading="creating" :disabled="!roomName.trim()">
              Create room <UIcon name="i-lucide-arrow-right" class="ml-1 size-4" />
            </UButton>
          </form>
        </UCard>

        <UCard class="h-full">
          <div class="mb-7 flex size-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
            <UIcon name="i-lucide-log-in" class="size-5" />
          </div>
          <h2 class="text-xl font-semibold">Join a room</h2>
          <p class="mt-2 text-sm text-gray-500">Enter the short code shared by your host.</p>
          <form class="mt-6 space-y-4" @submit.prevent="joinRoom">
            <UInput v-model="roomCode" size="lg" placeholder="Room code" aria-label="Room code" maxlength="12" class="uppercase" />
            <UButton type="submit" size="lg" block color="neutral" variant="outline" :loading="joining" :disabled="!roomCode.trim()">
              Join room <UIcon name="i-lucide-arrow-right" class="ml-1 size-4" />
            </UButton>
          </form>
        </UCard>
      </div>
      <p class="mt-8 text-center text-sm text-gray-500">No accounts. Just a room and a good conversation.</p>
    </div>
  </main>
</template>
