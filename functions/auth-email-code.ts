import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'
import { getKV } from './lib/getKV.js'
import { approveLoginRequest } from './lib/loginRequest.js'

interface PostBody {
 code: string
 id: string
}

const CODE_LENGTH = 4

async function validateRequestBody(
 request: Request
): Promise<{
 error?: string
 data: PostBody
}> {
 try {
  const formData = await request.formData()
  const data: PostBody = {
   code: formData.get('code'),
   id: formData.get('id'),
  }
  if (!data || typeof data !== 'object') {
   throw new Error('missing data')
  }

  if (typeof data.code !== 'string') {
   return {
    error: 'code is required',
    data,
   }
  }

  if (typeof data.id !== 'string') {
   return {
    error: 'id is required',
    data,
   }
  }

  if (data.code !== data.code.trim()) {
   return {
    error:
     'code must not start or end with space',
    data,
   }
  }

  if (data.code.length !== CODE_LENGTH) {
   return {
    error: `code must be ${CODE_LENGTH} characters`,
    data,
   }
  }

  if (
   !data.code
    .split('')
    .every((x) => /\d/.test(x))
  ) {
   return {
    error: `code must only contain numbers 0-9`,
    data,
   }
  }

  return { data }
 } catch (e) {
  return {
   error:
    'unable to parse incoming JSON post body: ' +
    e.message,
   data: { code: '', id: '' },
  }
 }
}

export const onRequestPost: PagesFunction<Env> =
 async function (context) {
  const {
   error,
   data: { code, id: uniqueId },
  } = await validateRequestBody(context.request)

  if (error) {
   return new Response(error, { status: 400 })
  }

  const kv = await getKV(context)

  const approveResponse =
   await approveLoginRequest(kv, uniqueId, code)

  if (typeof approveResponse === 'string') {
   return new Response(
    JSON.stringify({
     error: approveResponse,
    }),
    {
     status: 404,
    }
   )
  }

  return new Response(
   JSON.stringify({
    success: true,
   }),
   {
    headers: {
     'Content-Type': 'application/json',
    },
   }
  )
 }
