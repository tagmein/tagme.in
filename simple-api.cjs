const http = require('http');
const url = require('url');

// Simple in-memory message storage
const messages = {};

const server = http.createServer((req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Realm');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // Handle different endpoints
    if (path === '/send') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          console.log('Received send request:', data);
          
          // Store the message
          const channel = data.channel || 'general';
          if (!messages[channel]) {
            messages[channel] = [];
          }
          
          const message = {
            id: Date.now(),
            text: data.message,
            sender: data.userName || 'Anonymous',
            timestamp: new Date().toISOString(),
            score: 0
          };
          
          messages[channel].push(message);
          console.log('Stored message in channel', channel, ':', message);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, id: message.id }));
        } catch (error) {
          console.error('Error parsing send request:', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    } else if (path === '/news') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ items: [] }));
    } else if (path === '/seek') {
      // Handle seek endpoint for fetching channel messages
      const channel = parsedUrl.query.channel;
      const hour = parsedUrl.query.hour;
      console.log('Seek request for channel:', channel, 'hour:', hour);
      
      // Return stored messages for this channel
      const channelMessages = messages[channel] || [];
      console.log('Returning messages for channel', channel, ':', channelMessages);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        response: { messages: channelMessages }
      }));
    } else if (path === '/channel-info') {
      // Handle channel-info endpoint
      const channel = parsedUrl.query.channel;
      console.log('Channel info request for:', channel);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        name: channel,
        created: Date.now(),
        messageCount: (messages[channel] || []).length
      }));
    } else if (path.startsWith('/store/')) {
      // Simple store endpoint that returns empty data for now
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    } else {
      console.log('404 for path:', path);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(8787, 'localhost', () => {
  console.log('Tag Me In API server running on http://localhost:8787');
});
