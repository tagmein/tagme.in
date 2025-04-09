import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'
import { getKV } from './lib/getKV.js'
import { scroll } from './lib/scroll.js'

interface GetReactionsBody {
 getForMessageIds: string[]
}

interface CreateReactionBody {
 createForMessageId: string
 reaction: string
}

type RequestBody =
 | GetReactionsBody
 | CreateReactionBody

async function readRequestBody(
 request: Request
) {
 const contentType = request.headers.get(
  'content-type'
 )
 if (!contentType) {
  throw new Error('Missing content-type header')
 }

 if (contentType.includes('application/json')) {
  const data = await request.json()
  if (!data || typeof data !== 'object') {
   throw new Error('Invalid JSON body')
  }
  return data as RequestBody
 }

 throw new Error('Unsupported content type')
}

async function validateRequestBody(
 data: RequestBody
): Promise<{
 error?: string
 data: RequestBody
}> {
 // Check if it's a get reactions request
 if (
  'getForMessageIds' in data &&
  Array.isArray(data.getForMessageIds)
 ) {
  if (
   !data.getForMessageIds.every(
    (id) => typeof id === 'string'
   )
  ) {
   return {
    error:
     'getForMessageIds must be an array of strings',
    data,
   }
  }
  return { data: data as GetReactionsBody }
 }

 // Check if it's a create reaction request
 if (
  'createForMessageId' in data &&
  typeof data.createForMessageId === 'string' &&
  'reaction' in data &&
  typeof data.reaction === 'string'
 ) {
  if (data.reaction.length > 25) {
   return {
    error:
     'reaction must be 25 characters or less',
    data,
   }
  }

  if (data.reaction !== data.reaction.trim()) {
   return {
    error:
     'reaction must not start or end with space',
    data,
   }
  }

  return { data: data as CreateReactionBody }
 }

 return {
  error: 'invalid request body format',
  data,
 }
}
export const onRequestPost: PagesFunction<Env> =
 async function (context) {
  const { request, env } = context
  try {
   // Read and validate the request body
   const body = await readRequestBody(request)
   const { error, data } =
    await validateRequestBody(body)

   if (error) {
    return new Response(
     JSON.stringify({ error }),
     {
      status: 400,
      headers: {
       'Content-Type': 'application/json',
      },
     }
    )
   }

   const url = new URL(context.request.url)
   const kvUrl = url.searchParams.get('kv')

   // Authenticate and get KV instance
   const kv = await getKV(
    {
     env: {
      ...env,
      ASSETS: { fetch: globalThis.fetch },
     },
     request,
    } as any,
    true,
    kvUrl
   )

   if (!kv) {
    return new Response(
     JSON.stringify({
      error: 'not authorized',
     }),
     {
      status: 401,
      headers: {
       'Content-Type': 'application/json',
      },
     }
    )
   }

   // Handle the request based on type
   if ('getForMessageIds' in data) {
    // Handle get reactions request
    const reactions = await Promise.all(
     data.getForMessageIds.map(
      async (messageId) => {
       const MESSAGE_REACTIONS_CHANNEL = `reactions:message-${messageId}`
       const messageReactions = await scroll(kv)
        .channel(MESSAGE_REACTIONS_CHANNEL)
        .seek()
       return {
        messageId,
        reactions: messageReactions.messages,
       }
      }
     )
    )

    return new Response(
     JSON.stringify({ reactions }),
     {
      headers: {
       'Content-Type': 'application/json',
      },
     }
    )
   } else {
    const messageId = data.createForMessageId
    const MESSAGE_REACTIONS_CHANNEL = `reactions:message-${messageId}`
    // Handle create reaction request
    await scroll(kv)
     .channel(MESSAGE_REACTIONS_CHANNEL)
     .send(`reaction${data.reaction}`, 1)

    return new Response(
     JSON.stringify({
      message: 'reaction added',
     }),
     {
      headers: {
       'Content-Type': 'application/json',
      },
     }
    )
   }
  } catch (error) {
   return new Response(
    JSON.stringify({
     error: error.message,
    }),
    {
     status: 400,
     headers: {
      'Content-Type': 'application/json',
     },
    }
   )
  }
 }
