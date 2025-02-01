import { CivilMemoryKV } from '@tagmein/civil-memory'
import { scrollChannel } from './scrollChannel.js'

const NEWS_ITEM_APPEARS_AFTER = 30 * 60 * 1000

interface NewsItem {
 channel: string
 message: string
 seen: number
}

export function scroll(kv: CivilMemoryKV) {
 const newsKey = {
  newsChunkId: `news.chunk#id`,
  newsChunkById: (id: number) =>
   `news.chunk.id#${id.toString(36)}`,
 }

 async function getLatestNewsChunkId() {
  const latestChunkString = await kv.get(
   newsKey.newsChunkId
  )
  return typeof latestChunkString === 'string'
   ? parseInt(latestChunkString, 36)
   : 0
 }

 const channel = scrollChannel(
  kv,
  newsKey,
  getLatestNewsChunkId
 )

 async function news(
  chunk: number | null,
  includeNewMessages: boolean
 ): Promise<string> {
  const chunkId =
   typeof chunk === 'number'
    ? chunk
    : await getLatestNewsChunkId()
  const chunkKey =
   newsKey.newsChunkById(chunkId)
  if (includeNewMessages) {
   const template = JSON.stringify({
    chunkId,
    data: 'DATA',
   })
   return template.replace(
    '"DATA"',
    (await kv.get(chunkKey)) ?? '[]' // this technique avoids parsing the chunk simply to re-stringify it in the response
   )
  } else {
   const showNewsOlderThan =
    Date.now() - NEWS_ITEM_APPEARS_AFTER
   const newsChunkString = await kv.get(
    chunkKey
   )
   const newsChunk = (
    typeof newsChunkString === 'string'
     ? JSON.parse(newsChunkString)
     : []
   ).filter(
    (n: NewsItem) => n.seen < showNewsOlderThan
   )
   return JSON.stringify({
    chunkId,
    data: newsChunk,
   })
  }
 }

 return { channel, news }
}
