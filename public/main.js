const rootUrl =
 location.origin === 'http://localhost:8000'
  ? 'https://tagme.in'
  : ''

const begin2024 = new Date(
 'January 1, 2024 00:00:00 GMT'
)

function getHourNumber() {
 const now = new Date()
 const msPerHour = 1000 * 60 * 60
 return Math.floor(
  (now.getTime() - begin2024.getTime()) /
   msPerHour
 )
}

function describeHourNumber(hourNumber) {
 const date = new Date(
  begin2024.getTime() + hourNumber * 3600e3
 )
 return date
  .toLocaleString()
  .replace(/\:\d\d\:\d\d /, '')
  .replace(', ', '\n')
}

function addYouTubeEmbed(block, text) {
 const regExp =
  /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
 const match = text.match(regExp)

 if (match && match[2].length == 11) {
  const id = match[2]
  const frame = document.createElement('iframe')
  frame.setAttribute('width', '560')
  frame.setAttribute('height', '315')
  frame.setAttribute('frameborder', '0')
  frame.setAttribute(
   'src',
   `//www.youtube.com/embed/${id}`
  )
  frame.setAttribute(
   'allowfullscreen',
   'allowfullscreen'
  )
  block.appendChild(frame)
 }
}

function addTextWithLinks(text, container) {
 const parts = text.split(/(https?:\/\/[^\s]+)/)

 parts.forEach((part) => {
  if (/^https?:\/\//.test(part)) {
   const a = document.createElement('a')
   a.setAttribute('target', '_blank')
   a.setAttribute('href', part)
   a.textContent = part
   container.appendChild(a)
  } else if (part) {
   container.appendChild(
    document.createTextNode(part)
   )
  }
 })
}

function addBlockquote(
 parent,
 channel,
 text,
 score
) {
 const block =
  document.createElement('blockquote')
 const blockContent =
  document.createElement('div')
 const blockText =
  document.createElement('span')
 addTextWithLinks(text, blockText)
 blockContent.appendChild(blockText)
 try {
  addYouTubeEmbed(blockContent, text)
 } catch (e) {
  console.error('YouTube embed error', e)
 }
 const agreeButton =
  document.createElement('button')
 agreeButton.textContent = 'Agree'
 block.appendChild(agreeButton)
 block.appendChild(blockContent)
 agreeButton.addEventListener(
  'click',
  async () => {
   try {
    await sendMessage(channel, text)
    agreeButton.classList.add('success')
   } catch (e) {
    alert(e.message)
   }
  }
 )
 const cite = document.createElement('cite')
 cite.textContent = score
 block.appendChild(cite)

 parent.appendChild(block)
}

// Attach to DOM elements
const channelEl =
 document.getElementById('channel')
const channelsEl =
 document.getElementById('channels')
const contentEl =
 document.getElementById('content')
const messageEl =
 document.getElementById('message')
const hourEl = document.getElementById('hour')
const timeDescriptionEl =
 document.getElementById('time-description')

function getUrlData() {
 const [_, channel, hour] = window.location.hash
  .split('/')
  .map((x) =>
   typeof x === 'string'
    ? decodeURIComponent(x)
    : undefined
  )
 return {
  channel: channel ?? '',
  hour: hour ?? getHourNumber().toString(10),
 }
}

// Keep current channel/hour in hash URL route
function route() {
 const { channel, hour } = getUrlData()

 channelEl.value = channel ?? ''
 hourEl.value =
  hour ?? getHourNumber().toString(10)
 const trueHour =
  hour ?? getHourNumber().toString(10)
 timeDescriptionEl.textContent =
  describeHourNumber(trueHour)
 displayChannel(channel ?? '', trueHour)
}

// Top Messages
function displayMessages(
 attachToEl,
 channel,
 messages,
 hour
) {
 const sortedMessages = Object.entries(
  messages
 ).sort((a, b) => b[1] - a[1])
 sortedMessages.forEach(([text, votes]) => {
  const score = votes - hour
  addBlockquote(
   attachToEl,
   channel,
   text,
   score
  )
 })
}

function displayChannels(topChannels, hour) {
 // Top Channels
 channelsEl.innerHTML = ''
 const sortedChannels = Object.entries(
  topChannels
 ).sort((a, b) => b[1] - a[1])
 sortedChannels.forEach(([name, votes]) => {
  const encoded = encodeURIComponent(name)

  channelsEl.innerHTML += `
      <a href="/#/${encoded}/${hour}">
        ${name.length > 0 ? name : '⌂'} 
        <cite>${votes - hour}</cite> 
      </a>
    `
 })
}

// Load channel content
async function displayChannel(channel, hour) {
 contentEl.innerHTML = '<p>Seeking...</p>'

 try {
  const resp = await fetch(
   `${rootUrl}/seek?channel=${encodeURIComponent(
    channel
   )}&hour=${hour}`
  )
  if (!resp.ok) {
   throw new Error(resp.statusText)
  }
  const data = await resp.json()
  const {
   topChannels,
   topMessages,
   mostRecentHour,
  } = data

  contentEl.innerHTML = ''

  if (
   Object.keys(topMessages).length === 0 &&
   typeof mostRecentHour === 'string'
  ) {
   const diffHours =
    parseInt(mostRecentHour, 10) - data.hour
   contentEl.innerHTML = `<p>Channel has no activity at this time, displaying content from ${Math.abs(
    diffHours
   )} hour${
    Math.abs(diffHours) === 1 ? '' : 's'
   } ${diffHours > 0 ? 'later' : 'ago'}.</p>`
   const respMR = await fetch(
    `${rootUrl}/seek?channel=${encodeURIComponent(
     channel
    )}&hour=${mostRecentHour}`
   )
   if (!respMR.ok) {
    throw new Error(respMR.statusText)
   }
   const dataMR = await respMR.json()
   displayMessages(
    contentEl,
    channel,
    dataMR.topMessages,
    dataMR.hour
   )
   displayChannels(dataMR.topChannels, hour)
  } else {
   displayChannels(topChannels, hour)

   displayMessages(
    contentEl,
    channel,
    topMessages,
    data.hour
   )
  }
 } catch (err) {
  contentEl.innerHTML = `<p>${
   err?.message ?? err ?? 'unknown error'
  }</p>`
 }
}

// Load channel when input changes
let channelTimer
channelEl.addEventListener('input', () => {
 clearTimeout(channelTimer)
 channelTimer = setTimeout(() => {
  const channel = channelEl.value
  window.location.hash = `#/${encodeURIComponent(
   channel
  )}/${getHourNumber().toString(10)}`
 }, 250)
})

window.addEventListener('hashchange', route)
route() // Initial load

async function sendMessage(channel, message) {
 const resp = await fetch(`${rootUrl}/send`, {
  method: 'POST',
  headers: {
   'Content-Type': 'application/json',
  },
  body: JSON.stringify({
   channel,
   message,
  }),
 })

 if (!resp.ok) {
  throw new Error(await resp.text())
 }

 return await resp.text()
}

const sendMessageForm =
 document.getElementById('send')

const sendMessageFormFields =
 document.getElementById('send-fields')

sendMessageForm.addEventListener(
 'submit',
 async (event) => {
  event.preventDefault()

  const channel = channelEl.value
  const message = sendMessageForm.message.value

  if (!message) {
   alert('Message is required')
   return
  }

  sendMessageFormFields.setAttribute(
   'disabled',
   'disabled'
  )

  try {
   await sendMessage(channel, message)
   sendMessageForm.reset()
   messageEl.focus()
   const nowChannel = `/#/${encodeURIComponent(
    channel
   )}`
   if (window.location.href !== nowChannel) {
    window.location.href = nowChannel
   } else {
    route()
   }
  } catch (err) {
   alert(
    'Error! Please try again: ' +
     (err.message ?? err ?? 'unknown reason')
   )
  } finally {
   sendMessageFormFields.removeAttribute(
    'disabled'
   )
  }
 }
)

document
 .getElementById('now')
 .addEventListener('click', function () {
  const { channel } = getUrlData()
  location.href = `/#/${encodeURIComponent(
   channel
  )}/${getHourNumber().toString(10)}`
 })

hourEl.addEventListener('input', function () {
 const { channel } = getUrlData()
 location.href = `/#/${encodeURIComponent(
  channel
 )}/${hourEl.value}`
})

function goHour(diff) {
 return function () {
  const { channel, hour } = getUrlData()
  const newHour =
   parseInt(
    hour ?? getHourNumber().toString(10)
   ) + diff
  location.href = `/#/${encodeURIComponent(
   channel
  )}/${newHour.toString(10)}`
 }
}

const aboutToggleButton =
 document.getElementById('about-toggle-button')
const aboutToggleContent =
 document.getElementById('about-toggle-content')
function showAbout() {
 aboutToggleButton.innerHTML = '&times;'
 aboutToggleContent.style.display = 'block'
 aboutToggleButton.classList.remove('open')
}
function hideAbout() {
 aboutToggleButton.innerHTML = 'i'
 aboutToggleContent.style.display = 'none'
 aboutToggleButton.classList.add('open')
}
if (localStorage.getItem('about') !== 'hide') {
 showAbout()
}
function toggleAbout() {
 const isOpen =
  localStorage.getItem('about') !== 'hide'
 if (isOpen) {
  hideAbout()
  localStorage.setItem('about', 'hide')
 } else {
  showAbout()
  localStorage.removeItem('about')
 }
}
aboutToggleButton.addEventListener(
 'click',
 toggleAbout
)
document
 .getElementById('hour-back')
 .addEventListener('click', goHour(-1))
document
 .getElementById('hour-next')
 .addEventListener('click', goHour(1))
