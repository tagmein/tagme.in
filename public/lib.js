function addTextWithLinks(container, text) {
 const parts = text.split(/(https?:\/\/[^\s]+)/)
 parts.forEach((part) => {
  if (/^https?:\/\//.test(part)) {
   const a = document.createElement('a')
   a.setAttribute('target', '_blank')
   a.setAttribute('href', part)
   a.textContent = decodeURI(part)
   container.appendChild(a)
  } else if (part) {
   addHashTagLinks(container, part)
  }
 })
}

function addTextBlocks(container, text) {
 const lines = text.split('\n')
 let currentQuote = null
 lines.forEach((line) => {
  if (line.trimStart().startsWith('>')) {
   const formattedLine = line.replace(
    /^> ?/,
    ''
   )
   if (currentQuote === null) {
    // Start a new quote
    currentQuote = formattedLine
   } else {
    // Add the line without '>' to the current quote
    currentQuote += '\n' + formattedLine
   }
  } else {
   if (currentQuote) {
    const quoteElement =
     document.createElement('blockquote')
    addTextWithCodeBlocks(
     quoteElement,
     currentQuote
    )
    container.appendChild(quoteElement)
   }
   // Regular line, reset current quote
   currentQuote = null
   const p = document.createElement('p')
   addTextWithCodeBlocks(p, line)
   container.appendChild(p)
  }
 })
 if (currentQuote) {
  const quoteElement =
   document.createElement('blockquote')
  addTextWithCodeBlocks(
   quoteElement,
   currentQuote
  )
  container.appendChild(quoteElement)
 }
}

function addHashTagLinks(container, text) {
 const parts = text.split(/(#[^,.\s]*)/)

 parts.forEach((part) => {
  if (part[0] === '#') {
   const channel = part.slice(1)
   const a = document.createElement('a')
   a.href = `/#/${encodeURIComponent(channel)}`
   a.textContent =
    part === '#'
     ? `#${HOME_CHANNEL_ICON}`
     : part
   container.appendChild(a)
  } else if (part) {
   container.appendChild(
    document.createTextNode(part)
   )
  }
 })
}

function addTextWithCodeBlocks(
 container,
 text
) {
 let codeBlock = false
 let codeContent = ''
 let isEscape = false
 let textContent = ''

 for (let i = 0; i < text.length; i++) {
  const char = text[i]

  if (!isEscape && char === '\\') {
   isEscape = true
  } else if (!isEscape && char === '`') {
   if (codeBlock) {
    flushCodeBlock()
    codeBlock = false
   } else {
    openCodeBlock()
   }
  } else {
   if (codeBlock) {
    codeContent += char
   } else {
    textContent += char
   }
   if (isEscape) {
    isEscape = false
   }
  }
 }

 flushRemainingContent()

 function flushCodeBlock() {
  const code = document.createElement('code')
  addTextWithLinks(code, codeContent)
  container.appendChild(code)
  codeContent = ''
 }

 function openCodeBlock() {
  flushText()
  codeBlock = true
 }

 function flushText() {
  if (textContent) {
   const span = document.createElement('span')
   addTextWithLinks(span, textContent)
   container.appendChild(span)
   textContent = ''
  }
 }

 function flushRemainingContent() {
  if (codeContent) {
   flushCodeBlock()
  }
  flushText()
 }
}

function addYouTubeEmbed(container, text) {
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
  container.appendChild(frame)
 }
}

function addImageEmbed(container, text) {
 const regExp =
  /https:\/\/\S+\.(gif|jpe?g|png|webp)/
 const match = text.match(regExp)

 if (match) {
  const imageContainer = elem({
   classes: ['image-container'],
   children: [
    elem({
     attributes: {
      src: match[0],
     },
     tagName: 'img',
    }),
   ],
   events: {
    click() {
     if (
      imageContainer.classList.contains(
       'expanded'
      )
     ) {
      imageContainer.classList.remove(
       'expanded'
      )
     } else {
      imageContainer.classList.add('expanded')
     }
    },
   },
  })
  container.appendChild(imageContainer)
 }
}

function begin2024GMT() {
 return new Date('January 1, 2024 00:00:00 GMT')
}

function debounce(fn, delay = 500) {
 let timeout
 return function () {
  clearTimeout(timeout)
  timeout = setTimeout(fn, delay)
 }
}

function elem({
 attributes,
 classes,
 children,
 events,
 tagName = 'div',
 textContent,
} = {}) {
 const e = document.createElement(tagName)
 if (attributes) {
  for (const [k, v] of Object.entries(
   attributes
  )) {
   e.setAttribute(k, v)
  }
 }
 if (events) {
  for (const [k, v] of Object.entries(events)) {
   e.addEventListener(k, v)
  }
 }
 if (classes) {
  for (const c of classes) {
   e.classList.add(c)
  }
 }
 if (textContent) {
  e.textContent = textContent
 }
 if (children) {
  for (const c of children) {
   e.appendChild(c)
  }
 }
 return e
}

function formatChannelData(channels) {
 return Object.entries(channels)
  .map(function ([name, score]) {
   return { score, name }
  })
  .sort(function (a, b) {
   return b.score - a.score
  })
}

function formatMessageData(messages) {
 const now = Date.now()
 return Object.entries(messages)
  .map(function ([text, data]) {
   const score =
    data.position +
    (data.velocity * (now - data.timestamp)) /
     ONE_HOUR_MS
   return { data, score, text }
  })
  .sort(function (a, b) {
   return b.score - a.score
  })
}

function getDateTime(hoursSince2024) {
 const resultDate = new Date(
  begin2024GMT().getTime() +
   hoursSince2024 * 60 * 60 * 1000
 )
 return [
  resultDate.getFullYear(),
  resultDate.getMonth(),
  resultDate.getDate() - 1,
  resultDate.getHours(),
 ]
}

function getDaysInMonth(year, month) {
 const months30 = [3, 5, 8, 10]
 const feb = 1

 if (months30.includes(month)) {
  return 30
 }

 if (month === feb) {
  if (
   year % 4 === 0 &&
   (year % 100 !== 0 || year % 400 === 0)
  )
   return 29
  return 28
 }

 return 31
}

function getHourNumber() {
 const now = new Date()
 const msPerHour = 1000 * 60 * 60
 return Math.floor(
  (now.getTime() - begin2024GMT().getTime()) /
   msPerHour
 )
}

function messageReplyChannel(
 channel,
 messageText
) {
 return `replies@${encodeURIComponent(
  channel ?? ''
 )}:${encodeURIComponent(messageText)}`
}

function getUrlData() {
 const [_, channel, messageEncoded] =
  window.location.hash
   .split('/')
   .map((x) =>
    typeof x === 'string'
     ? decodeURIComponent(x)
     : undefined
   )
 if (
  typeof channel === 'string' &&
  channel.length > 25
 ) {
  alert('channel must be 25 characters or less')
  return { channel: '', messageChannel: '' }
 }
 if (
  typeof channel === 'string' &&
  channel.includes('.')
 ) {
  alert('channel must not include "."')
  return { channel: '', messageChannel: '' }
 }
 if (
  typeof channel === 'string' &&
  channel.includes(',')
 ) {
  alert('channel must not include ","')
  return { channel: '', messageChannel: '' }
 }
 if (
  typeof channel === 'string' &&
  channel.includes('  ')
 ) {
  alert(
   'channel must not include two spaces in a row'
  )
  return { channel: '', messageChannel: '' }
 }
 const message =
  typeof messageEncoded === 'string' &&
  messageEncoded.length > 1
   ? decodeURIComponent(atob(messageEncoded))
   : undefined
 const messageChannel =
  typeof message === 'string'
   ? messageReplyChannel(channel, message)
   : channel ?? ''
 return {
  channel: channel ?? '',
  messageChannel,
  message,
 }
}

function hoursSinceStartOf2024(
 year,
 month,
 day,
 hour
) {
 const startDate = begin2024GMT()

 const date = new Date(
  year,
  month,
  day + 1,
  hour
 )

 return Math.floor(
  (date - startDate) / (1000 * 60 * 60)
 )
}

async function networkChannelSeek(
 channel,
 hour
) {
 const response = await fetch(
  `${networkRootUrl()}/seek?channel=${encodeURIComponent(
   channel
  )}&hour=${hour}`
 )
 if (!response.ok) {
  throw new Error(
   `${
    response.statusText
   }: ${await response.text()}`
  )
 }
 return response.json()
}

async function networkMessageSend(
 channel,
 message,
 velocity = 0
) {
 const body = JSON.stringify({
  channel,
  message,
  velocity,
 })
 const resp = await fetch(
  `${networkRootUrl()}/send`,
  {
   method: 'POST',
   headers: {
    'Content-Length': body.length,
    'Content-Type': 'application/json',
   },
   body,
  }
 )

 if (!resp.ok) {
  throw new Error(await resp.text())
 }

 return await resp.text()
}

function networkRootUrl() {
 return location.origin ===
  'http://localhost:8000'
  ? 'https://tagme.in'
  : ''
}

function setChannel(channel) {
 location.hash = `#/${encodeURIComponent(
  channel
 )}`
}

function randomId() {
 return '12345678'
  .split('')
  .map(() =>
   (Math.random() * 1e6)
    .toString(36)
    .replace('.', '')
    .slice(0, 4)
  )
  .join('')
}

function read(key, defaultValue) {
 const data = localStorage.getItem(key)
 if (typeof data === 'string') {
  return JSON.parse(data)
 }
 return defaultValue
}

function write(key, value) {
 localStorage.setItem(
  key,
  JSON.stringify(value)
 )
}

function listSessions() {
 return read('tmi:sessions', [])
}

function writeSessions(data) {
 write('tmi:sessions', data)
}

const PUBLIC_SESSION_ID = 'public'

function setActiveSessionId(id) {
 write('tmi:active-session', id)
 route()
}

function getActiveSessionId() {
 return read(
  'tmi:active-session',
  PUBLIC_SESSION_ID
 )
}

function createSession() {
 const id = randomId()
 const { hash, origin } = location
 writeSessions([
  ...listSessions(),
  {
   id,
   hash,
  },
 ])
 location.href = `https://tagme.in/auth-linkedin-init?origin=${encodeURIComponent(
  origin
 )}&state=${id}`
}
