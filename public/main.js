const HOME_CHANNEL_ICON = '⌂'

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

const mainToolbar = elem({
 classes: ['toolbar'],
 children: [
  elem({
   children: [
    elem({
     classes: ['h-stretch'],
     tagName: 'span',
     textContent: HOME_CHANNEL_ICON,
    }),
   ],
   events: {
    click() {
     location.hash = '#'
    },
   },
   tagName: 'button',
  }),
  loadingIndicator,
  channelInput,
  lightDarkModeButton,
  fullScreenButton,
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

const composeTextarea = elem({
 attributes: {
  maxlength: '150',
  placeholder:
   'Write a message (up to 150 characters)',
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
   const { channel } = getUrlData()
   if (
    (await withLoading(
     networkMessageSend(
      channel,
      composeTextarea.value
     )
    )) !== false
   ) {
    focusOnMessage = composeTextarea.value
    composeTextarea.value = ''
    const nowHour = getHourNumber()
    if (nowHour !== hour) {
     setHour(nowHour)
    } else {
     route()
    }
   }
  },
 },
 tagName: 'form',
})

const mainContent = elem({
 tagName: 'main',
})

const body = elem({ classes: ['body'] })
body.appendChild(mainToolbar)
body.appendChild(compose)
body.appendChild(mainContent)
body.appendChild(
 document.getElementById('footer')
)
document.body.appendChild(body)

async function route() {
 const { channel } = getUrlData()
 if (channelInput.value.trim() !== channel) {
  channelInput.value = channel
 }
 const channelData = await withLoading(
  networkChannelSeek(channel, getHourNumber())
 )
 const hasMessages =
  Object.keys(channelData.topMessages).length >
  0
 if (hasMessages) {
  displayContent(channel, channelData)
 } else if (
  channelData.mostRecentHour !== null
 ) {
  const archivedChannelData = await withLoading(
   networkChannelSeek(
    channel,
    channelData.mostRecentHour
   )
  )
  displayContent(
   channel,
   channelData,
   archivedChannelData
  )
 } else {
  displayContent(channel)
 }
 body.scrollTo(0, 0)
}

window.addEventListener('hashchange', route)
route().catch((e) => console.error(e))

function displayContent(
 channel,
 content,
 archive
) {
 mainContent.innerHTML = ''
 if (!content && !archive) {
  mainContent.appendChild(
   elem({
    tagName: 'p',
    textContent:
     'This channel has no content. Be the first to write a message!',
   })
  )
  return
 }
 const hasNewChannels =
  Object.keys(content.topChannels).length > 0
 if (archive) {
  attachMessages(
   channel,
   mainContent,
   formatMessageData(archive.topMessages)
  )
  attachChannels(
   mainContent,
   formatChannelData(
    hasNewChannels
     ? content.topChannels
     : archive.topChannels
   )
  )
 } else {
  attachMessages(
   channel,
   mainContent,
   formatMessageData(content.topMessages)
  )
  attachChannels(
   mainContent,
   formatChannelData(content.topChannels)
  )
 }
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
 return Object.entries(messages)
  .map(function ([text, score]) {
   return { score, text }
  })
  .sort(function (a, b) {
   return b.score - a.score
  })
}

function attachChannels(container, channels) {
 container.appendChild(
  elem({
   tagName: 'p',
   textContent: 'Popular channels',
  })
 )
 container.appendChild(
  elem({
   classes: ['channel-list'],
   children: channels.map((c) =>
    elem({
     attributes: {
      href: `/#/${encodeURIComponent(c.name)}`,
     },
     classes: ['channel'],
     tagName: 'a',
     textContent:
      c.name === ''
       ? HOME_CHANNEL_ICON
       : c.name,
     children: [
      elem({
       tagName: 'span',
       textContent: c.score.toString(10),
      }),
     ],
    })
   ),
  })
 )
}

function attachMessages(
 channel,
 container,
 messages
) {
 const nowHour = getHourNumber()
 for (const message of messages) {
  const content = elem()
  addTextWithCodeBlocks(content, message.text)
  addYouTubeEmbed(content, message.text)
  addImageEmbed(content, message.text)
  const agreeButton = elem({
   classes: ['agree'],
   attributes: {
    title: 'I agree with this',
   },
   events: {
    async click() {
     if (
      (await withLoading(
       networkMessageSend(channel, message.text)
      )) !== false
     ) {
      agreeButton.classList.add('agreed')
     }
    },
   },
   tagName: 'button',
   textContent: '✔',
  })
  const score = elem({
   children: [
    elem({
     textContent: (
      message.score - nowHour
     ).toString(10),
    }),
   ],
   classes: ['score'],
  })
  const article = elem({
   children: [content, agreeButton, score],
   tagName: 'article',
  })
  container.appendChild(article)
  if (focusOnMessage === message.text) {
   article.scrollIntoView({
    behavior: 'smooth',
   })
   article.classList.add('highlight')
   focusOnMessage = undefined
  }
 }
}
