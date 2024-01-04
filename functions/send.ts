import type {
 KVNamespace,
 PagesFunction,
} from '@cloudflare/workers-types'
import { civilMemoryKV } from '@tagmein/civil-memory'

import { getHourNumber } from './lib/getHourNumber'
import { voteForMessage } from './lib/voteForMessage'
import { channelActive } from './lib/channelActive'

const RANKED_HISTORY_ITEM_COUNT = 250
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

  const key = {
   hourChannelMessage: `hour_channel_message#${hourId}_${channelId}`,
   hourChannelTopMessages: `hour_channel_top_messages#${hourId}_${channelId}`,
  }

  const newMessageVotesCount =
   await voteForMessage(
    kv,
    messageId,
    hourId,
    hour
   )

  // Update the total ranking for the hour channel messages
  let hourChannelTopMessages:
   | string
   | Record<string, number> =
   (await kv.get(key.hourChannelTopMessages)) ||
   '{}'
  hourChannelTopMessages = JSON.parse(
   hourChannelTopMessages
  )
  hourChannelTopMessages[message] =
   newMessageVotesCount

  if (
   Object.keys(hourChannelTopMessages).length >
   RANKED_HISTORY_ITEM_COUNT
  ) {
   // Sort and keep top RANKED_HISTORY_ITEM_COUNT
   hourChannelTopMessages = Object.fromEntries(
    Object.entries(hourChannelTopMessages)
     .sort((a, b) => b[1] - a[1])
     .slice(0, RANKED_HISTORY_ITEM_COUNT)
   )
  }

  await kv.set(
   key.hourChannelTopMessages,
   JSON.stringify(hourChannelTopMessages)
  )

  await channelActive(
   kv,
   channel,
   hour,
   channelId,
   hourId
  )

  // Check if channel's message has already been posted this hour
  const existingChannelHourMessage =
   await kv.get(key.hourChannelMessage)
  if (existingChannelHourMessage) {
   // we voted for the message, but we didn't send it to the channel
   return new Response('voted')
  }

  // send the message to the channel for this hour
  await kv.set(key.hourChannelMessage, message)

  // we voted for the message and sent it to the channel
  return new Response('sent')
 }
