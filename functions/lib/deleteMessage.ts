import { CivilMemoryKV } from '@tagmein/civil-memory'
import { getHourNumber } from './getHourNumber'

const RANKED_HISTORY_ITEM_COUNT = 250

export async function deleteMessage(
 kv: CivilMemoryKV,
 message: string,
 channel: string
): Promise<void> {
 const hour = getHourNumber()
 const hourId = hour.toString(10)
 const channelId = encodeURIComponent(channel)
 const key = {
  channelMostRecentHour: `channel_recent_hour#${channelId}`,
  hourChannelTopMessages: `hour_channel_top_messages#${hourId}_${channelId}`,
 }

 async function getHourChannelTopMessages(): Promise<
  [string | null, Record<string, number>]
 > {
  const mostRecentHour = await kv.get(
   key.channelMostRecentHour
  )
  if (typeof mostRecentHour === 'string') {
   const hourChannelTopMessagesKey = `hour_channel_top_messages#${mostRecentHour}_${channelId}`
   return [
    mostRecentHour,
    JSON.parse(
     (await kv.get(
      hourChannelTopMessagesKey
     )) ?? '{}'
    ),
   ]
  }
  return [mostRecentHour, {}]
 }

 let [mostRecentHour, hourChannelTopMessages] =
  await getHourChannelTopMessages()

 // Delete the given message from the channel
 delete hourChannelTopMessages[message]

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

 if (mostRecentHour !== hourId) {
  await kv.set(
   key.channelMostRecentHour,
   hourId
  )
 }
}
