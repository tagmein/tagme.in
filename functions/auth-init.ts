import { type PagesFunction } from '@cloudflare/workers-types'
import { civilMemoryKV } from '@tagmein/civil-memory'
import { Env } from './lib/env.js'
import { randomId } from './lib/randomId.js'
import {
 SessionData,
 sessionIsExpired,
} from './lib/session.js'

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

  const initKey = `init#${key}-${id}`
  const initString = await authKV.get(initKey)

  if (!initString) {
   return new Response(
    JSON.stringify({
     error: 'not found',
    }),
    { status: 404 }
   )
  }

  const init = JSON.parse(initString) as {
   created: number
   email: string
  }

  await authKV.delete(initKey)

  const accessToken = '1234'
   .split('')
   .map(randomId)
   .join('')

  const sessionsByEmailKey = `sessions.email#${encodeURIComponent(
   init.email
  )}`

  const existingSessionsString =
   await authKV.get(sessionsByEmailKey)
  const expiredSessionList: SessionData[] = []
  const existingSessionList = (
   existingSessionsString
    ? JSON.parse(existingSessionsString)
    : []
  ).filter((session: SessionData) => {
   if (sessionIsExpired(session)) {
    expiredSessionList.push(session)
    return false // discard the session
   }
   return true // keep the session
  })

  for (const session of expiredSessionList) {
   // delete the expired session
   await authKV.delete(
    `session.accessToken#${session.accessToken}`
   )
  }

  const newSessionData: SessionData = {
   accessToken,
   created: init.created,
   email: init.email,
   id,
  }

  existingSessionList.push(newSessionData)

  await authKV.set(
   sessionsByEmailKey,
   JSON.stringify(existingSessionList)
  )

  const sessionKey = `session.accessToken#${accessToken}`
  await authKV.set(
   sessionKey,
   JSON.stringify(newSessionData)
  )

  return new Response(
   JSON.stringify(newSessionData),
   {
    headers: {
     'Content-Type': 'application/json',
    },
   }
  )
 }
