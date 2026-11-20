# asquestion

A small, self-hostable live Q&A app. Create a room, invite participants with a short code, collect and upvote questions, and put one question on a clean presentation screen. No accounts or external services required.

## Requirements

- Node.js 20.19+ (Node.js 22 recommended)
- pnpm (or npm)

## Local development

```sh
pnpm install
cp .env.example .env
pnpm dev
```

Open <http://localhost:3000>. Room data is written to `.data/`, which is ignored by Git. Nitro serves the API and WebSocket endpoint from the same process.

## Production deployment

Build and run the Nitro Node server:

```sh
pnpm install --frozen-lockfile
pnpm build
mkdir -p .data
NODE_ENV=production NITRO_HOST=0.0.0.0 NITRO_PORT=3000 DATA_DIR=./.data node .output/server/index.mjs
```

Persist `DATA_DIR` across restarts and back it up. HTTPS is recommended in production: moderator and anonymous identity cookies are HTTP-only, SameSite=Lax, and marked Secure when `NODE_ENV=production`.

### Docker Compose

```sh
docker compose up --build -d
```

Compose publishes port 3000 and mounts a named persistent volume at `/app/.data`. Put a TLS-terminating reverse proxy in front of the app for public deployments and forward WebSocket upgrades.

## Storage

All application records use Nitro `useStorage()` with the `data` mount. The default configuration uses Unstorage's filesystem driver at `DATA_DIR` (default `./.data`). Nitro reads this setting when configuration/build runs, so set it in the build environment for a custom production path; Docker builds with `/app/.data`. It can also be adjusted in `nuxt.config.ts` or with environment-specific Nitro configuration. The storage layer uses individual room/question/vote keys and a small question-ID index per room; no direct filesystem APIs or database are used by application logic.

To switch storage, keep the mount name `data` and set `STORAGE_DRIVER` to an Unstorage driver. The default is `fs`; Vercel automatically selects `upstash`. For Vercel, add an Upstash Redis integration and make sure its REST URL and **write-enabled** token are available in the Vercel environment, then redeploy. The app accepts `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, legacy `KV_REST_API_URL` / `KV_REST_API_TOKEN`, or the integration-prefixed `STORAGE_APP_KV_REST_API_URL` / `STORAGE_APP_KV_REST_API_TOKEN`. Do not use the read-only token for this app. Those credentials are read by Unstorage's Upstash driver; they are never sent to the browser. Outside Vercel, you can choose `STORAGE_DRIVER=upstash` and configure the same variables. Filesystem remains the default for local development and single-process self-hosting.

Vote keys are unique per room, question, and anonymous voter, so repeated requests from the same identity do not increase the count. The check/write is not a cross-request transaction; storage drivers without atomic operations cannot guarantee serialization of every concurrent operation. The same-process application and filesystem setup are intended for a single Node process.

## Deployment limits

The supported default is one persistent Node.js process with local persistent storage and an in-memory WebSocket room manager. Filesystem data and in-memory connections are **not shared** across serverless function instances or multiple replicas. Vercel uses shared Upstash storage for records, but this alone does not make the in-memory WebSocket room manager shared or guarantee live updates between function instances. Multi-instance deployments need shared pub/sub/broadcast and an appropriate persistent WebSocket-capable runtime. For the complete real-time experience, use the documented single-process Node/Docker deployment unless that shared realtime infrastructure has been added.

## Security and moderation

There is no registration system. Participants receive an anonymous identity cookie. Room creation generates a cryptographically random moderator token; only its SHA-256 hash is stored, and the token is kept in an HTTP-only cookie scoped by room. Privileged WebSocket actions re-check the token on the server. Incoming actions are validated without Zod, question content is limited to 500 characters, and the WebSocket endpoint checks browser origins and applies a simple per-identity rate limit.

Moderator cookies are browser-local. Keep the browser that created the room if moderator access is needed later. Clearing that cookie means the room cannot be moderated; there is intentionally no account or recovery system.

## Commands

- `pnpm dev` — local development
- `pnpm build` — production build
- `pnpm preview` — preview the production build
- `pnpm lint` — ESLint
- `pnpm typecheck` — Nuxt/TypeScript type check
