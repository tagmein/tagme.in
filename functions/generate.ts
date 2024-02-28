import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'
import { generateMessages } from './lib/generateMessages.js'
import { getKV } from './lib/getKV.js'

const MAX_CHANNEL_LENGTH = 250
const MIN_MESSAGE_LENGTH = 3
const MAX_MESSAGE_LENGTH = 175

interface PostBody {
 channel: string
 message?: string
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

  if (typeof data.message === 'string') {
   if (data.message !== data.message.trim()) {
    return {
     error:
      'message must not start or end with space',
     data,
    }
   }

   if (
    data.message.length > MAX_MESSAGE_LENGTH
   ) {
    return {
     error: `message must be ${MAX_MESSAGE_LENGTH} characters or less`,
     data,
    }
   }

   if (
    data.message.length < MIN_MESSAGE_LENGTH
   ) {
    return {
     error: `message must be at least ${MIN_MESSAGE_LENGTH} characters long`,
     data,
    }
   }
  }

  if (typeof data.channel !== 'string') {
   return {
    error: 'channel must be a string',
    data,
   }
  }

  if (data.channel !== data.channel.trim()) {
   return {
    error:
     'channel must not start or end with space',
    data,
   }
  }

  if (
   data.channel.length > MAX_CHANNEL_LENGTH
  ) {
   return {
    error: `channel must be ${MAX_CHANNEL_LENGTH} characters or less`,
    data,
   }
  }

  return { data }
 } catch (e) {
  return {
   error:
    'unable to parse incoming JSON post body: ' +
    e.message,
   data: {
    channel: '',
   },
  }
 }
}

export const onRequestPost: PagesFunction<Env> =
 async function (context) {
  const {
   error,
   data: { channel, message },
  } = await validateRequestBody(context.request)

  if (error) {
   return new Response(error, { status: 400 })
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

  try {
   return new Response(
    JSON.stringify(
     await generateMessages(
      MAX_MESSAGE_LENGTH,
      context.env.WORKERS_AI_API_TOKEN,
      channel,
      message
     )
    ),
    {
     headers: {
      'Content-Type': 'application/json',
     },
    }
   )
  } catch (error) {
   return new Response(error.message, {
    status: 400,
   })
  }
 }
