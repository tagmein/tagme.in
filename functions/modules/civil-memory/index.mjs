'use strict'

import { cloudflareKV } from './kv/cloudflareKV.mjs'
import { httpKV } from './kv/httpKV.mjs'
import { volatileKV } from './kv/volatileKV.mjs'

export const civilMemoryKV = {
 cloudflare: cloudflareKV,
 http: httpKV,
 volatile: volatileKV,
}
