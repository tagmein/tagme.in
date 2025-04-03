@@ -0,0 +1,255 @@
 import express from 'express'
 import fs from 'fs/promises'
 import path from 'path'
 import { pathToFileURL } from 'url'
 
 /**
  * The Express app that will serve both our static files and API endpoints.
  */
 const app = express()
 
 /**
  * Use the PORT environment variable, falling back to 8787.
  * Note: Express expects a number.
  */
 const port = Number(process.env.PORT || 8787)
 
 /**
  * Simulated environment object.
  * Extend this object with your KV emulation and other Cloudflare bindings as needed.
  */
 const env = {
  // Example: You can add your KV bindings or other environment variables here.
  // authKV: createLocalKV('auth'),
  TAGMEIN_LOCAL_KV: 'true',
 }
 
 /**
  * Adapter function: converts an Express request into a Cloudflare-style Request,
  * calls the provided Cloudflare function, and pipes back the Response.
  */
 async function adaptCfHandler(
  cfHandler: (context: {
   request: Request
   env: any
   params: any
  }) => Promise<Response>,
  req: express.Request,
  res: express.Response
 ) {
  // Construct the URL for the Cloudflare Request
  const protocol = req.protocol
  const host = req.get('host')
  const url = `${protocol}://${host}${req.originalUrl}`
 
  // Copy headers from the Express request into a new Headers instance
  const headers = new Headers()
  for (const [key, value] of Object.entries(
   req.headers
  )) {
   if (Array.isArray(value)) {
    headers.set(key, value.join(', '))
   } else if (value) {
    headers.set(key, String(value))
   }
  }
 
  // Prepare options for the Cloudflare Request.
  // Include the `duplex: 'half'` option if we're sending a body.
  const options: RequestInit & {
   duplex?: 'half'
  } = {
   method: req.method,
   headers,
  }
 
  // For methods that typically have a body, pass the request stream.
  if (
   req.method !== 'GET' &&
   req.method !== 'HEAD'
  ) {
   options.body = req as unknown as BodyInit
   options.duplex = 'half'
  }
 
  // Create the Cloudflare-like Request object.
  const cfRequest = new Request(url, options)
 
  // Build a context object similar to Cloudflare Workers context.
  const context = {
   request: cfRequest,
   env,
   params: req.params || {},
  }
 
  try {
   // Invoke the Cloudflare function handler.
   const cfResponse: Response = await cfHandler(
    context
   )
 
   // Set the HTTP status code from the Cloudflare Response.
   res.status(cfResponse.status)
 
   // Pass along all headers from the Cloudflare Response.
   cfResponse.headers.forEach((value, key) => {
    res.setHeader(key, value)
   })
 
   // Retrieve the response body as an ArrayBuffer and send it back.
   const arrayBuffer =
    await cfResponse.arrayBuffer()
   res.send(Buffer.from(arrayBuffer))
  } catch (err) {
   console.error(
    'Error in Cloudflare handler:',
    err
   )
   res.status(500).send('Internal Server Error')
  }
 }
 
 /**
  * A helper which wraps a Cloudflare function handler into an Express route handler.
  */
 function cfExpressHandler(
  cfHandler: (context: {
   request: Request
   env: any
   params: any
  }) => Promise<Response>
 ) {
  return (
   req: express.Request,
   res: express.Response
  ) => {
   adaptCfHandler(cfHandler, req, res)
  }
 }
 
 /**
  * Dynamically loads modules in the /functions folder that export Cloudflare-compatible functions.
  * For each file found (ending in .js or .ts), the base file name is used as the route path.
  *
  * - If an "onRequest" export exists, it is registered for ALL methods.
  * - Otherwise, exports such as onRequestGet, onRequestPost, etc. are mapped
  *   to the corresponding HTTP verb.
  */
 async function loadCfFunctions() {
  const functionsDir = path.join(
   process.cwd(),
   'functions'
  )
  let files: string[] = []
  try {
   files = await fs.readdir(functionsDir)
  } catch (err) {
   console.error(
    'Error reading functions directory:',
    err
   )
   return
  }
 
  // Support files ending in .js or .ts
  const supportedExtensions = ['.js', '.ts']
  for (const file of files) {
   const ext = path.extname(file)
   if (!supportedExtensions.includes(ext))
    continue
 
   const baseName = path.basename(file, ext)
   const routePath = '/' + baseName
   const modulePath = path.join(
    functionsDir,
    file
   )
   try {
    // Dynamically import the module. Convert the file path to a file:// URL.
    const mod = await import(
     pathToFileURL(modulePath).href
    )
 
    if (mod.onRequest) {
     console.log(
      `Registering route [ALL] ${routePath} from onRequest export`
     )
     app.all(
      routePath,
      cfExpressHandler(mod.onRequest)
     )
    } else {
     // Map method-specific exports.
     const methodMapping: {
      [key: string]:
       | 'get'
       | 'post'
       | 'put'
       | 'delete'
       | 'patch'
       | 'head'
       | 'options'
     } = {
      onRequestGet: 'get',
      onRequestPost: 'post',
      onRequestPut: 'put',
      onRequestDelete: 'delete',
      onRequestPatch: 'patch',
      onRequestHead: 'head',
      onRequestOptions: 'options',
     }
     let registered = false
     for (const [
      exportName,
      httpMethod,
     ] of Object.entries(methodMapping)) {
      if (mod[exportName]) {
       console.log(
        `Registering route [${httpMethod.toUpperCase()}] ${routePath} from ${exportName} export`
       )
       app[httpMethod](
        routePath,
        cfExpressHandler(mod[exportName])
       )
       registered = true
      }
     }
     if (!registered) {
      console.warn(
       `No valid Cloudflare function export found in ${file}`
      )
     }
    }
   } catch (err) {
    console.error(
     `Error loading module ${file}:`,
     err
    )
   }
  }
 }
 
 /**
  * Main entry-point: load the Cloudflare functions, serve the static files,
  * and then start listening on the chosen port.
  */
 async function main() {
  // Load and register all API functions.
  await loadCfFunctions()
 
  // Serve static files from the /public directory.
  const publicDir = path.join(
   process.cwd(),
   'public'
  )
  app.use(express.static(publicDir))
 
  // Start the server.
  app.listen(port, () => {
   console.log(`Server running on port ${port}`)
  })
 }
 
 main().catch((err) => {
  console.error('Error starting server:', err)
 })