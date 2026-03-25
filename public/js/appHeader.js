let lightDarkModeButton
let fullScreenButton
let mainToolbar
let otherToolbar
let activityFilterInput

function initializeAppHeader() {
 lightDarkModeButton = elem({
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

 fullScreenButton = elem({
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

 mainToolbar = elem({
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

 otherToolbar = elem({
  classes: ['toolbar', 'mode-other'],
 })

 activityFilterInput = elem({
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
}

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

let activityToolbar
let tabStripContainer
let themeSelectorButton
let appAccounts
let activityContainer
let appHeader

function initializeAppHeader() {
 lightDarkModeButton = elem({
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

 fullScreenButton = elem({
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

 mainToolbar = elem({
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

 otherToolbar = elem({
  classes: ['toolbar', 'mode-other'],
 })

 activityFilterInput = elem({
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

 activityToolbar = elem({
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

 tabStripContainer = elem({
  classes: ['tab-strip-container'],
 })

 themeSelectorButton = elem({
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

 appAccounts = displayAppAccounts()
 activityContainer = displayActivity()

 appHeader = elem({
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
}

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
