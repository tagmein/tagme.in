import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'
import { getKV } from './lib/getKV.js'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Google GenAI
const { GEMINI_API_KEY } = process.env

if (!GEMINI_API_KEY) {
 throw new Error(
  'GEMINI_API_KEY is not set in the environment variables.'
 )
}

const genAI = new GoogleGenerativeAI(
 GEMINI_API_KEY
)

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
  const body = await context.request.json()
  const channel = body.channel || 'default'
  const messageId = body.messageId // Optional parameter for specific message ID
  const userMessage = body.message

  if (!userMessage) {
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

  let contextMessages =
   'No messages found in the channel.'

  // Fetch specific message and its replies if messageId is provided
  if (messageId) {
   const specificMessage = await kv.get(
    `message#${channel}#${messageId}`
   )
   const replies = await kv.get(
    `replies#${channel}#${messageId}`
   )
   contextMessages = specificMessage
    ? `Message: ${specificMessage}\nReplies: ${replies || 'No replies found.'}`
    : 'Message not found.'
  } else {
   // Fetch all channel messages if no specific messageId is provided
   const channelMessages = await kv.get(
    `seek#${channel}#999999999`
   )
   contextMessages =
    channelMessages ||
    'No messages found in the channel.'
  }

  // Use the Gemini API to generate a response
  const modelName = 'gemini-pro' // Corrected model name
  const model = genAI.getGenerativeModel({
   model: modelName,
  })

  console.log('Requesting Gemini API with:', {
   modelName,
   prompt: `Channel: ${channel}\nMessage: ${userMessage}\nContext: ${contextMessages}`,
  })

  let result
  try {
   result = await model.generateContent({
    contents: [
     {
      parts: [
       {
        text: `Channel: ${channel}\nMessage: ${userMessage}\nContext: ${contextMessages}`,
       },
      ],
     },
    ],
   })
  } catch (fetchError) {
   console.error(
    'Error fetching from Gemini API:',
    fetchError.message
   )
   return new Response(
    JSON.stringify({
     error: 'Failed to fetch from Gemini API',
     details: fetchError.message,
    }),
    {
     status: 502,
     headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
     },
    }
   )
  }

  // Extract the response text
  const responseText =
   result?.candidates?.[0]?.output ||
   'No response generated.'

  // Suggested content: Extract facts or key points from the response
  const suggestedContent =
   extractSuggestedContent(responseText)

  const response = {
   channel,
   message: userMessage,
   reply: responseText,
   context: contextMessages,
   suggestedContent, // Include suggested content in the response
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

// Helper function to extract suggested content (facts) from the AI response
function extractSuggestedContent(
 responseText: string
): string[] {
 // Example logic: Extract sentences that contain numbers or specific keywords
 const facts = responseText
  .split('.')
  .map((sentence) => sentence.trim())
  .filter(
   (sentence) =>
    /\d/.test(sentence) || // Contains numbers
    /(important|key|notable|fact|suggest|recommend)/i.test(
     sentence
    ) // Contains keywords
  )
 return facts
}
