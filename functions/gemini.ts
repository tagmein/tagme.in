import { GoogleGenAI } from '@google/genai';
import type { PagesFunction, Response as WorkerResponse } from '@cloudflare/workers-types';
import { getKV } from './lib/getKV.js';
import { scroll } from './lib/scroll.js';
import { Env } from './lib/env.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Fallback responses when API fails
const FALLBACK_RESPONSES = [
    "I'm currently having trouble connecting to my knowledge base. Could you try again in a moment?",
    "I apologize, but I'm experiencing some connectivity issues right now. Let's try again soon.",
    "It seems I can't access my full capabilities at the moment. Please try again later.",
    "I'm having trouble processing your request right now due to some technical difficulties.",
    "Sorry for the inconvenience, but I'm unable to generate a complete response right now."
];

function getFallbackResponse() {
    return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

interface ChatRequest {
    message: string;
    channel?: string;
    model?: string;
}

export const onRequestGet: PagesFunction = async (context): Promise<WorkerResponse> => {
    return new Response('Gemini API endpoint is working', {
        headers: {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*',
        },
    }) as unknown as WorkerResponse;
};

export const onRequestPost: PagesFunction<Env> = async (context): Promise<WorkerResponse> => {
    try {
        const body = await context.request.json() as ChatRequest;
        
        if (!body.message) {
            throw new Error('Message is required');
        }
        
        // Define channel from request or use default
        const channel = body.channel || 'default';
        
        // Fetch channel messages to provide context
        let channelContext = "";
        try {
            // Get the KV store
            const kv = await getKV(context, true);
            
            if (kv) {
                // Fetch messages from the channel
                const channelMessages = await scroll(kv)
                    .channel(channel)
                    .seek();
                
                if (channelMessages && channelMessages.messages && Object.keys(channelMessages.messages).length > 0) {
                    // Format messages for the AI
                    channelContext = "Previous channel messages:\n" + 
                        Object.entries(channelMessages.messages)
                            .map(([key, data]) => {
                                // @ts-ignore - assuming data has text property
                                return `${key}: ${data.text || data.toString()}`;
                            })
                            .join('\n');
                    
                    console.log(`Found ${Object.keys(channelMessages.messages).length} messages in channel ${channel}`);
                }
            }
        } catch (error) {
            console.error('Error fetching channel context:', error);
            // Continue without context if there's an error
        }
        
        // Get model from request or use default models list
        const requestedModel = body.model || undefined;
        
        // Try multiple model names in order of preference
        const modelNames = requestedModel ? 
            [requestedModel] : // Use only the requested model
            [
                'gemini-1.5-flash',    // Use this as default
                'gemini-2.0-flash-001', // Try the newest model
                'models/gemini-pro',    // Try with full path format
                'gemini-pro',           // Standard format
                'gemini-1.0-pro'        // Version-specific format
            ];
        
        let responseText = null;
        let apiError = null;
        let suggestedContent = [];
        
        // Try each model name until one works
        for (const modelName of modelNames) {
            try {
                console.log(`Trying model: ${modelName}...`);
                
                // Create prompt with channel context if available
                const prompt = channelContext 
                    ? `${channelContext}\n\nUser's new message: ${body.message}\n\nPlease respond to the user's new message with the channel context in mind.`
                    : body.message;
                
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                });
                
                responseText = response.text;
                
                if (responseText) {
                    console.log(`Success with model: ${modelName}`);
                    suggestedContent = extractSuggestedContent(responseText);
                    break;
                }
            } catch (err) {
                console.log(`Failed with model ${modelName}: ${err.message}`);
                if (!apiError) apiError = err; // Keep the first error
            }
        }
        
        if (responseText) {
            return new Response(JSON.stringify({ 
                success: true, 
                reply: responseText,
                suggestedContent,
                hasChannelContext: channelContext.length > 0
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }) as unknown as WorkerResponse;
        } else {
            console.error('All model attempts failed:', apiError);
        }
        
        // If we got here, the API failed - use fallback
        console.log("Using fallback response mechanism");
        const fallbackResponse = getFallbackResponse();
        
        // Create simple suggested content for fallback
        suggestedContent = [
            "Can you try a different question?",
            "Could you rephrase your request?",
            "Let's try something else"
        ];
        
        return new Response(JSON.stringify({ 
            success: true, 
            reply: fallbackResponse,
            suggestedContent,
            usingFallback: true
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        }) as unknown as WorkerResponse;
        
    } catch (error) {
        console.error('Request processing error:', error);
        
        return new Response(JSON.stringify({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error.toString()
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        }) as unknown as WorkerResponse;
    }
};

function extractSuggestedContent(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    
    return sentences
        .filter(sentence => 
            sentence.trim().length > 15 &&
            (
                /\b(important|key|notable|significant|recommend|suggest)\b/i.test(sentence) ||
                /\d/.test(sentence) ||
                sentence.includes(':') ||
                /\b(how|what|why|when|where|which|who)\b/i.test(sentence)
            )
        )
        .map(sentence => sentence.trim())
        .slice(0, 3);
}
