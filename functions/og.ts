import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'
import { extractTags } from './lib/extractTags.js'
import { getKV } from './lib/getKV.js'

const headers = {
 'Content-Type': 'application/json',
}

export const onRequestGet: PagesFunction<
 Env
> = async (context) => {
 const requestUrl = new URL(context.request.url)
 const url = requestUrl.searchParams.get('url')
 const kvUrl = requestUrl.searchParams.get('kv')
 const refresh =
  requestUrl.searchParams.get('refresh')

 if (typeof url !== 'string') {
  return new Response('missing url parameter', {
   status: 400,
  })
 }

 try {
  new URL(url)
 } catch (e) {
  return new Response(
   'url parameter is invalid',
   {
    status: 400,
   }
  )
 }

 const kv = await getKV(context, true, kvUrl)

 if (!kv) {
  return new Response(
   JSON.stringify({
    error: 'not authorized',
   }),
   {
    headers,
    status: 401,
   }
  )
 }

 const ogTagsKey = `og.url#${encodeURIComponent(
  url
 )}`

 console.log(`open graph kv: ${kv.description}`)

 if (refresh !== 'true') {
  const cachedTags = await kv.get(ogTagsKey)

  if (typeof cachedTags === 'string') {
   return new Response(cachedTags, {
    headers,
   })
  }
 }

 const tagsString = JSON.stringify(
  await extractTags(url)
 )

 await kv.set(ogTagsKey, tagsString)

 return new Response(tagsString, {
  headers,
 })
}
