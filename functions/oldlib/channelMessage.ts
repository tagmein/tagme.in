import { CivilMemoryKV } from '@tagmein/civil-memory'

const RANKED_HISTORY_ITEM_COUNT = 250

export async function channelMessage(
 kv: CivilMemoryKV,
 channelId: string,
 hourId: string,
 message: string,
 newMessageVotesCount: number
) {
 const key = {
  channelMostRecentHour: `channel_recent_hour#${channelId}`,
  hourChannelMessage: `hour_channel_message#${hourId}_${channelId}`,
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

 // Update the total ranking for the hour channel messages
 let [mostRecentHour, hourChannelTopMessages] =
  await getHourChannelTopMessages()
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

 // Check if channel's message has already been posted this hour
 const existingChannelHourMessage =
  await kv.get(key.hourChannelMessage)
 if (!existingChannelHourMessage) {
  // send the message to the channel for this hour
  await kv.set(key.hourChannelMessage, message)
 }

 if (mostRecentHour !== hourId) {
  await kv.set(
   key.channelMostRecentHour,
   hourId
  )
 }
}
