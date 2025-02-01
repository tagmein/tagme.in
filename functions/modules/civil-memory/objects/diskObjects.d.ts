import type {
 createReadStream,
 createWriteStream,
} from 'node:fs'
import type {
 mkdir,
 stat,
 unlink,
} from 'node:fs/promises'
import type { join } from 'node:path'
import { CivilMemoryObjects } from '../index.js'
export interface CivilMemoryDiskObjectsOptions {
 rootDir: string
 fs: {
  createReadStream: typeof createReadStream
  createWriteStream: typeof createWriteStream
 }
 fsPromises: {
  mkdir: typeof mkdir
  stat: typeof stat
  unlink: typeof unlink
 }
 path: {
  join: typeof join
 }
}
export declare function diskObjects({
 rootDir,
 fs,
 fsPromises,
 path,
}: CivilMemoryDiskObjectsOptions): CivilMemoryObjects
