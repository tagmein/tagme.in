import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'
import { getKV } from './lib/getKV.js'
import { GoogleGenAI } from '@google/genai' // Correct package

// Initialize Google GenAI
const GEMINI_API_KEY =
 process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({
 apiKey: GEMINI_API_KEY,
})

export const onRequestPost: PagesFunction<
 Env
> = async (context) => {
 const kv = await getKV(context, true)

 if (!kv) {
  return new Response(
   JSON.stringify({ error: 'Not authorized' }),
   {
    status: 401,
    headers: {
     'Content-Type': 'application/json',
     'Access-Control-Allow-Origin': '*',
    },
   }
  )
 }

 try {
  // Parse the request body
  const body = await context.request.json()
  const channel = body.channel || 'default'
  const message = body.message

  if (!message) {
   return new Response(
    JSON.stringify({
     error: 'Message parameter is required',
    }),
    {
     status: 400,
     headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
     },
    }
   )
  }

  // Fetch channel messages from KV store
  const channelMessages = await kv.get(
   `seek#${channel}#999999999`
  )
  const contextMessages =
   channelMessages ||
   'No messages found in the channel.'

  // Generate a response using Google GenAI
  const aiResponse =
   await ai.models.generateContent({
    model: 'gemini-2.0-flash-001',
    contents: `Channel: ${channel}\nMessage: ${message}\nContext: ${contextMessages}`,
   })

  const response = {
   channel,
   message,
   reply:
    aiResponse.text || 'No response generated.',
   context: contextMessages,
  }

  return new Response(
   JSON.stringify(response),
   {
    headers: {
     'Content-Type': 'application/json',
     'Access-Control-Allow-Origin': '*',
    },
   }
  )
 } catch (error) {
  console.error(
   'Error generating AI response:',
   error.message
  )
  console.error('Stack Trace:', error.stack)
  return new Response(
   JSON.stringify({
    error: 'Failed to generate AI response',
    details: error.message,
   }),
   {
    status: 500,
    headers: {
     'Content-Type': 'application/json',
     'Access-Control-Allow-Origin': '*',
    },
   }
  )
 }
}
