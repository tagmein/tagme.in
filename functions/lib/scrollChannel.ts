import { CivilMemoryKV } from '../modules/civil-memory/index.mjs'
import { getHourNumber } from './getHourNumber.js'

const SCRIPT_PREFIX = '𝓢@'

interface LabelData {
 position: number
 seen: number
 timestamp: number
 velocity: number
}

interface MessageData {
 labels: { [key: string]: LabelData }
 newsChunk: number
 position: number
 replies: {
  count: number
  top: MessageData[]
 }
 seen: number
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
   typeof chunkString === 'string' &&
   chunkString.length > 4
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
   const newChunkString =
    await kv.get(newChunkKey)
   const newChunkData =
    typeof newChunkString === 'string' &&
    newChunkString.length > 4
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
  // console.dir({
  //  channel: 'channel',
  //  channelName,
  //  channelId,
  //  namespace,
  //  namespaceId,
  // })
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
   if (channelName in existingChannelRank) {
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
   try {
    await kv.set(
     chunkKey,
     JSON.stringify(chunkData)
    )
   } catch (error) {
    throw new Error(
     `Error setting chunk data: ${error} ; chunkId: ${chunkId} ; chunkKey: ${chunkKey} ; chunkData: ${JSON.stringify(
      chunkData
     )}`
    )
   }
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
    typeof chunkString === 'string' &&
    chunkString.length > 4
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
    channelName.startsWith('labels@') ||
    channelName.startsWith('replies@') ||
    channelName.startsWith(SCRIPT_PREFIX)
     ? Promise.resolve()
     : storeChannelRank(channelScore),
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
    channelName.startsWith('labels@') ||
    channelName.startsWith('replies@') ||
    channelName.startsWith(SCRIPT_PREFIX)
     ? Promise.resolve()
     : storeChannelRank(channelScore),
   ])
  }

  async function getMessage(message: string) {
   const messageId = encodeURIComponent(
    channelName === '𝓢'
     ? message.slice(0, 100)
     : message
   )
   const key = {
    messagePosition: `scroll.channel.message:${channelId}#${messageId}`,
   }
   const messageDataString = await kv.get(
    key.messagePosition
   )
   const messageData =
    typeof messageDataString === 'string' &&
    messageDataString.length > 4
     ? JSON.parse(messageDataString)
     : {
        position: 0,
        timestamp,
        velocity: 0,
        replies: {
         count: 0,
         top: [],
        },
       }
   return messageData
  }

  async function send(
   message: string,
   velocity: number
  ) {
   const messageData = await getMessage(message)
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
    replies: messageData.replies ?? {
     count: 0,
     top: [],
    },
    labels: convertLabels(
     messageData.labels ?? {}
    ),
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

   function convertLabels(x: {
    [key: string]: MessageData
   }) {
    return Object.fromEntries(
     Object.entries(x)
      .filter((y) => y[0].startsWith('status:'))
      .map(
       ([messageText, messageData]: [
        string,
        MessageData,
       ]): [string, LabelData] => {
        return [
         messageText,
         {
          position: messageData.position,
          seen: messageData.seen,
          timestamp: messageData.timestamp,
          velocity: messageData.velocity,
         },
        ]
       }
      )
    )
   }

   async function updateParentMessageLabels(
    message: string
   ) {
    if (!channelName.startsWith('labels@')) {
     return
    }
    // console.log('updateParentMessageLabels')
    const [parentChannel, parentMessage] =
     channelName
      .substring('labels@'.length)
      .split('#', 2)
      .map(decodeURIComponent)

    const parentChannelId = encodeURIComponent(
     parentChannel
    )
    const parentMessageId = encodeURIComponent(
     parentMessage
    )
    // Fetch the *current* data for the parent message
    const parentMessageData = await channel(
     parentChannel
    ).getMessage(parentMessage)

    // Fetch the *latest* state of all labels for this parent message
    const labelsChannelName = `labels@${parentChannelId}#${parentMessageId}`
    const parentMessageLabels = await channel(
     labelsChannelName
    ).seek() // seek() returns { messages: { [messageText]: MessageData } }

    // console.dir({
    //  channel: `labels@${parentChannelId}#${parentMessageId}`,
    //  parentMessageLabels,
    // })

    // Construct the updated parent message data
    // Keep the original position, timestamp, velocity, replies, newsChunk etc.
    // ONLY update the 'labels' field.
    const newParentMessageData: MessageData = {
     ...parentMessageData, // Keep existing fields like newsChunk, replies
     position: parentMessageData.position, // Keep original position
     seen: Date.now(), // Update seen time to now, indicating label activity
     timestamp: parentMessageData.timestamp, // Keep original timestamp
     velocity: parentMessageData.velocity, // Keep original velocity
     // --- Only update the labels field ---
     labels: convertLabels(
      // convertLabels extracts relevant fields
      parentMessageLabels.messages ?? {}
     ),
    }

    // console.dir(
    //  {
    //   rankMessage: 'RANK',
    //   labelsChannel: `labels@${parentChannelId}#${parentMessageId}`,
    //   parentChannel,
    //   parentMessage,
    //   newParentMessageData,
    //  },
    //  { depth: null }
    // )

    // Re-rank the parent message in its own channel with the updated labels
    await channel(parentChannel).rankMessage(
     parentMessage,
     newParentMessageData
    )

    // console.dir({
    //  message,
    //  messageData,
    //  channelName,
    //  parentChannel,
    //  parentMessage,
    // })
    /*
      {
        message: 'status:in progress',
        messageData: {
          newsChunk: 0,
          position: 4.073648611111111,
          seen: 1742067707094,
          timestamp: 1742072065661,
          velocity: 10,
          replies: { count: 0, top: [] },
          labels: {}
        },
        channelName: 'labels@tmi%3Afeat%2Flabels#I%20clicked%20%22label%20message%22%20and%20nothing%20happened.',
        parentChannel: 'tmi:feat/labels',
        parentMessage: 'I clicked "label message" and nothing happened.'
      }
    */
   }

   async function updateParentMessageReplies() {
    const isReply =
     channelName.startsWith('replies@')
    if (!isReply) {
     return
    }
    const [parentChannelId, parentMessageId] =
     channelName.substring(8).split(':')

    const [parentChannel, parentMessage] = [
     parentChannelId,
     parentMessageId,
    ].map(decodeURIComponent)

    const parentChannelNowKey = `scroll.channel.messages:${parentChannelId}#now`
    const parentChannelDataString =
     await kv.get(parentChannelNowKey)

    if (
     typeof parentChannelDataString ===
      'string' &&
     parentChannelDataString.length > 4
    ) {
    } else {
     throw new Error(
      `Parent channel data not found: ${JSON.stringify(
       parentChannel
      )}`
     )
    }

    const parentMessageData = JSON.parse(
     parentChannelDataString
    )

    const allRepliesKey = `scroll.channel.messages:${encodeURIComponent(
     `replies@${parentChannelId}:${parentMessageId}`
    )}#now`

    const allReplies = await seekMessages(
     allRepliesKey
    )

    const top10Replies = Object.fromEntries(
     Object.entries(allReplies)
      .sort(
       (a, b) => b[1].position - a[1].position
      )
      .slice(0, 10)
    )

    const updatedParentMessageData = {
     ...parentMessageData,
     [parentMessage]: {
      ...parentMessageData[parentMessage],
      replies: {
       count: Object.keys(allReplies).length,
       top: top10Replies,
      },
     },
    }

    await kv.set(
     parentChannelNowKey,
     JSON.stringify(updatedParentMessageData)
    )
   }
   const messageId = encodeURIComponent(message)
   const key2 = {
    messagePosition: `scroll.channel.message:${channelId}#${messageId}`,
   }
   await Promise.all([
    kv.set(
     key2.messagePosition,
     JSON.stringify(newMessageData)
    ),
    rankMessage(message, newMessageData),
    updateParentMessageLabels(message),
   ])

   await new Promise((resolve) =>
    setTimeout(resolve, 100)
   )

   await updateParentMessageReplies()
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
    async function updateParentMessageReplies() {
     const isReply =
      channelName.startsWith('replies@')
     if (!isReply) {
      return
     }
     const [parentChannelId, parentMessageId] =
      channelName.substring(8).split(':')

     const [parentChannel, parentMessage] = [
      parentChannelId,
      parentMessageId,
     ].map(decodeURIComponent)

     const parentChannelNowKey = `scroll.channel.messages:${parentChannelId}#now`
     const parentChannelDataString =
      await kv.get(parentChannelNowKey)

     if (
      typeof parentChannelDataString ===
       'string' &&
      parentChannelDataString.length > 4
     ) {
     } else {
      throw new Error(
       `Parent channel data not found: ${JSON.stringify(
        parentChannel
       )}`
      )
     }

     const parentMessageData = JSON.parse(
      parentChannelDataString
     )

     const allRepliesKey = `scroll.channel.messages:${encodeURIComponent(
      `replies@${parentChannelId}:${parentMessageId}`
     )}#now`

     const allReplies = await seekMessages(
      allRepliesKey
     )

     const top10Replies = Object.fromEntries(
      Object.entries(allReplies)
       .sort(
        (a, b) => b[1].position - a[1].position
       )
       .slice(0, 10)
     )

     const updatedParentMessageData = {
      ...parentMessageData,
      [parentMessage]: {
       ...parentMessageData[parentMessage],
       replies: {
        count: Object.keys(allReplies).length,
        top: top10Replies,
       },
      },
     }

     await kv.set(
      parentChannelNowKey,
      JSON.stringify(updatedParentMessageData)
     )
    }

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

    await new Promise((resolve) =>
     setTimeout(resolve, 100)
    )

    await updateParentMessageReplies()

    return true
   } else {
    throw new Error(
     `Message with score of ${MESSAGE_PERSIST_THRESHOLD} cannot be unsent. Please demote the message first.`
    )
   }
  }

  async function seekMessages(_key: string) {
   const messagesString = await kv.get(_key)
   return messagesString
    ? excludeOverlyNegativeMessages(
       JSON.parse(messagesString)
      )
    : {}
  }

  function excludeOverlyNegativeMessages(messages: {
   [key: string]: MessageData
  }) {
   //  console.dir({ messages })
   return Object.fromEntries(
    Object.entries(messages).filter(
     ([_, messageData]) => {
      if (
       !(('replies' in messageData) as unknown)
      ) {
       messageData.replies = {
        count: 0,
        top: [],
       }
      }
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
     seekMessages(key.channelMessages),
     seekChannels(),
    ])

   return { channels, messages }
  }

  return {
   getMessage,
   rankMessage,
   remove,
   seek,
   send,
   unsend,
  }
 }
}
