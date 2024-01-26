const HOME_CHANNEL_ICON = '⌂'
const BACK_ICON = '⏴'
const ONE_HOUR_MS = 60 * 60 * 1000

let focusOnMessage = undefined

const channelInput = elem({
 attributes: {
  maxlength: 25,
  placeholder: 'Enter channel name',
 },
 events: {
  input: debounce(function () {
   setChannel(channelInput.value.trim())
  }),
 },
 tagName: 'input',
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
 textContent: '⛶',
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
 textContent: '☼',
})

const appAccounts = displayAppAccounts()

const appHeader = elem({
 classes: ['app-header'],
 children: [
  appAccounts.element,
  elem({
   classes: ['toolbar'],
   children: [
    elem({
     children: [
      elem({
       classes: [
        'h-stretch',
        'display-on-channel',
       ],
       tagName: 'span',
       textContent: HOME_CHANNEL_ICON,
      }),
      elem({
       classes: [
        'h-stretch',
        'display-on-message',
       ],
       tagName: 'span',
       textContent: BACK_ICON,
      }),
     ],
     events: {
      click() {
       const { channel, message } = getUrlData()
       location.hash =
        typeof message === 'string'
         ? `#/${encodeURIComponent(channel)}`
         : '#'
       body.scrollTo(0, 0)
      },
     },
     tagName: 'button',
    }),
    loadingIndicator,
    channelInput,
    lightDarkModeButton,
    fullScreenButton,
   ],
  }),
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
  alert(e.message ?? e ?? 'Unknown error')
  return false
 } finally {
  loaderCount--
  if (loaderCount === 0) {
   loadingIndicator.style.opacity = '0'
  }
 }
}

const COMPOSE_PLACEHOLDER_MESSAGE =
 'Write a message (up to 150 characters)'

const COMPOSE_PLACEHOLDER_REPLY =
 'Write a reply (up to 150 characters)'

const composeTextarea = elem({
 attributes: {
  maxlength: '150',
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

const compose = elem({
 children: [
  composeTextarea,
  elem({
   attributes: {
    title: 'Send message now',
    type: 'submit',
    value: '➹',
   },
   tagName: 'input',
  }),
 ],
 classes: ['compose'],

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
 classes: ['message-content'],
})

const mainContent = elem({
 tagName: 'main',
})

const body = elem({ classes: ['body'] })
body.appendChild(appHeader)
body.appendChild(messageContent)
body.appendChild(compose)
body.appendChild(mainContent)
body.appendChild(
 document.getElementById('footer')
)
document.body.appendChild(body)

async function route() {
 const {
  channel,
  messageChannel,
  message: messageText,
 } = getUrlData()
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
 body.scrollTo(0, 0)
}

window.addEventListener('hashchange', route)
route().catch((e) => console.error(e))

const activeSessionId = getActiveSessionId()

if (activeSessionId !== PUBLIC_SESSION_ID) {
 registerSession(activeSessionId)
}
