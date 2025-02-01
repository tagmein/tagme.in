import type { KVNamespace } from '@cloudflare/workers-types'
import { CivilMemoryKV } from '../index.js'
export declare function cloudflareKV({
 binding,
}: {
 binding: KVNamespace
}): CivilMemoryKV
