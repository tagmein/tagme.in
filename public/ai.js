async function suggestMessages(
 suggestedMessagesContainer,
 composeTextarea,
 formattedMessageData,
 channel,
 message
) {
 function showUpliftBot() {
  suggestedMessagesContainer.appendChild(
   elem({
    classes: ['uplift-bot-avatar'],
   })
  )
  suggestedMessagesContainer.appendChild(
   elem({
    classes: ['uplift-bot'],
    children: [
     elem({
      classes: ['uplift-bot-name'],
      tagName: 'span',
      textContent: 'Uplift Bot',
     }),
     elem({
      tagName: 'span',
      textContent: ' says:',
     }),
    ],
   })
  )
 }
 let totalRenderedSuggestions = 0
 function renderSuggestedMessages(
  suggestedMessages
 ) {
  console.log(formattedMessageData)
  for (const suggestedMessage of suggestedMessages) {
   if (
    formattedMessageData.find(
     (x) => x.text === suggestedMessage
    )
   ) {
    continue
   }
   totalRenderedSuggestions++
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
 }

 const suggestingMoreMessagesNotice = elem({
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

 const suggestError = elem({
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
      suggestMoreMessages()
     },
    },
    textContent: 'Try again',
   }),
  ],
 })

 const suggestMoreButton = elem({
  classes: ['standalone-button'],
  tagName: 'button',
  events: {
   click(e) {
    e.preventDefault()
    suggestMoreMessages()
   },
  },
  textContent: 'More ideas, please!',
 })

 let skip = 0
 async function suggestMoreMessages() {
  try {
   suggestedMessagesContainer.appendChild(
    suggestingMoreMessagesNotice
   )
   const suggestBody = JSON.stringify({
    channel,
    message,
    skip,
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

   if (
    !Array.isArray(suggestedMessages) ||
    suggestedMessages.length < 1
   ) {
    throw new Error(
     'No suggested messages found'
    )
   }

   renderSuggestedMessages(suggestedMessages)

   if (totalRenderedSuggestions < skip + 5) {
    skip += 5
    if (skip < 25) {
     setTimeout(suggestMoreMessages, 500)
    }
   }

   suggestedMessagesContainer.appendChild(
    suggestMoreButton
   )
  } catch (e) {
   suggestedMessagesContainer.appendChild(
    suggestError
   )
   throw e
  } finally {
   suggestedMessagesContainer.removeChild(
    suggestingMoreMessagesNotice
   )
  }
 }

 suggestedMessagesContainer.innerHTML = ''
 showUpliftBot()
 await suggestMoreMessages()
}
