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

const [
 yearSelect,
 monthSelect,
 daySelect,
 hourSelect,
 updateDateTime,
] = dateTimeSelector(setHour)

const timeToolbar = elem({
 classes: ['toolbar', 'time-toolbar'],
 children: [
  elem({
   attributes: {
    title: 'Go to now',
   },
   events: {
    click() {
     const { hour } = getUrlData()
     const nowHour = getHourNumber()
     if (nowHour !== hour) {
      setHour(nowHour)
     } else {
      route()
     }
    },
   },
   tagName: 'button',
   textContent: '⏲',
  }),
  elem({
   attributes: {
    title: 'Go back 1 hour',
   },
   events: {
    click() {
     const { hour } = getUrlData()
     setHour(hour - 1)
    },
   },
   tagName: 'button',
   textContent: '«',
  }),
  yearSelect,
  monthSelect,
  daySelect,
  hourSelect,
  elem({
   attributes: {
    title: 'Go forward 1 hour',
   },
   events: {
    click() {
     const { hour } = getUrlData()
     setHour(hour + 1)
    },
   },
   tagName: 'button',
   textContent: '»',
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
   const { channel, hour } = getUrlData()
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
body.appendChild(timeToolbar)
body.appendChild(mainContent)
body.appendChild(
 document.getElementById('footer')
)
document.body.appendChild(body)

async function route() {
 const { channel, hour } = getUrlData()
 if (channelInput.value.trim() !== channel) {
  channelInput.value = channel
 }
 updateDateTime(hour)
 const channelData = await withLoading(
  networkChannelSeek(channel, hour)
 )
 const hasMessages =
  Object.keys(channelData.topMessages).length >
  0
 if (hasMessages) {
  displayContent(channel, hour, channelData)
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
   channelData.mostRecentHour,
   channelData,
   archivedChannelData
  )
 } else {
  displayContent(channel, hour)
 }
 body.scrollTo(0, 0)
}

window.addEventListener('hashchange', route)
route().catch((e) => console.error(e))

function displayContent(
 channel,
 hour,
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
   hour,
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
   hour,
   mainContent,
   formatChannelData(content.topChannels)
  )
 }
}

function becomeModerator(silent) {
 if (silent !== 'silent') {
  if (
   prompt(
    'I hereby confirm that I would like to apply for the role of content moderator on Tag Me In. To continue, type the word "apply":'
   ) !== 'apply'
  ) {
   return
  }
  alert(
   'Hello friend,\n\nYour application to become a content moderator on Tag Me In has been approved, and you are now a content moderator.\n\nAs a moderator, you will notice new controls that are visible next to each post. Please remove all distasteful, unhelpful, meaningless, harmful, or illegal content.\n\nThank you for providing this valuable service to the Tag Me In community. Your contributions are noticed and appreciated by the spirit of kindness.\n\nSincerely,\n\nNate'
  )
 }
 localStorage.setItem('role:moderator', 'yes')
 document.body.classList.add(
  'role-moderator-active'
 )
}

function resignAsModerator() {
 if (
  !confirm(
   'I am done being a content moderator on Tag Me In, please accept my resignation'
  )
 ) {
  return
 }
 localStorage.removeItem('role:moderator')
 document.body.classList.remove(
  'role-moderator-active'
 )
}

if (
 localStorage.getItem('role:moderator') ===
 'yes'
) {
 becomeModerator('silent')
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

function attachChannels(
 hour,
 container,
 channels
) {
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
      href: `/#/${encodeURIComponent(
       c.name
      )}/${hour}`,
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
       textContent: (c.score - hour).toString(
        10
       ),
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
  const deleteButton = elem({
   classes: ['delete'],
   attributes: {
    title: 'Remove message',
   },
   events: {
    async click() {
     if (
      !confirm(
       `Dear content moderator,\n\nAre you sure you would like to remove the following message from the channel ${JSON.stringify(
        channel.length === 0
         ? HOME_CHANNEL_ICON
         : channel
       )}?\n\n"${message.text}"`
      )
     ) {
      return
     }
     if (
      (await withLoading(
       networkMessageDelete(
        channel,
        message.text
       )
      )) !== false
     ) {
      deleteButton.classList.add('deleted')
      article.style.opacity = '0'
      await new Promise((r) =>
       setTimeout(r, 1e3)
      )
      article.remove()
     }
    },
   },
   tagName: 'button',
   textContent: '♻',
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
   children: [
    content,
    agreeButton,
    deleteButton,
    score,
   ],
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
