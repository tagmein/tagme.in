// functions/chat.ts - Backend chat API integration

import { handleRequest } from "../api/handler";

type Env = {
    GEMINI_API_KEY: string;
};

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const channel = url.searchParams.get("channel");
    const message = url.searchParams.get("message");

    // Return an error if the message is not provided
    if (!message) {
        return new Response(JSON.stringify({ error: "Message is required" }), { status: 400 });
    }

    // Ensure the Gemini API key is available
    if (!env.GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: "Gemini API key not configured." }), { status: 500 });
    }

    // Prepare the prompt based on channel and message context
    let prompt = `User message: ${message}`;
    if (channel) {
        // Fetch the messages from the channel if it's provided
        const channelMessages = await fetchChannelMessages(channel);
        prompt = `Context: Messages from channel ${channel}: ${channelMessages.join(' ')} User message: ${message}`;
    }

    // Send the prompt to the Gemini API
    try {
        const response = await fetch("https://gemini.googleapis.com/v1/models/gemini-1:generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.GEMINI_API_KEY}`
            },
            body: JSON.stringify({ prompt })
        });

        const result = await response.json();
        return new Response(JSON.stringify({ response: result.choices?.[0]?.text || "No response" }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Error interacting with Gemini API." }), { status: 500 });
    }
};

// Helper function to fetch messages from a channel
async function fetchChannelMessages(channel: string): Promise<string[]> {
    try {
        const response = await fetch(`https://api.example.com/seek?channel=${encodeURIComponent(channel)}&hour=999999999`);
        const data = await response.json();
        return data.messages || [];  // Assuming the API returns an array of messages
    } catch (error) {
        console.error("Error fetching channel messages:", error);
        return [];
    }
}
