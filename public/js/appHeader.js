const themeNames = [
 'black',
 'blue',
 'brown',
 'cyan',
 'darkred',
 'gray',
 'green',
 'magenta',
 'none',
 'orange',
 'pink',
 'purple',
 'red',
 'white',
 'yellow',
]

const setTheme = (themeName) => {
 document.body.setAttribute(
  'data-theme',
  themeName
 )
 currentTheme = themeName
 localStorage.setItem('theme', themeName)
}

let currentTheme = localStorage.getItem('theme')

if (currentTheme) {
 document.body.setAttribute(
  'data-theme',
  currentTheme
 )
}

const lightDarkModeButton = elem({
 attributes: {
  'data-tour':
   'Switch between light and dark mode.',
  title: 'Switch light/dark mode',
 },
 children: [icon('sun')],
 events: {
  click() {
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
  click() {
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

const tabStripContainer = elem({
 classes: ['tab-strip-container'],
})

const themeSelector = elem({
 classes: ['theme-selector'],
 children: themeNames.map((themeName) =>
  elem({
   attributes: {
    'data-theme': themeName,
   },
   children: [
    document.createTextNode(themeName),
   ],
   style: {
    backgroundColor: `var(--theme-${themeName}--color-bg)`,
   },
   tagName: 'button',
   events: {
    click() {
     setTheme(themeName)
    },
   },
  })
 ),
})

let modeBeforeThemeSelector = undefined

function exitThemeSelector() {
 document.body.removeAttribute('data-mode')
 if (modeBeforeThemeSelector) {
  document.body.setAttribute(
   'data-mode',
   modeBeforeThemeSelector
  )
 }
}

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
    modeBeforeThemeSelector =
     document.body.getAttribute('data-mode')
    document.body.setAttribute(
     'data-mode',
     'theme-selector'
    )
    setTimeout(() => {
     document
      .querySelector(
       `button[data-theme="${
        currentTheme ?? 'none'
       }"]`
      )
      .focus()
    }, 100)
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
