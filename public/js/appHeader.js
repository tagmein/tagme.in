const lightDarkModeButton = elem({
 attributes: {
  'data-tour':
   'Switch between light and dark mode.',
  title: 'Switch light/dark mode',
 },
 children: [icon('sun')],
 events: {
  click(e) {
   e.stopPropagation()
   if (
    document.body.classList.contains(
     'light-mode'
    )
   ) {
    setLightMode(false)
   } else {
    setLightMode(true)
   }
  },
 },
 tagName: 'button',
})

const fullScreenButton = elem({
 attributes: {
  'data-tour': 'Toggle full screen.',
  title: 'Toggle full screen',
 },
 children: [icon('in')],
 events: {
  click(e) {
   e.stopPropagation()
   if (!document.fullscreenElement) {
    document.documentElement
     .requestFullscreen()
     .catch((e) => console.error(e))
   } else {
    document.exitFullscreen()
   }
  },
 },
 tagName: 'button',
})

function setLightMode(lightMode) {
 if (lightMode) {
  document.body.classList.add('light-mode')
  localStorage.setItem('light-mode', '1')
 } else {
  document.body.classList.remove('light-mode')
  localStorage.removeItem('light-mode', '1')
 }
}

if (
 localStorage.getItem('light-mode') === '1'
) {
 setLightMode(true)
}

const mainToolbar = elem({
 classes: ['toolbar', 'mode-main'],
 children: [
  elem({
   attributes: {
    'data-tour':
     'Go to the home channel, or back to the channel when viewing a message.',
   },
   children: [
    elem({
     classes: [
      'icon',
      'icon-home',
      'display-on-channel',
     ],
     tagName: 'span',
    }),
    elem({
     classes: ['display-on-message'],
     children: [icon('back')],
     tagName: 'span',
    }),
   ],
   events: {
    click() {
     const { channel, message } = getUrlData()
     location.hash =
      typeof message === 'string'
       ? `#/${encodeURIComponent(channel)}`
       : '#'
     scrollToTop()
    },
   },
   tagName: 'button',
  }),
  channelInput,
  elem({
   classes: ['input-icon'],
   children: [icon('search')],
   tagName: 'button',
  }),
  elem({
   attributes: {
    'data-tour':
     'Catch up on the latest messages across all channels in the realm.',
   },
   children: [
    elem({
     classes: ['icon', 'icon-news'],
     tagName: 'span',
    }),
   ],
   events: {
    click() {
     activityContainer.toggle()
    },
   },
   tagName: 'button',
  }),
 ],
})

const otherToolbar = elem({
 classes: ['toolbar', 'mode-other'],
})

const activityFilterInput = elem({
 attributes: {
  'data-tour': 'Search recent messages.',
  maxlength: 25,
  placeholder: 'Search activity',
 },
 events: {
  blur() {
   activityFilterInputFocused = false
   autocompleteActivitySearch.close()
   applyActivityFilter(
    activityFilterInput.value.trim()
   )
  },
  focus() {
   lastKnownActivityFilterInput =
    activityFilterInput.value
   activityFilterInputFocused = true
   autocompleteActivitySearch.open()
  },
  input() {
   autocompleteActivitySearch.filter(
    activityFilterInput.value.trim()
   )
  },
  keydown({ key }) {
   if (key === 'Enter') {
    activityFilterInput.blur()
   }
  },
 },
 tagName: 'input',
})

const autocompleteActivitySearch =
 displayAutocompleteActivitySearch(
  activityFilterInput,
  cancelActivityFilterInput,
  applyActivityFilter
 )

function applyActivityFilter(filterText) {
 const trimmedFilter = filterText.trim()
 autocompleteActivitySearch.visit(trimmedFilter)
 activityFilterInput.value = trimmedFilter
 activityContainer.filter(trimmedFilter)
 scrollToTop()
}

// Create date picker for activity log
const activityDatePicker = elem({
 attributes: {
  'data-tour':
   'Select a date to jump to in the activity log.',
  type: 'date',
  placeholder: 'Select date',
  max: new Date().toISOString().split('T')[0], // Set max date to today
 },
 classes: ['activity-date-picker'],
 events: {
  // Add input validation
  change(e) {
   // Ensure date is not in the future
   const selectedDate = new Date(e.target.value)
   const today = new Date()
   today.setHours(0, 0, 0, 0)

   if (selectedDate > today) {
    const notification = elem({
     tagName: 'div',
     classes: [
      'date-search-notification',
      'date-search-error',
     ],
     textContent:
      'Cannot select future dates. Please select today or earlier.',
    })
    document.body.appendChild(notification)

    setTimeout(() => {
     notification.style.opacity = '0'
     setTimeout(() => {
      if (notification.parentNode) {
       document.body.removeChild(notification)
      }
     }, 500)
    }, 3000)

    // Reset to today's date
    e.target.value = today
     .toISOString()
     .split('T')[0]
   }
  },
  focus() {
   // On mobile devices, this will show the native date picker,
   // which is easier to use than HTML date input
   if ('ontouchstart' in window) {
    try {
     // Try to show date picker in a more mobile-friendly way
     activityDatePicker.click()
    } catch (error) {
     console.error(
      'Error showing date picker:',
      error
     )
    }
   }
  },
 },
 tagName: 'input',
})

// Set initial date to today
activityDatePicker.value = new Date()
 .toISOString()
 .split('T')[0]

// Create GO button for date picker
const activityDateGoButton = elem({
 attributes: {
  'data-tour':
   'Jump to the selected date in the activity log.',
 },
 classes: ['activity-date-go-button'],
 children: [
  elem({
   tagName: 'span',
   textContent: 'GO',
  }),
 ],
 events: {
  click() {
   const selectedDate = activityDatePicker.value
   if (selectedDate) {
    try {
     // Show loading notification
     const loadingNotification = elem({
      tagName: 'div',
      classes: [
       'date-search-notification',
       'date-search-loading',
      ],
      textContent: 'Finding activity...',
     })
     document.body.appendChild(
      loadingNotification
     )

     // Create a more robust date parsing approach
     let dateObj

     // First try standard date constructor (works in most modern browsers)
     dateObj = new Date(selectedDate)

     // If that fails, try manual parsing
     if (isNaN(dateObj.getTime())) {
      // Handle different date formats (yyyy-mm-dd, mm/dd/yyyy, etc.)
      const dateParts =
       selectedDate.split(/[-\/]/)

      if (dateParts.length === 3) {
       // If format appears to be yyyy-mm-dd (ISO format)
       if (
        selectedDate.includes('-') &&
        dateParts[0].length === 4
       ) {
        dateObj = new Date(
         parseInt(dateParts[0]),
         parseInt(dateParts[1]) - 1,
         parseInt(dateParts[2])
        )
       }
       // If format appears to be mm/dd/yyyy (US format)
       else if (selectedDate.includes('/')) {
        dateObj = new Date(
         parseInt(dateParts[2]),
         parseInt(dateParts[0]) - 1,
         parseInt(dateParts[1])
        )
       }
      }
     }

     // Additional fallback for mobile browsers
     if (
      isNaN(dateObj.getTime()) &&
      typeof selectedDate === 'string'
     ) {
      // Try to normalize the date string format
      const normalizedDate =
       selectedDate.replace(/[^\d]/g, '/')
      dateObj = new Date(normalizedDate)
     }

     // Verify we have a valid date before proceeding
     if (isNaN(dateObj.getTime())) {
      console.error(
       'Invalid date format:',
       selectedDate
      )

      // Remove loading notification
      document.body.removeChild(
       loadingNotification
      )

      // Show error notification
      const errorNotification = elem({
       tagName: 'div',
       classes: [
        'date-search-notification',
        'date-search-error',
       ],
       textContent:
        'Invalid date format. Please select a valid date.',
      })
      document.body.appendChild(
       errorNotification
      )

      setTimeout(() => {
       errorNotification.style.opacity = '0'
       setTimeout(() => {
        if (errorNotification.parentNode) {
         document.body.removeChild(
          errorNotification
         )
        }
       }, 500)
      }, 3000)
      return
     }

     // Log for debugging
     console.log('Selected date:', selectedDate)
     console.log(
      'Processed date object:',
      dateObj
     )
     console.log(
      'Date string:',
      dateObj.toString()
     )

     // Ensure date is at the start of the day for consistent comparison
     dateObj.setHours(0, 0, 0, 0)

     // Remove loading notification as scrollToDate will handle its own notifications
     setTimeout(() => {
      if (loadingNotification.parentNode) {
       document.body.removeChild(
        loadingNotification
       )
      }
     }, 1000)

     // Call the scroll function with the validated date
     activityContainer.scrollToDate(dateObj)
    } catch (error) {
     console.error(
      'Error processing date selection:',
      error
     )

     // Show error notification with more detailed message
     const errorNotification = elem({
      tagName: 'div',
      classes: [
       'date-search-notification',
       'date-search-error',
      ],
      textContent:
       'Error processing date. Please try a different format (YYYY-MM-DD).',
     })
     document.body.appendChild(
      errorNotification
     )

     setTimeout(() => {
      errorNotification.style.opacity = '0'
      setTimeout(() => {
       if (errorNotification.parentNode) {
        document.body.removeChild(
         errorNotification
        )
       }
      }, 500)
     }, 3000)
    }
   } else {
    // Handle empty date input
    const errorNotification = elem({
     tagName: 'div',
     classes: [
      'date-search-notification',
      'date-search-error',
     ],
     textContent:
      'Please select a date before clicking GO.',
    })
    document.body.appendChild(errorNotification)

    setTimeout(() => {
     errorNotification.style.opacity = '0'
     setTimeout(() => {
      if (errorNotification.parentNode) {
       document.body.removeChild(
        errorNotification
       )
      }
     }, 500)
    }, 3000)
   }
  },
 },
 tagName: 'button',
})

// Create date picker container
const activityDatePickerContainer = elem({
 classes: ['activity-date-picker-container'],
 children: [
  activityDatePicker,
  activityDateGoButton,
 ],
})

const activityToolbar = elem({
 classes: ['toolbar', 'mode-activity'],
 children: [
  elem({
   attributes: {
    'data-tour': 'Exit the news view.',
   },
   children: [icon('close')],
   events: {
    click() {
     if (activityFilterInput.value === '') {
      activityContainer.toggle()
     } else {
      applyActivityFilter('')
     }
    },
   },
   tagName: 'button',
  }),
  activityFilterInput,
  elem({
   classes: ['input-icon'],
   children: [icon('search')],
   tagName: 'button',
  }),
  elem({
   attributes: {
    'data-tour': 'Exit the news view.',
   },
   classes: ['icon-news-active'],
   children: [
    elem({
     classes: ['icon', 'icon-news'],
     tagName: 'span',
    }),
   ],
   events: {
    click() {
     activityContainer.toggle()
    },
   },
   tagName: 'button',
  }),
 ],
})

// Create a separate container for the date picker that will be positioned below the search bar
const activityToolbarExtended = elem({
 classes: ['toolbar-extended', 'mode-activity'],
 children: [activityDatePickerContainer],
})

// Add the extended toolbar to the app header
document.addEventListener(
 'DOMContentLoaded',
 () => {
  const appHeader = document.querySelector(
   '.app-header'
  )
  if (appHeader) {
   appHeader.appendChild(
    activityToolbarExtended
   )
  }
 }
)

const tabStripContainer = elem({
 classes: ['tab-strip-container'],
})

const themeSelectorButton = elem({
 attributes: {
  'data-tour': 'Switch theme.',
 },
 children: [icon('theme')],
 tagName: 'button',
 events: {
  click(e) {
   e.stopPropagation()
   if (
    document.body.getAttribute('data-mode') ===
    'theme-selector'
   ) {
    exitThemeSelector()
   } else {
    enterThemeSelector()
   }
  },
 },
})

const appAccounts = displayAppAccounts()

const activityContainer = displayActivity()

const appHeader = elem({
 classes: ['app-header'],
 children: [
  elem({
   classes: ['toolbar'],
   children: [
    elem({
     attributes: {
      'data-tour':
       'Welcome to the Tag Me In tour! Click the logo to re-launch the tour at any time.',
     },
     events: {
      click() {
       tour()
      },
     },
     classes: ['brand'],
     tagName: 'button',
    }),
    elem({
     attributes: {
      'data-tour':
       'Switch between public and private realms.',
     },
     classes: ['app-accounts-container'],
     children: [appAccounts.element],
    }),
    lightDarkModeButton,
    themeSelectorButton,
    fullScreenButton,
   ],
  }),
  tabStripContainer,
  mainToolbar,
  otherToolbar,
  activityToolbar,
  loadingIndicator,
 ],
 events: {
  click() {
   if (
    document.body.getAttribute('data-mode') ===
    'theme-selector'
   ) {
    exitThemeSelector()
   }
  },
 },
})
