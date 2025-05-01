import type { PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'

interface ChannelMetadata {
 description: string
 purpose: string
 created: string
 tags: string[]
 lastUpdated: string
}

// Helper to get KV key for channel metadata
function getChannelMetadataKey(
 channel: string
): string {
 return `channel:${channel}:metadata`
}

export const onRequestGet: PagesFunction<
 Env
> = async (context) => {
 try {
  const url = new URL(context.request.url)
  const channel =
   url.searchParams.get('channel')

  if (!channel) {
   return new Response(
    JSON.stringify({
     error: 'Channel parameter is required',
    }),
    {
     status: 400,
     headers: {
      'Content-Type': 'application/json',
     },
    }
   )
  }

  // Get channel metadata from KV
  const key = getChannelMetadataKey(channel)
  let metadata =
   await context.env.TAGMEIN_KV.get(key, 'json')

  // If no metadata exists, create default metadata for the channel
  if (!metadata) {
   metadata = {
    description:
     channel === 'default'
      ? 'The main channel for general discussions and community interaction.'
      : `Channel for ${channel}-related discussions.`,
    purpose:
     channel === 'default'
      ? 'General discussion and community hub'
      : `Dedicated space for ${channel} topics`,
    created: new Date().toISOString(),
    tags:
     channel === 'default'
      ? ['general', 'community', 'main']
      : [channel],
    lastUpdated: new Date().toISOString(),
   }
   // Store the default metadata
   await context.env.TAGMEIN_KV.put(
    key,
    JSON.stringify(metadata)
   )
  }

  return new Response(
   JSON.stringify(metadata),
   {
    headers: {
     'Content-Type': 'application/json',
    },
   }
  )
 } catch (error) {
  console.error(
   'Error handling channel info request:',
   error
  )
  return new Response(
   JSON.stringify({
    error: 'Internal server error',
   }),
   {
    status: 500,
    headers: {
     'Content-Type': 'application/json',
    },
   }
  )
 }
}

export const onRequestPost: PagesFunction<
 Env
> = async (context) => {
 try {
  const data = await context.request.json()
  const { channel, metadata } = data

  if (!channel || !metadata) {
   return new Response(
    JSON.stringify({
     error: 'Channel and metadata are required',
    }),
    {
     status: 400,
     headers: {
      'Content-Type': 'application/json',
     },
    }
   )
  }

  // Validate metadata structure
  const validMetadata: ChannelMetadata = {
   description: metadata.description || '',
   purpose: metadata.purpose || '',
   created:
    metadata.created ||
    new Date().toISOString(),
   tags: Array.isArray(metadata.tags)
    ? metadata.tags
    : [],
   lastUpdated: new Date().toISOString(),
  }

  // Store metadata in KV
  const key = getChannelMetadataKey(channel)
  await context.env.TAGMEIN_KV.put(
   key,
   JSON.stringify(validMetadata)
  )

  return new Response(
   JSON.stringify({
    success: true,
    metadata: validMetadata,
   }),
   {
    headers: {
     'Content-Type': 'application/json',
    },
   }
  )
 } catch (error) {
  console.error(
   'Error handling channel info update:',
   error
  )
  return new Response(
   JSON.stringify({
    error: 'Internal server error',
   }),
   {
    status: 500,
    headers: {
     'Content-Type': 'application/json',
    },
   }
  )
 }
}
