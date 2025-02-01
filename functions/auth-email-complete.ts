import { type PagesFunction } from '@cloudflare/workers-types'
import { civilMemoryKV } from './modules/civil-memory/index.js'
import { Env } from './lib/env.js'
import { getKV } from './lib/getKV.js'
import { deleteLoginRequest } from './lib/loginRequest.js'
import { randomId } from './lib/randomId.js'

interface PostBody {
 id: string
 sessionId: string
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

  if (typeof data.sessionId !== 'string') {
   return {
    error: 'sessionId is required',
    data,
   }
  }

  return { data }
 } catch (e) {
  return {
   error:
    'unable to parse incoming JSON post body: ' +
    e.message,
   data: { id: '', sessionId: '' },
  }
 }
}

export const onRequestPost: PagesFunction<Env> =
 async function (context) {
  const {
   error,
   data: { id: uniqueId, sessionId },
  } = await validateRequestBody(context.request)

  if (error) {
   return new Response(error, { status: 400 })
  }

  const kv = await getKV(context)

  const loginRequest = await deleteLoginRequest(
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

  const authKV = context.env.TAGMEIN_LOCAL_KV
   ? civilMemoryKV.http({
      baseUrl:
       'http://localhost:3333?mode=disk&modeOptions.disk.basePath=./.kv-auth',
     })
   : civilMemoryKV.cloudflare({
      binding: context.env.TAGMEIN_AUTH_KV,
     })

  const key = randomId()

  await authKV.set(
   `init#${key}-${sessionId}`,
   JSON.stringify({
    created: Date.now(),
    email: loginRequest.email,
   })
  )

  return new Response(
   JSON.stringify({
    success: true,
    loginRequest,
    key,
   }),
   {
    headers: {
     'Content-Type': 'application/json',
    },
   }
  )
 }
