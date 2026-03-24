async function forkChannel(originalChannel) {
 try {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 6)
  const forkChannelName = `${originalChannel}-fork-${timestamp}-${randomSuffix}`
  
  console.log(`Starting fork from ${originalChannel} to ${forkChannelName}`)
  
  const loadingMessage = await withLoading(
   networkChannelSeek(originalChannel, getHourNumber())
  )
  
  if (!loadingMessage?.response?.messages) {
   throw new Error('Could not fetch messages from original channel')
  }
  
  let messages = loadingMessage.response.messages
  
  if (typeof messages === 'object' && !Array.isArray(messages)) {
   messages = Object.values(messages)
  }
  
  if (!Array.isArray(messages)) {
   throw new Error('Messages data is not in expected format')
  }
  
  console.log(`Found ${messages.length} messages to copy`)
  
  let sentCount = 0
  for (const message of messages) {
   if (message && message.text) {
    try {
      await networkChannelSend(forkChannelName, message.text)
      sentCount++
    } catch (sendError) {
      console.error('Failed to send message:', sendError)
    }
    
    if (sentCount % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
   }
  }
  
  setChannel(forkChannelName)
  await politeAlert(`Channel forked successfully! Copied ${sentCount} messages to: ${forkChannelName}`)
  
 } catch (error) {
  console.error('Fork channel error:', error)
  await politeAlert(`Failed to fork channel: ${error.message}`)
 }
}
