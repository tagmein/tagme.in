import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const app = express()

app.use((req, res, next) => {
 res.setHeader('Access-Control-Allow-Origin', '*')
 res.setHeader(
  'Access-Control-Allow-Headers',
  '*, Authorization, Content-Type'
 )
 res.setHeader(
  'Access-Control-Allow-Methods',
  'GET, OPTIONS, POST, DELETE'
 )
 res.setHeader('Access-Control-Max-Age', '86400')
 if (req.method === 'OPTIONS') {
  res.status(204).send('')
  return
 }
 next()
})
app.use(
 express.text({
  type: '*/*',
  limit: '20mb',
 })
)

const rootDir = process.cwd()

function resolveBasePath(req: express.Request): string {
 const raw = req.query['modeOptions.disk.basePath']
 const basePath =
  typeof raw === 'string' && raw.length > 0
   ? raw
   : './.kv'
 const resolved = path.resolve(rootDir, basePath)
 if (!resolved.startsWith(path.resolve(rootDir))) {
  throw new Error('Invalid basePath')
 }
 return resolved
}

function keyToFilename(key: string): string {
 return crypto.createHash('sha256').update(key).digest('hex')
}

async function ensureDir(dir: string) {
 await fs.mkdir(dir, { recursive: true })
}

app.get('/', async (req, res) => {
 const key = req.query.key
 if (typeof key !== 'string' || key.length === 0) {
  res.status(400).send('Missing key')
  return
 }
 let dir: string
 try {
  dir = resolveBasePath(req)
 } catch (e) {
  res.status(400).send('Invalid basePath')
  return
 }
 await ensureDir(dir)
 const filePath = path.join(dir, keyToFilename(key))
 try {
  const value = await fs.readFile(filePath, 'utf8')
  res.status(200).send(value)
 } catch (e: any) {
  if (e?.code === 'ENOENT') {
   res.status(404).send('Not found')
   return
  }
  res.status(500).send('Read failed')
 }
})

app.post('/', async (req, res) => {
 const key = req.query.key
 if (typeof key !== 'string' || key.length === 0) {
  res.status(400).send('Missing key')
  return
 }
 let dir: string
 try {
  dir = resolveBasePath(req)
 } catch (e) {
  res.status(400).send('Invalid basePath')
  return
 }
 await ensureDir(dir)
 const filePath = path.join(dir, keyToFilename(key))
 try {
  const value = typeof req.body === 'string' ? req.body : ''
  await fs.writeFile(filePath, value, 'utf8')
  res.status(204).send('')
 } catch (e) {
  res.status(500).send('Write failed')
 }
})

app.delete('/', async (req, res) => {
 const key = req.query.key
 if (typeof key !== 'string' || key.length === 0) {
  res.status(400).send('Missing key')
  return
 }
 let dir: string
 try {
  dir = resolveBasePath(req)
 } catch (e) {
  res.status(400).send('Invalid basePath')
  return
 }
 await ensureDir(dir)
 const filePath = path.join(dir, keyToFilename(key))
 try {
  await fs.unlink(filePath)
  res.status(204).send('')
 } catch (e: any) {
  if (e?.code === 'ENOENT') {
   res.status(204).send('')
   return
  }
  res.status(500).send('Delete failed')
 }
})

const port =
 typeof process.env.PORT === 'string' &&
 !Number.isNaN(parseInt(process.env.PORT))
  ? parseInt(process.env.PORT)
  : 3333

app.listen(port, '127.0.0.1', () => {
 console.log(`KV server running on http://127.0.0.1:${port}`)
})
