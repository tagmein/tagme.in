import {
 KVNamespace,
 PagesFunction,
 Response,
 Request,
} from '@cloudflare/workers-types'

import { civilMemoryKV } from '@tagmein/civil-memory'
import { channel } from 'diagnostics_channel'
import { getHourNumber } from './lib/getHourNumber'

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

  // Initialize or update message votes
  const messageVotesCountKey = `message_votes#${messageId}`
  const messageVotesHourKey = `message_voted_hour_${hourId}#${messageId}`
  const existingVoteHour = await kv.get(
   messageVotesHourKey
  )
  // Message was already voted on this hour
  if (existingVoteHour) {
   return new Response('already_voted', {
    status: 409,
   })
  }
  // Claim the vote for this message for this hour
  await kv.set(messageVotesHourKey, '1')
  const existingMessageVoteCount = await kv.get(
   messageVotesCountKey
  )
  // Update the total vote count for the message
  const newMessageVotesCount =
   typeof existingMessageVoteCount === 'string'
    ? parseInt(existingMessageVoteCount) + 1
    : hour
  await kv.set(
   messageVotesCountKey,
   newMessageVotesCount.toString(10)
  )

  // Initialize or update channel vote and message
  const channelVotesCountKey = `channel_votes#${channelId}`
  const channelHourMessageKey = `channel_hour_${hour}#${channelId}`

  // Check if channel's message has already been posted this hour
  const existingChannelHourMessage =
   await kv.get(channelHourMessageKey)

  const topMessages = `top_messages_${channelId}_${hourId}`

  let topMessageList:
   | string
   | Record<string, number> =
   (await kv.get(topMessages)) || '{}'
  topMessageList = JSON.parse(topMessageList)

  if (!topMessageList[messageId]) {
   topMessageList[messageId] = 0
  }

  topMessageList[messageId]++

  if (Object.keys(topMessageList).length > 25) {
   // Sort and keep top 25
   topMessageList = Object.entries(
    topMessageList
   )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .reduce(
     (acc, [message, votes]) => ({
      ...acc,
      [message]: votes,
     }),
     {}
    )
  }

  await kv.set(
   topMessages,
   JSON.stringify(topMessageList)
  )

  if (existingChannelHourMessage) {
   // we voted for the message, but we didn't send it to the channel
   return new Response('voted')
  }

  // send the message to the channel for this hour
  await kv.set(channelHourMessageKey, messageId)

  const existingChannelVoteCount = await kv.get(
   channelVotesCountKey
  )

  // Update the total vote count for the channel
  const newChannelVoteCount =
   typeof existingChannelVoteCount === 'string'
    ? parseInt(existingChannelVoteCount) + 1
    : hour
  await kv.set(
   channelVotesCountKey,
   newChannelVoteCount.toString(10)
  )

  // Re-rank most popular channels this hour
  const topChannelsHourKey = `top_channels_${hourId}`

  let topChannelList:
   | string
   | Record<string, number> =
   (await kv.get(topChannelsHourKey)) || '{}'
  topChannelList = JSON.parse(topChannelList)

  if (!topChannelList[channelId]) {
   topChannelList[channelId] = hour
  }

  topChannelList[channelId]++

  if (Object.keys(topChannelList).length > 25) {
   // Sort and keep top 25
   topChannelList = Object.entries(
    topChannelList
   )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .reduce(
     (acc, [channel, votes]) => ({
      ...acc,
      [channel]: votes,
     }),
     {}
    )
  }

  await kv.set(
   topChannelsHourKey,
   JSON.stringify(topChannelList)
  )

  // we voted for the message and sent it to the channel
  return new Response('sent')
 }
