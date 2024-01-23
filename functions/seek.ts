import {
 type KVNamespace,
 type PagesFunction,
} from '@cloudflare/workers-types'
import { civilMemoryKV } from '@tagmein/civil-memory'
import { scroll } from './lib/scroll'

interface Env {
 TAGMEIN_KV: KVNamespace
}

export const onRequestGet: PagesFunction<
 Env
> = async (context) => {
 const kv = civilMemoryKV.cloudflare({
  binding: context.env.TAGMEIN_KV,
 })

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

 async function scrollSeek() {
  try {
   const data = await scroll(kv)
    .channel(channel)
    .seek()
   return data
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
