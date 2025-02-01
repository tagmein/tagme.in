import type { R2Bucket } from '@cloudflare/workers-types'
import { CivilMemoryObjects } from '../index.js'
export declare function cloudflareObjects({
 binding,
}: {
 binding: R2Bucket
}): CivilMemoryObjects
