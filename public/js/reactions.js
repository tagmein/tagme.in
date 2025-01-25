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
   //  console.log(
   //   reactionOptions,
   //   updatedReactionOptions
   //  )
   if (updatedReactionOptions.length >= 10) {
    reactionOptions.splice(
     0,
     Infinity,
     ...updatedReactionOptions.slice(0, 10)
    )
    // console.log(reactionOptions)
   }
   resolve(reactionOptions)
  }, 1000)
 }
)

async function fetchReactions() {
 if (pendingReactionRequests.size === 0) return

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
  const response = await fetch('/reactions', {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json',
   },
   body: JSON.stringify({
    getForMessageIds: uncachedMessageIds,
   }),
  })

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
 const reactionCounts = {}
 Object.entries(
  reactions.messages || {}
 ).forEach(([key, data]) => {
  if (key.startsWith('reaction')) {
   const emoji = key.slice('reaction'.length)
   reactionCounts[emoji] =
    (reactionCounts[emoji] || 0) + 1
  }
 })

 // Create reaction elements
 Object.entries(reactionCounts).forEach(
  ([emoji, count]) => {
   const reactionElement = elem({
    tagName: 'button',
    classes: ['reaction', 'active'],
    textContent: `${emoji} ${count}`,
   })
   container.appendChild(reactionElement)
  }
 )
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
  await fetch('/reactions', {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json',
   },
   body: JSON.stringify({
    createForMessageId: messageId,
    reaction: reaction,
   }),
  })
 } catch (err) {
  console.error('Error adding reaction:', err)
 }
}

function attachReactions(
 container,
 channel,
 message
) {
 const messageId = `${channel}--message-${message.text}`

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
 const addReaction = elem({
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

    // Remove existing popup if one exists
    if (popupMenu) {
     popupMenu.remove()
    }

    // Create new popup
    const popup = await createPopupMenu()
    popupMenu = popup.element

    // Position popup relative to add reaction button
    const rect =
     addReaction.getBoundingClientRect()
    popupMenu.style.top = `${
     rect.bottom - 227
    }px`
    popupMenu.style.left = `${rect.left}px`

    // Add popup to document
    document.body.appendChild(popupMenu)

    // Close popup when clicking outside
    const closePopup = (e) => {
     if (!popupMenu) {
      document.removeEventListener(
       'click',
       closePopup
      )
      return
     }
     if (
      !popupMenu.contains(e.target) &&
      e.target !== addReaction
     ) {
      popupMenu.remove()
      document.removeEventListener(
       'click',
       closePopup
      )
     }
    }

    // Add small delay before adding click listener to prevent immediate close
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
   children: [reactions, addReaction],
  })
 )

 let popupMenu = null

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
   const reactionBtn = elem({
    tagName: 'button',
    classes: ['reaction-option'],
    textContent: reaction,
    events: {
     click: async () => {
      await addReaction(message.id, reaction)

      const reactionElement = elem({
       tagName: 'button',
       classes: ['reaction', 'active'],
       textContent: `${reaction} 1`,
      })
      reactions.appendChild(reactionElement)

      popupMenu.remove()
      popupMenu = null
     },
    },
   })

   menu.appendChild(reactionBtn)
  })

  return { element: menu }
 }
}
