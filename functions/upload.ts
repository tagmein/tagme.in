export async function onRequest(context) {
  try {
    if (context.request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { imageUrl } = await context.request.json()
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      return new Response('Image URL is required', { status: 400 })
    }

    // Validate that it's an image URL
    const isImageUrl = /https?:\/\/\S+\.(gif|jpe?g|png|webp)/i
    if (!isImageUrl.test(imageUrl)) {
      return new Response('Invalid image URL', { status: 400 })
    }

    // Fetch the image
    let imageResponse
    try {
      imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'TagMeIn/1.0'
        }
      })
    } catch (fetchError) {
      console.error('Fetch error:', fetchError)
      // Fallback: return the original URL if upload fails
      return new Response(JSON.stringify({
        originalUrl: imageUrl,
        uploadedUrl: imageUrl, // Fallback to original
        filename: null
      }), {
        headers: {
          'Content-Type': 'application/json',
        }
      })
    }
    
    if (!imageResponse.ok) {
      // Fallback: return the original URL if fetch fails
      return new Response(JSON.stringify({
        originalUrl: imageUrl,
        uploadedUrl: imageUrl, // Fallback to original
        filename: null
      }), {
        headers: {
          'Content-Type': 'application/json',
        }
      })
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    
    // Generate a unique filename
    const filename = `uploaded-${Date.now()}-${Math.random().toString(36).substring(2)}.${imageUrl.split('.').pop()}`
    
    // For now, we'll use a simple approach: serve the image through a proxy endpoint
    // In a production environment, you'd upload to R2 or another object storage
    const uploadedImageUrl = `/image-proxy/${filename}`
    
    // Store the image data in KV for now (this is a temporary solution)
    const kv = context.env.TAGMEIN_LOCAL_KV ? 
      context.env.TAGMEIN_LOCAL_KV : 
      context.env.TAGMEIN_KV

    if (kv) {
      await kv.put(`image:${filename}`, imageBuffer)
    }

    return new Response(JSON.stringify({
      originalUrl: imageUrl,
      uploadedUrl: uploadedImageUrl,
      filename: filename
    }), {
      headers: {
        'Content-Type': 'application/json',
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
