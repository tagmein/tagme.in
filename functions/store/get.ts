import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from '../lib/env.js'
import { getKV } from '../lib/getKV.js'
import { store } from '../lib/store.js'

export const onRequestGet: PagesFunction<
 Env
> = async (context) => {
 const url = new URL(context.request.url)
 const collectionName = url.searchParams.get(
  'collectionName'
 )
 const id = url.searchParams.get('id')
 const kvUrl = url.searchParams.get('kv')

 if (
  typeof collectionName !== 'string' ||
  typeof id !== 'string'
 ) {
  return new Response(
   'Invalid query parameters',
   { status: 400 }
  )
 }

 const kv = await getKV(context, false, kvUrl)

 if (!kv) {
  return new Response(
   JSON.stringify({ error: 'not authorized' }),
   {
    headers: {
     'Content-Type': 'application/json',
    },
    status: 401,
   }
  )
 }

 try {
  const item = await store(kv).get(
   collectionName,
   id
  )
  return new Response(
   JSON.stringify({ item }),
   {
    headers: {
     'Content-Type': 'application/json',
    },
   }
  )
 } catch (e) {
  return new Response(
   JSON.stringify({
    error: e.message ?? 'unknown error',
   }),
   {
    headers: {
     'Content-Type': 'application/json',
    },
    status: 500,
   }
  )
 }
}
