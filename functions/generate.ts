import type { PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'

interface PostBody {
 apiKey: string
 operation:
  | 'synthesize'
  | 'contrast'
  | 'subtract'
  | 'add'
 messages: Array<{
  text: string
  data: {
   timestamp: number
   velocity: number
   replies: { count: number; top: any[] }
   labels?: Record<string, any>
  }
  score: number
 }>
 customPrompt?: string
}

const SYSTEM_PROMPTS = {
 synthesize: `You are tasked with synthesizing insights from multiple messages. Analyze the provided messages and create a coherent summary that captures the main themes, patterns, and key insights. Focus on finding connections and common threads between the messages.`,

 contrast: `You are tasked with contrasting and comparing the provided messages. Identify the key differences, opposing viewpoints, contradictions, and varying perspectives. Highlight what makes each message unique and how they differ from each other.`,

 subtract: `You are tasked with identifying what is missing or what could be removed from the provided messages. Look for gaps in reasoning, missing perspectives, redundancies, or elements that don't contribute to the core message. Focus on what's absent or superfluous.`,

 add: `You are tasked with expanding and building upon the provided messages. Suggest additional insights, related concepts, follow-up questions, or complementary ideas that would enhance or extend the themes present in the messages.`,
}

async function validateRequestBody(
 request: Request
): Promise<{ error?: string; data: PostBody }> {
 try {
  const data: PostBody = await request.json()
  if (!data || typeof data !== 'object') {
   throw new Error('missing data')
  }

  if (
   typeof data.apiKey !== 'string' ||
   !data.apiKey.trim()
  ) {
   return {
    error: 'API key is required',
    data,
   }
  }

  if (
   ![
    'synthesize',
    'contrast',
    'subtract',
    'add',
   ].includes(data.operation)
  ) {
   return {
    error:
     'operation must be one of: synthesize, contrast, subtract, add',
    data,
   }
  }

  if (
   !Array.isArray(data.messages) ||
   data.messages.length === 0
  ) {
   return {
    error:
     'messages array is required and must not be empty',
    data,
   }
  }

  for (const message of data.messages) {
   if (typeof message.text !== 'string') {
    return {
     error:
      'each message must have a text field',
     data,
    }
   }
  }

  return { data }
 } catch (e) {
  return {
   error:
    'unable to parse incoming JSON post body',
   data: {
    apiKey: '',
    operation: 'synthesize',
    messages: [],
   },
  }
 }
}

async function callGeminiAPI(
 apiKey: string,
 prompt: string
): Promise<string> {
 const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
  {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json',
   },
   body: JSON.stringify({
    contents: [
     {
      parts: [
       {
        text: prompt,
       },
      ],
     },
    ],
    generationConfig: {
     temperature: 0.7,
     topK: 40,
     topP: 0.95,
     maxOutputTokens: 2048,
    },
   }),
  }
 )

 if (!response.ok) {
  const error = await response.text()
  throw new Error(`Gemini API error: ${error}`)
 }

 const result = (await response.json()) as any

 if (
  result.candidates &&
  result.candidates[0] &&
  result.candidates[0].content
 ) {
  return result.candidates[0].content.parts[0]
   .text
 } else {
  throw new Error(
   'Unexpected response format from Gemini API'
  )
 }
}

function formatMessagesForPrompt(
 messages: PostBody['messages']
): string {
 return messages
  .map((message, index) => {
   const date = new Date(
    message.data.timestamp
   ).toLocaleString()
   const velocity = message.data.velocity
   const replies = message.data.replies.count

   return `Message ${
    index + 1
   } (${date}, velocity: ${velocity}, replies: ${replies}):
${message.text}

---`
  })
  .join('\n\n')
}

export const onRequestPost: PagesFunction<Env> =
 async function (context) {
  // Add CORS headers
  const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Methods':
    'POST, OPTIONS',
   'Access-Control-Allow-Headers':
    'Content-Type',
  }

  // Handle preflight requests
  if (context.request.method === 'OPTIONS') {
   return new Response(null, {
    status: 200,
    headers: corsHeaders,
   })
  }

  const {
   error,
   data: {
    apiKey,
    operation,
    messages,
    customPrompt,
   },
  } = await validateRequestBody(context.request)

  if (error) {
   return new Response(
    JSON.stringify({ error }),
    {
     status: 400,
     headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
     },
    }
   )
  }

  try {
   const systemPrompt =
    customPrompt || SYSTEM_PROMPTS[operation]
   const formattedMessages =
    formatMessagesForPrompt(messages)

   const fullPrompt = `${systemPrompt}

Here are the messages to analyze:

${formattedMessages}

Please provide your analysis based on the operation requested: ${operation}`

   const result = await callGeminiAPI(
    apiKey,
    fullPrompt
   )

   return new Response(
    JSON.stringify({
     success: true,
     result,
     operation,
     messageCount: messages.length,
    }),
    {
     headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
     },
    }
   )
  } catch (error) {
   return new Response(
    JSON.stringify({
     error:
      error.message ||
      'An error occurred while processing your request',
    }),
    {
     status: 500,
     headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
     },
    }
   )
  }
 }
