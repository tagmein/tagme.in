async function suggestMessages(
 suggestedMessagesContainer,
 composeTextarea,
 channel,
 message
) {
 try {
  suggestedMessagesContainer.innerHTML = ''
  suggestedMessagesContainer.appendChild(
   elem({
    classes: ['text-message'],
    tagName: 'p',
    children: [
     elem({
      tagName: 'span',
      textContent:
       'Please wait, generating suggested messages...',
     }),
    ],
   })
  )
  const suggestBody = JSON.stringify({
   channel,
   message,
  })
  const suggestResponse = await withLoading(
   fetch(`${networkRootUrl()}/generate`, {
    method: 'POST',
    body: suggestBody,
    headers: {
     'Content-Type': 'application/json',
    },
   })
  )
  const suggestedMessages = await withLoading(
   suggestResponse.json()
  )
  suggestedMessagesContainer.innerHTML = ''
  if (
   !Array.isArray(suggestedMessages) ||
   suggestedMessages.length < 1
  ) {
   throw new Error(
    'No suggested messages found'
   )
  }
  for (const suggestedMessage of suggestedMessages) {
   suggestedMessagesContainer.appendChild(
    elem({
     classes: [
      'text-message',
      'suggested-message',
     ],
     tagName: 'p',
     children: [
      elem({
       tagName: 'span',
       textContent: suggestedMessage,
      }),
      elem({
       tagName: 'a',
       events: {
        click(e) {
         e.preventDefault()
         composeTextarea.value =
          suggestedMessage
         composeTextarea.focus()
         composeTextarea.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
         })
        },
       },
       textContent: 'Use this message',
      }),
     ],
    })
   )
  }
 } catch (e) {
  suggestedMessagesContainer.appendChild(
   elem({
    classes: ['text-message'],
    tagName: 'p',
    children: [
     elem({
      tagName: 'span',
      textContent:
       'There was an error suggesting messages ',
     }),
     elem({
      tagName: 'a',
      events: {
       click(e) {
        e.preventDefault()
        suggestMessages(
         suggestedMessagesContainer,
         composeTextarea,
         channel,
         message
        )
       },
       textContent: 'Try again',
      },
     }),
    ],
   })
  )
  throw e
 }
}
