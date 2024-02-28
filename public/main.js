const HOME_CHANNEL_ICON = '⌂'
const ONE_HOUR_MS = 60 * 60 * 1000

let focusOnMessage = undefined
let lastKnownChannelInput
let channelInputFocused = false
const channelInput = elem({
 attributes: {
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
  if (channelInputFocused) {
   cancelChannelInput()
   channelInput.blur()
  } else {
   channelInput.focus()
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
  title: 'Toggle full screen',
 },
 children: [icon('in')],
 events: {
  click() {
   if (!document.fullscreenElement) {
    document.body
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

const activityFilterInput = elem({
 attributes: {
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

const appHeader = elem({
 classes: ['app-header'],
 children: [
  elem({
   classes: ['toolbar'],
   children: [
    elem({
     classes: ['brand', 'grow'],
     tagName: 'span',
     textContent: 'Tag Me In',
    }),
    lightDarkModeButton,
    fullScreenButton,
   ],
  }),
  appAccounts.element,
  mainToolbar,
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
  maxlength: '175',
  placeholder: COMPOSE_PLACEHOLDER_MESSAGE,
  required: 'required',
 },
 events: {
  blur() {
   composeTextarea.value =
    composeTextarea.value.trim()
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

const suggestedMessagesContainer = elem({
 classes: ['generated-messages'],
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
   tagName: 'button',
  }),
  suggestedMessagesContainer,
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
    route()
   }
  },
 },
 tagName: 'form',
})

const messageContent = elem({
 classes: ['message-content', 'mode-main'],
})

const mainContent = elem({
 classes: ['mode-main'],
 tagName: 'main',
})

const consentPrompt = elem({
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
body.appendChild(messageContent)
body.appendChild(consentPrompt)
body.appendChild(compose)
body.appendChild(mainContent)
body.appendChild(
 document.getElementById('footer')
)

function scrolledPastBottom(element) {
 if (
  scrollY < 1 ||
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
  scrolledPastBottom(activityContainer.element)
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
 const channelData = await withLoading(
  networkChannelSeek(channel, getHourNumber())
 )
 const formattedMessageData = formatMessageData(
  channelData.response.messages
 )
 suggestMessages(
  suggestedMessagesContainer,
  composeTextarea,
  formattedMessageData,
  channel,
  messageText
 ).catch((e) => console.error(e))
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

 if (!consented) {
  const nowConsented = await politeAlert(
   `Greetings, Earthling, and welcome to Tag Me In!

Researchers are currently developing techniques to communicate with animals using artificial intelligence.

Tag Me In intends to be the first social network to welcome our animal brothers and sisters to the internet as soon as the technology is ready for them to interact with the internet.

To support this mission, Tag Me In is run as a social experiment that asks: what if we came together with the highest imaginable ethical guidelines to collaborate on a vision for a brighter future for animals on Earth?

By interacting with Tag Me In, you consent for your messages to be sent to an artificial intelligence system for evaluation on the following criteria:

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
  }
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
