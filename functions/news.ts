import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'
import { getKV } from './lib/getKV.js'
import { scroll } from './lib/scroll.js'

export const onRequestGet: PagesFunction<
 Env
> = async (context) => {
 const url = new URL(context.request.url)
 const chunkId = url.searchParams.get('chunk')
 const kvUrl = url.searchParams.get('kv')
 const includeNewMessages =
  url.searchParams.get('include') === 'new'

 const chunk =
  typeof chunkId === 'string'
   ? parseInt(chunkId, 36)
   : null

 if (
  typeof chunkId === 'string' &&
  (chunk < 0 || chunk.toString(36) !== chunkId)
 ) {
  return new Response(
   'chunk parameter must be a non-negative integer',
   { status: 400 }
  )
 }

 const kv = await getKV(context, true, kvUrl)

 if (!kv) {
  return new Response(
   JSON.stringify({
    error: 'not authorized',
   }),
   {
    headers: {
     'Content-Type': 'application/json',
    },
    status: 401,
   }
  )
 }

 async function scrollNews() {
  try {
   const data = await scroll(kv).news(
    chunk,
    includeNewMessages
   )
   return data
  } catch (e) {
   return JSON.stringify({
    error: e.stack ?? 'unknown error', // todo: remove stack trace
   })
  }
 }

 return new Response(await scrollNews(), {
  headers: {
   'Content-Type': 'application/json',
  },
 })
}
