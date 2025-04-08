import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { civilMemoryKV } from '@tagmein/civil-memory';

const app = new Hono();

// Enable CORS for all routes
app.use('*', cors());

// Root route
app.get('/', (c) => {
    console.log('Root route accessed');
    return c.text('Hello, Hono!');
});

// Chat route
app.get('/chat', async (c) => {
    console.log('Chat route accessed');
    const channel = c.req.query('channel') || 'default';
    const message = c.req.query('message');

    try {
        const kv = civilMemoryKV.http({ baseUrl: process.env.CIVIL_MEMORY_BASE_URL || 'http://localhost:3333' });

        // Fetch data in parallel
        const [channelData, messageData, allMessages] = await Promise.all([
            kv.get(`channel#${channel}`),
            message ? kv.get(`message#${message}`) : Promise.resolve(null),
            kv.get(`seek#${channel}#999999999`),
        ]);

        const response = {
            channel,
            message,
            reply: `This is a simulated response for channel: ${channel}, message: ${message || 'N/A'}`,
            context: allMessages || 'No messages found in the channel.',
        };

        console.log('Response:', response);
        return c.json(response);
    } catch (error) {
        console.error("Error fetching data from civilMemoryKV:", error);
        return c.json({ error: 'Failed to fetch data from civilMemoryKV' }, 500);
    }
});

// Export the fetch handler for Cloudflare Workers
export default app.fetch;
