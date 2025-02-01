import { cloudflareKV } from './kv/cloudflareKV.js'
import { diskKV } from './kv/diskKV.js'
import { httpKV } from './kv/httpKV.js'
import { vercelKV } from './kv/vercelKV.js'
import { volatileKV } from './kv/volatileKV.js'
import { cloudflareObjects } from './objects/cloudflareObjects.js'
import { diskObjects } from './objects/diskObjects.js'
import { vercelObjects } from './objects/vercelObjects.js'
export interface CivilMemoryKV {
 delete(key: string): Promise<void>
 get(key: string): Promise<string | null>
 set(key: string, value: string): Promise<void>
}
export interface CivilMemoryObjectsObjectInfo {
 createdAt: Date
 key: string
 size: number
}
export interface CivilMemoryObjects {
 delete(key: string): Promise<void>
 get(
  key: string
 ): Promise<null | ReadableStream<Uint8Array>>
 info(
  key: string
 ): Promise<CivilMemoryObjectsObjectInfo>
 put(
  key: string,
  value: ReadableStream<Uint8Array>
 ): Promise<void>
}
type Named<T, N extends string> = T & {
 name: N
}
export declare const civilMemoryKV: {
 cloudflare: Named<
  typeof cloudflareKV,
  'cloudflare'
 >
 disk: Named<typeof diskKV, 'disk'>
 http: Named<typeof httpKV, 'http'>
 vercel: Named<typeof vercelKV, 'vercel'>
 volatile: Named<typeof volatileKV, 'volatile'>
}
export declare const civilMemoryObjects: {
 cloudflare: Named<
  typeof cloudflareObjects,
  'cloudflare'
 >
 disk: Named<typeof diskObjects, 'disk'>
 vercel: Named<typeof vercelObjects, 'vercel'>
}
export {}
