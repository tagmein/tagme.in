import type { PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env'
import { getKV } from './lib/getKV'
import { scroll } from './lib/scroll'

const MAX_CHANNEL_LENGTH = 250
const MIN_MESSAGE_LENGTH = 5
const MAX_MESSAGE_LENGTH = 150

interface PostBody {
 channel: string
 message: string
 velocity: number
}

async function validateRequestBody(
 request: Request
): Promise<{ error?: string; data: PostBody }> {
 try {
  const data: PostBody = await request.json()
  if (!data || typeof data !== 'object') {
   throw new Error('missing data')
  }

  if (typeof data.message !== 'string') {
   return {
    error: 'message must be a string',
    data,
   }
  }

  if (data.message !== data.message.trim()) {
   return {
    error:
     'message must not start or end with space',
    data,
   }
  }

  if (typeof data.channel !== 'string') {
   return {
    error: 'channel must be a string',
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

  if (
   data.message.length > MAX_MESSAGE_LENGTH
  ) {
   return {
    error: `message must be ${MAX_MESSAGE_LENGTH} characters or less`,
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

  if (data.channel !== data.channel.trim()) {
   return {
    error:
     'channel must not start or end with space',
    data,
   }
  }

  if (typeof data.velocity !== 'number') {
   return {
    error: 'velocity must be a number',
    data,
   }
  }

  if (
   isNaN(data.velocity) ||
   data.velocity < -10 ||
   data.velocity > 10
  ) {
   return {
    error:
     'velocity must be in the range -10..10',
    data,
   }
  }

  return { data }
 } catch (e) {
  return {
   error:
    'unable to parse incoming JSON post body',
   data: {
    channel: '',
    message: '',
    velocity: 0,
   },
  }
 }
}

export const onRequestPost: PagesFunction<Env> =
 async function (context) {
  const {
   error,
   data: { message, channel, velocity },
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
   await scroll(kv, context.env.AI)
    .channel(channel)
    .send(message, velocity)
  } catch (error) {
   return new Response(error.message, {
    status: 400,
   })
  }

  // we voted for the message and sent it to the channel
  return new Response('sent')
 }
