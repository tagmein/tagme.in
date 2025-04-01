import { handleRequest } from "../api/handler";

type Env = {
    GEMINI_API_KEY: string;
};

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const channel = url.searchParams.get("channel");
    const message = url.searchParams.get("message");
    
    if (!message) {
        return new Response(JSON.stringify({ error: "Message is required" }), { status: 400 });
    }

    const prompt = channel
        ? `Context: Messages from channel ${channel}. User message: ${message}`
        : `User message: ${message}`;

    // Fetch the channel's messages if required (simulating GET /seek request)
    if (channel) {
        const messagesResponse = await fetch(`https://api.example.com/seek?channel=${channel}&hour=999999999`);
        const messages = await messagesResponse.json();
        // Append some of the messages as context for the AI
        const channelMessages = messages.slice(0, 5).map(msg => msg.text).join("\n");
        prompt += `\nPrevious channel messages:\n${channelMessages}`;
    }

    const response = await fetch("https://gemini.googleapis.com/v1/models/gemini-1:generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.GEMINI_API_KEY}`
        },
        body: JSON.stringify({ prompt })
    });

    const result = await response.json();

    return new Response(JSON.stringify({
        response: result.choices?.[0]?.text || "No response"
    }), { status: 200 });
};
