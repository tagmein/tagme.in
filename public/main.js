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

function addBlockquote(
 parent,
 channel,
 text,
 score,
 isNew
) {
 const block =
  document.createElement('blockquote')
 const blockContent =
  document.createElement('div')
 if (isNew) {
  block.classList.add('new')
 }
 const blockText =
  document.createElement('span')
 blockContent.textContent = text
 blockContent.appendChild(blockText)
 const agreeButton =
  document.createElement('button')
 agreeButton.textContent = 'Agree'
 block.appendChild(agreeButton)
 block.appendChild(blockContent)
 try {
  addYouTubeEmbed(blockContent, text)
 } catch (e) {
  console.error('YouTube embed error', e)
 }
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

// Load channel content
async function displayChannel(channel, hour) {
 console.log(
  `Load channel ${JSON.stringify(
   channel
  )} for hour ${hour}`
 )
 contentEl.innerHTML = '<p>Seeking...</p>'

 try {
  const resp = await fetch(
   `/seek?channel=${encodeURIComponent(
    channel
   )}&hour=${hour}`
  )
  if (!resp.ok) {
   throw new Error(resp.statusText)
  }
  const data = await resp.json()
  console.log(data)

  const {
   topChannels,
   topMessages,
   message,
   mostRecentHour,
  } = data

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
      <cite>${votes - data.hour}</cite> 
    </a>
  `
  })

  contentEl.innerHTML = ''

  // Top Messages
  const sortedMessages = Object.entries(
   topMessages
  ).sort((a, b) => b[1] - a[1])
  sortedMessages.forEach(([text, votes]) => {
   const score = votes - data.hour
   addBlockquote(
    contentEl,
    channel,
    text,
    score,
    text === message
   )
  })

  if (
   Object.keys(topMessages).length === 0 &&
   typeof mostRecentHour === 'string'
  ) {
   const goButton =
    document.createElement('button')
   const diffHours =
    parseInt(mostRecentHour, 10) - data.hour
   goButton.textContent = `Go ${
    diffHours > 0 ? '+' : ''
   }${diffHours} hour${
    Math.abs(diffHours) === 1 ? '' : 's'
   } for content`
   goButton.addEventListener('click', () => {
    location.href = `/#/${encodeURIComponent(
     channel
    )}/${mostRecentHour}`
   })
   contentEl.innerHTML =
    '<p>Time travel to read latest messages</p>'
   const goParagraph =
    document.createElement('p')
   goParagraph.appendChild(goButton)
   contentEl.appendChild(goParagraph)
   return
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
 const resp = await fetch('/send', {
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
   const response = await sendMessage(
    channel,
    message
   )
   sendMessageForm.reset()
   alert(response)
   channelEl.focus()
   window.location.href = `/#/${encodeURIComponent(
    channel
   )}`
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

const toggleAboutButton =
 document.getElementById('toggle-about')
const about = document.getElementById('about')
let isAboutVisible =
 localStorage.getItem('hide-about') !== '1'
function showAbout() {
 if (isAboutVisible) {
  toggleAboutButton.innerHTML = '&times;'
  about.style.display = 'block'
 } else {
  toggleAboutButton.innerHTML = 'Info'
  about.style.display = 'none'
 }
}
function toggleAbout() {
 isAboutVisible = !isAboutVisible
 localStorage.setItem(
  'hide-about',
  isAboutVisible ? '0' : '1'
 )
 showAbout()
}
toggleAboutButton.addEventListener(
 'click',
 toggleAbout
)
showAbout()

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
