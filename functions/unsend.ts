import type { PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'
import { getKV } from './lib/getKV.js'
import { scroll } from './lib/scroll.js'

const MAX_CHANNEL_LENGTH = 65536
const MIN_MESSAGE_LENGTH = 3
const MAX_MESSAGE_LENGTH = 175
const MAX_SCRIPT_LENGTH = 100000

interface PostBody {
 channel: string
 message: string
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

  const maxLength =
   data.channel === '𝓢'
    ? MAX_SCRIPT_LENGTH
    : MAX_MESSAGE_LENGTH

  if (
   data.message.length < MIN_MESSAGE_LENGTH
  ) {
   return {
    error: `message must be at least ${MIN_MESSAGE_LENGTH} characters long`,
    data,
   }
  }

  if (data.message.length > maxLength) {
   return {
    error: `message must be ${maxLength} characters or less`,
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

  return { data }
 } catch (e) {
  return {
   error:
    'unable to parse incoming JSON post body',
   data: {
    channel: '',
    message: '',
   },
  }
 }
}

export const onRequestPost: PagesFunction<Env> =
 async function (context) {
  const {
   error,
   data: { message, channel },
  } = await validateRequestBody(context.request)

  if (error) {
   return new Response(error, { status: 400 })
  }

  const url = new URL(context.request.url)
  const kvUrl = url.searchParams.get('kv')

  const kv = await getKV(context, true, kvUrl)

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
   await scroll(kv)
    .channel(channel)
    .unsend(message)
  } catch (error) {
   return new Response(error.message, {
    status: 400,
   })
  }

  // we voted for the message and sent it to the channel
  return new Response('sent')
 }
