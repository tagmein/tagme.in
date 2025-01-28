import { CivilMemoryKV } from '@tagmein/civil-memory'
import { getHourNumber } from './getHourNumber.js'

interface MessageData {
 position: number
 timestamp: number
 velocity: number
}

const MESSAGE_NEGATIVE_THRESHOLD = -10
const MESSAGE_PERSIST_THRESHOLD = 5
const NEWS_ITEMS_PER_CHUNK = 100
const ONE_HOUR_MS = 60 * 60 * 1000
const RANKED_HISTORY_ITEM_COUNT = 1000

export function scrollChannel(
 kv: CivilMemoryKV,
 newsKey: {
  newsChunkId: string
  newsChunkById(id: number): string
 },
 getLatestNewsChunkId: () => Promise<number>
) {
 const timestamp = Date.now()
 const hour = getHourNumber()
 const kHour = Math.floor(hour / 1e3)
 const mHour = Math.floor(kHour / 1e3)

 async function getPublishChunk(): Promise<
  [number, string, object[]]
 > {
  const chunkId = await getLatestNewsChunkId()
  const chunkKey =
   newsKey.newsChunkById(chunkId)
  const chunkString = await kv.get(chunkKey)
  const chunkData =
   typeof chunkString === 'string'
    ? JSON.parse(chunkString)
    : []
  if (
   chunkData.length >= NEWS_ITEMS_PER_CHUNK
  ) {
   const newChunkId = chunkId + 1
   await kv.set(
    newsKey.newsChunkId,
    newChunkId.toString(36)
   )
   const newChunkKey =
    newsKey.newsChunkById(newChunkId)
   const newChunkString = await kv.get(
    newChunkKey
   )
   const newChunkData =
    typeof newChunkString === 'string'
     ? JSON.parse(newChunkString)
     : []
   return [
    newChunkId,
    newChunkKey,
    newChunkData,
   ]
  }
  return [chunkId, chunkKey, chunkData]
 }

 return function channel(channelName: string) {
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
  async function removeChannelRank() {
   const existingChannelRankString =
    await kv.get(key.channelRank)
   let existingChannelRank: {
    [key: string]: number
   } = existingChannelRankString
    ? JSON.parse(existingChannelRankString)
    : {}
   delete existingChannelRank[channelName]
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

  async function publishMessageActivity(
   message: string,
   seen: number
  ): Promise<number> {
   const [chunkId, chunkKey, chunkData] =
    await getPublishChunk()
   const messageActivity = {
    channel: channelName,
    message,
    seen,
   }
   chunkData.unshift(messageActivity)
   await kv.set(
    chunkKey,
    JSON.stringify(chunkData)
   )
   return chunkId
  }

  async function remove() {
   await removeChannelRank()
  }

  async function unpublishMessageActivity(
   message: string,
   chunkId: number
  ) {
   const chunkKey =
    newsKey.newsChunkById(chunkId)
   const chunkString = await kv.get(chunkKey)
   const chunkData = (
    typeof chunkString === 'string'
     ? JSON.parse(chunkString)
     : []
   ).filter(
    // remove the message
    (m: Record<string, any>) =>
     m.message !== message
   )
   await kv.set(
    chunkKey,
    JSON.stringify(chunkData)
   )
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
     Math.max(
      0,
      b.position +
       ((timestamp - b.timestamp) *
        b.velocity) /
        ONE_HOUR_MS
     ),
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

  async function unrankMessage(
   message: string
  ) {
   const existingChannelRankString =
    await kv.get(key.channelMessages)
   let channelMessageRank: {
    [key: string]: MessageData
   } = existingChannelRankString
    ? JSON.parse(existingChannelRankString)
    : {}

   delete channelMessageRank[message]

   const newChannelMessageRankString =
    JSON.stringify(channelMessageRank)

   const channelScore = Object.values(
    channelMessageRank
   ).reduce(
    (a: number, b) =>
     a +
     Math.max(
      0,
      b.position +
       ((timestamp - b.timestamp) *
        b.velocity) /
        ONE_HOUR_MS
     ),
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
    newsChunk: messageData.newsChunk,
    position:
     messageData.position + positionDelta,
    seen: messageData.seen ?? Date.now(),
    timestamp,
    velocity,
   }
   if (
    typeof newMessageData.newsChunk !== 'number'
   ) {
    newMessageData.newsChunk =
     await publishMessageActivity(
      message,
      newMessageData.seen
     )
   }
   await Promise.all([
    kv.set(
     key.messagePosition,
     JSON.stringify(newMessageData)
    ),
    rankMessage(message, newMessageData),
   ])
  }

  async function unsend(message: string) {
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
   const currentPosition =
    messageData.position + positionDelta
   if (
    currentPosition < MESSAGE_PERSIST_THRESHOLD
   ) {
    await Promise.all([
     kv.delete(key.messagePosition),
     unrankMessage(message),
     ...(typeof messageData.newsChunk ===
     'number'
      ? [
         unpublishMessageActivity(
          message,
          messageData.newsChunk
         ),
        ]
      : []),
    ])
    return true
   } else {
    throw new Error(
     `Message with score of ${MESSAGE_PERSIST_THRESHOLD} cannot be unsent. Please demote the message first.`
    )
   }
  }

  async function seekMessages() {
   const messagesString = await kv.get(
    key.channelMessages
   )
   return messagesString
    ? excludeOverlyNegativeMessages(
       JSON.parse(messagesString)
      )
    : {}
  }

  function excludeOverlyNegativeMessages(messages: {
   [key: string]: MessageData
  }) {
   return Object.fromEntries(
    Object.entries(messages).filter(
     ([_, messageData]) => {
      const score =
       messageData.position +
       ((timestamp - messageData.timestamp) *
        messageData.velocity) /
        ONE_HOUR_MS
      return score > MESSAGE_NEGATIVE_THRESHOLD
     }
    )
   )
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

  return { remove, send, seek, unsend }
 }
}
