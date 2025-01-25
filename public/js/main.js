const HOME_CHANNEL_ICON = '⌂'
const ONE_HOUR_MS = 60 * 60 * 1000

let channelInputFocused = false
let expandedElement = undefined
let focusOnMessage = undefined
let lastKnownChannelInput
const channelInput = elem({
 attributes: {
  'data-tour':
   'See recently-visited channels, and switch to any channel.',
  maxlength: 25,
  placeholder: 'Search channels',
 },
 events: {
  blur() {
   channelInputFocused = false
   autocompleteChannels.close()
   setChannel(channelInput.value.trim())
  },
  focus() {
   lastKnownChannelInput = channelInput.value
   channelInputFocused = true
   autocompleteChannels.open()
  },
  input() {
   autocompleteChannels.filter(
    channelInput.value.trim()
   )
  },
  keydown({ key }) {
   if (key === 'Enter') {
    channelInput.blur()
   }
  },
 },
 tagName: 'input',
})

function cancelChannelInput() {
 channelInput.value = lastKnownChannelInput
}

let lastKnownActivityFilterInput
let activityFilterInputFocused = false
function cancelActivityFilterInput() {
 activityFilterInput.value =
  lastKnownActivityFilterInput
}

const autocompleteChannels =
 displayAutocompleteChannels(
  channelInput,
  cancelChannelInput
 )

addEventListener('keydown', ({ key }) => {
 if (key === 'Escape') {
  if (expandedElement === undefined) {
   if (channelInputFocused) {
    cancelChannelInput()
    channelInput.blur()
   } else {
    channelInput.focus()
   }
  } else {
   expandedElement.classList.remove('expanded')
   expandedElement = undefined
  }
 }
})

const loadingIndicator = elem({
 attributes: {
  inditerminate: 'true',
 },
 classes: ['loader'],
 tagName: 'progress',
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

const lightDarkModeButton = elem({
 attributes: {
  'data-tour':
   'Switch between light and dark mode.',
  title: 'Switch between light and dark mode',
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

const appAccounts = displayAppAccounts()

const activityContainer = displayActivity()

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
    fullScreenButton,
   ],
  }),
  tabStripContainer,
  mainToolbar,
  otherToolbar,
  activityToolbar,
  loadingIndicator,
 ],
})

let loaderCount = 0

async function withLoading(promise) {
 loaderCount++
 loadingIndicator.style.opacity = '1'
 try {
  const data = await promise
  return data
 } catch (e) {
  await politeAlert(
   e.message ?? e ?? 'Unknown error'
  )
  return false
 } finally {
  loaderCount--
  if (loaderCount === 0) {
   loadingIndicator.style.opacity = '0'
  }
 }
}

const COMPOSE_PLACEHOLDER_MESSAGE =
 'Write a message (up to 175 characters)'

const COMPOSE_PLACEHOLDER_REPLY =
 'Write a reply (up to 175 characters)'

const composeTextarea = elem({
 attributes: {
  'data-tour':
   'Compose your own message to send to the current channel.',
  maxlength: '175',
  placeholder: COMPOSE_PLACEHOLDER_MESSAGE,
  required: 'required',
 },
 events: {
  blur() {
   composeTextarea.value =
    composeTextarea.value.trim()
   if (composeTextarea.value.length === 0) {
    compose.classList.remove('active')
   }
  },
  focus() {
   compose.classList.add('active')
  },
  input() {
   const parametersToRemove = ['si']
   const text = composeTextarea.value
   const urls =
    text.match(/\bhttps?:\/\/\S+/gi) || []
   composeTextarea.value = urls.reduce(
    (acc, url) => {
     try {
      let removed = false
      const urlObj = new URL(url)
      const searchParams = new URLSearchParams(
       urlObj.search
      )
      parametersToRemove.forEach((param) => {
       if (searchParams.has(param)) {
        searchParams.delete(param)
        removed = true
       }
      })
      urlObj.search = searchParams.toString()
      return removed
       ? acc.replace(url, urlObj.toString())
       : acc
     } catch {
      return acc
     }
    },
    text
   )
  },
 },
 tagName: 'textarea',
})

const realmControlContainer = elem({
 classes: ['realm-control', 'mode-other'],
})

const compose = elem({
 children: [
  composeTextarea,
  elem({
   attributes: {
    title: 'Send message now',
   },
   children: [icon('plane')],
   classes: ['submit'],
   events: {
    mousedown(e) {
     e.preventDefault()
    },
   },
   tagName: 'button',
  }),
 ],
 classes: [
  'compose',
  'mode-main',
  'send-consent-granted',
 ],
 events: {
  async submit(e) {
   e.preventDefault()
   const { messageChannel } = getUrlData()
   if (
    (await withLoading(
     networkMessageSend(
      messageChannel,
      composeTextarea.value,
      1
     )
    )) !== false
   ) {
    focusOnMessage = composeTextarea.value
    composeTextarea.value = ''
    compose.classList.remove('active')
    document.body.focus()
    route()
   }
  },
 },
 tagName: 'form',
})

const messageContent = elem({
 attributes: {
  'data-tour': 'General channel information.',
 },
 classes: [
  'message-content',
  'mode-main',
  'mode-activity',
 ],
})

const mainContent = elem({
 attributes: {
  'data-tour': 'Read the channel messages.',
 },
 classes: ['mode-main'],
 tagName: 'main',
})

const consentPrompt = elem({
 attributes: {
  'data-tour':
   'Read and accept the conditions for contributing your own messages.',
 },
 classes: [
  'consent-prompt',
  'mode-main',
  'send-consent-not-granted',
 ],
 events: {
  click: gainConsent,
 },
 tagName: 'p',
 textContent:
  'Tap here to learn about contributing to Tag Me In',
})

const { body } = document
body.appendChild(appHeader)
body.appendChild(activityContainer.element)
body.appendChild(realmControlContainer)
body.appendChild(messageContent)
body.appendChild(consentPrompt)
body.appendChild(compose)
body.appendChild(mainContent)
body.appendChild(
 document.getElementById('footer')
)

function scrolledPastBottom(
 element,
 exemptZeroScroll = false
) {
 if (
  (!exemptZeroScroll && scrollY < 1) ||
  !element.checkVisibility()
 ) {
  return false
 }
 const bottom = Math.ceil(
  document.documentElement.scrollHeight -
   scrollY -
   document.documentElement.clientHeight
 )
 const elementBottom = Math.ceil(
  document.documentElement.scrollHeight -
   element.offsetTop -
   element.offsetHeight
 )
 return bottom < elementBottom
}
let lastScrollY = 0
addEventListener('scroll', () => {
 if (scrollY < lastScrollY) {
  body.classList.add('scroll-up')
 } else {
  body.classList.remove('scroll-up')
 }
 lastScrollY = scrollY
 if (scrollY > 0) {
  document.body.classList.remove('scroll-zero')
 } else {
  document.body.classList.add('scroll-zero')
 }
 if (
  scrolledPastBottom(
   activityContainer.element,
   true
  )
 ) {
  activityContainer.element.classList.add(
   'scrolled-past-bottom'
  )
  withLoading(activityContainer.loadMore())
 } else {
  activityContainer.element.classList.remove(
   'scrolled-past-bottom'
  )
 }
 if (scrolledPastBottom(messageContent)) {
  messageContent.classList.add(
   'scrolled-past-bottom'
  )
 } else {
  messageContent.classList.remove(
   'scrolled-past-bottom'
  )
 }
 if (scrolledPastBottom(mainContent)) {
  mainContent.classList.add(
   'scrolled-past-bottom'
  )
 } else {
  mainContent.classList.remove(
   'scrolled-past-bottom'
  )
 }
})

async function route() {
 const {
  channel,
  control,
  messageChannel,
  message: messageText,
 } = getUrlData()
 autocompleteChannels.visit(channel)
 document.title = [channel, 'Tag Me In']
  .filter((v) => v !== '')
  .join(' - ')
 activityContainer.clear()
 const activeSessionId = getActiveSessionId()
 if (activeSessionId !== PUBLIC_SESSION_ID) {
  if (
   await registerSession(
    activeSessionId,
    control
   )
  ) {
   return
  }
 }
 if (typeof messageText === 'string') {
  document.body.classList.remove('on-channel')
  document.body.classList.add('on-message')
  composeTextarea.setAttribute(
   'placeholder',
   COMPOSE_PLACEHOLDER_REPLY
  )
 } else {
  document.body.classList.remove('on-message')
  document.body.classList.add('on-channel')
  composeTextarea.setAttribute(
   'placeholder',
   COMPOSE_PLACEHOLDER_MESSAGE
  )
 }
 if (channelInput.value.trim() !== channel) {
  channelInput.value = channel
 }
 if (activeSessionId !== PUBLIC_SESSION_ID) {
  realmControlContainer.innerHTML = ''
 }
 realmControlContainer.style.display =
  activeSessionId === PUBLIC_SESSION_ID
   ? 'none'
   : ''
 const channelData = await withLoading(
  networkChannelSeek(channel, getHourNumber())
 )
 const formattedMessageData = formatMessageData(
  channelData.response.messages
 )
 if (activeSessionId !== PUBLIC_SESSION_ID) {
  renderRealm(
   realmControlContainer,
   activeSessionId
  )
 } else if (
  activeSessionId === PUBLIC_SESSION_ID
 ) {
  const tabs = tabStrip(
   'discussion',
   () => void 0
  )
  tabs.add(
   'discussion',
   'Discussion',
   { switchTo() {} },
   switchToMode('main')
  )
  tabStripContainer.innerHTML = ''
  await tabs.activate()
  tabStripContainer.appendChild(tabs.element)
 }
 if (typeof messageText === 'string') {
  displayChannelMessage(
   channel,
   formattedMessageData,
   messageText
  )
  displayChannelMessageReplies(
   messageChannel,
   formattedMessageData,
   messageText
  ).catch((e) => console.error(e))
 } else {
  displayChannelHome(
   channel,
   formattedMessageData,
   formatChannelData(
    channelData.response.channels
   )
  )
 }
 scrollToTop()
}

window.addEventListener('hashchange', route)
route().catch((e) => console.error(e))

const consentKey = 'consent:ai-moderator'

function checkConsent() {
 if (
  localStorage.getItem(consentKey) === 'consent'
 ) {
  document.body.classList.add(
   'send-consent-granted'
  )
 } else {
  {
   document.body.classList.remove(
    'send-consent-granted'
   )
  }
 }
}

async function gainConsent() {
 const consented =
  localStorage.getItem(consentKey) === 'consent'
 if (consented) {
  return true
 } else {
  const nowConsented = await politeAlert(
   `Greetings, Earthling, and welcome to Tag Me In!

Researchers are currently developing techniques to communicate with animals using artificial intelligence.

Tag Me In intends to be the first social network to welcome our animal brothers and sisters to the internet as soon as the technology is ready for them to interact with the internet.

To support this mission, Tag Me In is run as a social experiment that asks: what if we came together with the highest imaginable ethical guidelines to collaborate on a vision for a brighter future for animals on Earth?

By interacting with Tag Me In, you consent for your messages to be sent to an artificial intelligence system, other human beings, or other technological systems by any group, organization, or government agency of any nation (moderation technology on Tag Me In is open to the public) for evaluation on the following criteria:

 • Violence or harmful language
 • Discrimination based on group characteristics
 • Causing harm to animals

We hope you'll join us on this journey. But at the same time, we know it's not for everyone. And that's ok. There's no shortage of social websites that permit posting content that contributes to the demise of individual animals.

Part of the beauty of life is diversity, and Tag Me In aims to stand out as a network that has a stated goal of being inclusive and respectful towards every individual animal on Earth.

If you believe in a world where every animal is seen as part of the sacred beauty of life, you've found a like-minded corner of the internet.

You can change your mind at any time in the future and remove consent: look for a link in the footer to remove previously-granted consent.

To get started, consider the following statements:`,
   'Agree and access the ability to contribute to Tag Me In',
   [
    'I consent to having everything I type into Tag Me In be judged exactingly by artificial intelligence in support of creating a safe(r) space for animals on the internet.',
    'I welcome animal-human communication with open arms.',
    'I would like to co-create a future where humans and animals coexist in peace and mutual respect.',
   ],
   'Cancel'
  )
  if (nowConsented) {
   localStorage.setItem(consentKey, 'consent')
   checkConsent()
   return true
  }
  return false
 }
}

checkConsent()

document
 .getElementById('remove-consent')
 .addEventListener('click', (e) => {
  e.preventDefault()
  localStorage.removeItem(consentKey)
  checkConsent()
 })
