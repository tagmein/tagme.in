const tourCompleted =
 localStorage.getItem('tour') === 'complete'

function tour() {
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
  removeEventListener('scroll', refreshTour)
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
  } else {
   tourPointer++
  }
  refreshTour()
 }

 const tourButtons = elem({
  classes: ['tour-buttons'],
  children: [
   elem({
    tagName: 'button',
    textContent: 'Exit',
    events: {
     click: exitTour,
    },
   }),
   elem({
    tagName: 'button',
    textContent: 'Back',
    events: {
     click: back,
    },
   }),
   elem({
    tagName: 'button',
    textContent: 'Next',
    events: {
     click: next,
    },
   }),
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
         innerHeight - self.height - pad,
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
         innerHeight - self.height - pad,
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
 }

 async function refreshTour() {
  const currentElement = elements[tourPointer]
  if (!currentElement) {
   exitTour()
   return
  }
  removeEventListener('scroll', refreshTour)
  currentElement.scrollIntoView({
   behavior: 'instant',
   block: 'start',
   inline: 'start',
  })
  scrollBy({
   behavior: 'instant',
   top: -240,
  })
  addEventListener('scroll', refreshTour)
  tourMessage.textContent =
   currentElement.getAttribute('data-tour')
  repositionTour()
  await new Promise((r) => setTimeout(r, 250))
  repositionTour()
  await new Promise((r) => setTimeout(r, 250))
  repositionTour()
 }

 addEventListener('scroll', refreshTour)

 document.body.appendChild(tourShade)
 document.body.appendChild(tourElement)

 refreshTour()
}

if (!tourCompleted) {
 setTimeout(tour, 50)
}
