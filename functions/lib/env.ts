import { type KVNamespace } from '@cloudflare/workers-types'

export interface Env {
 DKIM_PRIVATE_KEY: string
 TAGMEIN_AUTH_KV: KVNamespace
 TAGMEIN_KV: KVNamespace
 TAGMEIN_LOCAL_KV_BASEURL?: string
 TAGMEIN_LOCAL_KV: string
 TAGMEIN_PRIVATE_KV: KVNamespace
}
