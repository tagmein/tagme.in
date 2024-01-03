function getHourNumber() {
 const begin2024 = new Date(
  'January 1, 2024 00:00:00 GMT'
 )
 const now = new Date()
 const msPerHour = 1000 * 60 * 60
 return Math.floor(
  (now.getTime() - begin2024.getTime()) /
   msPerHour
 )
}

// Attach to DOM elements
const channelEl =
 document.getElementById('channel')
const contentEl =
 document.getElementById('content')

// Keep current channel/hour in hash URL route
function route() {
 const [_, channel, hour] = window.location.hash
  .split('/')
  .map(decodeURIComponent)

 channelEl.value = channel ?? ''
 displayChannel(
  channel ?? '',
  hour ?? getHourNumber().toString(10)
 )
}

// Load channel content
async function displayChannel(channel, hour) {
 console.log(
  `Load channel ${JSON.stringify(
   channel
  )} for hour ${hour}`
 )
 contentEl.textContent = 'Seeking...'

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
  // Display channel data
 } catch (err) {
  contentEl.textContent =
   err?.message ?? err ?? 'unknown error'
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

const sendMessageForm =
 document.getElementById('send')

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

  sendMessageForm.send.disabled = true

  try {
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

   sendMessageForm.reset()
   channelEl.focus()
  } catch (err) {
   alert(
    'Error! Please try again: ' +
     (err.message ?? err ?? 'unknown reason')
   )
  } finally {
   sendMessageForm.send.disabled = false
  }
 }
)
