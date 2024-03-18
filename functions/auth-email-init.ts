import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'
import { getKV } from './lib/getKV.js'
import { createLoginRequest } from './lib/loginRequest.js'
import { sendEmail } from './lib/sendEmail.js'

interface PostBody {
 email: string
}

const MAX_EMAIL_LENGTH = 128
const MIN_EMAIL_LENGTH = 5

async function validateRequestBody(
 request: Request
): Promise<{
 error?: string
 data: PostBody
}> {
 try {
  const data: PostBody = await request.json()
  if (!data || typeof data !== 'object') {
   throw new Error('missing data')
  }

  if (typeof data.email === 'string') {
   if (data.email !== data.email.trim()) {
    return {
     error:
      'email must not start or end with space',
     data,
    }
   }

   if (data.email.length > MAX_EMAIL_LENGTH) {
    return {
     error: `email must be ${MAX_EMAIL_LENGTH} characters or less`,
     data,
    }
   }

   if (data.email.length < MIN_EMAIL_LENGTH) {
    return {
     error: `email must be at least ${MIN_EMAIL_LENGTH} characters long`,
     data,
    }
   }
  }

  return { data }
 } catch (e) {
  return {
   error:
    'unable to parse incoming JSON post body: ' +
    e.message,
   data: { email: '' },
  }
 }
}

export const onRequestPost: PagesFunction<Env> =
 async function (context) {
  const {
   error,
   data: { email: _email },
  } = await validateRequestBody(context.request)

  if (error) {
   return new Response(error, { status: 400 })
  }

  const email = _email.toLowerCase()

  const kv = await getKV(context)

  const uniqueId = await createLoginRequest(
   kv,
   email
  )

  const verifyLink = `https://tagme.in/auth?id=${uniqueId}`

  try {
   const response = await sendEmail(
    context.env,
    {
     email,
     name: email,
    },
    `Verify your email address to sign in to Tag Me In:\n\n${verifyLink}`
   )

   if (!response.ok) {
    return new Response(
     JSON.stringify({
      error: await response.text(),
     }),
     {
      status: 500,
     }
    )
   }
  } catch (e) {
   return new Response(
    JSON.stringify({ error: e.message }),
    {
     status: 500,
    }
   )
  }

  return new Response(
   JSON.stringify({
    success: true,
    id: uniqueId,
   }),
   {
    headers: {
     'Content-Type': 'application/json',
    },
   }
  )
 }
