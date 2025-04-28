import type {
    PagesFunction,
    Response as ResponseType,
   } from '@cloudflare/workers-types'
   import { GoogleGenAI } from '@google/genai'
   import { Env } from './lib/env.js'
   
   interface ChatRequest {
    message: string
    channel: string
    userName?: string
    history?: Array<{
     text: string | any
     sender: string
     timestamp?: string
    }>
   }
   
   // Helper to fetch channel messages from /seek
   async function fetchChannelMessages(channel: string, request: Request): Promise<any[]> {
     const url = `/seek?channel=${encodeURIComponent(channel)}&hour=999999999`;
     // Use the same origin as the incoming request
     const base = new URL(request.url).origin;
     const seekUrl = base + url;
     const resp = await fetch(seekUrl, { headers: { 'Accept': 'application/json' } });
     if (!resp.ok) return [];
     const data: any = await resp.json();
     // Assume data.messages is an array or object of messages
     if (Array.isArray(data.messages)) return data.messages;
     if (typeof data.messages === 'object') return Object.values(data.messages);
     return [];
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
   
     // Fetch channel messages for Gemini context
     const channelMessages = await fetchChannelMessages(data.channel, request);
   
     // Prepare chat history for the new API format
     const history = data.history || []
   
     // Convert history to content parts format for Gemini
     const messages = []
   
     // Add a system prompt to instruct the AI
     let systemPrompt = "You are a helpful assistant. Do not repeat the user's message back to them. Answer helpfully and conversationally.";
     if ((data as any).userName && (data as any).userName.trim() !== '') {
       systemPrompt += ` The user's name is ${(data as any).userName}. Please address them as ${(data as any).userName} in your responses and be friendly and personal.`;
     }
     messages.push({
       role: 'system',
       parts: [{ text: systemPrompt }],
     });
   
     // Add channel messages as context (as user/assistant turns)
     for (const msg of channelMessages) {
       if (!msg || !msg.text) continue;
       let sender = msg.sender || '';
       let text = typeof msg.text === 'string' ? msg.text : (msg.text.text || JSON.stringify(msg.text));
       let role = sender === 'You' ? 'user' : 'assistant';
       messages.push({ role, parts: [{ text }] });
     }
   
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
   
     // Prevent duplication: Only add the current user message if it's not already the last message in history
     const lastHistory = history[history.length - 1]
     let lastMessageText = ''
     if (lastHistory && lastHistory.sender === 'You') {
      if (typeof lastHistory.text === 'string') {
        lastMessageText = lastHistory.text
      } else if (lastHistory.text && typeof lastHistory.text.text === 'string') {
        lastMessageText = lastHistory.text.text
      }
     }
     if (!lastHistory || lastHistory.sender !== 'You' || lastMessageText !== data.message) {
      messages.push({
        role: 'user',
        parts: [{ text: data.message }],
      })
     }
   
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
        sender: 'Tag Me In AI',
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