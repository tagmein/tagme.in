import type {
    PagesFunction,
    Response as ResponseType,
   } from '@cloudflare/workers-types'
   import { GoogleGenAI } from '@google/genai'
   import { Env } from './lib/env.js'
   
   interface ChatRequest {
    message: string
    channel: string
    history?: Array<{
     text: string | any
     sender: string
     timestamp?: string
    }>
   }
   
   export const onRequestPost: PagesFunction<
    Env
   > = async (context) => {
    try {
     const request = context.request
     const data: ChatRequest = await request.json()
   
     if (!data.message) {
      return new Response(
       JSON.stringify({
        error: 'Message is required',
       }),
       {
        status: 400,
        headers: {
         'Content-Type': 'application/json',
        },
       }
      ) as unknown as ResponseType
     }
   
     // Get API key from environment and validate it
     const GEMINI_API_KEY =
      context.env.GEMINI_API_KEY
   
     // Check if API key exists and is not empty
     if (
      !GEMINI_API_KEY ||
      GEMINI_API_KEY.trim() === ''
     ) {
      console.error(
       'Chat error: GEMINI_API_KEY is missing or empty'
      )
      return new Response(
       JSON.stringify({
        error: 'API key configuration error',
        details:
         'GEMINI_API_KEY is not configured properly',
       }),
       {
        status: 500,
        headers: {
         'Content-Type': 'application/json',
        },
       }
      ) as unknown as ResponseType
     }
   
     // Initialize Google Generative AI
     const ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
     })
   
     // Prepare chat history for the new API format
     const history = data.history || []
   
     // Convert history to content parts format for Gemini
     const messages = []
   
     // Add previous messages
     for (let i = 0; i < history.length; i++) {
      const msg = history[i]
      // Skip system error messages
      if (msg.sender === 'System') continue
   
      // Handle complex text objects by extracting the text property or converting to string
      let messageText = ''
      if (typeof msg.text === 'string') {
       messageText = msg.text
      } else if (
       typeof msg.text === 'object' &&
       msg.text !== null
      ) {
       // Try to extract the actual text if it's a complex object
       if (
        msg.text.text &&
        typeof msg.text.text === 'string'
       ) {
        messageText = msg.text.text
       } else {
        // Fallback to JSON string if we can't get the text property
        try {
         messageText = JSON.stringify(msg.text)
        } catch (e) {
         messageText = 'Unparseable message'
        }
       }
      }
   
      const role =
       msg.sender === 'You' ? 'user' : 'assistant'
      messages.push({
       role,
       parts: [{ text: messageText }],
      })
     }
   
     // Add current user message
     messages.push({
      role: 'user',
      parts: [{ text: data.message }],
     })
   
     console.log(
      'Sending to Gemini:',
      JSON.stringify(messages)
     )
   
     try {
      // Get response from Gemini using the structured content format
      const response =
       await ai.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: messages,
       })
   
      const text = response.text
   
      return new Response(
       JSON.stringify({
        message: text,
        sender: 'Tagmein AI',
        channel: data.channel,
       }),
       {
        headers: {
         'Content-Type': 'application/json',
        },
       }
      ) as unknown as ResponseType
     } catch (apiError) {
      console.error('Gemini API error:', apiError)
   
      // Check for authentication/authorization issues
      if (
       apiError.message &&
       apiError.message.includes('403')
      ) {
       return new Response(
        JSON.stringify({
         error:
          'Authentication error with Gemini API',
         details:
          'API key may be invalid or missing permissions',
        }),
        {
         status: 403,
         headers: {
          'Content-Type': 'application/json',
         },
        }
       ) as unknown as ResponseType
      }
   
      // Other API errors
      return new Response(
       JSON.stringify({
        error: 'Error calling Gemini API',
        details: apiError.message,
       }),
       {
        status: 500,
        headers: {
         'Content-Type': 'application/json',
        },
       }
      ) as unknown as ResponseType
     }
    } catch (error) {
     console.error('Chat error:', error)
     return new Response(
      JSON.stringify({
       error: 'Failed to process chat message',
       details: error.message,
      }),
      {
       status: 500,
       headers: {
        'Content-Type': 'application/json',
       },
      }
     ) as unknown as ResponseType
    }
   }