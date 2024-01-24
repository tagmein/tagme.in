import {
 Response,
 type PagesFunction,
} from '@cloudflare/workers-types'
import { Env } from './lib/env'

const LINKEDIN_ACCESS_TOKEN_URL =
 'https://www.linkedin.com/oauth/v2/accessToken'

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

 const linkedIn = await response.json()

 return new Response(
  JSON.stringify({
   code,
   error,
   errorDescription,
   linkedIn,
   state,
  })
 )
}
