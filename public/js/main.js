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
 classes: ['message-content', 'mode-main'],
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
body.appendChild(themeSelector)
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

setTimeout(() => {
 if (
  typeof lastKnownModeAtStartup === 'string'
 ) {
  switchToMode(lastKnownModeAtStartup)()
 }
 setTimeout(() => {
  hasCompletedStartup = true
  document.body.removeAttribute('data-starting')
 }, 500)
})
