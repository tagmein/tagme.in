import type { PagesFunction } from '@cloudflare/workers-types'
import { civilMemoryKV } from '@tagmein/civil-memory'
import { Env } from './lib/env'

interface PostBody {
 id: string
 key: string
}

async function validateRequestBody(
 request: Request
): Promise<{ error?: string; data: PostBody }> {
 try {
  const data: PostBody = await request.json()
  if (!data || typeof data !== 'object') {
   throw new Error('missing data')
  }

  if (typeof data.id !== 'string') {
   return {
    error: 'id must be a string',
    data,
   }
  }
  if (typeof data.key !== 'string') {
   return {
    error: 'key must be a string',
    data,
   }
  }
  return { data }
 } catch (e) {
  return {
   error:
    'unable to parse incoming JSON post body',
   data: {
    id: '',
    key: '',
   },
  }
 }
}

export const onRequestPost: PagesFunction<Env> =
 async function ({ env, request }) {
  const authKV = civilMemoryKV.cloudflare({
   binding: env.TAGMEIN_AUTH_KV,
  })
  const {
   error,
   data: { id, key },
  } = await validateRequestBody(request)

  if (error) {
   return new Response(JSON.stringify(error), {
    status: 400,
   })
  }

  const initString = await authKV.get(
   `init#${key}-${id}`
  )

  if (!initString) {
   if (error) {
    return new Response(
     JSON.stringify({
      error: 'not found',
     }),
     { status: 404 }
    )
   }
  }

  const init = JSON.parse(initString) as {
   created: number
   email: string
  }

  // to do
 }
