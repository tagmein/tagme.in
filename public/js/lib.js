const lastKnownModeAtStartup =
 localStorage.getItem('mode')

let hasCompletedStartup = false

function switchToMode(
 mode,
 saveToStorage = true
) {
 return function (runSpecialActions = true) {
  if (
   typeof lastKnownModeAtStartup === 'string' &&
   mode !== lastKnownModeAtStartup &&
   !hasCompletedStartup
  ) {
   console.warn(
    `mode ${mode} is not the same as the last known mode at startup ${lastKnownModeAtStartup}, skipping`
   )
   return
  }
  if (document.body.dataset.mode !== mode) {
   if (saveToStorage) {
    for (const index of [-5, -4, -3, -2]) {
     localStorage.setItem(
      `mode-${index.toString(10)}`,
      localStorage.getItem(
       `mode-${(index + 1).toString(10)}`
      ) ?? 'main'
     )
    }
    localStorage.setItem(
     `mode--1`,
     localStorage.getItem('mode') ?? 'main'
    )
    localStorage.setItem('mode', mode)
   }
   document.body.dataset.mode = mode
   // two ways of setting the data-mode attribute for maximum compatibility
   document.body.setAttribute('data-mode', mode)
   if (runSpecialActions) {
    if (mode === 'theme-selector') {
     enterThemeSelector()
    }
   }
  }
 }
}

function restoreLastKnownMode(index = 0) {
 const lastKnownMode = localStorage.getItem(
  index === 0 ? 'mode' : `mode-${index}`
 )

 if (typeof lastKnownMode === 'string') {
  switchToMode(lastKnownMode, false)()
 }
}

function niceNumber(value) {
 if (value > 1e12) {
  return (value / 1e12).toFixed(1) + 'T'
 }
 if (value > 1e9) {
  return (value / 1e9).toFixed(1) + 'B'
 }
 if (value > 1e6) {
  return (value / 1e6).toFixed(1) + 'M'
 }
 if (value > 1e3) {
  return (value / 1e3).toFixed(1) + 'k'
 }
 return Math.round(value).toString(10)
}

function isInsideElementWithClass(
 target,
 className
) {
 let parent = target
 while ((parent = parent.parentElement)) {
  if (parent.classList.contains(className)) {
   return true
  }
 }
 return false
}

function insertAfter(child, node) {
 if (child.nextElementSibling) {
  child.parentElement.insertBefore(
   node,
   child.nextElementSibling
  )
 } else {
  child.parentElement.appendChild(node)
 }
}

function safeDecodeURI(uri) {
 try {
  return decodeURI(uri)
 } catch (e) {}
 return uri
}

function addTextWithLinks(container, text) {
 const parts = text.split(/(https?:\/\/[^\s]+)/)
 let isAfterLink = false
 parts.forEach((part) => {
  if (/^https?:\/\//.test(part)) {
   const a = document.createElement('a')
   a.setAttribute('target', '_blank')
   a.setAttribute('href', part)
   a.textContent = safeDecodeURI(part)
   container.appendChild(a)
   isAfterLink = true
  } else if (part) {
   addHashTagLinks(container, part, isAfterLink)
  }
 })
}

function addTextBlocks(
 container,
 text,
 filter
) {
 const lines =
  typeof filter === 'function'
   ? text
      .split('\n')
      .map(filter)
      .filter((x) => x !== undefined)
   : text.split('\n')
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

function addHashTagLinks(
 container,
 text,
 isAfterLink
) {
 const parts = text.match(
  /((?<!\&)#[^,.\s]*)|([^#]+)|(\&#\d*;?)/g
 )
 parts.forEach((part) => {
  if (part[0] === '#') {
   const channel = decodeURIComponent(
    part.slice(1)
   )
   const a = document.createElement('a')
   a.href = `/#/${encodeURIComponent(channel)}`
   a.textContent =
    part === '#'
     ? `#${HOME_CHANNEL_ICON}`
     : part
   container.appendChild(a)
   isAfterLink = true
  } else if (part) {
   container.appendChild(
    document.createTextNode(
     (isAfterLink ? ' ' : '') +
      htmlEntities(part)
    )
   )
   isAfterLink = false
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
  if (codeContent.startsWith('=')) {
   formula(code, codeContent)
  } else {
   addTextWithLinks(code, codeContent)
  }
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

const isYouTubeUrl =
 /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]{11}).*/

function addYouTubeEmbed(container, text) {
 const match = text.match(isYouTubeUrl)
 if (match && match[2].length === 11) {
  const id = match[2]
  const frame = document.createElement('iframe')
  frame.setAttribute('width', '100%')
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
const isUrl = /https?:\/\/\S+/

const isImageUrl =
 /https?:\/\/\S+\.(gif|jpe?g|png|webp)/

function addImageEmbed(container, text) {
 const urlMatch = text.match(isUrl)

 if (
  !urlMatch ||
  urlMatch[0].match(isYouTubeUrl)
 ) {
  return
 }

 const imageUrlMatch =
  urlMatch[0].match(isImageUrl)

 if (!imageUrlMatch) {
  return
 }

 const imgSrc = imageUrlMatch
  ? imageUrlMatch[0]
  : 'https://dropkeep.app/screenshot?' +
    new URLSearchParams({
     url: urlMatch[0],
     width: 720,
     height: 720,
    }).toString()

 addImageByUrl(container, imgSrc)
}

function captureScrollPosition() {
 const scrollPosition = document.body.scrollTop
 localStorage.setItem(
  'scrollPosition',
  scrollPosition
 )
 document.body.scrollTo({
  behavior: 'instant',
  left: 0,
  top: 0,
 })
 document.body.style.overflow = 'hidden'
}

function restoreScrollPosition() {
 const scrollPosition = localStorage.getItem(
  'scrollPosition'
 )
 if (scrollPosition) {
  document.body.scrollTo({
   behavior: 'instant',
   left: 0,
   top: scrollPosition,
  })
 }
 document.body.style.overflow = 'auto'
}

function addImageByUrl(
 container,
 imgSrc,
 classes = []
) {
 const imageContainerReferencePosition = elem()
 const imageContainer = elem({
  classes: ['image-container', ...classes],
  children: [
   elem({
    attributes: {
     loading: 'lazy',
     src: imgSrc,
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
     imageContainerReferencePosition.parentElement.insertBefore(
      imageContainer,
      imageContainerReferencePosition
     )
     imageContainer.classList.remove('expanded')
     restoreScrollPosition()
     expandedElement = undefined
    } else {
     captureScrollPosition()
     imageContainer.classList.add('expanded')
     expandedElement = imageContainer
     document.body.appendChild(imageContainer)
    }
   },
  },
 })
 container.appendChild(imageContainer)
 container.appendChild(
  imageContainerReferencePosition
 )
}

async function addOpenGraphLink(
 container,
 text
) {
 const urlMatch = text.match(isUrl)

 if (!urlMatch) {
  return // it's not a URL
 }

 if (
  urlMatch[0].match(isYouTubeUrl) ||
  urlMatch[0].match(isImageUrl)
 ) {
  return // it's YouTube or an image
 }

 const activeSession = getActiveSession()

 try {
  const tagResponse = await fetch(
   `${networkRootUrl(
    env
   )}/og?url=${encodeURIComponent(
    urlMatch[0]
   )}${
    activeSession?.url
     ? `&kv=${encodeURIComponent(
        activeSession?.url
       )}`
     : ''
   }`
  )
  if (!tagResponse.ok) {
   throw new Error(tagResponse.statusText)
  }
  const tags = await tagResponse.json()
  if (tags.image) {
   addImageByUrl(container, tags.image, [
    'image-article',
   ])
  }
  if (tags.title) {
   const titleElem = elem({ tagName: 'h1' })
   addTextWithCodeBlocks(titleElem, tags.title)
   container.appendChild(titleElem)
  }
  if (tags.description) {
   const descriptionElem = elem({
    tagName: 'p',
   })
   addTextWithCodeBlocks(
    descriptionElem,
    tags.description
   )
   container.appendChild(descriptionElem)
  }
  const siteName = htmlEntities(
   tags.site_name ?? urlMatch[0].split('/')[2]
  )
  container.appendChild(
   elem({
    attributes: {
     href: tags.url ?? urlMatch[0],
     target: '_blank',
    },
    classes: ['external-link'],
    tagName: 'a',
    textContent:
     tags.type === 'website'
      ? siteName
      : `Open ${
         tags.type ?? 'page'
        } on ${siteName}`,
   })
  )
 } catch (e) {
  console.warn(e)
 }
}

async function addMessageReplies(
 channel,
 container,
 message
) {
 const replies = message.data.replies
 if (
  !replies ||
  typeof replies.count !== 'number' ||
  replies.count === 0
 ) {
  return
 }
 const replyContainer = elem({
  tagName: 'div',
  classes: ['replies'],
  children: [
   elem({
    attributes: {
     title: 'Toggle replies',
    },
    events: {
     click() {
      replyContainer.classList.toggle(
       'expanded'
      )
     },
    },
    tagName: 'h4',
    textContent: `${replies.count ?? 'No'} ${
     replies.count === 1 ? 'Reply' : 'Replies'
    }`,
   }),
  ],
 })

 const formattedMessageReplies =
  formatMessageData(message.data.replies.top)

 const messageReplyChannel = `replies@${encodeURIComponent(
  channel
 )}:${encodeURIComponent(message.text)}`

 attachMessages(
  messageReplyChannel,
  replyContainer,
  formattedMessageReplies,
  false,
  'No replies. Be the first to write a reply!',
  undefined,
  false,
  false,
  true
 )

 const topReplyCount = Object.keys(
  message.data.replies.top
 ).length
 const totalReplyCount =
  message.data.replies.count
 const additionalReplies =
  totalReplyCount - topReplyCount
 const additionalRepliesText =
  additionalReplies === 1 ? 'reply' : 'replies'

 if (totalReplyCount > topReplyCount) {
  replyContainer.appendChild(
   elem({
    attributes: {
     href: `/#/${encodeURIComponent(
      channel
     )}/${btoa(
      encodeURIComponent(message.text)
     )}`,
    },
    tagName: 'a',
    textContent: `View ${additionalReplies.toString(
     10
    )} more ${additionalRepliesText}`,
   })
  )
 }
 container.appendChild(replyContainer)
}

function htmlEntities(text) {
 const parser = new DOMParser()
 const doc = parser.parseFromString(
  text,
  'text/html'
 )
 return doc.body.textContent
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
 dataset,
 events,
 style,
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
 if (dataset) {
  for (const [k, v] of Object.entries(
   dataset
  )) {
   e.dataset[k] = v
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
 if (style) {
  for (const [k, v] of Object.entries(style)) {
   e.style[k] = v
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

const begin2024 = new Date(
 'January 1, 2024 00:00:00 GMT'
)

function getHourNumber() {
 const now = new Date()
 return Math.floor(
  (now.getTime() - begin2024.getTime()) /
   ONE_HOUR_MS
 )
}

function getHourTimestamp(hourNumber) {
 return (
  begin2024.getTime() + hourNumber * ONE_HOUR_MS
 )
}

function calculateScore(data, hourToEvaluate) {
 const now =
  typeof hourToEvaluate === 'number'
   ? getHourTimestamp(hourToEvaluate)
   : Date.now()

 console.log(
  `Calcuated score for ${
   hourToEvaluate ?? 'now'
  }`,
  {
   position: data.position,
   velocity: data.velocity,
   timestamp: data.timestamp,
   score:
    data.position +
    (data.velocity * (now - data.timestamp)) /
     ONE_HOUR_MS,
  }
 )
 return (
  data.position +
  (data.velocity * (now - data.timestamp)) /
   ONE_HOUR_MS
 )
}

function formatMessageEntry([text, data]) {
 const score = calculateScore(data)
 return { data, score, text }
}

function formatMessageData(messages) {
 return Object.entries(messages)
  .map(formatMessageEntry)
  .sort(function (a, b) {
   return b.score - a.score
  })
}

function getDateTime(hoursSince2024) {
 const resultDate = new Date(
  begin2024.getTime() +
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
 return Math.floor(
  (now.getTime() - begin2024.getTime()) /
   ONE_HOUR_MS
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

async function politeAlert(
 message,
 actionText,
 requiredConsent,
 allowCancel
) {
 let alertBox
 const consentForm = requiredConsent
  ? [
     elem({
      tagName: 'form',
      children: requiredConsent.map((text) => {
       const checkbox = elem({
        attributes: {
         type: 'checkbox',
        },
        events: {
         click() {
          if (checkbox.checked) {
           label.classList.remove('required')
          }
         },
        },
        tagName: 'input',
       })
       const label = elem({
        children: [
         checkbox,
         elem({
          tagName: 'div',
          textContent: text,
         }),
        ],
        tagName: 'label',
       })
       return label
      }),
     }),
    ]
  : []
 const agreed = await new Promise((agree) => {
  const alertContainer = elem({
   classes: ['alert-container'],
   attributes: {
    tabIndex: 0,
   },
   children: [
    elem({
     textContent: message,
    }),
    ...consentForm,
    elem({
     events: {
      click() {
       if (consentForm[0]) {
        const missingCheckbox =
         consentForm[0].querySelector(
          'input:not(:checked)'
         )
        if (missingCheckbox) {
         missingCheckbox.parentElement.classList.add(
          'required'
         )
         return
        }
       }
       agree(true)
      },
     },
     tagName: 'button',
     textContent: actionText ?? 'OK',
    }),
    ...(allowCancel
     ? [
        elem({
         events: {
          click() {
           agree(false)
          },
         },
         tagName: 'button',
         textContent:
          typeof allowCancel === 'string'
           ? allowCancel
           : 'Cancel',
        }),
       ]
     : []),
   ],
  })
  alertBox = elem({
   classes: ['alert-shade'],
   events: {
    click(e) {
     if (
      isInsideElementWithClass(
       e.target,
       'alert-container'
      )
     ) {
      return
     }
     alertContainer.focus()
    },
   },
   children: [alertContainer],
  })
  document.body.appendChild(alertBox)
 })
 document.body.removeChild(alertBox)
 return agreed
}

function dialog(...children) {
 function close() {
  document.body.removeChild(dialogBox)
 }
 const cancelButton = !children.includes(false)
 const compChildren = [
  elem({
   children: children.filter(
    (v) => typeof v !== 'boolean'
   ),
  }),
 ]
 if (cancelButton) {
  compChildren.push(
   elem({
    events: {
     click: close,
    },
    tagName: 'button',
    textContent: 'Cancel',
   })
  )
 }
 const alertContainer = elem({
  classes: ['alert-container'],
  attributes: {
   tabIndex: 0,
  },
  children: compChildren,
 })
 const dialogBox = elem({
  classes: ['alert-shade'],
  events: {
   click(e) {
    if (
     isInsideElementWithClass(
      e.target,
      'alert-container'
     )
    ) {
     return
    }
    alertContainer.focus()
   },
  },
  children: [alertContainer],
 })
 document.body.appendChild(dialogBox)

 dialogBox.scrollIntoView({
  behavior: 'instant',
  block: 'center',
 })

 return { close }
}

function getUrlData() {
 const [control, channel, messageEncoded] =
  window.location.hash
   .split('/')
   .map((x) =>
    typeof x === 'string'
     ? decodeURIComponent(x)
     : undefined
   )
 if (
  typeof channel === 'string' &&
  channel.length > 512
 ) {
  politeAlert(
   'channel must be 512 characters or less'
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
   : (channel ?? '')
 return {
  control,
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
 const startDate = begin2024

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
 const headers = {}
 const activeSession = getActiveSession()
 if (activeSession) {
  headers.Authorization =
   activeSession.accessToken
  if (activeSession.realm) {
   headers['X-Realm'] = activeSession.realm
  }
 }
 const response = await fetch(
  `${networkRootUrl(
   env
  )}/seek?channel=${encodeURIComponent(
   channel
  )}&hour=${hour}${
   typeof activeSession?.url === 'string'
    ? `&kv=${encodeURIComponent(
       activeSession?.url
      )}`
    : ''
  }`,
  { headers }
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
 velocity = 0,
 sessionId
) {
 const body = JSON.stringify({
  channel,
  message,
  velocity,
 })
 const headers = {
  'Content-Length': body.length,
  'Content-Type': 'application/json',
 }
 const activeSession = sessionId
  ? sessionId === PUBLIC_SESSION_ID
    ? undefined
    : readSession(sessionId)
  : getActiveSession()
 if (activeSession) {
  headers.Authorization =
   activeSession.accessToken
  if (activeSession.realm) {
   headers['X-Realm'] = activeSession.realm
  }
 }
 const resp = await fetch(
  `${networkRootUrl(env)}/send${
   typeof activeSession?.url === 'string'
    ? `?kv=${encodeURIComponent(
       activeSession?.url
      )}`
    : ''
  }`,
  {
   method: 'POST',
   headers,
   body,
  }
 )

 if (!resp.ok) {
  const error = await resp.text()
  window.g = resp
  window.h = error
  console.error({
   error,
   url: `${networkRootUrl(env)}/send`,
  })
  alert(error)
  return false
 }

 return await resp.text()
}

async function networkMessageUnsend(
 channel,
 message
) {
 const body = JSON.stringify({
  channel,
  message,
 })
 const headers = {
  'Content-Length': body.length,
  'Content-Type': 'application/json',
 }
 const activeSession = getActiveSession()
 if (activeSession) {
  headers.Authorization =
   activeSession.accessToken
  if (activeSession.realm) {
   headers['X-Realm'] = activeSession.realm
  }
 }
 const resp = await fetch(
  `${networkRootUrl(env)}/unsend${
   typeof activeSession?.url === 'string'
    ? `?kv=${encodeURIComponent(
       activeSession?.url
      )}`
    : ''
  }`,
  {
   method: 'POST',
   headers,
   body,
  }
 )

 if (!resp.ok) {
  throw new Error(await resp.text())
 }

 return await resp.text()
}

function networkRootUrl(env) {
 return env.TAGMEIN_API_BASEURL ?? ''
}

async function getNews(chunk, callback) {
 const headers = {}
 const activeSession = getActiveSession()
 if (activeSession) {
  headers.Authorization =
   activeSession.accessToken
  if (activeSession.realm) {
   headers['X-Realm'] = activeSession.realm
  }
 }
 const hasChunk =
  typeof chunk === 'number' && !isNaN(chunk)
 const response = await fetch(
  `${networkRootUrl(env)}/news${
   hasChunk
    ? `?chunk=${chunk.toString(36)}`
    : ''
  }${
   typeof activeSession?.url === 'string'
    ? `${
       hasChunk ? '&' : '?'
      }kv=${encodeURIComponent(
       activeSession?.url
      )}`
    : ''
  }`,
  { headers }
 )
 const news = await response.json()
 if (typeof callback === 'function') {
  callback(news.chunkId)
 }
 return news
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

function removeSession(sessionId) {
 writeSessions(
  listSessions().filter(
   (x) => x.id !== sessionId
  )
 )
}

function readSession(sessionId) {
 return read('tmi:sessions', []).find(
  (x) => x.id === sessionId
 )
}

function getActiveSession() {
 const sessionId = getActiveSessionId()
 if (sessionId === PUBLIC_SESSION_ID) {
  return
 }
 return readSession(sessionId)
}

function writeSession(
 sessionId,
 newSessionData
) {
 return writeSessions(
  listSessions().map((x) =>
   x.id === sessionId ? newSessionData : x
  )
 )
}

const PUBLIC_SESSION_ID = 'public'

let localActiveSessionId

function setActiveSessionId(id) {
 localActiveSessionId = id
 write('tmi:active-session', id)
 route()
}

function getActiveSessionId() {
 if (typeof localActiveSessionId !== 'string') {
  localActiveSessionId = read(
   'tmi:active-session',
   PUBLIC_SESSION_ID
  )
 }
 return localActiveSessionId
}

function createSession() {
 let waitingMessage
 let continueButton
 const code = [0, 0, 0, 0]
  .map(() =>
   (
    Math.round(100 * Math.random()) % 10
   ).toString(10)
  )
  .join('')
 const verifyButton = elem({
  attributes: {
   type: 'submit',
   value: 'Verify',
  },
  tagName: 'input',
 })
 function closeModal() {
  loginDialog.close()
 }
 const loginDialog = dialog(
  elem({
   tagName: 'h2',
   textContent: 'Sign in',
  }),
  elem({
   tagName: 'h4',
   textContent: 'Verify your kv server:',
  }),
  elem({
   tagName: 'p',
   textContent: `➊ Enter compatible kv server url and verify ownership`,
  }),
  elem({
   tagName: 'h5',
   textContent: `KV Server Specification`,
  }),
  elem({
   tagName: 'code',
   textContent: `
Read a value:   GET <url>?key=<key>
Delete a value: DELETE <url>?key=<key>
Set a value:    POST <url>?key=<key>
                with value as request body
`.trim(),
  }),
  elem({
   tagName: 'p',
   textContent: `➋ Set the key "code" to ${JSON.stringify(
    code
   )}`,
  }),
  elem({
   tagName: 'p',
   textContent: `➌ Press Verify`,
  }),
  elem({
   tagName: 'form',
   children: [
    elem({
     attributes: {
      autofocus: true,
      name: 'url',
      placeholder: 'Enter kv server URL',
      required: true,
      type: 'text',
     },
     tagName: 'input',
    }),
    verifyButton,
   ],
   events: {
    async submit(e) {
     e.preventDefault()
     if (!waitingMessage) {
      waitingMessage = elem({
       tagName: 'p',
       textContent:
        'Please wait, checking kv server...',
      })
     }
     try {
      if (continueButton?.parentElement) {
       continueButton.parentElement.removeChild(
        continueButton
       )
      }
      const serverUrl = new URL(
       e.target.url.value
      )
      serverUrl.searchParams.set('key', 'code')
      serverUrl.searchParams.set('mode', 'disk')
      serverUrl.searchParams.set(
       'modeOptions.disk.basePath',
       './.kv-public'
      )
      const serverUrlString =
       serverUrl.toString()
      e.target.url.disabled = true
      verifyButton.disabled = true
      e.target.appendChild(waitingMessage)
      waitingMessage.textContent =
       'Please wait, giving you time to set the login value on your kv server...'
      let result = await createSessionWithKVUrl(
       serverUrlString,
       code
      )
      console.log({ result })
      if (result.success) {
       await new Promise((x) =>
        setTimeout(x, 500)
       )
       waitingMessage.textContent =
        '✅ Connected'
       closeModal()
       return
      }
      await new Promise((x) =>
       setTimeout(x, 3000)
      )
      async function reCheckNow() {
       if (continueButton?.parentElement) {
        continueButton.parentElement.removeChild(
         continueButton
        )
       }

       waitingMessage.textContent = `Please wait, checking kv server now at ${e.target.url.value}...`
       result = await createSessionWithKVUrl(
        serverUrlString,
        code
       )
       await new Promise((x) =>
        setTimeout(x, 500)
       )
       if (result.success) {
        waitingMessage.textContent =
         '✅ Connected'
        await new Promise((x) =>
         setTimeout(x, 500)
        )
        closeModal()
        return
       }
       waitingMessage.textContent =
        result.error ?? 'Unknown error'
       // check here, then allow continue if still not found / not correct code
       continueButton = elem({
        tagName: 'button',
        textContent: 'Continue',
        events: {
         async click(e) {
          e.preventDefault()
          reCheckNow()
         },
        },
       })
       e.target.appendChild(continueButton)
      }
      await reCheckNow()
     } catch (e) {
      alert(
       e.message ??
        'Something went wrong, please try again'
      )
      e.target.removeChild(waitingMessage)
     } finally {
      e.target.url.disabled = false
      verifyButton.disabled = false
     }
    },
   },
  })
 )
}

async function createSessionWithKVUrl(
 url,
 expectedCode
) {
 console.log({
  message: 'now checking url: ' + url,
 })
 const response = await fetch(url)
 if (!response.ok) {
  return {
   success: false,
   error: `Got response code ${response.status}} ${response.statusText}`,
  }
 }
 const responseText = await response.text()
 if (expectedCode !== responseText) {
  return {
   success: false,
   error: `Expected ${JSON.stringify(
    responseText
   )} to be ${JSON.stringify(expectedCode)}`,
  }
 }
 const sessionId = randomId()
 const newSession = {
  id: sessionId,
  url,
  hash: location.hash,
 }
 writeSessions([...listSessions(), newSession])
 const createdAppAccount =
  appAccounts.add(newSession)
 await registerSessionWithUrl(sessionId, url)
 createdAppAccount.switchTo()
 return {
  success: true,
  data: newSession,
 }
}

async function registerSessionWithUrl(
 sessionId,
 url
) {
 const session = readSession(sessionId)
 const realm = realms.find(
  (x) => x.session.id === sessionId
 )
 realm.realmTabLabel.textContent = session.url
 location.hash = session.hash
 return true
}

async function registerSession(
 sessionId,
 control
) {
 const session = readSession(sessionId)
 const realm = realms.find(
  (x) => x.session.id === sessionId
 )
 realm.realmTabLabel.textContent = new URL(
  session.url
 ).host
 location.hash = session.hash
 return true
}

function scrollToTop(top = 0) {
 document.body.scrollTo(0, top, {
  behavior: 'instant',
 })
 document.body.classList.remove('scroll-up')
 document.body.classList.add('scroll-zero')
}

function fakeScroll() {
 window.dispatchEvent(new CustomEvent('scroll'))
}

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
