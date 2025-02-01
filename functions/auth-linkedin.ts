import { type PagesFunction } from '@cloudflare/workers-types'
import { civilMemoryKV } from './modules/civil-memory/index.js'
import { Env } from './lib/env.js'
import { randomId } from './lib/randomId.js'

const LINKEDIN_ACCESS_TOKEN_URL =
 'https://www.linkedin.com/oauth/v2/accessToken'

const LINKEDIN_PROFILE_URL =
 'https://api.linkedin.com/v2/userinfo'

const TAGMEIN_LINKEDIN_REDIRECT_URI =
 'https://tagme.in/auth-linkedin'

export const onRequestGet: PagesFunction<
 Env
> = async ({ env, request }) => {
 const url = new URL(request.url)
 const code = url.searchParams.get('code') ?? ''
 const error = url.searchParams.get('error')
 const errorDescription = url.searchParams.get(
  'error_description'
 )
 const state = JSON.parse(
  url.searchParams.get('state') ?? '{}'
 ) as { id: string; origin: string }

 if (typeof state?.id !== 'string') {
  return new Response(
   JSON.stringify({
    error: 'missing state.id',
   })
  )
 }

 if (typeof state?.origin !== 'string') {
  return new Response(
   JSON.stringify({
    error: 'missing state.origin',
   })
  )
 }

 const accessTokenRequestData: Record<
  string,
  string
 > = {
  code,
  client_id:
   env.TAGMEIN_AUTH_LINKEDIN_CLIENT_ID,
  client_secret:
   env.TAGMEIN_AUTH_LINKEDIN_CLIENT_SECRET,
  grant_type: 'authorization_code',
  redirect_uri: TAGMEIN_LINKEDIN_REDIRECT_URI,
 }

 if (error !== null) {
  return new Response(
   JSON.stringify({
    error,
    errorDescription,
   })
  )
 }

 const response = await fetch(
  LINKEDIN_ACCESS_TOKEN_URL,
  {
   method: 'POST',
   headers: {
    'Content-Type':
     'application/x-www-form-urlencoded',
   },
   body: new URLSearchParams(
    accessTokenRequestData
   ).toString(),
  }
 )

 const linkedIn = (await response.json()) as {
  access_token: string
  expires_in: number
  scope: string
 }

 const linkedInProfileResponse = await fetch(
  LINKEDIN_PROFILE_URL,
  {
   headers: {
    Authorization: `Bearer ${linkedIn.access_token}`,
   },
  }
 )

 const linkedInProfile =
  (await linkedInProfileResponse.json()) as
   | {
      sub: string
      email_verified: boolean
      name: string
      locale?: {
       country: string
       language: string
      }
      given_name: string
      family_name: string
      email: string
      picture?: string
     }
   | {
      serviceErrorCode: number
      message: string
      status: number
     }

 if ('status' in linkedInProfile) {
  return new Response(
   JSON.stringify(linkedInProfile)
  )
 }

 if (!linkedInProfile.email_verified) {
  return new Response(
   JSON.stringify({
    error:
     'please verify your email address on LinkedIn',
   })
  )
 }

 const authKV = env.TAGMEIN_LOCAL_KV
  ? civilMemoryKV.http({
     baseUrl:
      'http://localhost:3333?mode=disk&modeOptions.disk.basePath=./.kv-auth',
    })
  : civilMemoryKV.cloudflare({
     binding: env.TAGMEIN_AUTH_KV,
    })

 const key = randomId()

 await authKV.set(
  `init#${key}-${state.id}`,
  JSON.stringify({
   created: Date.now(),
   email: linkedInProfile.email.toLowerCase(),
   linkedInProfile,
  })
 )

 return new Response('', {
  headers: {
   Location: `${state.origin}/#key=${key}`,
  },
  status: 302,
 })
}
