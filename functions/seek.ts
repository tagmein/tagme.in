import {
 type KVNamespace,
 type PagesFunction,
} from '@cloudflare/workers-types'
import { civilMemoryKV } from '@tagmein/civil-memory'

interface Env {
 TAGMEIN_KV: KVNamespace
}

export const onRequestGet: PagesFunction<
 Env
> = async (context) => {
 const kv = civilMemoryKV.cloudflare({
  binding: context.env.TAGMEIN_KV,
 })

 const url = new URL(context.request.url)
 const channel = url.searchParams.get('channel')
 const hourId = url.searchParams.get('hour')

 if (typeof channel !== 'string') {
  return new Response(
   'missing channel parameter',
   { status: 400 }
  )
 }

 if (channel.length > 25) {
  return new Response(
   'channel parameter must be 25 characters or less',
   { status: 400 }
  )
 }

 if (channel !== channel.trim()) {
  return new Response(
   'channel parameter must not start or end with space',
   { status: 400 }
  )
 }

 if (typeof hourId !== 'string') {
  return new Response(
   'missing hour parameter',
   { status: 400 }
  )
 }

 const hour = parseInt(hourId)

 if (hour < 0 || hour.toString(10) !== hourId) {
  return new Response(
   'hour parameter must be a non-negative integer',
   { status: 400 }
  )
 }

 const channelId = encodeURIComponent(channel)

 const key = {
  channelMostRecentHour: `channel_recent_hour#${channelId}`,
  hourChannelMessage: `hour_channel_message#${hourId}_${channelId}`,
  hourChannelTopMessages: `hour_channel_top_messages#${hourId}_${channelId}`,
  hourTopChannels: `hour_top_channels#${hourId}`,
 }

 const namespace = channel.includes(':')
  ? channel.substring(0, channel.indexOf(':'))
  : undefined

 const namespaceKeyPrefix = namespace
  ? `[${encodeURIComponent(namespace)}]`
  : ''

 const [
  message,
  topMessages,
  topChannels,
  mostRecentHour,
 ] = await Promise.all([
  kv.get(key.hourChannelMessage),
  kv.get(key.hourChannelTopMessages),
  kv.get(
   namespaceKeyPrefix + key.hourTopChannels
  ),
  kv.get(key.channelMostRecentHour),
 ])

 const messageObject = message
  ? {
     text: message,
     votes: parseInt(
      await kv.get(
       `message_votes#${encodeURIComponent(
        message
       )}`
      )
     ),
    }
  : undefined

 return new Response(
  JSON.stringify({
   channel,
   hour,
   mostRecentHour,
   now: Date.now(),
   message: messageObject,
   topChannels: topChannels
    ? JSON.parse(topChannels)
    : {},
   topMessages: topMessages
    ? JSON.parse(topMessages)
    : {},
  }),
  {
   headers: {
    'Content-Type': 'application/json',
   },
  }
 )
}
