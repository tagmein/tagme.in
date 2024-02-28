async function suggestMessages(
 suggestedMessagesContainer,
 channel,
 message
) {
 try {
  const suggestBody = JSON.stringify({
   channel,
   message,
  })
  const suggestResponse = await fetch(
   `${networkRootUrl()}/generate`,
   {
    method: 'POST',
    body: suggestBody,
    headers: {
     'Content-Type': 'application/json',
    },
   }
  )
  const suggestData =
   await suggestResponse.json()
  console.log(suggestData)
 } catch (e) {
  suggestedMessagesContainer.appendChild(
   elem({
    classes: ['text-message'],
    tagName: 'p',
   })
  )
 }
}
