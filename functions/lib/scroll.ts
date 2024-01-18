import { CivilMemoryKV } from '@tagmein/civil-memory'
import { getHourNumber } from './getHourNumber'

const RANKED_HISTORY_ITEM_COUNT = 1000
const ONE_HOUR_MS = 60 * 60 * 1000

interface MessageData {
 position: number
 timestamp: number
 velocity: number
}

export function scroll(kv: CivilMemoryKV) {
 const timestamp = Date.now()
 const hour = getHourNumber()
 const kHour = Math.floor(hour / 1e3)
 const mHour = Math.floor(kHour / 1e3)
 function channel(channelName: string) {
  const channelId =
   encodeURIComponent(channelName)
  const namespace = channelName.includes(':')
   ? channelName.split(':', 2)[0]
   : undefined
  const namespaceId =
   typeof namespace === 'string'
    ? encodeURIComponent(namespace)
    : undefined
  const key = {
   channelActivityKH: `scroll.channel.activity.kh:${channelId}#${kHour}`,
   channelActivityMH: `scroll.channel.activity.mh:${channelId}#${mHour}`,
   channelMessages: `scroll.channel.messages:${channelId}#now`,
   channelMessagesHour: `scroll.channel.messages.hour:${channelId}#${hour}`,
   channelRank:
    typeof namespaceId === 'string'
     ? `scroll.channel.rank@${namespaceId}#now`
     : `scroll.channel.rank#now`,
   channelRankHour:
    typeof namespaceId === 'string'
     ? `scroll.channel.rank.hour@${namespaceId}#${hour}`
     : `scroll.channel.rank.hour#${hour}`,
  }
  async function storeChannelRank(
   channelScore: number
  ) {
   const existingChannelRankString =
    await kv.get(key.channelRank)
   let existingChannelRank: {
    [key: string]: number
   } = existingChannelRankString
    ? JSON.parse(existingChannelRankString)
    : {}
   existingChannelRank[channelName] =
    channelScore

   if (
    Object.keys(existingChannelRank).length >
    RANKED_HISTORY_ITEM_COUNT
   ) {
    // Sort and keep top RANKED_HISTORY_ITEM_COUNT
    existingChannelRank = Object.fromEntries(
     Object.entries(existingChannelRank)
      .sort((a, b) => b[1] - a[1])
      .slice(0, RANKED_HISTORY_ITEM_COUNT)
    )
   }
   const newChannelRankString = JSON.stringify(
    existingChannelRank
   )
   await Promise.all([
    kv.set(
     key.channelRank,
     newChannelRankString
    ),
    kv.set(
     key.channelRankHour,
     newChannelRankString
    ),
   ])
  }
  async function activeKH() {
   const existingKHString = await kv.get(
    key.channelActivityKH
   )
   const existingKH: number[] = existingKHString
    ? JSON.parse(existingKHString)
    : []
   if (!existingKH.includes(hour)) {
    existingKH.push(hour)
    await kv.set(
     key.channelActivityKH,
     JSON.stringify(existingKH)
    )
   }
  }
  async function activeMH() {
   const existingMHString = await kv.get(
    key.channelActivityMH
   )
   const existingMH: number[] = existingMHString
    ? JSON.parse(existingMHString)
    : []
   if (!existingMH.includes(kHour)) {
    existingMH.push(kHour)
    await kv.set(
     key.channelActivityMH,
     JSON.stringify(existingMH)
    )
   }
  }
  async function active() {
   await Promise.all([activeKH(), activeMH()])
  }
  async function rankMessage(
   message: string,
   messageData: MessageData
  ) {
   const existingChannelRankString =
    await kv.get(key.channelMessages)
   let channelMessageRank: {
    [key: string]: MessageData
   } = existingChannelRankString
    ? JSON.parse(existingChannelRankString)
    : {}

   channelMessageRank[message] = messageData

   if (
    Object.keys(channelMessageRank).length >
    RANKED_HISTORY_ITEM_COUNT
   ) {
    // Sort and keep top RANKED_HISTORY_ITEM_COUNT
    channelMessageRank = Object.fromEntries(
     Object.entries(channelMessageRank)
      .sort(
       (a, b) => b[1].position - a[1].position
      )
      .slice(0, RANKED_HISTORY_ITEM_COUNT)
    )
   }

   const newChannelMessageRankString =
    JSON.stringify(channelMessageRank)

   const channelScore = Object.values(
    channelMessageRank
   ).reduce(
    (a: number, b) =>
     a +
     b.position +
     ((timestamp - b.timestamp) * b.velocity) /
      ONE_HOUR_MS,
    0
   )

   await Promise.all([
    kv.set(
     key.channelMessages,
     newChannelMessageRankString
    ),
    kv.set(
     key.channelMessagesHour,
     newChannelMessageRankString
    ),
    active(),
    storeChannelRank(channelScore),
   ])
  }
  async function send(
   message: string,
   velocity: number
  ) {
   const messageId = encodeURIComponent(message)
   const key = {
    messagePosition: `scroll.channel.message:${channelId}#${messageId}`,
   }
   const messageDataString = await kv.get(
    key.messagePosition
   )
   const messageData = messageDataString
    ? JSON.parse(messageDataString)
    : {
       position: 0,
       timestamp,
       velocity: 0,
      }
   const timeDelta =
    timestamp - messageData.timestamp
   const positionDelta =
    (timeDelta * messageData.velocity) /
    ONE_HOUR_MS
   const newMessageData = {
    position:
     messageData.position + positionDelta,
    timestamp,
    velocity,
   }
   await Promise.all([
    kv.set(
     key.messagePosition,
     JSON.stringify(newMessageData)
    ),
    rankMessage(message, newMessageData),
   ])
  }

  async function seekMessages() {
   const messagesString = await kv.get(
    key.channelMessages
   )
   return messagesString
    ? JSON.parse(messagesString)
    : {}
  }

  async function seekChannels() {
   const channelsString = await kv.get(
    key.channelRank
   )
   return channelsString
    ? JSON.parse(channelsString)
    : {}
  }

  async function seek() {
   const [messages, channels] =
    await Promise.all([
     seekMessages(),
     seekChannels(),
    ])
   return { channels, messages }
  }

  return { send, seek }
 }

 return { channel }
}
