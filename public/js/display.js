let realms = []

let secondMostRecentRealm

const MESSAGE_PERSIST_THRESHOLD = 5

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
    globalRealmTab.scrollIntoView({
     behavior: 'smooth',
     inline: 'nearest',
    })
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
   textContent:
    session.name ?? session.email ?? '···',
  })
  function switchTo() {
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
    const secondRealmCandidate =
     activeRealm?.session?.id ??
     PUBLIC_SESSION_ID
    if (secondRealmCandidate !== session.id) {
     secondMostRecentRealm =
      secondRealmCandidate
    }
    setActiveSessionId(session.id)
    switchToRealm.realmTab.classList.add(
     'active'
    )
    switchToRealm.realmTab.scrollIntoView({
     behavior: 'smooth',
     inline: 'nearest',
    })
   }
  }
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
    click: switchTo,
   },
  })
  element.insertBefore(realmTab, addRealm)
  return {
   session,
   switchTo,
   realmTab,
   realmTabLabel,
  }
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

 setTimeout(function () {
  activeRealmTab.scrollIntoView({
   behavior: 'instant',
   inline: 'center',
  })
 })

 function add(session) {
  const newAccount = addAccount(session)
  realms.push(newAccount)
  return newAccount
 }

 return { add, element }
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
  mainContent.innerHTML =
   '<p style="padding: 0 30px">This content is not available</p>'
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
  true,
  'No replies. Be the first to write a reply!',
  undefined,
  true
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
  sendToRealm,
  false
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
   message,
   true,
   undefined,
   true
  )
 } else {
  messageContent.innerHTML =
   '<h3 style="padding: 0 30px">Not found</h3>'
 }
}

let lastAttachedChannels

function attachChannels(container, channels) {
 lastAttachedChannels = channels
 if (channels.length === 0) {
  channels.push({ name: '', score: 0 })
 }
 container.appendChild(
  elem({
   attributes: {
    'data-tour': 'Discover popular channels.',
   },
   classes: ['channel-list'],
   children: [
    elem({
     tagName: 'p',
     textContent: 'Popular channels',
    }),
   ].concat(
    channels.map((c) =>
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
         title: Math.round(c.score).toString(
          10
         ),
        },
        tagName: 'span',
        textContent: niceNumber(c.score),
       }),
      ],
     })
    )
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
 sendToRealm = undefined,
 copyToReply = false
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
 for (const index in messages) {
  attachMessage(
   channel,
   container,
   messages[index],
   includeFooter,
   sendToRealm,
   copyToReply,
   index === '0'
  )
 }
}

function attachMessage(
 channel,
 container,
 message,
 includeFooter,
 sendToRealm,
 copyToReply,
 includeTourAttributes
) {
 const content = elem()
 addTextBlocks(content, message.text)
 addYouTubeEmbed(content, message.text)
 addImageEmbed(content, message.text)
 addOpenGraphLink(content, message.text)

 const agreeButton = elem({
  classes: ['agree'],
  children: [icon('yes')],
  attributes: {
   title: 'I agree with this',
  },
  dataset: includeTourAttributes
   ? {
      tour:
       'Click here to promote the message. The maximum promotion speed is +10 points per hour.',
     }
   : undefined,
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
  dataset: includeTourAttributes
   ? {
      tour:
       'Click here to demote the message. The maximum demotion speed is -10 points per hour.',
     }
   : undefined,
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
  dataset: includeTourAttributes
   ? {
      tour:
       'The message score. The score continues to increase or decrease unless the movement is stopped.',
     }
   : undefined,
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
    dataset: includeTourAttributes
     ? {
        tour:
         'View the message, including any replies. You can also reply to the message from here.',
       }
     : undefined,
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
   const copyMessageLink = elem({
    attributes: {
     href,
    },
    events: {
     click(e) {
      e.preventDefault()
      navigator.clipboard.writeText(
       message.text
      )
      copyMessageLink.textContent =
       '✔ message copied'
      setTimeout(function () {
       copyMessageLink.textContent =
        'copy message'
      }, 2e3)
     },
    },
    tagName: 'a',
    textContent: 'copy message',
   })
   messageFooter.appendChild(copyMessageLink)
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
    dataset: includeTourAttributes
     ? {
        tour: 'Copy a link to this message.',
       }
     : undefined,
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
     dataset: includeTourAttributes
      ? {
         tour:
          'Copy this message into another realm.',
        }
      : undefined,
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
   if (copyToReply) {
    const copyToReplyLink = elem({
     attributes: {
      href,
     },
     dataset: includeTourAttributes
      ? {
         tour: 'Copy message content to reply.',
        }
      : undefined,
     events: {
      click(e) {
       e.preventDefault()
       composeTextarea.innerText = message.text
       composeTextarea.focus()
       composeTextarea.selectionStart =
        composeTextarea.value.length
      },
     },
     tagName: 'a',
     textContent: 'copy message in reply',
    })
    messageFooter.appendChild(
     elem({
      tagName: 'span',
      textContent: ' • ',
     })
    )
    messageFooter.appendChild(copyToReplyLink)
   }
   if (
    message.score < MESSAGE_PERSIST_THRESHOLD
   ) {
    const unsendInfo = `Unsend this message. Messages with a score less than ${MESSAGE_PERSIST_THRESHOLD} can be unsent.`
    const unsendLink = elem({
     attributes: {
      href,
      title: unsendInfo,
     },
     classes: ['unsend'],
     dataset: includeTourAttributes
      ? {
         tour: unsendInfo,
        }
      : undefined,
     events: {
      async click(e) {
       e.preventDefault()
       await withLoading(
        networkMessageUnsend(
         channel,
         message.text
        )
       )
       unsendLink.textContent = `✔ unsent`
       await new Promise((r) =>
        setTimeout(r, 1000)
       )
       article.classList.add('unsent')
       await new Promise((r) =>
        setTimeout(r, 1000)
       )
       article.remove()
      },
     },
     tagName: 'a',
     textContent: 'unsend',
    })
    messageFooter.appendChild(
     elem({
      tagName: 'span',
      textContent: ' • ',
     })
    )
    messageFooter.appendChild(unsendLink)
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
  classes: ['dropdown'],
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
    classes: ['dropdown-shade'],
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

function displayAutocompleteActivitySearch(
 filterInput,
 cancelFilterInput,
 applyFilter
) {
 let filterHistory
 function readFilterHistory() {
  if (!filterHistory) {
   filterHistory = read(
    'tmi:activity-filter-history',
    {}
   )
  }
  return filterHistory
 }
 function writeFilterHistory(history) {
  filterHistory = history
  write('tmi:activity-filter-history', history)
 }
 let closeTimeout
 let openTimeout
 let canClose
 const filterHistoryListElement = elem({
  classes: ['dropdown'],
  events: {
   mousedown() {
    canClose = false
    cancelFilterInput()
   },
   mouseup() {
    canClose = true
    clearTimeout(closeTimeout)
    openTimeout = setTimeout(
     () => filterInput.focus(),
     250
    )
   },
  },
 })
 let isOpen = false
 const historyElement = elem({
  children: [
   elem({
    classes: ['dropdown-shade'],
    events: {
     mousedown() {
      cancelFilterInput()
     },
    },
   }),
   filterHistoryListElement,
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
  filterHistoryListElement.innerHTML = ''
  historyEntries = []
  for (const [filter] of Object.entries(
   readFilterHistory()
  ).sort(function ([, a], [, b]) {
   return b - a
  })) {
   const historyEntry = elem({
    tagName: 'a',
    events: {
     click(e) {
      e.stopPropagation()
      e.preventDefault()
      applyFilter(filter)
     },
    },
    children: [
     elem({
      tagName: 'span',
      textContent: filter,
     }),
     elem({
      classes: ['remove'],
      tagName: 'span',
      textContent: '❌',
      events: {
       click(e) {
        if (filterInput.value === filter) {
         filterInput.value = ''
        }
        e.preventDefault()
        e.stopPropagation()
        historyEntry.remove()
        const history = readFilterHistory()
        delete history[filter]
        writeFilterHistory(history)
       },
      },
     }),
    ],
   })
   filterHistoryListElement.appendChild(
    historyEntry
   )
   historyEntries.push([
    filter.toLowerCase(),
    historyEntry,
   ])
  }
  document.body.appendChild(historyElement)
  isOpen = true
 }
 function visit(filterText) {
  filterInput.blur()
  closeNow()
  if (filterText.trim().length === 0) {
   return
  }
  const history = readFilterHistory()
  if (!(filterText in history)) {
   history[filterText] = 0
  }
  history[filterText]++
  writeFilterHistory(history)
 }
 return {
  close,
  filter,
  open,
  visit,
 }
}

function displayActivity() {
 const element = elem({
  attributes: {
   'data-tour':
    'Read the news, all recent messages and replies in this realm.',
  },
  classes: ['activity-container'],
 })

 let isVisible = false

 function toggle() {
  if (isVisible) {
   hide()
  } else {
   show()
  }
 }

 function show() {
  isVisible = true
  document.body.setAttribute(
   'data-mode',
   'activity'
  )
  load()
 }

 function hide() {
  document.body.setAttribute(
   'data-mode',
   'main'
  )
  isVisible = false
  nextChunk = undefined
 }

 let lastMessages = []

 async function load() {
  loadMore(undefined, function () {
   element.innerHTML = ''
   lastMessages = []
  })
 }

 let isLoading = false
 let nextChunk = undefined
 async function loadMore(chunk, callback) {
  if (isLoading) {
   return
  }
  const chunk2 =
   typeof chunk === 'number' ? chunk : nextChunk
  if (chunk2 < 0) {
   if (chunk2 < -1) {
    return
   }
   element.appendChild(
    elem({
     tagName: 'p',
     textContent: 'End of news.',
     classes: ['text-message'],
    })
   )
   nextChunk--
   return
  }
  isLoading = true
  const news = await getNews(
   chunk2,
   function (chunk) {
    nextChunk = chunk - 1
    isLoading = false
   }
  )
  if (typeof callback === 'function') {
   callback()
  }
  lastMessages.push(
   ...news.data.map((newsMessage) =>
    attachNewsMessage(element, newsMessage)
   )
  )
  filterAgain()
  return nextChunk
 }

 function clear() {
  element.innerHTML = ''
  hide()
 }

 let filterTerms = []
 async function filter(filterText) {
  filterTerms = filterText
   .split(/\s+/)
   .map((x) => x.toLowerCase())
   .filter((x) => x !== '')
  filterAgain()
  while ((await withLoading(loadMore())) > -1) {
   if (
    !scrolledPastBottom(
     activityContainer.element,
     true
    )
   ) {
    break
   }
  }
 }

 function filterAgain() {
  for (const {
   channel,
   element,
   message,
   parentMessage,
  } of lastMessages) {
   const messageIncludesAllTerms =
    filterTerms.length === 0
     ? true
     : filterTerms.every(
        (term) =>
         channel.includes(term) ||
         message.includes(term) ||
         parentMessage?.includes(term)
       )
   element.style.display =
    messageIncludesAllTerms ? 'block' : 'none'
  }
 }

 return {
  clear,
  element,
  filter,
  show,
  hide,
  toggle,
  loadMore,
 }
}

function localDateTime(dt) {
 const nowDate = new Date().toLocaleDateString()
 const dateString = dt.toLocaleDateString()
 if (dateString === nowDate) {
  return dt
   .toLocaleTimeString()
   .replace(/(:\d\d):\d\d/, (_, a) => a)
 }
 return dateString
}

function attachNewsMessage(
 container,
 { message, channel, seen }
) {
 const content = elem()
 addTextBlocks(content, message)
 addYouTubeEmbed(content, message)
 addImageEmbed(content, message)
 addOpenGraphLink(content, message)
 const isReply = channel.startsWith('replies@')
 if (isReply) {
  const [parentChannel, parentMessage] = channel
   .substring(8)
   .split(':')
   .map(decodeURIComponent)
  const messageLink = `/#/${encodeURIComponent(
   parentChannel
  )}/${btoa(encodeURIComponent(parentMessage))}`
  const parentChannelContainer = elem({
   attributes: {
    href: messageLink,
   },
   classes: ['news-channel'],
   events: {
    click() {
     const { channel: currentChannel } =
      getUrlData()
     focusOnMessage = message
     if (parentChannel === currentChannel) {
      route()
     }
    },
   },
   tagName: 'a',
   textContent: `#${
    parentChannel === ''
     ? HOME_CHANNEL_ICON
     : parentChannel
   }`,
  })
  const parentContent = elem({
   children: [parentChannelContainer],
   classes: ['reply'],
   tagName: 'blockquote',
  })
  addTextBlocks(parentContent, parentMessage)
  addYouTubeEmbed(parentContent, parentMessage)
  addImageEmbed(parentContent, parentMessage)
  addOpenGraphLink(parentContent, parentMessage)
  const dateContainer = elem({
   attributes: {
    href: messageLink,
    title: new Date(seen).toString(),
   },
   classes: ['news-date'],
   events: {
    click() {
     const { channel: currentChannel } =
      getUrlData()
     focusOnMessage = message
     if (parentChannel === currentChannel) {
      route()
     }
    },
   },
   tagName: 'a',
   textContent: localDateTime(new Date(seen)),
  })
  const article = elem({
   children: [
    dateContainer,
    content,
    parentContent,
   ],
   classes: ['news'],
   tagName: 'article',
  })
  container.appendChild(article)
  return {
   channel: '#' + parentChannel.toLowerCase(),
   element: article,
   message: message.toLowerCase(),
   parentMessage: parentMessage.toLowerCase(),
  }
 } else {
  const dateContainer = elem({
   attributes: {
    href: `#/${encodeURIComponent(channel)}`,
    title: new Date(seen).toString(),
   },
   classes: ['news-date'],
   events: {
    click() {
     const { channel: currentChannel } =
      getUrlData()
     focusOnMessage = message
     if (channel === currentChannel) {
      route()
     }
    },
   },
   tagName: 'a',
   textContent: localDateTime(new Date(seen)),
  })
  const channelContainer = elem({
   attributes: {
    href: `#/${encodeURIComponent(channel)}`,
   },
   classes: ['news-channel'],
   events: {
    click() {
     const { channel: currentChannel } =
      getUrlData()
     focusOnMessage = message
     if (channel === currentChannel) {
      route()
     }
    },
   },
   tagName: 'a',
   textContent: `#${
    channel === '' ? HOME_CHANNEL_ICON : channel
   }`,
  })
  const article = elem({
   children: [
    dateContainer,
    channelContainer,
    content,
   ],
   classes: ['news'],
   tagName: 'article',
  })
  container.appendChild(article)
  return {
   channel: '#' + channel.toLowerCase(),
   element: article,
   message: message.toLowerCase(),
  }
 }
}
