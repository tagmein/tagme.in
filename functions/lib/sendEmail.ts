import { Env } from './env.js'

export interface Contact {
 email: string
 name: string
}

export async function sendEmail(
 env: Env,
 to: Contact,
 body: string
) {
 return fetch(
  'https://api.mailchannels.net/tx/v1/send',
  {
   method: 'POST',
   headers: {
    'content-type': 'application/json',
   },
   body: JSON.stringify({
    personalizations: [
     {
      dkim_domain: 'tagme.in',
      dkim_private_key: env.DKIM_PRIVATE_KEY,
      dkim_selector: 'mailchannels',
      to: [to],
     },
    ],
    from: {
     email: 'service@tagme.in',
     name: 'Tag Me In',
    },
    subject: 'Verify your email address',
    content: [
     {
      type: 'text/plain',
      value: body,
     },
    ],
   }),
  }
 )
}
