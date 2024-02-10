let realms = []

let secondMostRecentRealm

function icon(...names) {
 return elem({
  classes: [
   'icon',
   ...names.map((name) => `icon-${name}`),
  ],
  tagName: 'span',
 })
}

function displayAppAccounts() {
 const globalRealmTab = elem({
  classes: ['realm'],
  children: [
   icon('globe', 'sm'),
   elem({
    tagName: 'span',
    textContent: 'Public',
   }),
  ],
  events: {
   click() {
    const sessionId = getActiveSessionId()
    if (sessionId !== PUBLIC_SESSION_ID) {
     const activeRealm = realms.find(
      (r) => sessionId === r.session.id
     )
     if (
      activeRealm?.session.id !==
      PUBLIC_SESSION_ID
     ) {
      secondMostRecentRealm =
       activeRealm.session.id
     }
     const activeRealmTab =
      activeRealm?.realmTab ?? globalRealmTab
     activeRealmTab.classList.remove('active')
     globalRealmTab.classList.add('active')
    }
    setActiveSessionId(PUBLIC_SESSION_ID)
   },
  },
 })

 function addAccount(session) {
  const realmTabLabel = elem({
   tagName: 'span',
   textContent: session.email ?? '···',
  })
  const realmTab = elem({
   classes: ['realm'],
   children: [
    icon('hut', 'sm'),
    realmTabLabel,
    elem({
     classes: ['close'],
     children: [icon('close', 'sm')],
     tagName: 'span',
     events: {
      click(e) {
       e.stopPropagation()
       realmTab.remove()
       const sessions = listSessions()
       const activeSessionId =
        getActiveSessionId()
       removeSession(session.id)
       if (activeSessionId === session.id) {
        const index = sessions.findIndex(
         (x) => x.id === session.id
        )
        const switchToSessionId =
         sessions[index - 1]?.id ??
         sessions[index + 1]?.id
        const activeRealm =
         typeof switchToSessionId === 'string'
          ? realms.find(
             (r) =>
              switchToSessionId === r.session.id
            )
          : undefined
        const activeRealmTab =
         activeRealm?.realmTab ?? globalRealmTab
        activeRealmTab.classList.add('active')
        secondMostRecentRealm = undefined
        setActiveSessionId(
         activeRealm?.session?.id ??
          PUBLIC_SESSION_ID
        )
       }
      },
     },
    }),
   ],
   events: {
    click() {
     const sessionId = getActiveSessionId()
     const activeRealm = realms.find(
      (r) => sessionId === r.session.id
     )
     const activeRealmTab =
      activeRealm?.realmTab ?? globalRealmTab
     activeRealmTab.classList.remove('active')
     const switchToRealm = realms.find(
      (r) => session.id === r.session.id
     )
     if (switchToRealm) {
      secondMostRecentRealm =
       activeRealm?.session?.id ??
       PUBLIC_SESSION_ID
      setActiveSessionId(session.id)
      switchToRealm.realmTab.classList.add(
       'active'
      )
     }
    },
   },
  })
  element.insertBefore(realmTab, addRealm)
  return { session, realmTab, realmTabLabel }
 }

 const addRealm = elem({
  classes: ['realm', 'realm-add'],
  children: [
   icon('plus', 'sm'),
   elem({
    tagName: 'span',
    textContent: ' realm',
   }),
  ],
  events: {
   click: createSession,
  },
 })

 const element = elem({
  classes: ['app-accounts'],
  children: [globalRealmTab, addRealm],
 })

 realms = listSessions().map((session) =>
  addAccount(session)
 )

 const sessionId = getActiveSessionId()
 const activeRealm = realms.find(
  (r) => sessionId === r.session.id
 )

 const activeRealmTab =
  activeRealm?.realmTab ?? globalRealmTab
 activeRealmTab.classList.add('active')

 return { element }
}

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
 const sendToRealm = secondMostRecentRealm
  ? secondMostRecentRealm === PUBLIC_SESSION_ID
    ? PUBLIC_SESSION_ID
    : readSession(secondMostRecentRealm)
  : undefined
 attachMessages(
  channel,
  mainContent,
  formattedMessageData,
  true,
  undefined,
  sendToRealm
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

let lastAttachedChannels

function attachChannels(container, channels) {
 lastAttachedChannels = channels
 container.appendChild(
  elem({
   tagName: 'p',
   textContent: 'Popular channels',
  })
 )
 if (channels.length === 0) {
  channels.push({ name: '', score: 0 })
 }
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
       attributes: {
        title: Math.round(c.score).toString(10),
       },
       tagName: 'span',
       textContent: niceNumber(c.score),
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
 emptyMessage = undefined,
 sendToRealm = undefined
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
   includeFooter,
   sendToRealm
  )
 }
}

function attachMessage(
 channel,
 container,
 message,
 includeFooter,
 sendToRealm
) {
 const content = elem()
 addTextBlocks(content, message.text)
 addYouTubeEmbed(content, message.text)
 addImageEmbed(content, message.text)
 const agreeButton = elem({
  classes: ['agree'],
  children: [icon('yes')],
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
 })
 const disagreeButton = elem({
  classes: ['disagree'],
  children: [icon('no')],
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
    attributes: {
     title: Math.round(message.score).toString(
      10
     ),
    },
    textContent: `${niceNumber(message.score)}`,
   })
  )
  score.appendChild(
   elem({
    classes: ['velocity'],
    textContent: velocityText,
   })
  )
 }
 const score = elem({
  classes: ['score'],
 })
 renderScore()
 const articleToolButtons = elem({
  classes: ['article-tool-buttons'],
  children: [agreeButton, disagreeButton],
 })
 const articleTools = elem({
  classes: ['article-tools'],
  children: [score, articleToolButtons],
 })
 const article = elem({
  children: [content, articleTools],
  tagName: 'article',
 })
 if (includeFooter) {
  const messageFooter = elem({
   classes: ['message-footer'],
  })
  article.appendChild(messageFooter)
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
   if (sendToRealm) {
    const label =
     sendToRealm === PUBLIC_SESSION_ID
      ? 'public'
      : sendToRealm.email
    const sendToLabel = `send to ${label}`
    const sendToLink = elem({
     attributes: {
      href,
     },
     events: {
      async click(e) {
       e.preventDefault()
       await withLoading(
        networkMessageSend(
         channel,
         message.text,
         Math.max(1, message.data.velocity),
         sendToRealm === PUBLIC_SESSION_ID
          ? PUBLIC_SESSION_ID
          : sendToRealm.id
        )
       )
       sendToLink.textContent = `✔ sent to ${label}`
      },
     },
     tagName: 'a',
     textContent: sendToLabel,
    })
    messageFooter.appendChild(
     elem({
      tagName: 'span',
      textContent: ' • ',
     })
    )
    messageFooter.appendChild(sendToLink)
   }
  }
  renderFooter()
 }
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

function displayAutocompleteChannels(
 channelInput,
 cancelChannelInput
) {
 let channelHistory
 function readChannelHistory() {
  if (!channelHistory) {
   channelHistory = read(
    'tmi:channel-history',
    {}
   )
  }
  return channelHistory
 }
 function writeChannelHistory(history) {
  channelHistory = history
  write('tmi:channel-history', history)
 }
 let closeTimeout
 let openTimeout
 let canClose
 const channelHistoryListElement = elem({
  classes: ['channel-history'],
  events: {
   mousedown() {
    canClose = false
    cancelChannelInput()
   },
   mouseup() {
    canClose = true
    clearTimeout(closeTimeout)
    openTimeout = setTimeout(
     () => channelInput.focus(),
     250
    )
   },
  },
 })
 let isOpen = false
 const historyElement = elem({
  children: [
   elem({
    classes: ['channel-history-shade'],
    events: {
     mousedown() {
      cancelChannelInput()
     },
    },
   }),
   channelHistoryListElement,
  ],
 })
 function close() {
  closeTimeout = setTimeout(closeNow, 250)
 }
 function closeNow() {
  clearTimeout(closeTimeout)
  clearTimeout(openTimeout)
  if (!isOpen || !canClose) {
   return
  }
  document.body.removeChild(historyElement)
  isOpen = false
 }
 function filter(text) {
  const terms = text.toLowerCase().split(/\s+/)
  for (const [
   historyChannel,
   historyEntry,
  ] of historyEntries) {
   historyEntry.style.display = terms.every(
    (term) => historyChannel.includes(term)
   )
    ? 'block'
    : 'none'
  }
 }
 let historyEntries = []
 function open() {
  canClose = true
  clearTimeout(closeTimeout)
  if (isOpen) {
   return
  }
  channelHistoryListElement.innerHTML = ''
  historyEntries = []
  for (const [channel] of Object.entries(
   readChannelHistory()
  ).sort(function ([, a], [, b]) {
   return b - a
  })) {
   const historyEntry = elem({
    tagName: 'a',
    attributes: {
     href: `#/${encodeURIComponent(channel)}`,
    },
    children: [
     elem({
      tagName: 'span',
      textContent:
       channel === ''
        ? HOME_CHANNEL_ICON
        : channel,
     }),
     elem({
      classes: ['remove'],
      tagName: 'span',
      textContent: '❌',
      events: {
       click(e) {
        e.preventDefault()
        e.stopPropagation()
        historyEntry.remove()
        const history = readChannelHistory()
        delete history[channel]
        writeChannelHistory(history)
       },
      },
     }),
    ],
   })
   channelHistoryListElement.appendChild(
    historyEntry
   )
   historyEntries.push([
    channel.toLowerCase(),
    historyEntry,
   ])
  }
  lastAttachedChannels?.forEach?.(
   ({ name: channel, score }) => {
    const historyEntry = elem({
     tagName: 'a',
     attributes: {
      href: `#/${encodeURIComponent(channel)}`,
     },
     classes: ['small'],
     children: [
      elem({
       tagName: 'span',
       textContent:
        channel === ''
         ? HOME_CHANNEL_ICON
         : channel,
      }),
      elem({
       classes: ['score'],
       tagName: 'span',
       textContent: niceNumber(score),
      }),
     ],
    })
    channelHistoryListElement.appendChild(
     historyEntry
    )
    historyEntries.push([
     channel.toLowerCase(),
     historyEntry,
    ])
   }
  )
  document.body.appendChild(historyElement)
  isOpen = true
 }
 function visit(channel) {
  channelInput.blur()
  closeNow()
  const history = readChannelHistory()
  if (!(channel in history)) {
   history[channel] = 0
  }
  history[channel]++
  writeChannelHistory(history)
 }
 return {
  close,
  filter,
  open,
  visit,
 }
}
