function displayAppAccounts() {
 const globalRealmTab = elem({
  classes: ['realm'],
  textContent: '🌍 Public',
  events: {
   click() {
    const sessionId = getActiveSessionId()
    const activeRealm = realms.find(
     (r) => sessionId === r.session.id
    )
    const activeRealmTab =
     activeRealm?.realmTab ?? globalRealmTab
    activeRealmTab.classList.remove('active')
    setActiveSessionId(PUBLIC_SESSION_ID)
    globalRealmTab.classList.add('active')
   },
  },
 })

 function addAccount(session) {
  const realmTab = elem({
   classes: ['realm'],
   children: [
    elem({
     classes: ['hut', 'invert-icon'],
     tagName: 'span',
     textContent: '🛖',
    }),
    elem({
     tagName: 'span',
     textContent: ` ${session.email ?? '···'}`,
    }),
    elem({
     classes: ['close', 'invert-icon'],
     tagName: 'span',
     textContent: '❌',
     events: {
      click(e) {
       e.stopPropagation()
       realmTab.remove()
       const sessions = listSessions()
       const activeSessionId =
        getActiveSessionId()
       writeSessions(
        sessions.filter(
         (x) => x.id !== session.id
        )
       )
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
      setActiveSessionId(session.id)
      switchToRealm.realmTab.classList.add(
       'active'
      )
     }
    },
   },
  })
  element.insertBefore(realmTab, addRealm)
  return { session, realmTab }
 }

 const addRealm = elem({
  classes: ['realm'],
  children: [
   elem({
    classes: ['invert-icon'],
    tagName: 'span',
    textContent: '➕',
   }),
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

 const realms = listSessions().map((session) =>
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
 addTextBlocks(content, message.text)
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
