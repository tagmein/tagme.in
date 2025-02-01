import type {
 mkdir,
 readFile,
 unlink,
 writeFile,
} from 'node:fs/promises'
import type { join } from 'node:path'
import { CivilMemoryKV } from '../index.js'
export interface CivilMemoryDiskKVOptions {
 rootDir: string
 fsPromises: {
  mkdir: typeof mkdir
  readFile: typeof readFile
  unlink: typeof unlink
  writeFile: typeof writeFile
 }
 path: {
  join: typeof join
 }
}
export declare function diskKV({
 rootDir,
 fsPromises,
 path,
}: CivilMemoryDiskKVOptions): CivilMemoryKV
