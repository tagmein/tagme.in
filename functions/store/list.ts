import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from '../lib/env.js'
import { getKV } from '../lib/getKV.js'
import { store } from '../lib/store.js'

interface ListBody {
 collectionName: string
 fieldList?: string[]
 skip?: number
 limit?: number
}

async function validateListBody(
 request: Request
): Promise<{ error?: string; data: ListBody }> {
 try {
  const data: ListBody = await request.json()
  if (!data || typeof data !== 'object') {
   throw new Error('missing data')
  }

  if (typeof data.collectionName !== 'string') {
   return {
    error: 'collectionName must be a string',
    data,
   }
  }

  if (
   data.fieldList &&
   !Array.isArray(data.fieldList)
  ) {
   return {
    error:
     'fieldList must be an array of strings',
    data,
   }
  }

  if (
   data.skip &&
   typeof data.skip !== 'number'
  ) {
   return {
    error: 'skip must be a number',
    data,
   }
  }

  if (
   data.limit &&
   typeof data.limit !== 'number'
  ) {
   return {
    error: 'limit must be a number',
    data,
   }
  }

  return { data }
 } catch (e) {
  return {
   error:
    'unable to parse incoming JSON post body',
   data: { collectionName: '' },
  }
 }
}

export const onRequestPost: PagesFunction<
 Env
> = async (context) => {
 const {
  error,
  data: {
   collectionName,
   fieldList,
   skip,
   limit,
  },
 } = await validateListBody(context.request)

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
  const items = await store(kv).list(
   collectionName,
   fieldList,
   skip,
   limit
  )
  return new Response(
   JSON.stringify({ items }),
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
