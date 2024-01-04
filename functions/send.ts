import type {
 KVNamespace,
 PagesFunction,
} from '@cloudflare/workers-types'
import { civilMemoryKV } from '@tagmein/civil-memory'

import { channelActive } from './lib/channelActive'
import { channelMessage } from './lib/channelMessage'
import { getHourNumber } from './lib/getHourNumber'
import { voteForMessage } from './lib/voteForMessage'

const MAX_CHANNEL_LENGTH = 25
const MAX_MESSAGE_LENGTH = 75

interface Env {
 TAGMEIN_KV: KVNamespace
}

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
  if (typeof data.channel !== 'string') {
   return {
    error: 'channel must be a string',
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
  return { data }
 } catch (e) {
  return {
   error:
    'unable to parse incoming JSON post body',
   data: { channel: '', message: '' },
  }
 }
}

export const onRequestPost: PagesFunction<Env> =
 async function (context) {
  const kv = civilMemoryKV.cloudflare({
   binding: context.env.TAGMEIN_KV,
  })
  const {
   error,
   data: { message, channel },
  } = await validateRequestBody(context.request)

  if (error) {
   return new Response(error, { status: 400 })
  }

  const hour = getHourNumber()
  const hourId = hour.toString(10)
  const channelId = encodeURIComponent(channel)
  const messageId = encodeURIComponent(message)

  const newMessageVotesCount =
   await voteForMessage(
    kv,
    messageId,
    hourId,
    hour
   )

  await Promise.all([
   channelActive(
    kv,
    channel,
    hour,
    channelId,
    hourId
   ),
   channelMessage(
    kv,
    channelId,
    hourId,
    message,
    newMessageVotesCount
   ),
  ])

  // we voted for the message and sent it to the channel
  return new Response('sent')
 }
