import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'
import { getKV } from './lib/getKV.js'
import { getLoginRequest } from './lib/loginRequest.js'

interface PostBody {
 id: string
}

async function validateRequestBody(
 request: Request
): Promise<{
 error?: string
 data: PostBody
}> {
 try {
  const data: PostBody = await request.json()
  if (!data || typeof data !== 'object') {
   throw new Error('missing data')
  }

  if (typeof data.id !== 'string') {
   return {
    error: 'id is required',
    data,
   }
  }

  return { data }
 } catch (e) {
  return {
   error:
    'unable to parse incoming JSON post body: ' +
    e.message,
   data: { id: '' },
  }
 }
}

export const onRequestPost: PagesFunction<Env> =
 async function (context) {
  const {
   error,
   data: { id: uniqueId },
  } = await validateRequestBody(context.request)

  if (error) {
   return new Response(error, { status: 400 })
  }

  const kv = await getKV(context)

  const loginRequest = await getLoginRequest(
   kv,
   uniqueId
  )

  if (!loginRequest) {
   return new Response(
    JSON.stringify({
     error: 'log in request not found',
    }),
    {
     status: 404,
    }
   )
  }

  return new Response(
   JSON.stringify({
    success: true,
    loginRequest,
   }),
   {
    headers: {
     'Content-Type': 'application/json',
    },
   }
  )
 }
