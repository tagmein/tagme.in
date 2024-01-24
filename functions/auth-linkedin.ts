import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env'

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
 const state =
  url.searchParams.get('state') ?? ''

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

 return new Response(
  JSON.stringify({
   linkedInProfile,
   state,
  })
 )
}
