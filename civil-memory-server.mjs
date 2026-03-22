#!/usr/bin/env node
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3333;
const basePath = process.env.BASE_PATH || path.join(__dirname, '.kv-local');

async function diskPath(namespace, key) {
  const dirPath = [basePath, namespace];
  const fileName = `${encodeURIComponent(key)}.txt`;
  
  // Create directory if it doesn't exist
  try {
    await fs.mkdir(path.join(basePath, namespace), { recursive: true });
  } catch (e) {
    // ignore
  }
  
  return path.join(...dirPath, fileName);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  try {
    if (req.method === 'GET' && url.pathname === '/seek') {
      const channel = url.searchParams.get('channel');
      const hour = url.searchParams.get('hour');
      
      if (channel && hour) {
        const filePath = await diskPath(`scroll.channel.${channel}`, hour);
        try {
          const data = await fs.readFile(filePath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end(data);
        } catch (e) {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end(''); // Return empty if file doesn't exist
        }
      } else {
        res.writeHead(400);
        res.end('Missing channel or hour parameter');
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

server.listen(port, () => {
  console.log(`Civil memory server running on port ${port}`);
  console.log(`Base path: ${basePath}`);
});
