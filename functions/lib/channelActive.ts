import { CivilMemoryKV } from '@tagmein/civil-memory'

const RANKED_HISTORY_ITEM_COUNT = 250

export async function channelActive(
 kv: CivilMemoryKV,
 channel: string,
 hour: number,
 channelId: string,
 hourId: string
) {
 const key = {
  channelVotesCount: `channel_votes#${channelId}`,
  hourTopChannels: `hour_top_channels#${hourId}`,
  mostRecentTopChannelsHour: `hour_top_channels#latest`,
 }

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

 const namespace = channel.includes(':')
  ? channel.substring(0, channel.indexOf(':'))
  : undefined

 const namespaceKeyPrefix = namespace
  ? `[${encodeURIComponent(namespace)}]`
  : ''

 async function getTopChannelList(): Promise<
  [string | null, Record<string, number>]
 > {
  const mostRecentTopChannelsHour =
   await kv.get(
    namespaceKeyPrefix +
     key.mostRecentTopChannelsHour
   )
  if (
   typeof mostRecentTopChannelsHour === 'string'
  ) {
   const recentHourTopChannelsKey = `hour_top_channels#${mostRecentTopChannelsHour}`
   return [
    mostRecentTopChannelsHour,
    JSON.parse(
     (await kv.get(
      namespaceKeyPrefix +
       recentHourTopChannelsKey
     )) ?? '{}'
    ),
   ]
  }
  return [mostRecentTopChannelsHour, {}]
 }

 // Re-rank most popular channels this hour
 let [
  mostRecentTopChannelsHour,
  topChannelList,
 ] = await getTopChannelList()

 if (!topChannelList[channel]) {
  topChannelList[channel] = hour
 }

 topChannelList[channel]++

 if (mostRecentTopChannelsHour !== hourId) {
  await kv.set(
   namespaceKeyPrefix +
    key.mostRecentTopChannelsHour,
   hourId
  )
 }

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
  namespaceKeyPrefix + key.hourTopChannels,
  JSON.stringify(topChannelList)
 )
}
