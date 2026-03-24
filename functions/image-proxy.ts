export async function onRequest(context) {
  try {
    const filename = context.params.filename
    
    if (!filename) {
      return new Response('Filename is required', { status: 400 })
    }

    // Retrieve the image from KV storage
    const kv = context.env.TAGMEIN_LOCAL_KV ? 
      context.env.TAGMEIN_LOCAL_KV : 
      context.env.TAGMEIN_KV

    if (!kv) {
      return new Response('Storage not available', { status: 500 })
    }

    const imageData = await kv.get(`image:${filename}`, { type: 'arrayBuffer' })
    
    if (!imageData) {
      return new Response('Image not found', { status: 404 })
    }

    // Determine content type from filename
    const ext = filename.split('.').pop().toLowerCase()
    const contentType = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    }[ext] || 'image/jpeg'

    return new Response(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      }
    })

  } catch (error) {
    console.error('Image proxy error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
