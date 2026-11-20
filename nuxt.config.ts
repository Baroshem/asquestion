// https://nuxt.com/docs/api/configuration/nuxt-config
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  nitro: {
    experimental: {
      websocket: true,
    },
    storage: {
      data: {
        driver: process.env.STORAGE_DRIVER || (process.env.VERCEL ? 'upstash' : 'fs'),
        base: process.env.DATA_DIR || './.data',
        ...(upstashUrl ? { url: upstashUrl } : {}),
        ...(upstashToken ? { token: upstashToken } : {}),
      },
    },
  },
})
