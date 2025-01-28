import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'
import { getKV } from './lib/getKV.js'
import { scroll } from './lib/scroll.js'

export const onRequestGet: PagesFunction<
 Env
> = async (context) => {
 const url = new URL(context.request.url)
 const channel = url.searchParams.get('channel')
 const hourId = url.searchParams.get('hour')

 if (typeof channel !== 'string') {
  return new Response(
   'missing channel parameter',
   { status: 400 }
  )
 }

 if (channel.length > 250) {
  return new Response(
   'channel parameter must be 250 characters or less',
   { status: 400 }
  )
 }

 if (channel !== channel.trim()) {
  return new Response(
   'channel parameter must not start or end with space',
   { status: 400 }
  )
 }

 if (typeof hourId !== 'string') {
  return new Response(
   'missing hour parameter',
   { status: 400 }
  )
 }

 const hour = parseInt(hourId)

 if (hour < 0 || hour.toString(10) !== hourId) {
  return new Response(
   'hour parameter must be a non-negative integer',
   { status: 400 }
  )
 }

 const kv = await getKV(context)

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

 async function scrollSeek() {
  try {
   const data = await scroll(kv)
    .channel(channel)
    .seek()
   if (
    Object.keys(data.messages).length === 0
   ) {
    await scroll(kv).channel(channel).remove()
   }
  } catch (e) {
   return {
    error: e.message ?? 'unknown error',
   }
  }
 }

 return new Response(
  JSON.stringify({
   response: await scrollSeek(),
  }),
  {
   headers: {
    'Content-Type': 'application/json',
   },
  }
 )
}
