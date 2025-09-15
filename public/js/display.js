let realms = []

let secondMostRecentRealm

const allLabels = globalThis.STATUS_LABELS

const LABEL_PREFIX = 'labels@'
const MESSAGE_PERSIST_THRESHOLD = 5
const REACTION_PREFIX =
 'reactions:message-channel-message-'

function displayAppAccounts() {
 const globalRealmTab = elem({
  classes: ['realm'],
  children: [
   icon('globe', 'sm'),
   elem({
    tagName: 'span',
    textContent: 'Earth',
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
   attributes: {
    title: session.url,
   },
   tagName: 'span',
   textContent:
    session.name ??
    new URL(session.url).origin ??
    'Error',
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

 if (
  (replyChannelData &&
   'error' in replyChannelData) ||
  typeof replyChannelData?.response
   ?.messages !== 'object'
 ) {
  throw new Error(
   replyChannelData.error ??
    `Error seeking reply channel: ${JSON.stringify(
     replyChannelData
    )}`
  )
 }

 const formattedMessageReplyData =
  formatMessageData(
   replyChannelData.response.messages
  )

 attachMessages(
  messageChannel,
  mainContent,
  formattedMessageReplyData,
  true,
  'No replies. Be the first to write a reply!',
  undefined,
  true,
  false,
  true
 )
}

function displayChannelArticle(
 articleElement,
 channel,
 message,
 messageContentFormatter
) {
 console.log(
  `Attaching message with formatter(${
   messageContentFormatter?.(
    'status:example'
   ) ?? 'none'
  })`
 )
 attachMessage(
  channel,
  articleElement,
  message,
  false,
  undefined,
  false,
  false,
  false,
  false,
  messageContentFormatter
 )
}

function displayChannelHome(
 channel,
 formattedMessageData,
 formattedChannelData
) {
 messageContent.innerHTML = ''
 mainContent.innerHTML = ''

 const channelHeader = elem({
  classes: ['channel-header'],
 })
 messageContent.appendChild(channelHeader)

 const descriptionElement = elem({
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
 channelHeader.appendChild(descriptionElement)

 const sendToRealm = secondMostRecentRealm
  ? secondMostRecentRealm === PUBLIC_SESSION_ID
    ? PUBLIC_SESSION_ID
    : readSession(secondMostRecentRealm)
  : undefined

 if (channel !== SCRIPT_CHANNEL) {
  const scriptsButton = elem({
   tagName: 'button',
   classes: ['channel-scripts-button'],
   textContent: '𝓢 scripts',
   attributes: {
    title:
     'Manage installed scripts for this channel',
   },
   events: {
    click: (e) => {
     e.stopPropagation() // Prevent potential parent clicks

     // Check if a script menu already exists in the target container
     const existingMenu =
      messageContent.querySelector(
       '.message-menu.script-menu'
      )

     if (existingMenu) {
      // If it exists, remove it
      existingMenu.remove()
     } else {
      // If it doesn't exist, render it
      renderScriptsMenu(channel, messageContent) // Render menu in message content area
     }
    },
   },
  })
  channelHeader.appendChild(scriptsButton) // Add button to the header container
 }

 attachMessages(
  channel,
  mainContent,
  formattedMessageData,
  true,
  undefined,
  sendToRealm,
  false,
  true,
  true
 )
 attachChannels(
  mainContent,
  formattedChannelData
 )

 // Display installed scripts above the compose area
 displayInstalledScripts(channel, compose)
}

function displayChannelMessage(
 channel,
 formattedMessageData,
 messageText
) {
 const message = formattedMessageData.find(
  (x) => x.text === messageText
 )

 //  will add a message here for next and prev message
 messageContent.innerHTML = ''
 if (message) {
  // Build header with optional Next link
  const headerChildren = [
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
     href: `/#/${encodeURIComponent(channel)}`,
    },
    tagName: 'a',
    textContent: `#${
     channel.length > 0
      ? channel
      : HOME_CHANNEL_ICON
    }`,
   }),
  ]

  //will Add Prev/Next links when available in this channel
  const currentIndex =
   formattedMessageData.findIndex(
    (x) => x.text === messageText
   )
  const hasPrev =
   typeof currentIndex === 'number' &&
   currentIndex > 0
  const hasNext =
   typeof currentIndex === 'number' &&
   currentIndex > -1 &&
   currentIndex + 1 <
    formattedMessageData.length

  if (hasPrev || hasNext) {
   // leading separator before navigation links
   headerChildren.push(
    elem({
     tagName: 'span',
     textContent: ' • ',
    })
   )
  }

  if (hasPrev) {
   const prevMessage =
    formattedMessageData[currentIndex - 1]
   const prevHref = `/#/${encodeURIComponent(
    channel
   )}/${btoa(
    encodeURIComponent(prevMessage.text)
   )}`
   headerChildren.push(
    elem({
     attributes: { href: prevHref },
     tagName: 'a',
     textContent: '⯇ Prev',
    })
   )
  }

  if (hasPrev && hasNext) {
   headerChildren.push(
    elem({
     tagName: 'span',
     textContent: ' • ',
    })
   )
  }

  if (hasNext) {
   const nextMessage =
    formattedMessageData[currentIndex + 1]
   const nextHref = `/#/${encodeURIComponent(
    channel
   )}/${btoa(
    encodeURIComponent(nextMessage.text)
   )}`
   headerChildren.push(
    elem({
     attributes: { href: nextHref },
     tagName: 'a',
     textContent: 'Next ▶',
    })
   )
  }

  messageContent.appendChild(
   elem({
    children: headerChildren,
   })
  )
  attachMessage(
   channel,
   messageContent,
   message,
   true,
   undefined,
   true,
   true
  )
 } else {
  messageContent.innerHTML =
   '<h3 style="padding: 0 30px">Not found</h3>'
 }
 // Display installed scripts above the compose area
 displayInstalledScripts(channel, compose)
}

let lastAttachedChannels

function attachChannels(container, channels) {
 if (channels.length === 0) {
  // console.log({
  //  channelInputValue: channelInput.value,
  //  channels,
  // })
  const channelName = channelInput.value.trim()
  const isNamespaced = channelName.includes(':')
  channels.push({
   name: isNamespaced
    ? channelName.split(':')[0] + ':'
    : '',
   score: 0,
  })
 }
 lastAttachedChannels = channels.filter(
  (c) => c.name.length <= 25
 )
 container.appendChild(
  elem({
   attributes: {
    'data-tour-off':
     'Discover popular channels.',
   },
   classes: ['channel-list'],
   children: [
    elem({
     tagName: 'p',
     textContent: 'Popular channels',
    }),
   ].concat(
    lastAttachedChannels.map((c) =>
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
 copyToReply = false,
 includeReplies = false,
 includeReactions = false
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
   index === '0',
   includeReplies,
   includeReactions
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
 includeTourAttributes,
 includeReplies = false,
 includeReactions = false,
 messageContentFormatter = undefined
) {
 const content = elem()

 // --- Special rendering for SCRIPT_CHANNEL messages ---
 if (channel === SCRIPT_CHANNEL) {
  const scriptTextarea = elem({
   tagName: 'textarea',
   attributes: {
    readOnly: true, // Make it non-editable
   },
   style: {
    width: '100%',
    height: 'auto', // Start with auto height
    minHeight: '50px', // Minimum height
    maxHeight: '360px', // Maximum height
    boxSizing: 'border-box',
    resize: 'none', // Disable manual resize
    border: '1px solid var(--border-color)', // Add a subtle border
    background: 'var(--bg-alt)', // Match background
    color: 'inherit', // Inherit text color
    padding: '5px',
    // Apply monospace styles consistent with compose area and CSS
    fontFamily: 'monospace',
    fontSize: '85%',
    lineHeight: '1.5',
    overflowY: 'auto', // Add scroll if content exceeds maxHeight
   },
  })
  scriptTextarea.value = message.text // Set the script text
  content.appendChild(scriptTextarea)

  // Adjust height after setting value to fit content up to max-height
  // Use a small timeout to ensure rendering before calculating scrollHeight
  setTimeout(() => {
   scriptTextarea.style.height = 'auto' // Reset height to calculate natural height
   const scrollH = scriptTextarea.scrollHeight
   const maxH = 360
   scriptTextarea.style.height = `${Math.min(
    scrollH,
    maxH
   )}px`
  }, 0)
 } else {
  // --- Default message rendering ---
  addTextBlocks(
   content,
   channel === 'reactions' &&
    message.text.startsWith('reaction')
    ? message.text.substring(8)
    : messageContentFormatter
    ? messageContentFormatter(message.text)
    : message.text
  )
  addYouTubeEmbed(content, message.text)
  addImageEmbed(content, message.text)
  addOpenGraphLink(content, message.text)
 }

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
  const messageScoreText = niceNumber(
   message.score ?? 0
  )
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
     title: message.score.toPrecision(3),
    },
    textContent: `${messageScoreText}`,
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
 const messageLink = `/#/${encodeURIComponent(
  channel
 )}/${btoa(encodeURIComponent(message.text))}`
 const dateContainer = elem({
  attributes: {
   href: messageLink,
   title: new Date(
    message.data.seen
   ).toString(),
  },
  classes: ['news-date'],
  events: {
   click() {
    const { channel: currentChannel } =
     getUrlData()
    focusOnMessage = message
    route()
   },
  },
  tagName: 'a',
  textContent: localDateTime(
   new Date(message.data.seen)
  ),
 })
 const articleToolButtons = elem({
  classes: ['article-tool-buttons'],
  children: [agreeButton, disagreeButton],
 })
 const articleTools = elem({
  classes: ['article-tools'],
  children: [score, articleToolButtons],
 })
 articleTools.appendChild(
  elem({
   style: { flexGrow: 1 },
  })
 )
 if (includeReactions) {
  attachReactions(
   articleTools,
   channel,
   message
  )
 }
 const article = elem({
  children: [content, articleTools],
  tagName: 'article',
 })
 const newsItem = elem({
  classes: ['news'],
  children: [article, dateContainer],
 })
 if (includeFooter) {
  function footerLinkSeparator() {
   messageFooter.appendChild(
    elem({
     tagName: 'span',
     textContent: ' • ',
    })
   )
  }
  const messageFooter = elem({
   classes: ['message-footer'],
  })
  newsItem.appendChild(messageFooter)
  const labelsElement =
   document.createElement('div')
  labelsElement.classList.add('message-labels')
  async function renderFooter() {
   messageFooter.innerHTML = ''
   const href = `/#/${encodeURIComponent(
    channel
   )}/${btoa(encodeURIComponent(message.text))}`
   await labelMessage(
    labelsElement,
    channel,
    message,
    messageFooter,
    false,
    allLabels
   )
   if (channel !== SCRIPT_CHANNEL) {
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
    footerLinkSeparator()
   }
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
   footerLinkSeparator()
   const labelMessageLink = elem({
    attributes: {
     href,
    },
    events: {
     async click(e) {
      e.preventDefault()
      await labelMessage(
       labelsElement,
       channel,
       message,
       messageFooter,
       true,
       allLabels
      )
      labelMessageLink.textContent =
       '✔ message labeled'
      setTimeout(function () {
       labelMessageLink.textContent =
        'label message'
      }, 2e3)
     },
    },
    tagName: 'a',
    textContent: 'label message',
   })
   messageFooter.appendChild(labelMessageLink)
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
      composeTextarea.focus()
      composeTextarea.value = message.text
      composeTextarea.selectionStart = 0
      composeTextarea.selectionEnd =
       composeTextarea.value.length
     },
    },
    tagName: 'a',
    textContent: copyToReply
     ? 'reply with message'
     : 'new with message',
   })
   messageFooter.appendChild(
    elem({
     tagName: 'span',
     textContent: ' • ',
    })
   )
   messageFooter.appendChild(copyToReplyLink)

   footerLinkSeparator()
   if (channel !== SCRIPT_CHANNEL) {
    const copyViewMessageLink = elem({
     attributes: {
      href,
     },
     events: {
      click(e) {
       e.preventDefault()
       navigator.clipboard.writeText(
        `${location.origin}${href}`
       )
       copyViewMessageLink.textContent =
        '✔ link copied'
       setTimeout(function () {
        copyViewMessageLink.textContent =
         'copy link'
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
    messageFooter.appendChild(
     copyViewMessageLink
    )
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
       if (
        !confirm(
         `Are you sure you want to unsend this message?\n\n${JSON.stringify(
          `${message.text.substring(0, 100)}${
           message.text.length > 100
            ? '...'
            : ''
          }`
         )}`
        )
       ) {
        return
       }
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
       newsItem.classList.add('unsent')
       await new Promise((r) =>
        setTimeout(r, 1000)
       )
       newsItem.remove()
      },
     },
     tagName: 'a',
     textContent: 'unsend',
    })
    footerLinkSeparator()
    messageFooter.appendChild(unsendLink)
   }
  }
  renderFooter()
 }
 if (includeReplies) {
  addMessageReplies(channel, newsItem, message)
 }
 container.appendChild(newsItem)
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
  )
   .filter(([channel]) => channel.length <= 25)
   .sort(function ([, a], [, b]) {
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
  classes: ['activity-container-inner'],
 })

 const outerElement = elem({
  classes: ['activity-container'],
  children: [element],
 })

 let isVisible = false

 const endOfNewsMessageElement = elem({
  tagName: 'p',
  textContent: 'End of news.',
  classes: ['text-message'],
 })

 function endOfNews() {
  element.appendChild(endOfNewsMessageElement)
 }

 function toggle() {
  if (isVisible) {
   hide()
  } else {
   show()
  }
 }

 let lastScrollPosition = 0

 // Function to scroll to a specific date in the activity log
 async function scrollToDate(targetDate) {
  console.log(
   'scrollToDate called with:',
   targetDate
  )

  if (!isVisible) {
   await show()
  }

  if (
   !(targetDate instanceof Date) ||
   isNaN(targetDate.getTime())
  ) {
   console.error(
    'Invalid date provided to scrollToDate:',
    targetDate
   )
   const notification = elem({
    tagName: 'div',
    classes: [
     'date-search-notification',
     'date-search-error',
    ],
    textContent: `Invalid date format. Please try again with a valid date.`,
   })
   document.body.appendChild(notification)
   setTimeout(() => {
    notification.style.opacity = '0'
    setTimeout(() => {
     if (notification.parentNode) {
      document.body.removeChild(notification)
     }
    }, 500)
   }, 3000)
   return
  }

  const targetDateStart = new Date(targetDate)
  targetDateStart.setHours(0, 0, 0, 0)
  console.log(
   'Target date (start of day):',
   targetDateStart
  )

  let foundExactMatch = false
  let foundAfter = false
  let exactMatchItem = null
  let afterItem = null
  let afterDate = null
  let attempts = 0
  const MAX_LOAD_ATTEMPTS = 50

  function sameDay(d1, d2) {
   return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
   )
  }

  function checkForDateMatch() {
   const newsItems =
    element.querySelectorAll('.news')
   exactMatchItem = null
   afterItem = null
   afterDate = null
   for (const newsItem of newsItems) {
    const dateElement =
     newsItem.querySelector('.news-date')
    if (dateElement) {
     const dateStr =
      dateElement.getAttribute('title') ||
      dateElement.textContent
     if (dateStr) {
      try {
       let itemDate = new Date(dateStr)
       if (
        isNaN(itemDate.getTime()) &&
        dateStr.includes(' ')
       ) {
        const parts = dateStr.split(' ')
        if (parts.length >= 3) {
         const monthStr = parts[0]
         const dayStr = parts[1].replace(
          ',',
          ''
         )
         const yearStr = parts[2]
         const months = {
          January: 0,
          February: 1,
          March: 2,
          April: 3,
          May: 4,
          June: 5,
          July: 6,
          August: 7,
          September: 8,
          October: 9,
          November: 10,
          December: 11,
          Jan: 0,
          Feb: 1,
          Mar: 2,
          Apr: 3,
          May: 4,
          Jun: 5,
          Jul: 6,
          Aug: 7,
          Sep: 8,
          Oct: 9,
          Nov: 10,
          Dec: 11,
         }
         if (
          months[monthStr] !== undefined &&
          !isNaN(parseInt(dayStr)) &&
          !isNaN(parseInt(yearStr))
         ) {
          itemDate = new Date(
           parseInt(yearStr),
           months[monthStr],
           parseInt(dayStr)
          )
         }
        }
       }
       if (!isNaN(itemDate.getTime())) {
        itemDate.setHours(0, 0, 0, 0)
        if (
         !exactMatchItem &&
         sameDay(itemDate, targetDateStart)
        ) {
         exactMatchItem = newsItem
        }
        if (
         !afterItem &&
         itemDate > targetDateStart
        ) {
         afterItem = newsItem
         afterDate = itemDate
        }
       }
      } catch (e) {
       console.error(
        'Error parsing date:',
        dateStr,
        e
       )
      }
     }
    }
   }
   if (exactMatchItem) {
    foundExactMatch = true
    exactMatchItem.classList.add(
     'date-match-highlight'
    )
    setTimeout(() => {
     exactMatchItem.classList.remove(
      'date-match-highlight'
     )
    }, 3000)
    exactMatchItem.scrollIntoView({
     behavior: 'smooth',
     block: 'start',
    })
    const formattedFoundDate =
     targetDateStart.toLocaleDateString(
      undefined,
      {
       year: 'numeric',
       month: 'long',
       day: 'numeric',
      }
     )
    const notification = elem({
     tagName: 'div',
     classes: [
      'date-search-notification',
      'date-search-success',
     ],
     textContent: `Found activity from ${formattedFoundDate}.`,
    })
    document.body.appendChild(notification)
    setTimeout(() => {
     notification.style.opacity = '0'
     setTimeout(() => {
      if (notification.parentNode) {
       document.body.removeChild(notification)
      }
     }, 500)
    }, 5000)
    return true
   }
   if (afterItem) {
    foundAfter = true
    afterItem.classList.add(
     'date-match-highlight'
    )
    setTimeout(() => {
     afterItem.classList.remove(
      'date-match-highlight'
     )
    }, 3000)
    afterItem.scrollIntoView({
     behavior: 'smooth',
     block: 'start',
    })
    const formattedFoundDate =
     afterDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
     })
    const formattedTargetDate =
     targetDateStart.toLocaleDateString(
      undefined,
      {
       year: 'numeric',
       month: 'long',
       day: 'numeric',
      }
     )
    const notification = elem({
     tagName: 'div',
     classes: [
      'date-search-notification',
      'date-search-success',
     ],
     textContent: `No activity on ${formattedTargetDate}. Showing first activity after: ${formattedFoundDate}.`,
    })
    document.body.appendChild(notification)
    setTimeout(() => {
     notification.style.opacity = '0'
     setTimeout(() => {
      if (notification.parentNode) {
       document.body.removeChild(notification)
      }
     }, 500)
    }, 5000)
    return true
   }
   return false
  }

  // Keep loading until we find an exact match or after-date match or run out of content
  while (attempts < MAX_LOAD_ATTEMPTS) {
   if (checkForDateMatch()) {
    return
   }
   attempts++
   const loadingNotification = elem({
    tagName: 'div',
    classes: [
     'date-search-notification',
     'date-search-loading',
    ],
    textContent: `Loading more activity (attempt ${attempts}/${MAX_LOAD_ATTEMPTS})...`,
   })
   document.body.appendChild(
    loadingNotification
   )
   try {
    const nextChunkResult = await loadMore()
    loadingNotification.style.opacity = '0'
    setTimeout(() => {
     if (loadingNotification.parentNode) {
      document.body.removeChild(
       loadingNotification
      )
     }
    }, 500)
    if (
     nextChunkResult === undefined ||
     nextChunkResult < 0
    ) {
     break
    }
   } catch (error) {
    loadingNotification.style.opacity = '0'
    setTimeout(() => {
     if (loadingNotification.parentNode) {
      document.body.removeChild(
       loadingNotification
      )
     }
    }, 500)
    console.error(
     'Error loading more content:',
     error
    )
    break
   }
  }

  // If nothing found at all
  if (!foundExactMatch && !foundAfter) {
   const newsItems =
    element.querySelectorAll('.news')
   const earliest =
    element.querySelector('.news-date')
   let earliestDate = null
   if (earliest) {
    try {
     const dateStr =
      earliest.getAttribute('title') ||
      earliest.textContent
     earliestDate = new Date(dateStr)
     earliestDate.setHours(0, 0, 0, 0)
    } catch (e) {
     console.error(
      'Error parsing earliest date:',
      e
     )
    }
   }
   let notificationText = ''
   if (newsItems.length === 0) {
    notificationText = `No activity found in the system. Please try a different date.`
   } else if (
    earliestDate &&
    targetDateStart < earliestDate
   ) {
    const formattedEarliestDate =
     earliestDate.toLocaleDateString(
      undefined,
      {
       year: 'numeric',
       month: 'long',
       day: 'numeric',
      }
     )
    notificationText = `No activity found before ${formattedEarliestDate}. Please try a more recent date.`
   } else {
    const formattedTargetDate =
     targetDateStart.toLocaleDateString(
      undefined,
      {
       year: 'numeric',
       month: 'long',
       day: 'numeric',
      }
     )
    notificationText = `No activity found on or after ${formattedTargetDate}. Please try a different date.`
   }
   const notification = elem({
    tagName: 'div',
    classes: [
     'date-search-notification',
     'date-search-error',
    ],
    textContent: notificationText,
   })
   document.body.appendChild(notification)
   setTimeout(() => {
    const notifications =
     document.querySelectorAll(
      '.date-search-notification'
     )
    notifications.forEach((notif) => {
     notif.style.opacity = '0'
     setTimeout(() => {
      if (notif.parentNode) {
       notif.parentNode.removeChild(notif)
      }
     }, 500)
    })
   }, 6000)
  }
 }

 async function show() {
  lastScrollPosition = window.scrollY
  isVisible = true
  document.body.setAttribute(
   'data-mode',
   'activity'
  )
  await load()
  fakeScroll()
  scrollToTop()
 }

 function hide() {
  restoreLastKnownMode(-1)
  isVisible = false
  nextChunk = undefined
  scrollToTop(lastScrollPosition)
 }

 let lastMessages = []

 async function load() {
  await loadMore(undefined, function () {
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
   typeof chunk === 'number' && !isNaN(chunk)
    ? chunk
    : nextChunk
  if (
   typeof chunk2 === 'number' &&
   !isNaN(chunk2) &&
   chunk2 < 0
  ) {
   if (chunk2 < -1) {
    return
   }
   endOfNews()
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
  if (
   chunk2 === undefined &&
   (!news?.data || news.data.length === 0)
  ) {
   endOfNews()
   return
  }
  if (typeof callback === 'function') {
   callback()
  }
  if (typeof nextChunk !== 'number') {
   nextChunk = news.chunkId - 1
  }
  lastMessages.push(
   ...(news.data?.map?.((newsMessage) =>
    attachNewsMessage(element, newsMessage)
   ) ?? [])
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
  element: outerElement,
  filter,
  show,
  hide,
  toggle,
  loadMore,
  scrollToDate,
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
 const isLabel =
  channel.startsWith(LABEL_PREFIX)
 const isReaction = channel.startsWith(
  'reactions:message-'
 )
 const isReply = channel.startsWith('replies@')
 if (isLabel) {
  const labelSpan = elem({
   tagName: 'span',
   textContent: message.replace('status:', ''),
  })
  content.classList.add('label')
  content.classList.add('message-labels')
  content.appendChild(labelSpan)
  const [labelChannel, labelMessage] = channel
   .substring(LABEL_PREFIX.length)
   .split('#', 2)
   .map(decodeURIComponent)

  const messageLink = `/#/${encodeURIComponent(
   labelChannel
  )}/${btoa(encodeURIComponent(labelMessage))}`

  const labelChannelContainer = elem({
   attributes: {
    href: messageLink,
   },
   classes: ['news-channel'],
   events: {
    click() {
     const { channel: currentChannel } =
      getUrlData()
     focusOnMessage = message
     if (labelChannel === currentChannel) {
      route()
     }
    },
   },
   tagName: 'a',
   textContent: `#${
    labelChannel === ''
     ? HOME_CHANNEL_ICON
     : labelChannel
   }`,
  })
  const labelContent = elem({
   attributes: {
    title:
     'This is the message that was labeled',
   },
   children: [labelChannelContainer],
   classes: ['labeled'],
   tagName: 'blockquote',
  })
  addTextBlocks(labelContent, labelMessage)
  addYouTubeEmbed(labelContent, labelMessage)
  addImageEmbed(labelContent, labelMessage)
  addOpenGraphLink(labelContent, labelMessage)
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
     if (labelChannel === currentChannel) {
      route()
     }
    },
   },
   tagName: 'a',
   textContent: localDateTime(new Date(seen)),
  })
  const article = elem({
   children: [content, labelContent],
   tagName: 'article',
  })
  const newsItem = elem({
   classes: ['news', 'label-message'],
   children: [article, dateContainer],
  })
  container.appendChild(newsItem)
  return {
   channel: '#' + labelChannel.toLowerCase(),
   element: newsItem,
   message: message.toLowerCase(),
   labelMessage: labelMessage.toLowerCase(),
  }
 } else if (isReaction) {
  addTextBlocks(content, message, (x) =>
   isReaction && x.startsWith('reaction')
    ? x.substring('reaction'.length)
    : x
  )
  content.classList.add('reaction-reaction')
  /*
  Incoming channel name:
  `channel-message-${encodeURIComponent(
  channel
 )}--${encodeURIComponent(message.text)}`
  */
  const [reactionChannel, reactionMessage] =
   channel
    .substring(REACTION_PREFIX.length)
    .split('--')
    .map(decodeURIComponent)
  if (!channel.startsWith(REACTION_PREFIX)) {
   console.error(
    'Unknown reaction channel',
    channel
   )
   return elem({
    tagName: 'p',
    textContent:
     'Error: Unknown reaction channel',
   })
  }

  const messageLink = `/#/${encodeURIComponent(
   reactionChannel
  )}/${btoa(
   encodeURIComponent(reactionMessage)
  )}`

  const reactionChannelContainer = elem({
   attributes: {
    href: messageLink,
   },
   classes: ['news-channel'],
   events: {
    click() {
     const { channel: currentChannel } =
      getUrlData()
     focusOnMessage = message
     if (reactionChannel === currentChannel) {
      route()
     }
    },
   },
   tagName: 'a',
   textContent: `#${
    reactionChannel === ''
     ? HOME_CHANNEL_ICON
     : reactionChannel
   }`,
  })
  const reactionContent = elem({
   children: [reactionChannelContainer],
   classes: ['reply'],
   tagName: 'blockquote',
  })
  addTextBlocks(
   reactionContent,
   reactionMessage
  )
  addYouTubeEmbed(
   reactionContent,
   reactionMessage
  )
  addImageEmbed(
   reactionContent,
   reactionMessage
  )
  addOpenGraphLink(
   reactionContent,
   reactionMessage
  )
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
     if (reactionChannel === currentChannel) {
      route()
     }
    },
   },
   tagName: 'a',
   textContent: localDateTime(new Date(seen)),
  })
  const article = elem({
   children: [content, reactionContent],
   tagName: 'article',
  })
  const newsItem = elem({
   classes: ['news', 'reaction-message'],
   children: [article, dateContainer],
  })
  container.appendChild(newsItem)
  return {
   channel: '#' + reactionChannel.toLowerCase(),
   element: newsItem,
   message: message.toLowerCase(),
   reactionMessage:
    reactionMessage.toLowerCase(),
  }
 }

 addTextBlocks(content, message)
 addYouTubeEmbed(content, message)
 addImageEmbed(content, message)
 addOpenGraphLink(content, message)

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
   attributes: {
    title:
     'This is the message that was replied to',
   },
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
   children: [content, parentContent],
   tagName: 'article',
  })
  const newsItem = elem({
   classes: ['news'],
   children: [article, dateContainer],
  })
  container.appendChild(newsItem)
  return {
   channel: '#' + parentChannel.toLowerCase(),
   element: newsItem,
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
   tagName: 'article',
  })
  const newsItem = elem({
   classes: ['news'],
   children: [article, dateContainer],
  })
  container.appendChild(newsItem)
  return {
   channel: '#' + channel.toLowerCase(),
   element: newsItem,
   message: message.toLowerCase(),
  }
 }
}
