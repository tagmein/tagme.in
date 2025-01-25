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

function attachReactions(
 container,
 channel,
 message
) {
 //  console.log(
 //   'attachReactions',
 //   channel,
 //   message
 //  )
 const reactions = elem({
  tagName: 'div',
  classes: ['reactions-list'],
 })
 let isOpening = false
 let isOpeningTimeout = null
 const addReaction = elem({
  children: [icon('no')], // we rotate the icon to make it a plus in theme.css
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
   })

   reactionBtn.addEventListener('click', () => {
    // Add the reaction to the reactions list
    const reactionElement = elem({
     tagName: 'button',
     classes: ['reaction', 'active'],
     textContent: `${reaction} 1`,
    })
    reactions.appendChild(reactionElement)

    // Close the popup
    popupMenu.remove()
    popupMenu = null
   })

   menu.appendChild(reactionBtn)
  })

  return { element: menu }
 }
}
