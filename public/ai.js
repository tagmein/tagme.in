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
  for (const suggestedMessage of suggestedMessages) {
   if (
    formattedMessageData.find(
     (x) =>
      x.text.toLowerCase() ===
      suggestedMessage.toLowerCase()
    )
   ) {
    continue
   }
   exclude.push(suggestedMessage)
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
        async click(e) {
         e.preventDefault()
         if (!(await gainConsent())) {
          return
         }
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
  classes: [
   'generating-messages',
   'text-message',
  ],
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
  attributes: {
   'data-tour':
    'Let a bot suggest ideas to post.',
  },
  classes: ['standalone-button'],
  tagName: 'button',
  events: {
   click(e) {
    e.preventDefault()
    suggestMoreMessages()
   },
  },
  textContent: 'Show message ideas',
 })

 const MAX_MESSAGES_TO_GENERATE = 25

 let exclude = []
 async function suggestMoreMessages() {
  try {
   if (
    suggestMoreButton.parentElement ===
    suggestedMessagesContainer
   ) {
    suggestedMessagesContainer.removeChild(
     suggestMoreButton
    )
   }

   if (
    suggestMoreButton.textContent !==
    'More ideas, please!'
   ) {
    suggestMoreButton.textContent =
     'More ideas, please!'
   }

   if (
    suggestError.parentElement ===
    suggestedMessagesContainer
   ) {
    suggestedMessagesContainer.removeChild(
     suggestError
    )
   }
   suggestedMessagesContainer.appendChild(
    suggestingMoreMessagesNotice
   )
   const suggestBody = JSON.stringify({
    channel,
    exclude,
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

   if (
    !Array.isArray(suggestedMessages) ||
    suggestedMessages.length < 1
   ) {
    throw new Error(
     'No suggested messages found'
    )
   }

   renderSuggestedMessages(suggestedMessages)

   if (totalRenderedSuggestions < 5) {
    if (exclude.length <= 5) {
     setTimeout(suggestMoreMessages, 500)
    }
   }
   if (
    exclude.length < MAX_MESSAGES_TO_GENERATE
   ) {
    suggestedMessagesContainer.appendChild(
     suggestMoreButton
    )
   }
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
 suggestedMessagesContainer.appendChild(
  suggestMoreButton
 )
}
