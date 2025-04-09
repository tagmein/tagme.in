const tourCompleted =
 localStorage.getItem('tour') === 'complete'

let tourIsActive

function tour() {
 if (tourIsActive) {
  return
 }
 tourIsActive = true
 const elements = Array.from(
  document.querySelectorAll('*[data-tour]')
 ).filter(
  (x) => x.getBoundingClientRect().width > 0
 )

 let tourPointer = 0

 function exitTour() {
  document.body.removeChild(tourElement)
  document.body.removeChild(tourShade)
  localStorage.setItem('tour', 'complete')
  tourIsActive = false
 }

 function back() {
  if (tourPointer === 0) {
   tourPointer = elements.length - 1
  } else {
   tourPointer--
  }
  refreshTour()
 }

 function next() {
  if (tourPointer === elements.length - 1) {
   tourPointer = 0
   exitTour()
   const tourFinished = dialog(
    false, // Omit cancel button
    elem({
     tagName: 'h2',
     textContent: 'End of tour',
    }),
    elem({
     tagName: 'p',
     textContent:
      "You've reached the end of the Tag Me In tour." +
      ' You can start the tour over, or start using Tag Me In.',
    }),
    elem({
     events: {
      click: () => {
       tour()
       nextButton.focus()
       tourFinished.close()
      },
     },
     tagName: 'button',
     textContent: 'Restart tour',
    }),
    elem({
     events: {
      click: () => tourFinished.close(),
     },
     tagName: 'button',
     textContent: 'Done',
    })
   )
  } else {
   tourPointer++
   refreshTour()
  }
 }

 const exitButton = elem({
  tagName: 'button',
  textContent: 'Exit',
  events: {
   click: exitTour,
  },
 })

 const backButton = elem({
  tagName: 'button',
  textContent: 'Back',
  events: {
   click: back,
  },
 })

 const nextButton = elem({
  tagName: 'button',
  textContent: 'Next',
  events: {
   click: next,
  },
 })

 const tourButtons = elem({
  classes: ['tour-buttons'],
  children: [
   exitButton,
   backButton,
   nextButton,
  ],
 })

 const tourMessage = elem({
  tagName: 'p',
 })

 const tourElement = elem({
  classes: ['tour-container'],
  children: [tourMessage, tourButtons],
 })

 const tourSelf = elem({
  children: [elem(), elem(), elem(), elem()],
 })

 const tourShade = elem({
  classes: ['tour-shade'],
  children: [tourSelf],
 })

 function repositionTour() {
  for (const t of Array.from(
   tourSelf.children
  )) {
   t.style.display = 'none'
  }
  const currentElement = elements[tourPointer]
  const box =
   currentElement.getBoundingClientRect()
  const self =
   tourElement.getBoundingClientRect()
  const pad = 10
  const moreRoomAbove =
   box.top > innerHeight / 2
  const moreRoomLeft = box.left > innerWidth / 2
  Object.assign(
   tourElement.style,
   moreRoomAbove
    ? {
       bottom: `${Math.max(
        pad,
        Math.min(
         innerHeight -
          self.height -
          pad -
          scrollY,
         innerHeight - box.top + pad
        )
       )}px`,
       top: 'auto',
      }
    : {
       bottom: 'auto',
       top: `${Math.max(
        pad,
        Math.min(
         scrollY +
          innerHeight -
          self.height -
          pad,
         box.bottom + pad
        )
       )}px`,
      }
  )
  Object.assign(
   tourElement.style,
   moreRoomLeft
    ? {
       left: 'auto',
       right: `${Math.max(
        pad,
        Math.min(
         innerWidth - self.width - pad,
         innerWidth - box.right + pad
        )
       )}px`,
      }
    : {
       left: `${Math.max(
        pad,
        Math.min(
         innerWidth - self.width - pad,
         box.left + pad
        )
       )}px`,
       right: 'auto',
      }
  )
  Object.assign(tourSelf.style, {
   left: `${box.left}px`,
   top: `${box.top}px`,
   height: `${box.height}px`,
   width: `${box.width}px`,
  })
  scrollX = 0
  document.body.scrollLeft = 0
  setTimeout(() => {
   scrollX = 0
   document.body.scrollLeft = 0
  }, 100)
  tourSelf.children[3].style.width =
   window.innerWidth - box.right + 'px'
  for (const t of Array.from(
   tourSelf.children
  )) {
   t.style.display = 'block'
  }
 }

 async function refreshTour() {
  const currentElement = elements[tourPointer]
  if (!currentElement) {
   exitTour()
   return
  }
  currentElement.scrollIntoView({
   behavior: 'instant',
   block: 'start',
   inline: 'start',
  })
  tourMessage.textContent =
   currentElement.getAttribute('data-tour')
  tourElement?.scrollIntoView({
   behavior: 'instant',
   block: 'center',
  })
  currentElement?.scrollIntoView({
   behavior: 'instant',
   block: 'center',
  })
  repositionTour()
  tourElement?.scrollIntoView({
   behavior: 'instant',
   block: 'center',
  })
  currentElement?.scrollIntoView({
   behavior: 'instant',
   block: 'center',
  })
  await new Promise((r) => setTimeout(r, 50))
  tourElement?.scrollIntoView({
   behavior: 'instant',
   block: 'center',
  })
  currentElement?.scrollIntoView({
   behavior: 'instant',
   block: 'center',
  })
  repositionTour()
 }

 document.body.appendChild(tourShade)
 document.body.appendChild(tourElement)

 refreshTour()

 nextButton.focus()
}

if (!tourCompleted) {
 setTimeout(tour, 50)
}
