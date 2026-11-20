// https://nuxt.com/docs/api/configuration/nuxt-config
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
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      },
    },
  },
})
