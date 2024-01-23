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

const mainToolbar = elem({
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
body.appendChild(mainToolbar)
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
 } else {
  document.body.classList.remove('on-message')
  document.body.classList.add('on-channel')
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

async function displayChannelMessageReplies(
 messageChannel,
 formattedChannelMessageData,
 messageText
) {
 mainContent.innerHTML = ''
 const message =
  formattedChannelMessageData.find(
   (x) => x.text === messageText
  )
 if (!message) {
  mainContent.innerHTML = 'Not found'
  return
 }
 const replyChannelData = await withLoading(
  networkChannelSeek(
   messageChannel,
   getHourNumber()
  )
 )

 const formattedReplyMessageData =
  formatMessageData(
   replyChannelData.response.messages
  )

 attachMessages(
  messageChannel,
  mainContent,
  formattedReplyMessageData,
  false,
  'No replies. Be the first to write a reply!'
 )
}

function displayChannelHome(
 channel,
 formattedMessageData,
 formattedChannelData
) {
 messageContent.innerHTML = ''
 mainContent.innerHTML = ''
 messageContent.appendChild(
  elem({
   children: [
    elem({
     tagName: 'span',
     textContent: 'Channel ',
    }),
    elem({
     attributes: {
      href: `/#/${encodeURIComponent(channel)}`,
     },
     tagName: 'a',
     textContent: `#${
      channel.length > 0
       ? channel
       : HOME_CHANNEL_ICON
     }`,
    }),
    elem({
     tagName: 'span',
     textContent: ` has ${
      formattedMessageData.length === 1
       ? 'one'
       : formattedMessageData.length
     } message${
      formattedMessageData.length === 1
       ? ''
       : 's'
     }`,
    }),
   ],
  })
 )
 attachMessages(
  channel,
  mainContent,
  formattedMessageData
 )
 attachChannels(
  mainContent,
  formattedChannelData
 )
}

function displayChannelMessage(
 channel,
 formattedMessageData,
 messageText
) {
 const message = formattedMessageData.find(
  (x) => x.text === messageText
 )
 messageContent.innerHTML = ''
 if (message) {
  messageContent.appendChild(
   elem({
    children: [
     ...(formattedMessageData.length === 1
      ? [
         elem({
          tagName: 'span',
          textContent:
           'Viewing the only message on channel ',
         }),
        ]
      : [
         elem({
          tagName: 'span',
          textContent: 'Viewing one of ',
         }),
         elem({
          tagName: 'span',
          textContent: ` ${formattedMessageData.length} messages on channel `,
         }),
        ]),

     elem({
      attributes: {
       href: `/#/${encodeURIComponent(
        channel
       )}`,
      },
      tagName: 'a',
      textContent: `#${
       channel.length > 0
        ? channel
        : HOME_CHANNEL_ICON
      }`,
     }),
    ],
   })
  )
  attachMessage(
   channel,
   messageContent,
   message
  )
 } else {
  messageContent.innerText = 'Not found'
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
       textContent: Math.round(
        c.score
       ).toString(10),
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
 messages,
 includeFooter = true,
 emptyMessage = undefined
) {
 if (messages.length === 0) {
  mainContent.appendChild(
   elem({
    tagName: 'p',
    textContent:
     emptyMessage ??
     'This channel has no content. Be the first to write a message!',
   })
  )
 }
 for (const message of messages) {
  attachMessage(
   channel,
   container,
   message,
   includeFooter
  )
 }
}

function attachMessage(
 channel,
 container,
 message,
 includeFooter
) {
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
    message.data.velocity = Math.min(
     message.data.velocity + 1,
     10
    )
    if (
     (await withLoading(
      networkMessageSend(
       channel,
       message.text,
       message.data.velocity
      )
     )) !== false
    ) {
     agreeButton.classList.add('agreed')
     disagreeButton.classList.remove(
      'disagreed'
     )
     renderScore()
    }
   },
  },
  tagName: 'button',
  textContent: '✔',
 })
 const disagreeButton = elem({
  classes: ['disagree'],
  attributes: {
   title: 'I disagree with this',
  },
  events: {
   async click() {
    message.data.velocity = Math.max(
     message.data.velocity - 1,
     -10
    )
    if (
     (await withLoading(
      networkMessageSend(
       channel,
       message.text,
       message.data.velocity
      )
     )) !== false
    ) {
     agreeButton.classList.remove('agreed')
     disagreeButton.classList.add('disagreed')
     renderScore()
    }
   },
  },
  tagName: 'button',
  textContent: '✘',
 })
 function renderScore() {
  const velocityText =
   message.data.velocity !== 0
    ? ` ${
       message.data.velocity < 0 ? '' : '+'
      }${message.data.velocity.toString(10)}/hr`
    : ''
  score.innerHTML = ''
  score.appendChild(
   elem({
    textContent: `${Math.round(
     message.score
    ).toString(10)}${velocityText}`,
   })
  )
 }
 if (includeFooter) {
  const messageFooter = elem({
   classes: ['message-footer'],
  })
  content.appendChild(messageFooter)
  async function renderFooter() {
   messageFooter.innerHTML = ''
   const href = `/#/${encodeURIComponent(
    channel
   )}/${btoa(encodeURIComponent(message.text))}`
   const repliesLink = elem({
    attributes: {
     href,
    },
    tagName: 'a',
    textContent: 'View message',
   })
   messageFooter.appendChild(repliesLink)
   messageFooter.appendChild(
    elem({
     tagName: 'span',
     textContent: ' • ',
    })
   )
   const copyRepliesLink = elem({
    attributes: {
     href,
    },
    events: {
     click(e) {
      e.preventDefault()
      navigator.clipboard.writeText(
       `${location.origin}${href}`
      )
      copyRepliesLink.textContent =
       '✔ link copied'
      setTimeout(function () {
       copyRepliesLink.textContent = 'copy link'
      }, 2e3)
     },
    },
    tagName: 'a',
    textContent: 'copy link',
   })
   messageFooter.appendChild(copyRepliesLink)
  }
  renderFooter()
 }
 const score = elem({
  classes: ['score'],
 })
 renderScore()
 const articleTools = elem({
  classes: ['article-tools'],
  children: [
   score,
   agreeButton,
   disagreeButton,
  ],
 })
 const article = elem({
  children: [content, articleTools],
  tagName: 'article',
 })
 container.appendChild(article)
 if (focusOnMessage === message.text) {
  setTimeout(function () {
   article.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
   })
  }, 50)
  article.classList.add('highlight')
  focusOnMessage = undefined
 }
}
