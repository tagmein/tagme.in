const reactionOptions = [
 '👍',
 '❤️',
 '😄',
 '🎉',
 '😮',
 '😢',
 '👎',
 '🚀',
 '👏',
 '🤔',
]

// Cache for reactions by message ID
const reactionCache = new Map()

// Set to track message IDs needing reaction data
const pendingReactionRequests = new Set()
let reactionFetchTimeout = null

const reactionOptionsLoaded = new Promise(
 async (resolve) => {
  setTimeout(async () => {
   const reactionsChannelContent =
    await networkChannelSeek('reactions', 0)
   const updatedReactionOptions = Object.keys(
    reactionsChannelContent.response.messages
   )
    .filter((x) => x.startsWith('reaction'))
    .map((x) => x.slice('reaction'.length))
   if (updatedReactionOptions.length >= 10) {
    reactionOptions.splice(
     0,
     Infinity,
     ...updatedReactionOptions.slice(0, 10)
    )
   }
   resolve(reactionOptions)
  }, 1000)
 }
)

async function fetchReactions() {
 if (pendingReactionRequests.size === 0) {
  return
 }

 const messageIds = Array.from(
  pendingReactionRequests
 )
 pendingReactionRequests.clear()

 // Filter out cached message IDs
 const uncachedMessageIds = messageIds.filter(
  (id) => !reactionCache.has(id)
 )

 if (uncachedMessageIds.length === 0) {
  return
 }

 try {
  const response = await fetch(
   `${networkRootUrl()}/reactions`,
   {
    method: 'POST',
    headers: {
     'Content-Type': 'application/json',
     Accept: 'application/json',
    },
    body: JSON.stringify({
     getForMessageIds: uncachedMessageIds,
    }),
   }
  )

  if (!response.ok)
   throw new Error('Failed to fetch reactions')

  const data = await response.json()

  function getReactionContainers(messageId) {
   return document.querySelectorAll(
    `[data-message-id="${messageId}"]`
   )
  }

  // Update cache and UI with new reaction data
  data.reactions.forEach(
   ({ messageId, reactions }) => {
    reactionCache.set(messageId, reactions)

    // Update UI if container exists
    const containers =
     getReactionContainers(messageId)
    if (containers) {
     for (const container of containers) {
      updateReactionDisplay(
       messageId,
       container,
       reactions
      )
     }
    }
   }
  )
 } catch (err) {
  console.error(
   'Error fetching reactions:',
   err
  )
 }
}

function updateReactionDisplay(
 messageId,
 container,
 reactions
) {
 // Clear existing reactions
 container.innerHTML = ''

 // Group reactions by emoji
 const reactionScores = {}
 Object.entries(reactions).forEach(
  ([key, data]) => {
   if (key.startsWith('reaction')) {
    const emoji = key.slice('reaction'.length)
    reactionScores[emoji] =
     (reactionScores[emoji] || 0) +
     (1 + calculateScore(data))
   }
  }
 )

 // Create reaction elements
 Object.entries(reactionScores)
  .sort((a, b) => b[1] - a[1])
  .forEach(([reaction, score]) => {
   const reactionElement = elem({
    tagName: 'button',
    classes: ['reaction'],
    dataset: {
     reaction,
    },
    attributes: {
     title: `Score: ${Math.round(
      score
     ).toString(10)}`,
    },
    textContent: `${reaction} ${niceNumber(
     score
    )}`,
    events: {
     click: async () => {
      reactionElement.style.opacity = 0.5
      reactionElement.style.pointerEvents =
       'none'
      try {
       await addReaction(messageId, reaction)
       reactionElement.classList.add('active')
      } catch (err) {
       console.error(
        'Error adding reaction:',
        err
       )
       reactionElement.classList.remove(
        'active'
       )
      } finally {
       reactionElement.style.opacity = 1
       reactionElement.style.pointerEvents =
        'auto'
      }
     },
    },
   })
   container.appendChild(reactionElement)
  })
}

function queueReactionFetch(messageId) {
 pendingReactionRequests.add(messageId)

 clearTimeout(reactionFetchTimeout)
 reactionFetchTimeout = setTimeout(
  fetchReactions,
  500
 )
}

async function addReaction(
 messageId,
 reaction
) {
 try {
  const response = await fetch(
   `${networkRootUrl()}/reactions`,
   {
    method: 'POST',
    headers: {
     Accept: 'application/json',
     'Content-Type': 'application/json',
    },
    body: JSON.stringify({
     createForMessageId: messageId,
     reaction: reaction,
    }),
   }
  )
  if (!response.ok) {
   throw new Error(
    'Failed to add reaction: HTTP ' +
     response.status
   )
  }
 } catch (err) {
  console.error('Error adding reaction:', err)
  throw err
 }
}

function reactionMessageId(channel, message) {
 return `channel-message-${encodeURIComponent(
  channel
 )}--${encodeURIComponent(message.text)}`
}

function attachReactions(
 container,
 channel,
 message
) {
 const messageId = reactionMessageId(
  channel,
  message
 )

 const reactions = elem({
  tagName: 'div',
  classes: ['reactions-list'],
  dataset: {
   messageId,
  },
 })

 // Queue this message for reaction fetching if not cached
 if (!reactionCache.has(messageId)) {
  queueReactionFetch(messageId)
 } else {
  // If cached, update display immediately
  updateReactionDisplay(
   messageId,
   reactions,
   reactionCache.get(messageId)
  )
 }

 let isOpening = false
 let isOpeningTimeout = null

 const addReactionButton = elem({
  children: [icon('no')],
  classes: ['reaction'],
  tagName: 'button',
  textContent: 'React',
  events: {
   click: async function () {
    if (isOpening) {
     return
    }
    isOpening = true
    clearTimeout(isOpeningTimeout)
    isOpeningTimeout = setTimeout(() => {
     isOpening = false
    }, 250)

    if (popupMenuElement) {
     popupMenuElement.remove()
    }

    const popup = await createPopupMenu()
    popupMenuElement = popup.element
    addReactionButton.parentElement.appendChild(
     popupMenuElement
    )

    const closePopup = (e) => {
     if (!popupMenuElement) {
      document.removeEventListener(
       'click',
       closePopup
      )
      return
     }
     if (!popupMenuElement.contains(e.target)) {
      popupMenuElement.remove()
      document.removeEventListener(
       'click',
       closePopup
      )
     }
    }

    setTimeout(() => {
     document.addEventListener(
      'click',
      closePopup
     )
    }, 0)
   },
  },
 })
 container.appendChild(
  elem({
   tagName: 'div',
   classes: ['reactions-container'],
   children: [reactions, addReactionButton],
  })
 )

 let popupMenuElement = null

 async function createPopupMenu() {
  await reactionOptionsLoaded
  const menu = elem({
   dataset: {
    themeBg: true,
   },
   tagName: 'div',
   classes: ['reaction-popup'],
  })

  reactionOptions.forEach((reaction) => {
   let reactionElement = null
   const reactionBtn = elem({
    tagName: 'button',
    classes: ['reaction-option'],
    textContent: reaction,
    events: {
     click: async () => {
      reactionElement = reactions.querySelector(
       `[data-reaction="${reaction}"]`
      )
      if (reactionElement) {
       reactionElement.style.opacity = 1
       reactionElement.classList.add('active')
      } else {
       reactionElement = elem({
        dataset: {
         reaction,
        },
        tagName: 'button',
        classes: ['reaction', 'active'],
        textContent: `${reaction} 1`,
        style: {
         opacity: 0.5,
        },
       })
       reactions.appendChild(reactionElement)
      }
      try {
       await addReaction(messageId, reaction)
       reactionElement.style.opacity = 1
      } catch (err) {
       console.error(
        'Error adding reaction:',
        err
       )
       reactionElement.remove()
      }

      popupMenuElement.remove()
      popupMenuElement = null
     },
    },
   })

   menu.appendChild(reactionBtn)
  })

  return { element: menu }
 }
}
