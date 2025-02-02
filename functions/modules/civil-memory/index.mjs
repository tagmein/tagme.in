'use strict'

import { cloudflareKV } from './kv/cloudflareKV.mjs'
import { httpKV } from './kv/httpKV.mjs'
import { volatileKV } from './kv/volatileKV.mjs'

function keyCompression(kv) {
 return (settings) => {
  const setupKv = kv(settings)
  return {
   get: async (key) =>
    setupKv.get(
     await compressKey(setupKv, key)
    ),
   set: async (key, value) =>
    setupKv.set(
     await compressKey(setupKv, key),
     value
    ),
   delete: async (key) =>
    setupKv.delete(
     await compressKey(setupKv, key)
    ),
  }
 }
}

async function compressKey(kv, key) {
 if (key.length <= 212) {
  return key
 }
 const shard = key.slice(0, 200)
 const remainder = key.slice(200)
 const lookupKey = `lookup#${shard}`
 const lookup = await kv.get(lookupKey)
 let lookupData = {}
 if (
  typeof lookup === 'string' &&
  lookup.length > 4
 ) {
  lookupData = JSON.parse(lookup)
  if (remainder in lookupData) {
   return lookupData[remainder]
  }
 }
 const compressedKey = `shard#[${
  key.length
 };${Date.now()};${Math.random()
  .toString(36)
  .slice(2)}]`
 lookupData[remainder] = compressedKey
 await kv.set(
  lookupKey,
  JSON.stringify(lookupData)
 )
 return compressedKey
}

export const civilMemoryKV = {
 cloudflare: keyCompression(cloudflareKV),
 http: keyCompression(httpKV),
 volatile: keyCompression(volatileKV),
}
