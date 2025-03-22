import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from '../lib/env.js'
import { getKV } from '../lib/getKV.js'
import { store } from '../lib/store.js'

interface PatchBody {
 collectionName: string
 id: string
 item: Record<string, any>
}

async function validatePatchBody(
 request: Request
): Promise<{
 error?: string
 data: PatchBody
}> {
 try {
  const data: PatchBody = await request.json()
  if (!data || typeof data !== 'object') {
   throw new Error('missing data')
  }

  if (typeof data.collectionName !== 'string') {
   return {
    error: 'collectionName must be a string',
    data,
   }
  }

  if (typeof data.id !== 'string') {
   return { error: 'id must be a string', data }
  }

  if (typeof data.item !== 'object') {
   return {
    error: 'item must be an object',
    data,
   }
  }

  return { data }
 } catch (e) {
  return {
   error:
    'unable to parse incoming JSON post body',
   data: {
    collectionName: '',
    id: '',
    item: {},
   },
  }
 }
}

export const onRequestPost: PagesFunction<
 Env
> = async (context) => {
 const {
  error,
  data: { collectionName, id, item },
 } = await validatePatchBody(context.request)

 if (error) {
  return new Response(error, { status: 400 })
 }

 const url = new URL(context.request.url)
 const kvUrl = url.searchParams.get('kv')

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
  await store(kv).patch(
   collectionName,
   id,
   item
  )
  return new Response(
   JSON.stringify({ success: true }),
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
