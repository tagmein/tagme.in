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
  
  // Ensure tourElement is measured before positioning
  tourElement.style.visibility = 'hidden'
  tourElement.style.display = 'block'
  const self =
   tourElement.getBoundingClientRect()
  tourElement.style.visibility = 'visible'

  const pad = 10
  
  // Get current scroll position
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  // Use absolute positioning for the message box so it scrolls with the page
  tourElement.style.position = 'absolute'
  
  const moreRoomAbove =
   box.top > window.innerHeight / 2
  const moreRoomLeft = box.left > window.innerWidth / 2
  
  // Calculate available space in viewport
  const spaceAbove = box.top
  const spaceBelow = window.innerHeight - box.bottom
  
  // Position vertically (Relative to document)
  if (moreRoomAbove && spaceAbove >= self.height + pad) {
   tourElement.style.top = `${scrollTop + box.top - self.height - pad}px`
  } else if (spaceBelow >= self.height + pad) {
   tourElement.style.top = `${scrollTop + box.bottom + pad}px`
  } else {
   if (spaceAbove > spaceBelow) {
    tourElement.style.top = `${scrollTop + Math.max(pad, box.top - self.height - pad)}px`
   } else {
    tourElement.style.top = `${scrollTop + Math.max(pad, box.bottom + pad)}px`
   }
  }
  tourElement.style.bottom = 'auto'
  
  // Position horizontally (Relative to document)
  if (moreRoomLeft && box.right - self.width >= pad) {
   tourElement.style.left = `${scrollLeft + box.right - self.width}px`
  } else if (box.left + self.width <= window.innerWidth - pad) {
   tourElement.style.left = `${scrollLeft + box.left}px`
  } else {
   const leftPos = Math.max(pad, Math.min(
    window.innerWidth - self.width - pad,
    box.left
   ))
   tourElement.style.left = `${scrollLeft + leftPos}px`
  }
  tourElement.style.right = 'auto'
  
  // CRITICAL FIX: Position the highlight box using FIXED positioning
  // so it uses the exact coordinates from getBoundingClientRect()
  Object.assign(tourSelf.style, {
   position: 'fixed',
   left: `${box.left}px`,
   top: `${box.top}px`,
   height: `${box.height}px`,
   width: `${box.width}px`,
   zIndex: '9999',
   pointerEvents: 'none'
  })
  
  // Ensure the container itself doesn't shift
  Object.assign(tourShade.style, {
   position: 'fixed',
   top: '0',
   left: '0',
   width: '100%',
   height: '100%',
   pointerEvents: 'none',
   zIndex: '9998'
  })

  // Prevent horizontal scroll
  document.body.scrollLeft = 0
  
  // Set the right-side shade width
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
