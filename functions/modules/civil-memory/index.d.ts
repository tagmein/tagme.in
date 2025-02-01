import { cloudflareKV } from './kv/cloudflareKV.js'
import { diskKV } from './kv/diskKV.js'
import { httpKV } from './kv/httpKV.js'
import { volatileKV } from './kv/volatileKV.js'

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
 volatile: Named<typeof volatileKV, 'volatile'>
}
