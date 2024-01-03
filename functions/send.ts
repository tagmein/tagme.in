import type {
 KVNamespace,
 PagesFunction,
} from '@cloudflare/workers-types'
import { civilMemoryKV } from '@tagmein/civil-memory'

import { getHourNumber } from './lib/getHourNumber'
import { voteForMessage } from './lib/vote'

const RANKED_HISTORY_ITEM_COUNT = 250

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
  if (data.message.length > 25) {
   return {
    error:
     'message must be 25 characters or less',
    data,
   }
  }
  if (data.channel.length > 25) {
   return {
    error:
     'channel must be 25 characters or less',
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
   channelMostRecentHour: `channel_recent_hour#${channelId}`,
   channelVotesCount: `channel_votes#${channelId}`,
   hourChannelMessage: `hour_channel_message#${hourId}_${channelId}`,
   hourChannelTopMessages: `hour_channel_top_messages#${hourId}_${channelId}`,
   hourTopChannels: `hour_top_channels#${hourId}`,
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
  const existingChannelVoteCount = await kv.get(
   key.channelVotesCount
  )
  // Update the total vote count for the channel
  const newChannelVoteCount =
   typeof existingChannelVoteCount === 'string'
    ? parseInt(existingChannelVoteCount) + 1
    : hour
  await kv.set(
   key.channelVotesCount,
   newChannelVoteCount.toString(10)
  )

  // Re-rank most popular channels this hour
  let topChannelList:
   | string
   | Record<string, number> =
   (await kv.get(key.hourTopChannels)) || '{}'
  topChannelList = JSON.parse(topChannelList)

  if (!topChannelList[channel]) {
   topChannelList[channel] = hour
  }

  topChannelList[channel]++

  if (
   Object.keys(topChannelList).length >
   RANKED_HISTORY_ITEM_COUNT
  ) {
   // Sort and keep top RANKED_HISTORY_ITEM_COUNT
   topChannelList = Object.fromEntries(
    Object.entries(topChannelList)
     .sort((a, b) => b[1] - a[1])
     .slice(0, RANKED_HISTORY_ITEM_COUNT)
   )
  }

  await kv.set(
   key.hourTopChannels,
   JSON.stringify(topChannelList)
  )

  await kv.set(
   key.channelMostRecentHour,
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
