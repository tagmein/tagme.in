import { type KVNamespace } from '@cloudflare/workers-types'

export interface Env {
 TAGMEIN_KV: KVNamespace
 TAGMEIN_AUTH_KV: KVNamespace
 TAGMEIN_PRIVATE_KV: KVNamespace
}
