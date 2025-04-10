const HOME_CHANNEL_ICON = '⌂'
const ONE_HOUR_MS = 60 * 60 * 1000

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

const ADD_REACTION_PLACEHOLDER_MESSAGE =
 'Add a reaction (up to 25 characters)'

const COMPOSE_PLACEHOLDER_MESSAGE =
 'Write a message (up to 175 characters)'

const COMPOSE_PLACEHOLDER_REPLY =
 'Write a reply (up to 175 characters)'

async function updateComposeTextarea(
 channel,
 isReply
) {
 composeTextarea.setAttribute(
  'placeholder',
  isReply
   ? COMPOSE_PLACEHOLDER_REPLY
   : channel === 'reactions'
     ? ADD_REACTION_PLACEHOLDER_MESSAGE
     : channel === SCRIPT_CHANNEL
       ? 'Write script code (up to 100000 characters)'
       : COMPOSE_PLACEHOLDER_MESSAGE
 )
 composeTextarea.setAttribute(
  'maxlength',
  channel === 'reactions'
   ? 25
   : channel === SCRIPT_CHANNEL
     ? 100000
     : 175
 )
}

const composeTextarea = elem({
 attributes: {
  'data-tour':
   'Compose your own message to send to the current channel.',
  maxlength: '175',
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
   const urlParametersToRemove = ['si'] // remove tracking parameters @todo: move to a function and add more parameters
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
      urlParametersToRemove.forEach((param) => {
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

// --- Resize Observer for SCRIPT_CHANNEL textarea height persistence ---
let debounceTimeout
const scriptTextareaResizeObserver =
 new ResizeObserver((entries) => {
  for (let entry of entries) {
   // Only act if the observed element is the composeTextarea
   if (entry.target === composeTextarea) {
    // Debounce the saving operation
    clearTimeout(debounceTimeout)
    debounceTimeout = setTimeout(() => {
     // Check if we are currently on the SCRIPT_CHANNEL
     if (
      getUrlData().channel === SCRIPT_CHANNEL
     ) {
      const height =
       composeTextarea.offsetHeight // Get the actual rendered height
      if (height > 0) {
       // Only save valid heights
       localStorage.setItem(
        '𝓢.height',
        `${height}px`
       )
       // console.log(`Saved S channel height: ${height}px`);
      }
     }
    }, 300) // Debounce duration (300ms)
   }
  }
 })

// Start observing the textarea
scriptTextareaResizeObserver.observe(
 composeTextarea
)
// -------------------------------------------------------------------
// Add event listener for sending messages with CMD+Enter or CTRL+Enter
composeTextarea.addEventListener(
 'keydown',
 function (event) {
  // Check if Enter key is pressed with CMD or CTRL
  if (
   event.key === 'Enter' &&
   (event.metaKey || event.ctrlKey)
  ) {
   event.preventDefault() // Prevent the default action (new line)
   const { messageChannel } = getUrlData()
   const messageText =
    messageChannel === 'reactions'
     ? `reaction${composeTextarea.value}`
     : composeTextarea.value

   // Call your existing send message logic
   if (messageText) {
    ;(async () => {
     if (
      (await withLoading(
       networkMessageSend(
        messageChannel,
        messageText,
        1
       )
      )) !== false
     ) {
      focusOnMessage = messageText
      composeTextarea.value = ''
      compose.classList.remove('active')
      document.body.focus()
      route()
     }
    })()
   }
  }
 }
)

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
   const messageText =
    messageChannel === 'reactions'
     ? `reaction${composeTextarea.value}`
     : composeTextarea.value
   if (
    (await withLoading(
     networkMessageSend(
      messageChannel,
      messageText,
      1
     )
    )) !== false
   ) {
    focusOnMessage = messageText
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
 classes: ['message-content', 'mode-main'],
})

const mainContent = elem({
 attributes: {
  'data-tour': 'Read the channel messages.',
 },
 classes: ['mode-main'],
 tagName: 'main',
})

const scriptOutputReelContainer = elem({
 id: 'script-output-reel-container', // Give it an ID for potential styling/reference
 classes: ['script-output-reel'], // Keep the reel class for flex layout
 // This container will be cleared and populated by displayInstalledScripts
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
body.appendChild(themeSelector)
body.appendChild(appHeader)
body.appendChild(activityContainer.element)
body.appendChild(realmControlContainer)
body.appendChild(messageContent)
body.appendChild(scriptOutputReelContainer)
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
  (!exemptZeroScroll && body.scrollTop < 1) ||
  !element.checkVisibility()
 ) {
  return false
 }
 const bottom = Math.ceil(
  document.documentElement.scrollHeight -
   body.scrollTop -
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
let addTimeout
let removeTimeout
body.addEventListener('scroll', () => {
 clearTimeout(addTimeout)
 clearTimeout(removeTimeout)
 if (body.scrollTop < lastScrollY) {
  addTimeout = setTimeout(() =>
   body.classList.add('scroll-up')
  )
 } else {
  removeTimeout = setTimeout(
   () => body.classList.remove('scroll-up'),
   500
  )
 }
 lastScrollY = body.scrollTop
 if (lastScrollY > 0) {
  body.classList.remove('scroll-zero')
 } else {
  body.classList.add('scroll-zero')
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
 body.setAttribute('data-channel', channel)

 // --- Apply specific styles/behavior for SCRIPT_CHANNEL ---
 if (channel === SCRIPT_CHANNEL) {
  // Load and apply persisted height for the textarea
  const savedHeight =
   localStorage.getItem('𝓢.height')
  if (savedHeight) {
   composeTextarea.style.height = savedHeight
   // console.log(`Applied S channel height: ${savedHeight}`);
  } else {
   // Reset to default if no saved height (or rely on CSS min-height)
   composeTextarea.style.height = '' // Reset inline style
  }
 } else {
  // Ensure height is reset when navigating away from S channel
  composeTextarea.style.height = ''
 }
 // -------------------------------------------------------

 const activeSessionId = getActiveSessionId()
 if (typeof messageText === 'string') {
  body.classList.remove('on-channel')
  body.classList.add('on-message')
  composeTextarea.setAttribute(
   'placeholder',
   COMPOSE_PLACEHOLDER_REPLY
  )
  if (channel === SCRIPT_CHANNEL) {
   location.hash = `#/${SCRIPT_CHANNEL}`
   return
  }
 } else {
  body.classList.remove('on-message')
  body.classList.add('on-channel')
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
 if (
  (channelData && 'error' in channelData) ||
  typeof channelData?.response?.messages !==
   'object'
 ) {
  throw new Error(
   channelData.error ??
    `Error seeking channel: ${JSON.stringify(
     channelData
    )}`
  )
 }

 const formattedMessageData = formatMessageData(
  channelData.response.messages
 )

 const activeSession = getActiveSession()
 if (localStorage.getItem('session-pause')) {
  debugger
 }
 if (
  activeSessionId !== PUBLIC_SESSION_ID &&
  typeof activeSession?.email === 'string'
 ) {
  renderRealm(
   realmControlContainer,
   activeSessionId
  )
  return
 }

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
 if (typeof messageText === 'string') {
  displayChannelMessage(
   channel,
   formattedMessageData,
   messageText
  )
  await displayChannelMessageReplies(
   messageChannel,
   formattedMessageData,
   messageText
  ).catch((e) => console.error(e))
  await updateComposeTextarea(channel, true)
 } else {
  displayChannelHome(
   channel,
   formattedMessageData,
   formatChannelData(
    channelData.response.channels
   )
  )
  await updateComposeTextarea(channel)
 }
 scrollToTop()
}

window.addEventListener('hashchange', route)

async function firstRoute() {
 await route()
}

document.addEventListener(
 'DOMContentLoaded',
 firstRoute
)

const consentKey = 'consent:ai-moderator'

function checkConsent() {
 if (
  localStorage.getItem(consentKey) === 'consent'
 ) {
  body.classList.add('send-consent-granted')
 } else {
  {
   body.classList.remove('send-consent-granted')
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

setTimeout(() => {
 if (
  typeof lastKnownModeAtStartup === 'string'
 ) {
  switchToMode(lastKnownModeAtStartup)()
 }
 setTimeout(() => {
  hasCompletedStartup = true
  body.removeAttribute('data-starting')
 }, 500)
})
