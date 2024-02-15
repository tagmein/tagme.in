import { type KVNamespace } from '@cloudflare/workers-types'

export interface Env {
 TAGMEIN_KV: KVNamespace
 TAGMEIN_AUTH_KV: KVNamespace
 TAGMEIN_PRIVATE_KV: KVNamespace
 TAGMEIN_AUTH_LINKEDIN_CLIENT_ID: string
 TAGMEIN_AUTH_LINKEDIN_CLIENT_SECRET: string
 WORKERS_AI_API_TOKEN: string
}
