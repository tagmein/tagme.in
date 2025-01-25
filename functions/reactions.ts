import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'
import { getKV } from './lib/getKV.js'
import { scroll } from './lib/scroll.js'

interface GetReactionsBody {
 getForMessageIds: number[]
}

interface CreateReactionBody {
 createForMessageId: number
 reaction: string
}

type RequestBody =
 | GetReactionsBody
 | CreateReactionBody

async function validateRequestBody(
 request: Request
): Promise<{
 error?: string
 data: RequestBody
}> {
 try {
  const data: RequestBody = await request.json()

  if (!data || typeof data !== 'object') {
   throw new Error('missing data')
  }

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
     data: data as RequestBody,
    }
   }
   return { data: data as GetReactionsBody }
  }

  // Check if it's a create reaction request
  if (
   'createForMessageId' in data &&
   typeof data.createForMessageId ===
    'number' &&
   'reaction' in data &&
   typeof data.reaction === 'string'
  ) {
   if (data.reaction.length > 25) {
    return {
     error:
      'reaction must be 25 characters or less',
     data: data as RequestBody,
    }
   }

   if (data.reaction !== data.reaction.trim()) {
    return {
     error:
      'reaction must not start or end with space',
     data: data as RequestBody,
    }
   }

   return { data: data as CreateReactionBody }
  }

  return {
   error: 'invalid request body format',
   data: data as RequestBody,
  }
 } catch (e) {
  return {
   error:
    'unable to parse incoming JSON post body',
   data: { getForMessageIds: [] },
  }
 }
}

export default {
 async fetch(request: Request, env: Env) {
  if (request.method !== 'POST') {
   return new Response('Method not allowed', {
    status: 405,
   })
  }

  const { error, data } =
   await validateRequestBody(request)

  if (error) {
   return new Response(error, { status: 400 })
  }

  const kv = await getKV({
   env: {
    ...env,
    ASSETS: { fetch: globalThis.fetch },
   },
   request,
  } as any)

  if (!kv) {
   return new Response(
    JSON.stringify({
     error: 'not authorized',
    }),
    {
     headers: {
      'Content-Type': 'application/json',
     },
     status: 401,
    }
   )
  }

  try {
   if ('getForMessageIds' in data) {
    // Handle get reactions request
    const reactions = await Promise.all(
     data.getForMessageIds.map(
      async (messageId) => {
       const messageReactions = await scroll(kv)
        .channel(
         `reactions--message-${messageId}`
        )
        .seek()
       return {
        messageId,
        reactions: messageReactions,
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
    // Handle create reaction request
    await scroll(kv)
     .channel('reactions')
     .send(
      `reaction${data.reaction}`,
      data.createForMessageId
     )

    return new Response('reaction added')
   }
  } catch (error) {
   return new Response(error.message, {
    status: 400,
   })
  }
 },
}
