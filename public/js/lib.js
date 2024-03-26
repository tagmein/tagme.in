function switchToMode(mode) {
 return function () {
  if (document.body.dataset.mode !== mode) {
   document.body.dataset.mode = mode
  }
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

function addHashTagLinks(
 container,
 text,
 isAfterLink
) {
 const parts = text.split(/(#[^,.\s]*)/)

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
 /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/

function addYouTubeEmbed(container, text) {
 const match = text.match(isYouTubeUrl)

 if (match && match[2].length == 11) {
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

function addImageByUrl(
 container,
 imgSrc,
 classes = []
) {
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
     imageContainer.classList.remove('expanded')
     expandedElement = undefined
    } else {
     imageContainer.classList.add('expanded')
     expandedElement = imageContainer
    }
   },
  },
 })
 container.appendChild(imageContainer)
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

 try {
  const tagResponse = await fetch(
   `${networkRootUrl()}/og?url=${encodeURIComponent(
    urlMatch[0]
   )}`
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

function htmlEntities(text) {
 const parser = new DOMParser()
 const doc = parser.parseFromString(
  text,
  'text/html'
 )
 return doc.body.textContent
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
 dataset,
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
 const alertContainer = elem({
  classes: ['alert-container'],
  attributes: {
   tabIndex: 0,
  },
  children: [
   elem({
    children,
   }),
   elem({
    events: {
     click() {
      document.body.removeChild(dialogBox)
     },
    },
    tagName: 'button',
    textContent: 'Cancel',
   }),
  ],
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

 function close() {
  document.body.removeChild(dialogBox)
 }

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
  channel.length > 25
 ) {
  politeAlert(
   'channel must be 25 characters or less'
  )
  return { channel: '', messageChannel: '' }
 }
 if (
  typeof channel === 'string' &&
  channel.includes('.')
 ) {
  politeAlert('channel must not include "."')
  return { channel: '', messageChannel: '' }
 }
 if (
  typeof channel === 'string' &&
  channel.includes(',')
 ) {
  politeAlert('channel must not include ","')
  return { channel: '', messageChannel: '' }
 }
 if (
  typeof channel === 'string' &&
  channel.includes('  ')
 ) {
  politeAlert(
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
  `${networkRootUrl()}/seek?channel=${encodeURIComponent(
   channel
  )}&hour=${hour}`,
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
  `${networkRootUrl()}/send`,
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
  `${networkRootUrl()}/unsend`,
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

function networkRootUrl() {
 return location.origin ===
  'http://localhost:8000'
  ? 'https://tagme.in'
  : ''
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
 const response = await fetch(
  `${networkRootUrl()}/news${
   typeof chunk === 'number'
    ? `?chunk=${chunk.toString(10)}`
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
 const sendEmailButton = elem({
  attributes: {
   type: 'submit',
   value: 'Send email',
  },
  tagName: 'input',
 })
 const loginDialog = dialog(
  elem({
   tagName: 'h2',
   textContent: 'Sign in',
  }),
  elem({
   tagName: 'h4',
   textContent: 'Verify your email:',
  }),
  elem({
   tagName: 'p',
   textContent: `➊ Enter email address and send`,
  }),
  elem({
   tagName: 'p',
   textContent: `➋ Click the link in the email`,
  }),
  elem({
   tagName: 'p',
   textContent: `➌ Enter code ${code}`,
  }),
  elem({
   tagName: 'form',
   children: [
    elem({
     attributes: {
      autofocus: true,
      name: 'email',
      placeholder: 'Enter email address',
      required: true,
      type: 'text',
     },
     tagName: 'input',
    }),
    sendEmailButton,
   ],
   events: {
    async submit(e) {
     e.preventDefault()
     if (!waitingMessage) {
      waitingMessage = elem({
       tagName: 'p',
       textContent:
        'Please wait, sending email...',
      })
     }
     try {
      if (continueButton?.parentElement) {
       continueButton.parentElement.removeChild(
        continueButton
       )
      }
      e.target.email.disabled = true
      sendEmailButton.disabled = true
      e.target.appendChild(waitingMessage)
      waitingMessage.textContent =
       'Please wait, sending email...'
      const id = await createSessionEmail(
       e.target.email.value
      )
      waitingMessage.textContent =
       'Check your email inbox, the verification email should arrive momentarily...'
      await new Promise((x) =>
       setTimeout(x, 3000)
      )
      waitingMessage.textContent =
       'You must approve the login request within 5 minutes. Once you have approved the login request sent to your email, click the continue button:'
      continueButton = elem({
       tagName: 'button',
       textContent: 'Continue',
       events: {
        async click(e) {
         e.preventDefault()
         const fetchBody = JSON.stringify({
          id,
         })
         const response = await fetch(
          `${networkRootUrl()}/auth-email-verify`,
          {
           method: 'POST',
           body: fetchBody,
           headers: {
            'Content-Length':
             fetchBody.length.toString(10),
            'Content-Type': 'application/json',
           },
          }
         )
         if (!response.ok) {
          await politeAlert(
           `There was a problem: ${await response.text()}`
          )
          return
         } else {
          const responseBody =
           await response.json()
          if (
           !responseBody ||
           typeof responseBody.loginRequest
            ?.code !== 'string'
          ) {
           await politeAlert(
            'The log in request has not been approved'
           )
           return
          }
          if (
           responseBody.loginRequest.code ==
           code
          ) {
           await completeSessionEmail(id)
           loginDialog.close()
          } else {
           await politeAlert(
            `The code entered on approval was ${responseBody.loginRequest.code}, which did not match the code ${code} displayed above`
           )
          }
         }
        },
       },
      })
      e.target.appendChild(continueButton)
     } catch (e) {
      alert(
       e.message ??
        'Something went wrong, please try again'
      )
      e.target.removeChild(waitingMessage)
     } finally {
      e.target.email.disabled = false
      sendEmailButton.disabled = false
     }
    },
   },
  }),
  elem({
   tagName: 'h4',
   textContent: 'Or, verify with LinkedIn:',
  }),
  elem({
   tagName: 'form',
   children: [
    elem({
     events: {
      click: createSessionLinkedIn,
     },
     tagName: 'button',
     textContent: 'Verify with LinkedIn',
    }),
   ],
  })
 )
}

async function createSessionEmail(email) {
 const body = JSON.stringify({ email })
 const response = await fetch(
  `${networkRootUrl()}/auth-email-init`,
  {
   method: 'POST',
   body,
   headers: {
    'Content-Type': 'application/json',
    'Content-Length': body.length,
   },
  }
 )
 if (!response.ok) {
  throw new Error(await response.text())
 }
 const data = await response.json()
 if (!data.success) {
  throw new Error(
   data.message ?? JSON.stringify(data)
  )
 }
 return data.id
}

async function completeSessionEmail(uniqueId) {
 const sessionId = randomId()
 const completeFetchBody = JSON.stringify({
  id: uniqueId,
  sessionId,
 })
 const completeResponse = await fetch(
  `${networkRootUrl()}/auth-email-complete`,
  {
   method: 'POST',
   body: completeFetchBody,
   headers: {
    'Content-Length':
     completeFetchBody.length.toString(10),
    'Content-Type': 'application/json',
   },
  }
 )
 if (!completeResponse.ok) {
  await politeAlert(
   `There was a problem: ${await completeResponse.text()}`
  )
  return
 } else {
  const completeResponseBody =
   await completeResponse.json()
  if (
   !completeResponseBody ||
   typeof completeResponseBody.key !== 'string'
  ) {
   await politeAlert(
    'The log in request was not completed'
   )
   return
  }
  const { loginRequest, key } =
   completeResponseBody
  const { email } = loginRequest
  const newSession = {
   id: sessionId,
   email,
   hash: location.hash,
  }
  writeSessions([...listSessions(), newSession])
  const createdAppAccount =
   appAccounts.add(newSession)
  await registerSessionWithKey(sessionId, key)
  createdAppAccount.switchTo()
 }
}

function createSessionLinkedIn() {
 const id = randomId()
 const { hash, origin } = location
 writeSessions([
  ...listSessions(),
  {
   id,
   hash,
  },
 ])
 setActiveSessionId(id)
 location.href = `https://tagme.in/auth-linkedin-init?state=${encodeURIComponent(
  JSON.stringify({ id, origin })
 )}`
}

function forkSession(session, realm, name) {
 const id = randomId()
 const { accessToken, email } = session
 const created = Date.now()

 const forkedSession = {
  id,
  hash: '',
  accessToken,
  created,
  email,
  realm,
  name,
 }

 writeSessions([
  ...listSessions(),
  forkedSession,
 ])

 return forkedSession
}

async function registerSessionWithKey(
 sessionId,
 key
) {
 const session = readSession(sessionId)
 if (session && !session.accessToken) {
  const response = await fetch(
   'https://tagme.in/auth-init',
   {
    method: 'POST',
    body: JSON.stringify({
     id: sessionId,
     key,
    }),
    headers: {
     'Content-Type': 'application/json',
    },
   }
  )
  const data = await response.json()
  const newSession = {
   ...session,
   ...data,
  }
  writeSession(sessionId, newSession)
  const realm = realms.find(
   (x) => x.session.id === sessionId
  )
  realm.realmTabLabel.textContent =
   newSession.email
  location.hash = session.hash
  return true
 }
}

async function registerSession(
 sessionId,
 control
) {
 const session = readSession(sessionId)
 if (session && !session.accessToken) {
  if (!control.startsWith('#key=')) {
   console.warn(
    'control did not include key',
    control
   )
   location.hash = session.hash
   return true
  }
  const response = await fetch(
   'https://tagme.in/auth-init',
   {
    method: 'POST',
    body: JSON.stringify({
     id: sessionId,
     key: control.substring('#key='.length),
    }),
    headers: {
     'Content-Type': 'application/json',
    },
   }
  )
  const data = await response.json()
  const newSession = {
   ...session,
   ...data,
  }
  writeSession(sessionId, newSession)
  const realm = realms.find(
   (x) => x.session.id === sessionId
  )
  realm.realmTabLabel.textContent =
   newSession.email
  location.hash = session.hash
  return true
 }
}

function scrollToTop() {
 scrollTo(0, 0)
 document.body.classList.remove('scroll-up')
 document.body.classList.add('scroll-zero')
}
