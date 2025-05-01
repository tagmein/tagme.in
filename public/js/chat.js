class ChatInterface {
 constructor() {
  // Always use Gemini 1.5 Flash as the default
  this.chatURL = '/gemini'
  localStorage.setItem('chatURL', this.chatURL)
  localStorage.setItem(
   'geminiModel',
   'gemini-1.5-flash'
  )

  this.messageHistory = {}
  this.currentChannel = 'default'
  this.currentMessage = null
  this.currentChat = null
  this.chatContainer = null
  this.messagesArea = null
  this.inputArea = null
  this.userName =
   localStorage.getItem('chatUserName') || ''
  this.isRecording = false
  this.mediaRecorder = null
  this.audioChunks = []
  this.menuVisible = false
  this.recordingTimer = null
  this.recordingMaxTime = 30000 // 30 seconds max recording time
  this.isRecordingDirect = false

  // Initialize task manager
  this.taskManager = {
   tasks: JSON.parse(
    localStorage.getItem('tagme_tasks') || '[]'
   ),
   categories: JSON.parse(
    localStorage.getItem('tagme_categories') ||
     '["Work", "Personal", "Home", "Learning"]'
   ),
   userPreferences: JSON.parse(
    localStorage.getItem('tagme_preferences') ||
     '{}'
   ),
   taskStats: JSON.parse(
    localStorage.getItem('tagme_stats') || '{}'
   ),

   // Visual Progress Tracking
   updateTaskProgress(taskId, progress) {
    const task = this.tasks.find(
     (t) => t.id === taskId
    )
    if (task) {
     task.progress = Math.min(
      100,
      Math.max(0, progress)
     )
     this.updateProgressUI(task)
     this.saveTaskData()
    }
   },

   updateProgressUI(task) {
    const taskElement = document.querySelector(
     `[data-task-id="${task.id}"]`
    )
    if (taskElement) {
     const progressBar =
      taskElement.querySelector(
       '.task-progress-bar'
      ) || this.createProgressBar(taskElement)
     progressBar.style.width = `${task.progress}%`
     progressBar.setAttribute(
      'aria-valuenow',
      task.progress
     )
    }
   },

   createProgressBar(taskElement) {
    const progressContainer =
     document.createElement('div')
    progressContainer.className = 'progress'
    progressContainer.style.cssText =
     'height: 5px; margin-top: 5px; background: #e9ecef; border-radius: 3px;'

    const progressBar =
     document.createElement('div')
    progressBar.className = 'task-progress-bar'
    progressBar.style.cssText =
     'height: 100%; background: #7d5fff; border-radius: 3px; transition: width 0.3s ease;'
    progressBar.setAttribute(
     'role',
     'progressbar'
    )
    progressBar.setAttribute(
     'aria-valuemin',
     '0'
    )
    progressBar.setAttribute(
     'aria-valuemax',
     '100'
    )

    progressContainer.appendChild(progressBar)
    taskElement.appendChild(progressContainer)
    return progressBar
   },

   // Performance Reports
   generatePerformanceReport(
    timeframe = 'week'
   ) {
    const now = new Date()
    const stats = {
     totalTasks: 0,
     completedTasks: 0,
     onTimeTasks: 0,
     averageCompletion: 0,
     categoryBreakdown: {},
     productivityTrend: [],
    }

    const timeframeDays =
     timeframe === 'week' ? 7 : 30
    const startDate = new Date(
     now.setDate(now.getDate() - timeframeDays)
    )

    const relevantTasks = this.tasks.filter(
     (task) => {
      const taskDate = new Date(task.createdAt)
      return taskDate >= startDate
     }
    )

    // Calculate statistics
    relevantTasks.forEach((task) => {
     stats.totalTasks++
     if (task.completed) {
      stats.completedTasks++
      if (task.completedAt <= task.dueDate) {
       stats.onTimeTasks++
      }
     }

     // Category breakdown
     if (
      !stats.categoryBreakdown[task.category]
     ) {
      stats.categoryBreakdown[task.category] = {
       total: 0,
       completed: 0,
      }
     }
     stats.categoryBreakdown[task.category]
      .total++
     if (task.completed) {
      stats.categoryBreakdown[task.category]
       .completed++
     }
    })

    // Calculate completion rate
    stats.averageCompletion =
     stats.totalTasks > 0
      ? (
         (stats.completedTasks /
          stats.totalTasks) *
         100
        ).toFixed(1)
      : 0

    // Generate daily productivity trend
    for (let i = 0; i < timeframeDays; i++) {
     const date = new Date(
      now.setDate(now.getDate() - i)
     )
     const dayTasks = relevantTasks.filter(
      (task) => {
       const taskDate = new Date(
        task.completedAt || task.createdAt
       )
       return (
        taskDate.toDateString() ===
        date.toDateString()
       )
      }
     )

     stats.productivityTrend.unshift({
      date: date.toISOString().split('T')[0],
      completed: dayTasks.filter(
       (t) => t.completed
      ).length,
      total: dayTasks.length,
     })
    }

    return stats
   },

   displayPerformanceReport(stats) {
    const reportContainer =
     document.createElement('div')
    reportContainer.className =
     'performance-report'
    reportContainer.innerHTML = `
                    <h3>Performance Report</h3>
                    <div class="report-stats">
                        <div class="stat-item">
                            <span class="stat-label">Completion Rate:</span>
                            <span class="stat-value">${
                             stats.averageCompletion
                            }%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Tasks Completed:</span>
                            <span class="stat-value">${
                             stats.completedTasks
                            }/${
     stats.totalTasks
    }</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">On-time Completion:</span>
                            <span class="stat-value">${(
                             (stats.onTimeTasks /
                              stats.completedTasks) *
                             100
                            ).toFixed(
                             1
                            )}%</span>
                        </div>
                    </div>
                    <div class="category-breakdown">
                        <h4>Category Performance</h4>
                        ${Object.entries(
                         stats.categoryBreakdown
                        )
                         .map(
                          ([
                           category,
                           data,
                          ]) => `
                            <div class="category-stat">
                                <span>${category}:</span>
                                <div class="category-progress">
                                    <div class="progress-bar" style="width: ${
                                     (data.completed /
                                      data.total) *
                                     100
                                    }%"></div>
                                </div>
                                <span>${
                                 data.completed
                                }/${
                           data.total
                          }</span>
                            </div>
                        `
                         )
                         .join('')}
                    </div>
                `

    // Add the report to the messages area
    this.messagesArea.appendChild(
     reportContainer
    )
   },

   // ... existing code ...
  }

  // Make chat interface accessible globally for task management
  window.chatInterface = this

  // Add event listener for close button clicks
  document.addEventListener('click', (e) => {
   if (
    e.target.classList.contains(
     'chat-close-btn'
    )
   ) {
    this.closeChat()
   }
  })

  // Add home channel symbol constant
  this.HOME_CHANNEL = '⌂'
  this.currentChannel = this.HOME_CHANNEL
 }

 // Modify close chat method
 closeChat() {
  if (this.chatContainer) {
   this.chatContainer.remove()
   this.chatContainer = null
  }
 }

 async openChat(context = {}) {
  // Hide the chat button when chat is opened
  if (this.chatButton) {
   this.chatButton.style.display = 'none'
  }

  if (
   this.chatContainer &&
   this.chatContainer.style.display === 'none'
  ) {
   this.chatContainer.style.display = 'flex'
   return
  }

  // Initialize chat container if it doesn't exist
  if (!this.chatContainer) {
   this.chatContainer =
    document.createElement('div')
   this.chatContainer.id = 'chat-container'
   document.body.appendChild(this.chatContainer)
  }

  // Generate a unique chat ID based on channel and timestamp
  const timestamp = Date.now()
  this.currentChannel =
   context.channel || 'default'
  this.currentChat = `${this.currentChannel}_${timestamp}`

  // Clear the container and set up the interface
  this.chatContainer.innerHTML = ''
  await this.createChatInterface(context)

  // Make sure the chat container is visible
  this.chatContainer.style.display = 'flex'

  // Initialize empty message history for this chat if it doesn't exist
  if (!this.messageHistory[this.currentChat]) {
   this.messageHistory[this.currentChat] = []
  }

  // Save to localStorage
  localStorage.setItem(
   'chatHistory',
   JSON.stringify(this.messageHistory)
  )
 }

 async createChatInterface(context = {}) {
  // Apply chat container styling
  this.chatContainer.className =
   'chat-container'

  // Debug - log the context and current channel
  console.log(
   'Context in createChatInterface:',
   context
  )
  console.log(
   'Current channel before setting:',
   this.currentChannel
  )

  // Set the current channel
  this.currentChannel =
   context.channel || 'default'
  this.currentMessage =
   context.messageId || null
  this.currentChat = `${this.currentChannel}${
   this.currentMessage
    ? '_' + this.currentMessage
    : ''
  }`

  console.log(
   'Set current channel to:',
   this.currentChannel
  )
  console.log(
   'Current chat ID:',
   this.currentChat
  )

  const header = this.createHeader()
  this.chatContainer.appendChild(header)

  const chatArea = document.createElement('div')
  chatArea.className = 'chat-area'
  this.chatContainer.appendChild(chatArea)

  // Sidebar is optional, uncomment if you want it
  // const sidebar = this.createSidebar();
  // chatArea.appendChild(sidebar);

  const mainChat = document.createElement('div')
  mainChat.className = 'main-chat'
  chatArea.appendChild(mainChat)

  this.messagesArea =
   document.createElement('div')
  this.messagesArea.className = 'messages-area'
  mainChat.appendChild(this.messagesArea)

  this.inputArea = document.createElement('div')
  this.inputArea.className = 'input-area'
  mainChat.appendChild(this.inputArea)

  const messageInput =
   document.createElement('textarea')
  messageInput.className = 'message-input'
  messageInput.placeholder =
   'Type your message...'
  messageInput.addEventListener(
   'keydown',
   (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
     e.preventDefault()
     this.handleSendMessage()
    }
   }
  )
  this.inputArea.appendChild(messageInput)

  const buttonArea =
   document.createElement('div')
  buttonArea.className = 'button-area'
  this.inputArea.appendChild(buttonArea)

  const voiceButton =
   document.createElement('button')
  voiceButton.className = 'voice-button'
  voiceButton.innerHTML = '🎤'
  voiceButton.onclick = () =>
   this.toggleVoiceRecording()
  buttonArea.appendChild(voiceButton)

  const sendButton =
   document.createElement('button')
  sendButton.className = 'send-button'
  sendButton.innerHTML = '➤'
  sendButton.onclick = () =>
   this.handleSendMessage()
  buttonArea.appendChild(sendButton)

  // Load message history for the current chat
  this.loadChatHistory()

  // Add initial system message if this is a new chat
  if (
   !this.messageHistory[this.currentChat] ||
   this.messageHistory[this.currentChat]
    .length === 0
  ) {
   // Determine the display channel name
   let displayChannel =
    this.currentChannel === '' ||
    this.currentChannel === 'default'
     ? this.HOME_CHANNEL
     : this.currentChannel
   let initialMessage =
    this.userName && this.userName !== 'Guest'
     ? `Welcome to the "${displayChannel}" channel, ${this.userName}! How can I help you today?`
     : `Welcome to the "${displayChannel}" channel! How can I help you today?`
   if (context.message) {
    initialMessage = `You wanted to chat about: "${context.message}"
How can I help you with this?`
   }
   this.addMessage(
    initialMessage,
    'Tag Me In AI'
   )
  }

  // If there's a context message, send it to the AI
  if (
   context.message &&
   (!this.messageHistory[this.currentChat] ||
    this.messageHistory[this.currentChat]
     .length <= 1)
  ) {
   await this.sendMessage({
    channel: this.currentChannel,
    message: context.message,
   })
  }

  // Focus on the input field
  setTimeout(() => {
   if (messageInput) {
    messageInput.focus()
   }
  }, 100)

  // Direct send button
  const directSendBtn = document.getElementById(
   'directSendBtn'
  )
  if (directSendBtn) {
   directSendBtn.addEventListener(
    'click',
    () => {
     if (this.isRecordingDirect) {
      this.stopRecordingDirect()
     } else {
      this.startRecordingDirect()
     }
    }
   )
  }
 }

 async askForUserName() {
  return new Promise((resolve) => {
   const overlay = document.createElement('div')
   overlay.className = 'chat-overlay'

   const popup = document.createElement('div')
   popup.className = 'name-popup'

   const title = document.createElement('h3')
   title.textContent =
    'Hello, May we know your name?'

   const input = document.createElement('input')
   input.type = 'text'
   input.placeholder = 'Your name'
   input.value = this.userName

   const buttonContainer =
    document.createElement('div')
   buttonContainer.className =
    'name-popup-buttons'

   const continueButton =
    document.createElement('button')
   continueButton.textContent = 'Continue'
   continueButton.className =
    'name-continue-btn'
   continueButton.onclick = () => {
    if (input.value.trim()) {
     this.userName = input.value.trim()
     localStorage.setItem(
      'chatUserName',
      this.userName
     )
    } else {
     this.userName = 'Guest'
     localStorage.setItem(
      'chatUserName',
      this.userName
     )
    }
    document.body.removeChild(overlay)

    // Always resolve, even if user didn't enter a name
    resolve()
   }

   const skipButton =
    document.createElement('button')
   skipButton.textContent = 'Skip'
   skipButton.className = 'name-skip-btn'
   skipButton.onclick = () => {
    this.userName = 'Guest'
    localStorage.setItem(
     'chatUserName',
     this.userName
    )
    document.body.removeChild(overlay)
    resolve()
   }

   input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
     continueButton.click()
    }
   })

   buttonContainer.appendChild(continueButton)
   buttonContainer.appendChild(skipButton)

   popup.appendChild(title)
   popup.appendChild(input)
   popup.appendChild(buttonContainer)
   overlay.appendChild(popup)
   document.body.appendChild(overlay)

   // Focus on the input field
   setTimeout(() => {
    input.focus()
   }, 100)
  })
 }

 createHeader() {
  const header = document.createElement('div')
  header.className = 'chat-header'

  // Add conversations list button on left
  const listButton =
   document.createElement('button')
  listButton.className = 'chat-list-btn'
  listButton.innerHTML = '⛬'
  listButton.onclick = () =>
   this.toggleChatList()
  header.appendChild(listButton)

  // Add centered title with channel name
  const titleContainer =
   document.createElement('div')
  titleContainer.className = 'title-container'

  const title = document.createElement('h3')
  title.textContent = 'Chat'
  titleContainer.appendChild(title)

  // Always show the actual channel name
  const channelName =
   document.createElement('span')
  channelName.className = 'channel-name'
  // Use the home symbol for the default channel
  const displayChannel =
   this.currentChannel === 'default'
    ? this.HOME_CHANNEL
    : this.currentChannel
  channelName.textContent = ` #${displayChannel}`
  titleContainer.appendChild(channelName)

  header.appendChild(titleContainer)

  // Add buttons container for right side
  const headerButtons =
   document.createElement('div')
  headerButtons.className = 'header-buttons'

  // Add menu button
  const menuButton =
   document.createElement('button')
  menuButton.className = 'chat-menu-btn'
  menuButton.innerHTML = '☰'
  menuButton.onclick = () => this.toggleMenu()
  headerButtons.appendChild(menuButton)

  // Add close button
  const closeButton =
   document.createElement('button')
  closeButton.className = 'chat-close-btn'
  closeButton.innerHTML = '✖'
  closeButton.onclick = () => this.closeChat()
  headerButtons.appendChild(closeButton)

  header.appendChild(headerButtons)

  return header
 }

 toggleMainMenu() {
  const existingMenu = document.querySelector(
   '.main-menu-container'
  )
  if (existingMenu) {
   existingMenu.remove()
   return
  }

  const menuContainer =
   document.createElement('div')
  menuContainer.className =
   'main-menu-container'

  const menuContent =
   document.createElement('div')
  menuContent.className = 'menu-content'

  const menuItems = [
   {
    icon: '📋',
    text: 'Tasks',
    action: () => this.showTasksList(),
   },
   {
    icon: '📅',
    text: 'Schedule',
    action: () => this.showDailySchedule(),
   },
   {
    icon: '🔔',
    text: 'Reminders',
    action: () => this.showReminders(),
   },
   {
    icon: '📊',
    text: 'Reports',
    action: () => this.showReports(),
   },
  ]

  menuItems.forEach((item) => {
   const button =
    document.createElement('button')
   button.className = 'menu-button'
   button.innerHTML = `${item.icon} ${item.text}`
   button.onclick = () => {
    item.action()
    menuContainer.remove()
   }
   menuContent.appendChild(button)
  })

  menuContainer.appendChild(menuContent)
  this.chatContainer.appendChild(menuContainer)

  // Close menu when clicking outside
  menuContainer.onclick = (e) => {
   if (e.target === menuContainer) {
    menuContainer.remove()
   }
  }
 }

 createSidebar() {
  const sidebar = document.createElement('div')
  sidebar.className = 'chat-sidebar'

  const chatList = document.createElement('div')
  chatList.className = 'chat-list'
  sidebar.appendChild(chatList)

  const toggleButton =
   document.createElement('button')
  toggleButton.className =
   'toggle-sidebar-button'
  toggleButton.innerHTML = '☰'
  toggleButton.onclick = () => {
   sidebar.classList.toggle('collapsed')
   this.chatContainer.classList.toggle(
    'sidebar-collapsed'
   )
  }
  sidebar.appendChild(toggleButton)

  // List all previous chats
  const chats = this.listChats()
  chats.forEach((chat) => {
   const chatItem =
    document.createElement('div')
   chatItem.className = 'chat-history-item'
   if (chat.id === this.currentChat) {
    chatItem.classList.add('active')
   }

   const nameEl = document.createElement('div')
   nameEl.className = 'chat-history-name'
   nameEl.textContent = chat.name
   chatItem.appendChild(nameEl)

   // Make chat items clickable
   chatItem.onclick = () => {
    const [channel, messageId] =
     chat.id.split('_')
    this.openChat({
     channel: channel,
     messageId: messageId || null,
    })
   }

   chatList.appendChild(chatItem)
  })

  return sidebar
 }

 listChats() {
  const chats = []
  const storedChats = localStorage.getItem(
   'chatHistory'
  )

  if (storedChats) {
   try {
    const chatHistory = JSON.parse(storedChats)

    for (const chatId in chatHistory) {
     if (
      chatHistory[chatId] &&
      chatHistory[chatId].length > 0
     ) {
      const [channel] = chatId.split('_')
      const displayChannel =
       channel === 'default'
        ? this.HOME_CHANNEL
        : channel
      chats.push({
       id: chatId,
       name: `Channel #${displayChannel} has ${chatHistory[chatId].length} messages   `,
      })
     }
    }
   } catch (e) {
    console.error(
     'Error parsing chat history:',
     e
    )
   }
  }

  return chats
 }

 loadChatHistory() {
  this.messageHistory = {}
  const storedChats = localStorage.getItem(
   'chatHistory'
  )
  if (storedChats) {
   this.messageHistory = JSON.parse(storedChats)
  }

  if (
   this.currentChat &&
   this.messageHistory[this.currentChat]
  ) {
   this.messagesArea.innerHTML = ''
   this.messageHistory[
    this.currentChat
   ].forEach((message) => {
    this.createMessageElement(
     message.text,
     message.sender,
     message.timestamp
    )
   })
  }
 }

 createMessageElement(text, sender, timestamp) {
  const message = document.createElement('div')
  message.className = `message ${sender.toLowerCase()}-message`
  // Add user-message class if this is the current user's message
  if (sender === this.userName) {
   message.classList.add('user-message')
  }

  const senderElement =
   document.createElement('div')
  senderElement.className = 'message-sender'
  senderElement.textContent = sender
  message.appendChild(senderElement)

  const textElement =
   document.createElement('div')
  textElement.className = 'message-text'
  textElement.innerHTML =
   this.formatMessage(text)
  message.appendChild(textElement)

  // Add timestamp
  const timeElement =
   document.createElement('div')
  timeElement.className = 'message-time'
  timeElement.textContent = new Date(
   timestamp
  ).toLocaleTimeString([], {
   hour: '2-digit',
   minute: '2-digit',
  })
  message.appendChild(timeElement)

  this.messagesArea.appendChild(message)
  this.messagesArea.scrollTop =
   this.messagesArea.scrollHeight
  return message
 }

 handleSendMessage() {
  const messageInput =
   this.inputArea.querySelector(
    '.message-input'
   )
  const message = messageInput.value.trim()
  if (message) {
   // this.addMessage(message, 'You'); // Removed to prevent duplicate user messages
   this.sendMessage({
    channel: this.currentChannel,
    message,
   })
   messageInput.value = ''
  }
 }

 toggleVoiceRecording() {
  if (this.isRecording) {
   this.stopRecording()
  } else {
   this.startRecording()
  }
 }

 startRecording() {
  // Initialize speech recognition with cross-browser support
  if (!this.recognition) {
   try {
    // Check for all possible Speech Recognition APIs
    window.SpeechRecognition =
     window.SpeechRecognition ||
     window.webkitSpeechRecognition ||
     window.mozSpeechRecognition ||
     window.msSpeechRecognition

    // If no implementation is available, fallback to a simple recording indicator
    if (!window.SpeechRecognition) {
     this.handleUnsupportedBrowser()
     return
    }

    this.recognition =
     new window.SpeechRecognition()

    // Configure recognition settings
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.maxAlternatives = 1
    this.recognition.lang = 'en-US'

    // Handle recognition results
    this.recognition.onresult = (event) => {
     const messageInput =
      this.inputArea.querySelector(
       '.message-input'
      )
     let interimTranscript = ''
     let finalTranscript = ''

     try {
      for (
       let i = event.resultIndex;
       i < event.results.length;
       i++
      ) {
       const transcript =
        event.results[i][0].transcript
       if (event.results[i].isFinal) {
        finalTranscript += transcript
       } else {
        interimTranscript += transcript
       }
      }

      // Update input field with transcribed text
      if (messageInput) {
       messageInput.value =
        finalTranscript + interimTranscript
      }
     } catch (error) {
      console.error(
       'Error processing speech results:',
       error
      )
      this.handleRecognitionError(
       'Error processing speech'
      )
     }
    }

    // Handle recognition errors with detailed feedback
    this.recognition.onerror = (event) => {
     console.error(
      'Speech recognition error:',
      event.error
     )
     this.handleRecognitionError(event.error)
    }

    // Handle end of recognition
    this.recognition.onend = () => {
     if (this.isRecording) {
      // Try to restart recognition if it ends unexpectedly
      try {
       this.recognition.start()
      } catch (error) {
       console.error(
        'Error restarting recognition:',
        error
       )
       this.stopRecording()
       this.handleRecognitionError(
        'Recognition stopped unexpectedly'
       )
      }
     }
    }
   } catch (error) {
    console.error(
     'Error initializing speech recognition:',
     error
    )
    this.handleUnsupportedBrowser()
    return
   }
  }

  try {
   // Update UI to show recording state
   this.updateRecordingUI(true)

   // Start recording
   this.isRecording = true
   this.recognition.start()
   console.log('Speech recognition started')

   // Set auto-stop timer
   this.recordingTimer = setTimeout(() => {
    this.stopRecording()
   }, this.recordingMaxTime)
  } catch (error) {
   console.error(
    'Error starting recording:',
    error
   )
   this.handleRecognitionError(
    'Error starting recording'
   )
   this.isRecording = false
  }
 }

 // Add new helper methods for better error handling and UI updates
 handleUnsupportedBrowser() {
  this.addMessage(
   'Voice recording is not supported in your browser. For the best experience, please use one of these browsers:\n\n• Google Chrome\n• Microsoft Edge\n• Safari (iOS/MacOS)\n• Firefox (with speech recognition enabled)\n\nAlternatively, you can type your message directly.',
   'System'
  )

  // Update UI to show unsupported state
  const voiceButton =
   this.chatContainer.querySelector(
    '.voice-button'
   )
  if (voiceButton) {
   voiceButton.style.opacity = '0.5'
   voiceButton.title =
    'Voice recording not supported in this browser'
  }
 }

 handleRecognitionError(error) {
  let message = 'Error with voice recording: '

  switch (error) {
   case 'not-allowed':
    message +=
     'Please allow microphone access to use voice recording.'
    break
   case 'no-speech':
    message +=
     'No speech was detected. Please try again.'
    break
   case 'audio-capture':
    message +=
     'No microphone was found. Please check your microphone settings.'
    break
   case 'network':
    message +=
     'Network error occurred. Please check your internet connection.'
    break
   case 'aborted':
    message +=
     'Recording was aborted. Please try again.'
    break
   default:
    message +=
     'An error occurred. Please try again or type your message.'
  }

  this.addMessage(message, 'System')
 }

 updateRecordingUI(isStarting) {
  const voiceButton =
   this.chatContainer.querySelector(
    '.voice-button'
   )
  if (voiceButton) {
   if (isStarting) {
    voiceButton.innerHTML = '⏹️' // Stop icon
    voiceButton.classList.add('recording')
    voiceButton.style.backgroundColor =
     '#ff4a4a'
   } else {
    voiceButton.innerHTML = '🎤' // Mic icon
    voiceButton.classList.remove('recording')
    voiceButton.style.backgroundColor = ''
   }
  }

  // Update recording indicator
  if (isStarting) {
   const recordingIndicator =
    document.createElement('div')
   recordingIndicator.className =
    'recording-indicator'
   recordingIndicator.innerHTML =
    '<span class="recording-dot"></span> Recording...'
   recordingIndicator.style.cssText = `
                position: absolute;
                top: -25px;
                left: 10px;
                font-size: 12px;
                color: #ff4a4a;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 5px;
            `

   // Add pulsing dot animation if not already present
   if (
    !document.querySelector(
     'style[data-recording-styles]'
    )
   ) {
    const style =
     document.createElement('style')
    style.setAttribute(
     'data-recording-styles',
     ''
    )
    style.textContent = `
                    .recording-dot {
                        width: 8px;
                        height: 8px;
                        background-color: #ff4a4a;
                        border-radius: 50%;
                        animation: pulse 1.5s infinite;
                    }
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.3; }
                        100% { opacity: 1; }
                    }
                `
    document.head.appendChild(style)
   }

   this.inputArea.style.position = 'relative'
   this.inputArea.appendChild(
    recordingIndicator
   )

   // Update input placeholder
   const messageInput =
    this.inputArea.querySelector(
     '.message-input'
    )
   if (messageInput) {
    messageInput.placeholder = 'Listening...'
   }
  }
 }

 // Update stopRecording method for better cleanup
 stopRecording() {
  this.isRecording = false

  // Update UI
  this.updateRecordingUI(false)

  // Stop speech recognition
  if (this.recognition) {
   try {
    this.recognition.stop()
   } catch (error) {
    console.error(
     'Error stopping recognition:',
     error
    )
   }
   this.recognition = null
  }

  // Restore input field placeholder
  const messageInput =
   this.inputArea.querySelector(
    '.message-input'
   )
  if (messageInput) {
   messageInput.placeholder =
    'Type your message...'
  }

  // Clear the timer
  if (this.recordingTimer) {
   clearTimeout(this.recordingTimer)
   this.recordingTimer = null
  }

  // Remove recording indicator
  const recordingIndicator =
   this.inputArea.querySelector(
    '.recording-indicator'
   )
  if (recordingIndicator) {
   recordingIndicator.remove()
  }
 }

 processAudio(audioBlob) {
  const messageInput =
   this.inputArea.querySelector(
    '.message-input'
   )

  // Create audio URL for playback
  const audioURL =
   URL.createObjectURL(audioBlob)

  // Add processing indicator
  if (messageInput) {
   messageInput.placeholder =
    'Recording ready to send...'
  }

  // Create the audio player with direct send option
  const audioContainer =
   document.createElement('div')
  audioContainer.className =
   'audio-container recording-preview'

  const audioInfo =
   document.createElement('div')
  audioInfo.className = 'audio-label'
  audioInfo.innerHTML =
   '<strong>Your recording is ready!</strong> <span style="font-size: 11px;">(Note: We can\'t actually hear your voice, but we\'ll start a conversation about this channel)</span>'
  audioContainer.appendChild(audioInfo)

  const audioElement =
   document.createElement('audio')
  audioElement.src = audioURL
  audioElement.controls = true
  audioElement.autoplay = false
  audioElement.className = 'recorded-audio'
  audioContainer.appendChild(audioElement)

  // Add button container
  const buttonContainer =
   document.createElement('div')
  buttonContainer.className =
   'recording-buttons'
  audioContainer.appendChild(buttonContainer)

  // Add direct send button (primary action)
  const directSendBtn =
   document.createElement('button')
  directSendBtn.className = 'direct-send-btn'
  directSendBtn.textContent =
   '✓ Send Recording Directly'
  directSendBtn.onclick = async () => {
   this.addMessageToUI(
    'system',
    'Processing your recording...',
    false
   )
   directSendBtn.disabled = true

   // Create a more specific prompt message for the AI
   const promptMessage = `The user just spoke to you using voice recording. They're in the ${
    this.currentChannel === 'default'
     ? 'general'
     : this.currentChannel
   } channel and asked a question or made a comment. Since we can't transcribe their speech, please respond conversationally as if they had asked "Tell me about ${
    this.currentChannel === 'default'
     ? 'general topics'
     : this.currentChannel
   }". Keep your response friendly, helpful and focused on this channel's topic.`

   try {
    this.sendMessage({
     channel: this.currentChannel,
     message: promptMessage,
    })
   } catch (error) {
    console.error(
     'Error sending audio message:',
     error
    )
    this.addMessageToUI(
     'system',
     'Error processing your recording. Please try again.',
     false
    )
   } finally {
    this.audioRecorder.clearRecording()
    audioContainer.innerHTML = ''
    recordBtn.style.display = 'inline-flex'
    directSendBtn.disabled = false
   }
  }
  buttonContainer.appendChild(directSendBtn)

  // Add cancel button
  const cancelBtn =
   document.createElement('button')
  cancelBtn.className = 'cancel-recording-btn'
  cancelBtn.textContent = '✕ Cancel'
  cancelBtn.onclick = () => {
   if (audioContainer.parentNode) {
    audioContainer.parentNode.removeChild(
     audioContainer
    )
   }
   URL.revokeObjectURL(audioURL)
  }
  buttonContainer.appendChild(cancelBtn)

  // Optional: Add transcription option (secondary)
  const showTranscriptOption =
   document.createElement('div')
  showTranscriptOption.className =
   'transcription-option'
  showTranscriptOption.textContent =
   'Want to type instead? '

  const transcriptionLink =
   document.createElement('a')
  transcriptionLink.href = '#'
  transcriptionLink.textContent = 'Click here'
  transcriptionLink.onclick = (e) => {
   e.preventDefault()

   // Create transcription field
   const transcriptionContainer =
    document.createElement('div')
   transcriptionContainer.className =
    'manual-transcription-container'

   const transcriptionText =
    document.createElement('textarea')
   transcriptionText.className =
    'manual-transcription'
   transcriptionText.placeholder =
    'Type what you said here...'
   transcriptionText.rows = 2

   const sendTranscriptionBtn =
    document.createElement('button')
   sendTranscriptionBtn.className =
    'manual-submit-btn'
   sendTranscriptionBtn.textContent =
    'Send With Text'
   sendTranscriptionBtn.onclick = () => {
    const text = transcriptionText.value.trim()
    if (text) {
     if (audioContainer.parentNode) {
      audioContainer.parentNode.removeChild(
       audioContainer
      )
     }
     this.addMessage(text, 'You')
     this.sendMessage({
      channel: this.currentChannel,
      message: text,
     })
    }
   }

   transcriptionContainer.appendChild(
    transcriptionText
   )
   transcriptionContainer.appendChild(
    sendTranscriptionBtn
   )

   // Replace the link with the transcription field
   showTranscriptOption.parentNode.replaceChild(
    transcriptionContainer,
    showTranscriptOption
   )

   // Focus on the transcription field
   setTimeout(() => {
    transcriptionText.focus()
   }, 100)
  }

  showTranscriptOption.appendChild(
   transcriptionLink
  )
  audioContainer.appendChild(
   showTranscriptOption
  )

  // Add to message area
  this.messagesArea.appendChild(audioContainer)
  this.messagesArea.scrollTop =
   this.messagesArea.scrollHeight
 }

 addMessage(text, sender) {
  // Initialize the chat history for this channel if it doesn't exist
  if (!this.messageHistory[this.currentChat]) {
   this.messageHistory[this.currentChat] = []
  }

  // Create timestamp
  const timestamp = new Date().toISOString()

  // Store the message in history
  this.messageHistory[this.currentChat].push({
   text,
   sender,
   timestamp,
  })

  // Save to localStorage
  localStorage.setItem(
   'chatHistory',
   JSON.stringify(this.messageHistory)
  )

  // Create and display the message element
  this.createMessageElement(
   text,
   sender,
   timestamp
  )
 }

 async sendMessage(context) {
  const messageText =
   context.message ||
   this.inputArea
    .querySelector('.message-input')
    .value.trim()
  if (!messageText) return

  const timestamp = new Date().toISOString()
  // Use HOME_CHANNEL instead of 'default'
  const channel =
   context.channel ||
   this.currentChannel ||
   this.HOME_CHANNEL

  const backendMessage = {
   message: messageText,
   channel:
    channel === this.HOME_CHANNEL
     ? 'default'
     : channel, // Convert to 'default' for backend
   velocity: 0,
  }

  // Add user's message to the local UI immediately
  const uiMessage = {
   sender: this.userName,
   text: messageText,
   timestamp: timestamp,
   channel: channel,
   messageId:
    context.messageId || this.currentMessageId,
  }
  this.addMessage(
   uiMessage.text,
   uiMessage.sender
  )
  this.inputArea.querySelector(
   '.message-input'
  ).value = ''

  try {
   // Now, get AI response from /chat
   const aiResponse = await fetch('/chat', {
    method: 'POST',
    headers: {
     'Content-Type': 'application/json',
    },
    body: JSON.stringify({
     message: messageText,
     channel:
      channel === this.HOME_CHANNEL
       ? 'default'
       : channel, // Convert to 'default' for backend
     history:
      this.messageHistory[this.currentChat], // Send chat history for context
     userName: this.userName, // Send the user's name to the backend
    }),
   })

   if (!aiResponse.ok) {
    throw new Error('Failed to get AI response')
   }

   const aiData = await aiResponse.json()
   if (aiData.error) {
    throw new Error(aiData.error)
   }

   if (aiData && aiData.message) {
    this.addMessage(
     aiData.message,
     aiData.sender || 'Tagmein AI'
    )
    if (aiData.suggestedReplies) {
     this.displaySuggestedContent(
      aiData.suggestedReplies
     )
    }
   }
  } catch (error) {
   console.error(
    'Error sending message or getting AI response:',
    error
   )
   this.addMessage(
    `Error: ${error.message}`,
    'System'
   )
  }
 }

 displaySuggestedContent(suggestedContent) {
  if (
   !suggestedContent ||
   suggestedContent.length === 0
  ) {
   return
  }

  // Remove any existing suggestions
  const existingSuggestions =
   this.chatContainer.querySelector(
    '.suggestions-container'
   )
  if (existingSuggestions) {
   existingSuggestions.remove()
  }

  // Create a message-like container for suggestions
  const suggestionsContainer =
   document.createElement('div')
  suggestionsContainer.className =
   'message system-message suggestions-container'

  // Create a header that looks like a message sender
  const header = document.createElement('div')
  header.className = 'message-sender'
  header.textContent = 'Suggested Replies'
  suggestionsContainer.appendChild(header)

  // Create content area for buttons
  const contentArea =
   document.createElement('div')
  contentArea.className =
   'message-text suggestion-buttons-container'
  suggestionsContainer.appendChild(contentArea)

  // Add each suggestion as a styled button
  suggestedContent.forEach((suggestion) => {
   const suggestionElement =
    document.createElement('button')
   suggestionElement.className =
    'suggestion-button'
   suggestionElement.textContent = suggestion
   suggestionElement.onclick = () => {
    this.addMessage(suggestion, 'You')
    this.sendMessage({
     channel: this.currentChannel,
     message: suggestion,
    })
    suggestionsContainer.remove() // Remove suggestions after clicking
   }
   contentArea.appendChild(suggestionElement)
  })

  // Add timestamp
  const timeElement =
   document.createElement('div')
  timeElement.className = 'message-time'
  timeElement.textContent =
   new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
   })
  suggestionsContainer.appendChild(timeElement)

  // Add to messages area instead of chat container
  this.messagesArea.appendChild(
   suggestionsContainer
  )
  this.messagesArea.scrollTop =
   this.messagesArea.scrollHeight

  // Add CSS styles inline to ensure they're applied
  const style = document.createElement('style')
  style.textContent = `
            .suggestions-container {
                border-left: 4px solid #7d5fff !important;
                background-color: rgba(125, 95, 255, 0.05) !important;
            }
            
            .suggestion-buttons-container {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 5px;
            }
            
            .suggestion-button {
                background-color: #7d5fff;
                color: white;
                border: none;
                border-radius: 16px;
                padding: 6px 12px;
                margin: 0;
                font-size: 13px;
                cursor: pointer;
                transition: background-color 0.2s, transform 0.2s;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 200px;
            }
            
            .suggestion-button:hover {
                background-color: #6c4ae0;
                transform: translateY(-2px);
            }
        `

  this.chatContainer.appendChild(style)
 }

 addChatButtonsToChannels() {
  const channels = document.querySelectorAll(
   '.channel:not(.has-chat-button)'
  )
  channels.forEach((channel) => {
   channel.classList.add('has-chat-button')
   const chatButton =
    document.createElement('button')
   chatButton.className = 'chat-button'
   chatButton.innerHTML = '🗨️ Chat'
   chatButton.onclick = (e) => {
    e.stopPropagation()
    let channelName =
     channel.dataset.channel ||
     channel.textContent.trim()
    // Convert 'default' to home symbol
    if (channelName === 'default') {
     channelName = this.HOME_CHANNEL
    }
    console.log(
     `Channel clicked: ${channelName}`
    )
    this.openChat({ channel: channelName })
   }
   channel.appendChild(chatButton)
  })
 }

 addChatButtonsToMessages() {
  const messages = document.querySelectorAll(
   '.message:not(.has-chat-button)'
  )
  messages.forEach((message) => {
   message.classList.add('has-chat-button')
   const chatButton =
    document.createElement('button')
   chatButton.className = 'chat-button'
   chatButton.innerHTML = '🗨️ Chat'
   chatButton.onclick = (e) => {
    e.stopPropagation()
    const channelName =
     message.dataset.channel || 'default'
    const messageId =
     message.dataset.messageId || null
    console.log(
     `Message channel clicked: ${channelName}`
    )
    this.openChat({
     channel: channelName,
     messageId: messageId,
     message: message.textContent,
    })
   }
   message.appendChild(chatButton)
  })
 }

 formatMessage(text) {
  if (!text) return ''

  // Convert URLs to clickable links - both markdown style and plain URLs
  text = text.replace(
   /\[([^\]]+)\]\(([^)]+)\)/g,
   '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  )
  text = text.replace(
   /(https?:\/\/[^\s]+)/g,
   (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
   }
  )

  // Code blocks with language specification: ```language\ncode\n```
  text = text.replace(
   /```(\w*)\n([\s\S]*?)```/g,
   (match, language, code) => {
    return `<pre class="code-block ${language}"><code>${code.trim()}</code></pre>`
   }
  )

  // Headers: # Header (up to ######)
  text = text.replace(
   /^(#{1,6})\s+(.+)$/gm,
   (match, hashes, content) => {
    const level = hashes.length
    return `<h${level} style="margin: 0.8em 0 0.5em 0; font-weight: 600;">${content}</h${level}>`
   }
  )

  // Bold: **text**
  text = text.replace(
   /\*\*(.*?)\*\*/g,
   '<strong>$1</strong>'
  )

  // Italic: *text*
  text = text.replace(
   /\*([^*]+)\*/g,
   '<em>$1</em>'
  )

  // Unordered lists: * item or - item
  text = text.replace(
   /^[-*]\s+(.+)$/gm,
   '<li>$1</li>'
  )
  text = text.replace(
   /(<li>.*<\/li>)/s,
   '<ul style="margin: 0.5em 0; padding-left: 20px;">$1</ul>'
  )

  // Add markdown styles if they don't exist yet
  if (
   !document.querySelector(
    'style[data-markdown-styles]'
   )
  ) {
   const style = document.createElement('style')
   style.setAttribute(
    'data-markdown-styles',
    ''
   )
   style.textContent = `
                .message-text code {
                    background-color: white;
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: monospace;
                    font-size: 0.9em;
                    color: #a0a0a0;  /* Light grey for light mode */
                }
                .message-text pre.code-block {
                    background-color: white;
                    padding: 16px;
                    border-radius: 6px;
                    overflow-x: auto;
                    margin: 0.8em 0;
                    border: 1px solid #e1e4e8;
                    color: #a0a0a0;  /* Light grey for light mode */
                }
                
                /* Dark mode styles */
                @media (prefers-color-scheme: dark) {
                    .message-text code {
                        background-color: #000000;
                        color: white;
                    }
                    .message-text pre.code-block {
                        background-color: #000000;
                        border-color: #333333;
                        color: white;
                    }
                }
                
                /* For explicitly set dark mode class */
                .dark-mode .message-text code,
                .dark-theme .message-text code {
                    background-color: #000000;
                    color: white;
                }
                .dark-mode .message-text pre.code-block,
                .dark-theme .message-text pre.code-block {
                    background-color: #000000;
                    border-color: #333333;
                    color: white;
                }
                
                .message-text h1, .message-text h2, .message-text h3,
                .message-text h4, .message-text h5, .message-text h6 {
                    color: #24292e;
                    line-height: 1.25;
                }
                .message-text ul {
                    list-style-type: disc;
                }
                .message-text a {
                    color: #0366d6;
                    text-decoration: none;
                }
                .message-text a:hover {
                    text-decoration: underline;
                }
                .message-text strong {
                    font-weight: 600;
                }
                .message-text em {
                    font-style: italic;
                }
                
                /* Dark mode text colors */
                @media (prefers-color-scheme: dark) {
                    .message-text h1, .message-text h2, .message-text h3,
                    .message-text h4, .message-text h5, .message-text h6 {
                        color: #e6e6e6;
                    }
                    .message-text a {
                        color: #58a6ff;
                    }
                }
                
                .dark-mode .message-text h1, 
                .dark-mode .message-text h2, 
                .dark-mode .message-text h3,
                .dark-mode .message-text h4, 
                .dark-mode .message-text h5, 
                .dark-mode .message-text h6,
                .dark-theme .message-text h1, 
                .dark-theme .message-text h2, 
                .dark-theme .message-text h3,
                .dark-theme .message-text h4, 
                .dark-theme .message-text h5, 
                .dark-theme .message-text h6 {
                    color: #e6e6e6;
                }
                .dark-mode .message-text a,
                .dark-theme .message-text a {
                    color: #58a6ff;
                }
            `
   document.head.appendChild(style)
  }

  // Replace newlines with <br> tags (after markdown parsing)
  return text.replace(/\n/g, '<br>')
 }

 toggleMenu() {
  let menu =
   this.chatContainer.querySelector(
    '.chat-menu'
   )
  if (menu) {
   menu.remove()
   this.menuVisible = false
  } else {
   menu = document.createElement('div')
   menu.className = 'chat-menu'
   // Add dark/light mode class
   if (
    document.body.classList.contains(
     'light-mode'
    )
   ) {
    menu.classList.add('light-mode')
   } else {
    menu.classList.add('dark-mode')
   }
   // Match chat history dropdown styling
   menu.style.cssText = `
                position: absolute;
                top: 60px;
                right: 10px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 1002;
                width: 200px;
                overflow: visible;
                padding: 5px;
                background: var(--color-bg-medium);
                color: var(--color-text-primary);
            `
   if (menu.classList.contains('dark-mode')) {
    menu.style.background =
     'var(--color-bg-medium-dark)'
    menu.style.color =
     'var(--color-text-primary)'
   }

   const menuItems = [
    {
     text: 'Set Chat URL',
     action: () => {
      const newURL = prompt(
       'Enter new chat URL:',
       this.chatURL
      )
      if (newURL) {
       this.chatURL = newURL
       localStorage.setItem(
        'chatURL',
        this.chatURL
       )
       alert(
        `Chat URL updated to: ${this.chatURL}`
       )
      }
     },
    },
    {
     text: 'Reset to Tag Me In chatbot',
     action: () => {
      this.chatURL = '/api/chat'
      localStorage.setItem(
       'chatURL',
       this.chatURL
      )
      alert(
       'Chat URL reset to Tag Me In endpoint'
      )
     },
    },
    {
     text: 'Change Your Name',
     action: async () => {
      menu.remove()
      this.menuVisible = false
      localStorage.removeItem('chatUserName')
      this.userName = ''
      await this.askForUserName()
     },
    },
    {
     text: 'Delete Chat',
     action: () => {
      // Get the current chat history
      const chatHistory = JSON.parse(
       localStorage.getItem('chatHistory') ||
        '{}'
      )
      // Delete only the current chat
      if (
       this.currentChat &&
       chatHistory[this.currentChat]
      ) {
       delete chatHistory[this.currentChat]
       localStorage.setItem(
        'chatHistory',
        JSON.stringify(chatHistory)
       )
       // Clear only the current chat messages from the UI
       this.chatContainer.querySelector(
        '.messages-area'
       ).innerHTML = ''
       // Add the original welcome message after deletion
       let displayChannel =
        this.currentChannel === '' ||
        this.currentChannel === 'default'
         ? this.HOME_CHANNEL
         : this.currentChannel
       let initialMessage =
        this.userName &&
        this.userName !== 'Guest'
         ? `Welcome to the ${displayChannel} channel, ${this.userName}! How can I help you today?`
         : `Welcome to the ${displayChannel} channel! How can I help you today?`
       this.addMessage(
        initialMessage,
        'Tag Me In AI'
       )
       alert('Current chat deleted.')
      }
     },
    },
    {
     text: 'Delete All Chats',
     action: () => {
      if (
       confirm(
        'Are you sure you want to delete all chat history? This cannot be undone.'
       )
      ) {
       this.messageHistory = {}
       localStorage.removeItem('chatHistory')
       this.chatContainer.querySelector(
        '.messages-area'
       ).innerHTML = ''
       alert(
        'All chat history has been deleted.'
       )
      }
     },
    },
   ]

   menuItems.forEach((item) => {
    const button =
     document.createElement('button')
    button.textContent = item.text
    button.style.cssText = `
                    display: block;
                    width: 100%;
                    padding: 8px 12px;
                    margin: 4px 0;
                    border: none;
                    border-radius: 4px;
                    background: none;
                    text-align: left;
                    cursor: pointer;
                    transition: background-color 0.2s;
                `

    // Add a red color to the Delete All Chats button
    if (item.text === 'Delete All Chats') {
     button.style.color = '#dc3545'
    } else if (
     menu.classList.contains('dark-mode')
    ) {
     button.style.color = '#fff'
    }

    button.onmouseover = () => {
     button.style.backgroundColor = '#f0f0f0'
     if (menu.classList.contains('dark-mode')) {
      button.style.backgroundColor = '#3d3d3d'
     }
    }
    button.onmouseout = () => {
     button.style.backgroundColor =
      'transparent'
    }
    button.onclick = () => {
     item.action()
     if (item.text !== 'Change Your Name') {
      menu.remove()
      this.menuVisible = false
     }
    }
    menu.appendChild(button)
   })

   this.chatContainer.appendChild(menu)
   this.menuVisible = true
  }
 }

 // Add new method to toggle chat list
 toggleChatList() {
  let chatList =
   this.chatContainer.querySelector(
    '.chat-history-list'
   )
  if (chatList) {
   chatList.remove()
   return
  }

  chatList = document.createElement('div')
  chatList.className = 'chat-history-list'

  const header = document.createElement('div')
  header.className = 'chat-list-header'
  header.style.cssText = `
            text-align: center;
            font-weight: bold;
            padding-top: 24px;
            padding-bottom: 16px;
        `
  header.textContent = 'Chat History'
  chatList.appendChild(header)

  // Get all chat histories
  const conversations =
   this.listAllConversations()

  if (conversations.length === 0) {
   const emptyMsg =
    document.createElement('div')
   emptyMsg.className = 'empty-history'
   emptyMsg.textContent =
    'No previous conversations found'
   chatList.appendChild(emptyMsg)
  } else {
   // Create a list of conversations
   conversations.forEach((conv) => {
    const item = document.createElement('div')
    item.className = 'chat-history-item'
    if (conv.id === this.currentChat) {
     item.classList.add('active')
    }

    const nameEl = document.createElement('div')
    nameEl.className = 'chat-history-name'
    nameEl.textContent = conv.name

    const channelEl =
     document.createElement('div')
    channelEl.className = 'chat-history-channel'
    channelEl.textContent = `#${
     conv.channel === 'default'
      ? '⌂'
      : conv.channel
    }`

    const timeEl = document.createElement('div')
    timeEl.className = 'chat-history-time'
    timeEl.textContent = this.formatDate(
     new Date(conv.lastMessage)
    )

    item.appendChild(nameEl)
    item.appendChild(channelEl)
    item.appendChild(timeEl)

    item.onclick = () => {
     this.switchToConversation(conv.id)
     chatList.remove()
    }

    chatList.appendChild(item)
   })
  }

  this.chatContainer.appendChild(chatList)
 }

 formatDate(date) {
  const now = new Date()
  const isToday =
   date.toDateString() === now.toDateString()

  if (isToday) {
   return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
   })
  } else {
   return (
    date.toLocaleDateString() +
    ' ' +
    date.toLocaleTimeString([], {
     hour: '2-digit',
     minute: '2-digit',
    })
   )
  }
 }

 switchToConversation(chatId) {
  if (this.messageHistory[chatId]) {
   this.currentChat = chatId

   // Extract channel from chatId
   const parts = chatId.split('_')
   this.currentChannel = parts[0]
   this.currentMessage =
    parts.length > 1 ? parts[1] : null

   // Update header to show current channel
   const oldHeader =
    this.chatContainer.querySelector(
     '.chat-header'
    )
   if (oldHeader) {
    const newHeader = this.createHeader()
    this.chatContainer.replaceChild(
     newHeader,
     oldHeader
    )
   }

   // Load the message history for this chat
   this.loadChatHistory()
  }
 }

 listAllConversations() {
  const conversations = []

  // Load message history from localStorage if not already loaded
  if (
   !this.messageHistory ||
   Object.keys(this.messageHistory).length === 0
  ) {
   const storedHistory = localStorage.getItem(
    'chatHistory'
   )
   if (storedHistory) {
    try {
     this.messageHistory = JSON.parse(
      storedHistory
     )
    } catch (error) {
     console.error(
      'Error parsing chat history:',
      error
     )
     this.messageHistory = {}
     return conversations
    }
   } else {
    this.messageHistory = {}
    return conversations
   }
  }

  // Process message history
  for (const chatId in this.messageHistory) {
   if (
    this.messageHistory[chatId] &&
    Array.isArray(
     this.messageHistory[chatId]
    ) &&
    this.messageHistory[chatId].length > 0
   ) {
    // Extract channel from chatId
    const parts = chatId.split('_')
    const channel = parts[0]

    // Get the first user message for a name
    let chatName = ''
    for (const message of this.messageHistory[
     chatId
    ]) {
     if (
      message &&
      message.sender === 'You' &&
      message.text
     ) {
      chatName = message.text
      break
     }
    }

    // Fallback to first message if no user messages
    if (
     !chatName &&
     this.messageHistory[chatId][0] &&
     this.messageHistory[chatId][0].text
    ) {
     chatName =
      this.messageHistory[chatId][0].text
    }

    // Use a default name if still empty
    if (!chatName) {
     chatName = `Chat ${channel}`
    }

    // Truncate if too long
    chatName =
     chatName.length > 25
      ? chatName.substring(0, 25) + '...'
      : chatName

    // Get the timestamp of the last message
    let lastMessageTime =
     new Date().toISOString()
    const lastMessage =
     this.messageHistory[chatId][
      this.messageHistory[chatId].length - 1
     ]
    if (lastMessage && lastMessage.timestamp) {
     lastMessageTime = lastMessage.timestamp
    }

    conversations.push({
     id: chatId,
     name: chatName,
     channel: channel,
     lastMessage: lastMessageTime,
    })
   }
  }

  // Sort by most recent message
  conversations.sort(
   (a, b) =>
    new Date(b.lastMessage) -
    new Date(a.lastMessage)
  )

  return conversations
 }

 startRecordingDirect() {
  console.log('Start recording direct message')
  this.isRecordingDirect = true
  const directSendBtn = document.getElementById(
   'directSendBtn'
  )
  if (directSendBtn) {
   directSendBtn.classList.add('recording')
   directSendBtn.textContent = '⏹️' // Stop icon
  }

  // Display a notification to inform the user that recording has started
  this.addMessage(
   "Recording started. Voice detection is not available yet, so when you stop, I'll help you with your current topic.",
   'System'
  )
 }

 stopRecordingDirect() {
  console.log('Stop recording direct message')
  this.isRecordingDirect = false
  const directSendBtn = document.getElementById(
   'directSendBtn'
  )
  if (directSendBtn) {
   directSendBtn.classList.remove('recording')
   directSendBtn.textContent = '🎙️' // Mic icon
  }

  // Add a user message showing what would be the voice request
  this.addMessage(
   `[Voice Request about ${
    this.currentChannel === 'default'
     ? 'general topics'
     : this.currentChannel
   }]`,
   'You'
  )

  // Send a more specific message based on the current channel
  let messageContent = ''
  if (this.currentChannel === 'default') {
   messageContent =
    'I just tried to send you a voice message. Since voice detection is not working yet, please help me with some general information about this platform.'
  } else {
   messageContent = `I just tried to send you a voice message about "${this.currentChannel}". Since voice detection is not working yet, please give me key information about ${this.currentChannel} and how I can use it.`
  }

  this.sendMessage({
   channel: this.currentChannel,
   message: messageContent,
  })
 }

 // Add new method to handle task creation flow
 async handleTaskCreation(step, input) {
  if (step === 'initial') {
   // Add the styles if not already added
   if (
    !document.querySelector(
     'style[data-task-styles]'
    )
   ) {
    this.addTaskManagementStyles()
   }

   // Show the task management form
   const formContainer =
    this.createTaskManagementForm()
   this.messagesArea.appendChild(formContainer)

   return {
    message:
     "I've opened the task management interface for you. You can add new tasks using the form above.",
    nextStep: 'using_form',
   }
  }
  // ... rest of the existing handleTaskCreation method ...
 }

 // Add method to update task statistics
 updateTaskStats(task, duration) {
  const stats = this.taskManager.taskStats
  const today = new Date()
   .toISOString()
   .split('T')[0]

  // Initialize stats if needed
  stats.dailyStats = stats.dailyStats || {}
  stats.dailyStats[today] = stats.dailyStats[
   today
  ] || {
   totalTasks: 0,
   completedTasks: 0,
   timeSpentByCategory: {},
   productivityScore: 0,
  }

  // Update category stats
  stats.dailyStats[today].timeSpentByCategory[
   task.category
  ] =
   (stats.dailyStats[today].timeSpentByCategory[
    task.category
   ] || 0) + duration

  // Update task completion stats
  if (task.status === 'Completed') {
   stats.dailyStats[today].completedTasks++
  }

  // Calculate productivity score
  if (
   task.estimatedDuration &&
   task.actualDuration
  ) {
   const efficiency =
    task.estimatedDuration / task.actualDuration
   stats.dailyStats[today].productivityScore =
    (stats.dailyStats[today].productivityScore +
     (efficiency > 1 ? 1 : efficiency)) /
    2
  }

  this.saveTaskData()
 }

 // Enhance task parsing to include categories and more details
 parseTaskInput(input) {
  const task = {
   id: Date.now().toString(),
   createdAt: new Date().toISOString(),
   status: 'Pending',
   timeEntries: [],
   tags: [],
   subtasks: [],
   completionRate: 0,
  }

  // Parse task name
  const nameParts = input.split(',')
  task.name = nameParts[0].trim()

  // Parse category
  const categoryMatch = input.match(
   /category[:\s]+(\w+)/i
  )
  if (categoryMatch) {
   task.category = categoryMatch[1]
   // Add new category if it doesn't exist
   if (
    !this.taskManager.categories.includes(
     task.category
    )
   ) {
    this.taskManager.categories.push(
     task.category
    )
   }
  } else {
   // Auto-categorize based on keywords
   task.category = this.autoCategorizeTask(
    task.name
   )
  }

  // Parse due date/time
  const timeMatch = input.match(
   /at\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\s+today/i
  )
  if (timeMatch) {
   const timeStr = timeMatch[1]
   const today = new Date()
   const [hours, minutes] = timeStr
    .split(':')
    .map((num) => parseInt(num))
   today.setHours(hours)
   today.setMinutes(minutes || 0)
   task.dueDate = today.toISOString()
  }

  // Parse duration
  const durationMatch = input.match(
   /duration\s+(\d+)\s*(hour|hr|minute|min)/i
  )
  if (durationMatch) {
   const amount = parseInt(durationMatch[1])
   const unit = durationMatch[2].toLowerCase()
   task.estimatedDuration = unit.startsWith('h')
    ? amount * 60
    : amount
  }

  // Parse priority
  const priorityMatch = input.match(
   /(high|medium|low)\s+priority/i
  )
  if (priorityMatch) {
   task.priority =
    priorityMatch[1].toLowerCase()
  } else {
   task.priority =
    this.calculateTaskPriority(task)
  }

  // Parse location
  const locationMatch = input.match(
   /at\s+([^,]+?)(?=,|\s+at\s+|$)/i
  )
  if (locationMatch) {
   task.location = {
    name: locationMatch[1].trim(),
   }
  }

  // Parse subtasks
  const subtaskMatch = input.match(
   /subtasks?:\s*\[(.*?)\]/i
  )
  if (subtaskMatch) {
   task.subtasks = subtaskMatch[1]
    .split(',')
    .map((st) => ({
     id: Date.now() + Math.random(),
     title: st.trim(),
     status: 'Pending',
    }))
  }

  return task
 }

 // Add method for auto-categorization
 autoCategorizeTask(taskName) {
  const keywords = {
   Work: [
    'meeting',
    'presentation',
    'report',
    'client',
    'project',
    'deadline',
    'email',
   ],
   Personal: [
    'gym',
    'exercise',
    'shopping',
    'doctor',
    'appointment',
    'hobby',
   ],
   Home: [
    'clean',
    'laundry',
    'grocery',
    'cook',
    'repair',
    'maintenance',
   ],
   Learning: [
    'study',
    'read',
    'course',
    'learn',
    'practice',
    'research',
   ],
  }

  const lowercaseTask = taskName.toLowerCase()
  for (const [
   category,
   words,
  ] of Object.entries(keywords)) {
   if (
    words.some((word) =>
     lowercaseTask.includes(word)
    )
   ) {
    return category
   }
  }

  // Learn from user's previous categorizations
  const similarTasks =
   this.taskManager.tasks.filter(
    (t) =>
     t.name
      .toLowerCase()
      .includes(lowercaseTask) ||
     lowercaseTask.includes(
      t.name.toLowerCase()
     )
   )

  if (similarTasks.length > 0) {
   // Use the most common category from similar tasks
   const categoryCount = {}
   similarTasks.forEach((t) => {
    categoryCount[t.category] =
     (categoryCount[t.category] || 0) + 1
   })
   const mostCommonCategory = Object.entries(
    categoryCount
   ).sort((a, b) => b[1] - a[1])[0][0]
   return mostCommonCategory
  }

  return 'Personal' // Default category
 }

 // Add method for adaptive task prioritization
 calculateTaskPriority(task) {
  let score = 0

  // Factor 1: Due date proximity
  if (task.dueDate) {
   const dueIn =
    new Date(task.dueDate) - new Date()
   const daysUntilDue =
    dueIn / (1000 * 60 * 60 * 24)
   if (daysUntilDue <= 1) score += 3
   else if (daysUntilDue <= 3) score += 2
   else if (daysUntilDue <= 7) score += 1
  }

  // Factor 2: User's completion patterns
  const similarTasks =
   this.taskManager.tasks.filter(
    (t) =>
     t.category === task.category &&
     t.status === 'Completed'
   )

  if (similarTasks.length > 0) {
   const avgCompletionTime =
    similarTasks.reduce(
     (acc, t) => acc + (t.actualDuration || 0),
     0
    ) / similarTasks.length

   if (
    avgCompletionTime >
    (task.estimatedDuration || 0) * 1.5
   ) {
    score += 2 // User tends to take longer on similar tasks
   }
  }

  // Factor 3: Category importance
  const categoryStats =
   this.taskManager.taskStats.dailyStats || {}
  const recentStats = Object.values(
   categoryStats
  ).slice(-7) // Last 7 days
  const categoryCompletionRate =
   recentStats.reduce((acc, day) => {
    const categoryTasks =
     this.taskManager.tasks.filter(
      (t) =>
       t.category === task.category &&
       t.createdAt.startsWith(day)
     )
    const completed = categoryTasks.filter(
     (t) => t.status === 'Completed'
    ).length
    return (
     acc +
     completed / (categoryTasks.length || 1)
    )
   }, 0) / recentStats.length

  if (categoryCompletionRate < 0.5) score += 2 // Priority boost for neglected categories

  // Convert score to priority
  if (score >= 4) return 'high'
  if (score >= 2) return 'medium'
  return 'low'
 }

 // Add method to generate performance report
 generatePerformanceReport(taskId) {
  const task = this.taskManager.tasks.find(
   (t) => t.id === taskId
  )
  if (!task || task.status !== 'Completed')
   return null

  const report = {
   taskName: task.name,
   category: task.category,
   timeStats: {
    estimated: task.estimatedDuration || 0,
    actual: task.actualDuration || 0,
    difference:
     (task.actualDuration || 0) -
     (task.estimatedDuration || 0),
    efficiency: task.estimatedDuration
     ? (task.estimatedDuration /
        (task.actualDuration ||
         task.estimatedDuration)) *
       100
     : 100,
   },
   subtaskCompletion: task.subtasks
    ? (task.subtasks.filter(
       (st) => st.status === 'Completed'
      ).length /
       task.subtasks.length) *
      100
    : null,
   timeEntries: task.timeEntries || [],
   suggestions: [],
  }

  // Generate insights
  if (report.timeStats.difference > 0) {
   report.suggestions.push(
    `This task took ${Math.round(
     report.timeStats.difference
    )} minutes longer than estimated. Consider breaking it into smaller subtasks next time.`
   )
  }

  if (report.timeStats.efficiency < 70) {
   report.suggestions.push(
    'Efficiency was lower than usual. Try scheduling this type of task during your peak productivity hours.'
   )
  }

  if (
   task.timeEntries &&
   task.timeEntries.length > 1
  ) {
   report.suggestions.push(
    'This task was completed in multiple sessions. Consider allocating a dedicated time block for similar tasks in the future.'
   )
  }

  return report
 }

 // Add method to generate daily summary
 generateDailySummary() {
  const today = new Date()
   .toISOString()
   .split('T')[0]
  const stats =
   this.taskManager.taskStats.dailyStats[today]

  if (!stats)
   return 'No activity recorded today.'

  const summary = {
   totalTasks: stats.totalTasks,
   completedTasks: stats.completedTasks,
   completionRate:
    (stats.completedTasks / stats.totalTasks) *
    100,
   timeByCategory: stats.timeSpentByCategory,
   productivityScore:
    stats.productivityScore * 100,
   insights: [],
  }

  // Generate insights
  if (summary.completionRate < 50) {
   summary.insights.push(
    'Tip: Try breaking down tasks into smaller, more manageable pieces.'
   )
  }

  const mostProductiveCategory = Object.entries(
   stats.timeSpentByCategory
  ).sort((a, b) => b[1] - a[1])[0]
  summary.insights.push(
   `You spent most time on ${mostProductiveCategory[0]} tasks today.`
  )

  return summary
 }

 createTaskManagementForm() {
  const formContainer =
   document.createElement('div')
  formContainer.className =
   'task-form-container'

  // Add form header
  const formHeader =
   document.createElement('div')
  formHeader.className = 'task-form-header'
  formHeader.innerHTML =
   '<h3>📋 Task Management</h3>'
  formContainer.appendChild(formHeader)

  // Create main form
  const form = document.createElement('div')
  form.className = 'task-form'

  // Task name field
  const nameField = this.createFormField(
   'task-name',
   'Task Name',
   'text',
   'Enter task name'
  )
  form.appendChild(nameField)

  // Category dropdown
  const categoryField =
   document.createElement('div')
  categoryField.className = 'form-field'
  const categoryLabel =
   document.createElement('label')
  categoryLabel.textContent = 'Category'
  const categorySelect =
   document.createElement('select')
  categorySelect.className = 'task-category'
  this.taskManager.categories.forEach(
   (category) => {
    const option =
     document.createElement('option')
    option.value = category
    option.textContent = category
    categorySelect.appendChild(option)
   }
  )
  categoryField.appendChild(categoryLabel)
  categoryField.appendChild(categorySelect)
  form.appendChild(categoryField)

  // Due date and time
  const dateTimeField = this.createFormField(
   'task-due',
   'Due Date & Time',
   'datetime-local'
  )
  form.appendChild(dateTimeField)

  // Duration field
  const durationField = this.createFormField(
   'task-duration',
   'Estimated Duration (minutes)',
   'number',
   '30'
  )
  form.appendChild(durationField)

  // Priority dropdown
  const priorityField =
   document.createElement('div')
  priorityField.className = 'form-field'
  const priorityLabel =
   document.createElement('label')
  priorityLabel.textContent = 'Priority'
  const prioritySelect =
   document.createElement('select')
  prioritySelect.className = 'task-priority'
  ;['High', 'Medium', 'Low'].forEach(
   (priority) => {
    const option =
     document.createElement('option')
    option.value = priority.toLowerCase()
    option.textContent = priority
    prioritySelect.appendChild(option)
   }
  )
  priorityField.appendChild(priorityLabel)
  priorityField.appendChild(prioritySelect)
  form.appendChild(priorityField)

  // Location field
  const locationField = this.createFormField(
   'task-location',
   'Location (optional)',
   'text',
   'Enter location'
  )
  form.appendChild(locationField)

  // Subtasks field
  const subtasksField =
   document.createElement('div')
  subtasksField.className = 'form-field'
  const subtasksLabel =
   document.createElement('label')
  subtasksLabel.textContent =
   'Subtasks (optional)'
  const subtasksList =
   document.createElement('div')
  subtasksList.className = 'subtasks-list'
  const addSubtaskBtn =
   document.createElement('button')
  addSubtaskBtn.className = 'add-subtask-btn'
  addSubtaskBtn.textContent = '+ Add Subtask'
  addSubtaskBtn.onclick = () =>
   this.addSubtaskField(subtasksList)
  subtasksField.appendChild(subtasksLabel)
  subtasksField.appendChild(subtasksList)
  subtasksField.appendChild(addSubtaskBtn)
  form.appendChild(subtasksField)

  // Form buttons
  const buttonContainer =
   document.createElement('div')
  buttonContainer.className = 'form-buttons'

  const saveButton =
   document.createElement('button')
  saveButton.className = 'save-task-btn'
  saveButton.textContent = 'Save Task'
  saveButton.onclick = () =>
   this.saveTaskFromForm(form)

  const viewTasksButton =
   document.createElement('button')
  viewTasksButton.className = 'view-tasks-btn'
  viewTasksButton.textContent = 'View Tasks'
  viewTasksButton.onclick = () =>
   this.showTasksList()

  buttonContainer.appendChild(saveButton)
  buttonContainer.appendChild(viewTasksButton)
  form.appendChild(buttonContainer)

  formContainer.appendChild(form)
  return formContainer
 }

 createFormField(
  className,
  labelText,
  type,
  placeholder = ''
 ) {
  const field = document.createElement('div')
  field.className = 'form-field'

  const label = document.createElement('label')
  label.textContent = labelText

  const input = document.createElement('input')
  input.type = type
  input.className = className
  if (placeholder)
   input.placeholder = placeholder

  field.appendChild(label)
  field.appendChild(input)
  return field
 }

 addSubtaskField(subtasksList) {
  const subtaskField =
   document.createElement('div')
  subtaskField.className = 'subtask-field'

  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'subtask-input'
  input.placeholder = 'Enter subtask'

  const removeBtn =
   document.createElement('button')
  removeBtn.className = 'remove-subtask-btn'
  removeBtn.textContent = '✕'
  removeBtn.onclick = () =>
   subtaskField.remove()

  subtaskField.appendChild(input)
  subtaskField.appendChild(removeBtn)
  subtasksList.appendChild(subtaskField)
 }

 saveTaskFromForm(form) {
  const task = {
   id: Date.now().toString(),
   name: form.querySelector('.task-name').value,
   category: form.querySelector(
    '.task-category'
   ).value,
   dueDate:
    form.querySelector('.task-due').value,
   estimatedDuration: parseInt(
    form.querySelector('.task-duration').value
   ),
   priority: form.querySelector(
    '.task-priority'
   ).value,
   location: form.querySelector(
    '.task-location'
   ).value
    ? {
       name: form.querySelector(
        '.task-location'
       ).value,
      }
    : null,
   subtasks: Array.from(
    form.querySelectorAll('.subtask-input')
   )
    .map((input) => ({
     id: Date.now() + Math.random(),
     title: input.value,
     status: 'Pending',
    }))
    .filter(
     (subtask) => subtask.title.trim() !== ''
    ),
   status: 'Pending',
   createdAt: new Date().toISOString(),
   timeEntries: [],
   completionRate: 0,
  }

  this.taskManager.tasks.push(task)
  this.saveTaskData()
  this.showTasksList()
  this.addMessage(
   '✅ Task saved successfully!',
   'System'
  )
 }

 showTasksList() {
  const tasksContainer =
   document.createElement('div')
  tasksContainer.className =
   'tasks-list-container'

  const header = document.createElement('div')
  header.className = 'tasks-list-header'
  header.innerHTML = '<h3>📋 Your Tasks</h3>'

  const backButton =
   document.createElement('button')
  backButton.className = 'back-to-form-btn'
  backButton.textContent = '+ New Task'
  backButton.onclick = () => {
   tasksContainer.remove()
   this.messagesArea.appendChild(
    this.createTaskManagementForm()
   )
  }
  header.appendChild(backButton)

  tasksContainer.appendChild(header)

  // Tasks by status
  const statusGroups = {
   Pending: [],
   InProgress: [],
   Completed: [],
  }

  this.taskManager.tasks.forEach((task) => {
   statusGroups[task.status || 'Pending'].push(
    task
   )
  })

  Object.entries(statusGroups).forEach(
   ([status, tasks]) => {
    if (tasks.length > 0) {
     const statusSection =
      document.createElement('div')
     statusSection.className =
      'tasks-status-section'
     statusSection.innerHTML = `<h4>${status} Tasks</h4>`

     tasks.forEach((task) => {
      const taskCard =
       document.createElement('div')
      taskCard.className = `task-card ${task.priority}-priority`

      taskCard.innerHTML = `
                        <div class="task-card-header">
                            <h5>${
                             task.name
                            }</h5>
                            <span class="task-category">${
                             task.category
                            }</span>
                        </div>
                        <div class="task-card-details">
                            <p>📅 Due: ${new Date(
                             task.dueDate
                            ).toLocaleString()}</p>
                            <p>⏱️ Duration: ${
                             task.estimatedDuration
                            } minutes</p>
                            ${
                             task.location
                              ? `<p>📍 Location: ${task.location.name}</p>`
                              : ''
                            }
                        </div>
                        ${
                         task.subtasks.length >
                         0
                          ? `
                            <div class="task-subtasks">
                                <p>Subtasks:</p>
                                <ul>
                                    ${task.subtasks
                                     .map(
                                      (st) => `
                                        <li>
                                            <input type="checkbox" 
                                                   ${
                                                    st.status ===
                                                    'Completed'
                                                     ? 'checked'
                                                     : ''
                                                   } 
                                                   onchange="window.chatInterface.updateSubtaskStatus('${
                                                    task.id
                                                   }', '${
                                       st.id
                                      }', this.checked)">
                                            ${
                                             st.title
                                            }
                                        </li>
                                    `
                                     )
                                     .join('')}
                                </ul>
                            </div>
                        `
                          : ''
                        }
                    `

      const actionButtons =
       document.createElement('div')
      actionButtons.className =
       'task-card-actions'

      if (status === 'Pending') {
       const startButton =
        document.createElement('button')
       startButton.textContent = 'Start Task'
       startButton.onclick = () =>
        this.startTaskTimer(task.id)
       actionButtons.appendChild(startButton)
      } else if (status === 'InProgress') {
       const completeButton =
        document.createElement('button')
       completeButton.textContent = 'Complete'
       completeButton.onclick = () =>
        this.completeTask(task.id)
       actionButtons.appendChild(completeButton)
      }

      const deleteButton =
       document.createElement('button')
      deleteButton.textContent = 'Delete'
      deleteButton.className = 'delete-task-btn'
      deleteButton.onclick = () =>
       this.deleteTask(task.id)
      actionButtons.appendChild(deleteButton)

      taskCard.appendChild(actionButtons)
      statusSection.appendChild(taskCard)
     })

     tasksContainer.appendChild(statusSection)
    }
   }
  )

  // Remove existing task form or list if present
  const existingForm =
   this.messagesArea.querySelector(
    '.task-form-container'
   )
  if (existingForm) existingForm.remove()
  const existingList =
   this.messagesArea.querySelector(
    '.tasks-list-container'
   )
  if (existingList) existingList.remove()

  this.messagesArea.appendChild(tasksContainer)
  this.messagesArea.scrollTop =
   this.messagesArea.scrollHeight
 }

 // Add CSS styles for the new task management interface
 addTaskManagementStyles() {
  const style = document.createElement('style')
  style.setAttribute('data-task-styles', '')
  style.textContent = `
            .task-form-container, .tasks-list-container {
                background: white;
                border-radius: 8px;
                padding: 20px;
                margin: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .task-form-header, .tasks-list-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #7d5fff;
            }

            .form-field {
                margin-bottom: 15px;
            }

            .form-field label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #444;
            }

            .form-field input, .form-field select {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }

            .subtasks-list {
                margin: 10px 0;
            }

            .subtask-field {
                display: flex;
                gap: 10px;
                margin-bottom: 5px;
            }

            .remove-subtask-btn {
                background: #ff4a4a;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 0 8px;
                cursor: pointer;
            }

            .form-buttons {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }

            .save-task-btn, .view-tasks-btn, .back-to-form-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            }

            .save-task-btn {
                background: #7d5fff;
                color: white;
            }

            .view-tasks-btn {
                background: #5f9fff;
                color: white;
            }

            .back-to-form-btn {
                background: #5fd4ff;
                color: white;
            }

            .task-card {
                background: white;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
                border-left: 4px solid;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .task-card.high-priority { border-left-color: #ff4a4a; }
            .task-card.medium-priority { border-left-color: #ffa64a; }
            .task-card.low-priority { border-left-color: #4aff4a; }

            .task-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .task-category {
                background: #7d5fff;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
            }

            .task-card-details {
                font-size: 14px;
                color: #666;
            }

            .task-subtasks {
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #eee;
            }

            .task-card-actions {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }

            .task-card-actions button {
                padding: 5px 10px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }

            .delete-task-btn {
                background: #ff4a4a;
                color: white;
            }

            .tasks-status-section {
                margin-bottom: 20px;
            }

            .tasks-status-section h4 {
                margin-bottom: 10px;
                color: #444;
                border-bottom: 1px solid #eee;
                padding-bottom: 5px;
            }
        `
  document.head.appendChild(style)
 }

 updateSubtaskStatus(
  taskId,
  subtaskId,
  completed
 ) {
  const task = this.taskManager.tasks.find(
   (t) => t.id === taskId
  )
  if (task) {
   const subtask = task.subtasks.find(
    (st) => st.id === subtaskId
   )
   if (subtask) {
    subtask.status = completed
     ? 'Completed'
     : 'Pending'

    // Update task completion rate
    const completedSubtasks =
     task.subtasks.filter(
      (st) => st.status === 'Completed'
     ).length
    task.completionRate =
     (completedSubtasks /
      task.subtasks.length) *
     100

    // Auto-complete task if all subtasks are completed
    if (
     completedSubtasks === task.subtasks.length
    ) {
     this.completeTask(taskId)
    }

    this.saveTaskData()
    this.showTasksList() // Refresh the view
   }
  }
 }

 completeTask(taskId) {
  const task = this.taskManager.tasks.find(
   (t) => t.id === taskId
  )
  if (task) {
   // Stop timer if it's running
   if (task.startTime) {
    this.stopTaskTimer(taskId)
   }

   task.status = 'Completed'
   task.completedAt = new Date().toISOString()

   // Generate performance report
   const report =
    this.generatePerformanceReport(taskId)

   this.saveTaskData()
   this.showTasksList()

   // Show completion message with performance insights
   let message = `✅ Task "${task.name}" completed!`
   if (report) {
    message += `\n\nPerformance Summary:\n`
    message += `⏱️ Time spent: ${report.timeStats.actual} minutes\n`
    message += `📊 Efficiency rate: ${Math.round(
     report.timeStats.efficiency
    )}%\n`

    if (report.suggestions.length > 0) {
     message += '\nSuggestions for next time:\n'
     report.suggestions.forEach(
      (suggestion) => {
       message += `• ${suggestion}\n`
      }
     )
    }
   }

   this.addMessage(message, 'System')

   // Update daily statistics
   const today = new Date()
    .toISOString()
    .split('T')[0]
   this.taskManager.taskStats.dailyStats =
    this.taskManager.taskStats.dailyStats || {}
   this.taskManager.taskStats.dailyStats[
    today
   ] = this.taskManager.taskStats.dailyStats[
    today
   ] || {
    totalTasks: 0,
    completedTasks: 0,
    timeSpentByCategory: {},
    productivityScore: 0,
   }
   this.taskManager.taskStats.dailyStats[today]
    .completedTasks++
   this.saveTaskData()
  }
 }

 deleteTask(taskId) {
  if (
   confirm(
    'Are you sure you want to delete this task?'
   )
  ) {
   const taskIndex =
    this.taskManager.tasks.findIndex(
     (t) => t.id === taskId
    )
   if (taskIndex !== -1) {
    const task =
     this.taskManager.tasks[taskIndex]

    // Remove task from array
    this.taskManager.tasks.splice(taskIndex, 1)

    // Update statistics
    const today = new Date()
     .toISOString()
     .split('T')[0]
    if (
     this.taskManager.taskStats.dailyStats &&
     this.taskManager.taskStats.dailyStats[
      today
     ]
    ) {
     const stats =
      this.taskManager.taskStats.dailyStats[
       today
      ]

     // Decrement total tasks
     if (stats.totalTasks > 0)
      stats.totalTasks--

     // Decrement completed tasks if the task was completed
     if (
      task.status === 'Completed' &&
      stats.completedTasks > 0
     ) {
      stats.completedTasks--
     }

     // Remove time spent in category if any
     if (
      task.category &&
      stats.timeSpentByCategory[task.category]
     ) {
      const timeSpent = task.timeEntries.reduce(
       (total, entry) =>
        total + (entry.duration || 0),
       0
      )
      stats.timeSpentByCategory[
       task.category
      ] -= timeSpent
      if (
       stats.timeSpentByCategory[
        task.category
       ] <= 0
      ) {
       delete stats.timeSpentByCategory[
        task.category
       ]
      }
     }
    }

    this.saveTaskData()
    this.showTasksList()
    this.addMessage(
     `🗑️ Task "${task.name}" has been deleted.`,
     'System'
    )
   }
  }
 }

 // Add method to save all task-related data
 saveTaskData() {
  localStorage.setItem(
   'tagme_tasks',
   JSON.stringify(this.taskManager.tasks)
  )
  localStorage.setItem(
   'tagme_categories',
   JSON.stringify(this.taskManager.categories)
  )
  localStorage.setItem(
   'tagme_preferences',
   JSON.stringify(
    this.taskManager.userPreferences
   )
  )
  localStorage.setItem(
   'tagme_stats',
   JSON.stringify(this.taskManager.taskStats)
  )
 }

 // Add this method to create the menu
 createMainMenu() {
  const menuItems = [
   {
    icon: '📋',
    text: 'Tasks',
    action: () => this.showTasksList(),
   },
   {
    icon: '📅',
    text: 'Schedule',
    action: () => this.showDailySchedule(),
   },
   {
    icon: '🔔',
    text: 'Reminders',
    action: () => this.showReminders(),
   },
   {
    icon: '📊',
    text: 'Reports',
    action: () => this.showReports(),
   },
  ]

  const menuContainer =
   document.createElement('div')
  menuContainer.className =
   'main-menu-container'

  const menuHeader =
   document.createElement('div')
  menuHeader.className = 'menu-header'
  menuHeader.innerHTML = '<h3>📋 Menu</h3>'

  const menuContent =
   document.createElement('div')
  menuContent.className = 'menu-content'

  menuItems.forEach((item) => {
   const button =
    document.createElement('button')
   button.className = 'menu-button'
   button.innerHTML = `<span class="menu-icon">${item.icon}</span>${item.text}`
   button.onclick = item.action
   menuContent.appendChild(button)
  })

  menuContainer.appendChild(menuHeader)
  menuContainer.appendChild(menuContent)

  // Add styles for the menu
  const menuStyles = `
            .main-menu-container {
                background: white;
                border-radius: 8px;
                padding: 15px;
                margin: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .menu-header {
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid #7d5fff;
            }

            .menu-header h3 {
                margin: 0;
                color: #333;
                font-size: 1.2em;
            }

            .menu-content {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .menu-button {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px;
                border: none;
                border-radius: 6px;
                background: #f8f9fa;
                color: #333;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: left;
                font-size: 1em;
            }

            .menu-button:hover {
                background: #7d5fff;
                color: white;
            }

            .menu-icon {
                font-size: 1.2em;
                min-width: 24px;
            }
        `

  const style = document.createElement('style')
  style.textContent = menuStyles
  document.head.appendChild(style)

  return menuContainer
 }

 // Add method to show task form
 showTaskForm() {
  // Add the styles if not already added
  if (
   !document.querySelector(
    'style[data-task-styles]'
   )
  ) {
   this.addTaskManagementStyles()
  }

  const formContainer =
   this.createTaskManagementForm()

  // Remove existing form or list if present
  const existingForm =
   this.messagesArea.querySelector(
    '.task-form-container'
   )
  if (existingForm) existingForm.remove()
  const existingList =
   this.messagesArea.querySelector(
    '.tasks-list-container'
   )
  if (existingList) existingList.remove()

  this.messagesArea.appendChild(formContainer)
  this.messagesArea.scrollTop =
   this.messagesArea.scrollHeight
 }

 // Add method to show daily schedule
 showDailySchedule() {
  const scheduleContainer =
   document.createElement('div')
  scheduleContainer.className =
   'schedule-container'

  const today = new Date()
   .toISOString()
   .split('T')[0]
  const todaysTasks =
   this.taskManager.tasks.filter(
    (task) =>
     task.dueDate &&
     task.dueDate.startsWith(today)
   )

  if (todaysTasks.length === 0) {
   scheduleContainer.innerHTML = `
                <div class="schedule-header">
                    <h3>📅 Today's Schedule</h3>
                </div>
                <p>No tasks scheduled for today.</p>
                <button class="add-task-btn" onclick="window.chatInterface.showTaskForm()">Add New Task</button>
            `
  } else {
   // Sort tasks by due time
   todaysTasks.sort(
    (a, b) =>
     new Date(a.dueDate) - new Date(b.dueDate)
   )

   scheduleContainer.innerHTML = `
                <div class="schedule-header">
                    <h3>📅 Today's Schedule</h3>
                </div>
                <div class="schedule-list">
                    ${todaysTasks
                     .map(
                      (task) => `
                        <div class="schedule-item ${
                         task.priority
                        }-priority">
                            <div class="schedule-time">${new Date(
                             task.dueDate
                            ).toLocaleTimeString(
                             [],
                             {
                              hour: '2-digit',
                              minute: '2-digit',
                             }
                            )}</div>
                            <div class="schedule-details">
                                <h4>${
                                 task.name
                                }</h4>
                                <span class="task-category">${
                                 task.category
                                }</span>
                                <p>⏱️ ${
                                 task.estimatedDuration
                                } minutes</p>
                                ${
                                 task.location
                                  ? `<p>📍 ${task.location.name}</p>`
                                  : ''
                                }
                            </div>
                        </div>
                    `
                     )
                     .join('')}
                </div>
            `
  }

  // Remove existing containers
  const existingContainers =
   this.messagesArea.querySelectorAll(
    '.task-form-container, .tasks-list-container, .schedule-container'
   )
  existingContainers.forEach((container) =>
   container.remove()
  )

  this.messagesArea.appendChild(
   scheduleContainer
  )
  this.messagesArea.scrollTop =
   this.messagesArea.scrollHeight
 }

 // Add method to show reminders
 showReminders() {
  const reminderContainer =
   document.createElement('div')
  reminderContainer.className =
   'reminder-container'

  reminderContainer.innerHTML = `
            <div class="reminder-header">
                <h3>⏰ Reminders</h3>
            </div>
            <div class="reminder-options">
                <button onclick="window.chatInterface.setTaskReminder()">Set Task Reminder</button>
                <button onclick="window.chatInterface.createNewReminder()">Create New Reminder</button>
                <button onclick="window.chatInterface.viewAllReminders()">View All Reminders</button>
            </div>
        `

  // Remove existing containers
  const existingContainers =
   this.messagesArea.querySelectorAll(
    '.task-form-container, .tasks-list-container, .schedule-container, .reminder-container'
   )
  existingContainers.forEach((container) =>
   container.remove()
  )

  this.messagesArea.appendChild(
   reminderContainer
  )
  this.messagesArea.scrollTop =
   this.messagesArea.scrollHeight
 }

 // Add method to show reports
 showReports() {
  const reportsContainer =
   document.createElement('div')
  reportsContainer.className =
   'reports-container'

  const today = new Date()
   .toISOString()
   .split('T')[0]
  const stats = this.taskManager.taskStats
   .dailyStats?.[today] || {
   totalTasks: 0,
   completedTasks: 0,
   timeSpentByCategory: {},
   productivityScore: 0,
  }

  reportsContainer.innerHTML = `
            <div class="reports-header">
                <h3>📊 Performance Reports</h3>
            </div>
            <div class="reports-content">
                <div class="daily-summary">
                    <h4>Today's Summary</h4>
                    <p>Tasks Completed: ${
                     stats.completedTasks
                    }/${stats.totalTasks}</p>
                    <p>Productivity Score: ${Math.round(
                     stats.productivityScore
                    )}%</p>
                    
                    <h4>Time Spent by Category</h4>
                    <div class="category-stats">
                        ${
                         Object.entries(
                          stats.timeSpentByCategory
                         )
                          .map(
                           ([
                            category,
                            minutes,
                           ]) => `
                            <div class="category-stat">
                                <span class="category-name">${category}</span>
                                <span class="category-time">${Math.round(
                                 minutes
                                )} minutes</span>
                            </div>
                        `
                          )
                          .join('') ||
                         '<p>No time tracked today</p>'
                        }
                    </div>
                </div>
            </div>
        `

  // Remove existing containers
  const existingContainers =
   this.messagesArea.querySelectorAll(
    '.task-form-container, .tasks-list-container, .schedule-container, .reminder-container, .reports-container'
   )
  existingContainers.forEach((container) =>
   container.remove()
  )

  this.messagesArea.appendChild(
   reportsContainer
  )
  this.messagesArea.scrollTop =
   this.messagesArea.scrollHeight
 }

 // Add additional styles for new components
 addTaskManagementStyles() {
  const existingStyles = document.querySelector(
   'style[data-task-styles]'
  )
  if (existingStyles) {
   existingStyles.remove()
  }

  const style = document.createElement('style')
  style.setAttribute('data-task-styles', '')
  style.textContent = `
            ${this.getBaseStyles()}
            ${this.getMenuStyles()}
            ${this.getScheduleStyles()}
            ${this.getReminderStyles()}
            ${this.getReportStyles()}
            ${this.getScriptStyles()}
        `
  document.head.appendChild(style)
 }

 getBaseStyles() {
  return `
            .main-menu-container {
                background: white;
                border-radius: 8px;
                padding: 20px;
                margin: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .menu-header {
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #7d5fff;
            }

            .menu-button {
                display: block;
                width: 100%;
                padding: 12px;
                margin-bottom: 10px;
                border: none;
                border-radius: 4px;
                background: #f0f0f0;
                color: #333;
                font-size: 14px;
                cursor: pointer;
                transition: background 0.3s;
            }

            .menu-button:hover {
                background: #7d5fff;
                color: white;
            }
        `
 }

 getMenuStyles() {
  return `
            .menu-container {
                position: fixed;
                top: 0;
                right: 0;
                width: 300px;
                height: 100%;
                background: white;
                box-shadow: -2px 0 4px rgba(0,0,0,0.1);
                z-index: 1000;
                transform: translateX(100%);
                transition: transform 0.3s;
            }

            .menu-container.open {
                transform: translateX(0);
            }
        `
 }

 getScheduleStyles() {
  return `
            .schedule-container {
                background: white;
                border-radius: 8px;
                padding: 20px;
                margin: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .schedule-header {
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #7d5fff;
            }

            .schedule-item {
                display: flex;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 8px;
                background: #f8f9fa;
                border-left: 4px solid;
            }

            .schedule-time {
                font-size: 18px;
                font-weight: bold;
                margin-right: 15px;
                color: #7d5fff;
            }

            .schedule-details {
                flex: 1;
            }
        `
 }

 getReminderStyles() {
  return `
            .reminder-container {
                background: white;
                border-radius: 8px;
                padding: 20px;
                margin: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .reminder-header {
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #7d5fff;
            }

            .reminder-options {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .reminder-options button {
                padding: 12px;
                border: none;
                border-radius: 4px;
                background: #7d5fff;
                color: white;
                cursor: pointer;
                transition: background 0.3s;
            }

            .reminder-options button:hover {
                background: #6a4ddb;
            }
        `
 }

 getReportStyles() {
  return `
            .reports-container {
                background: white;
                border-radius: 8px;
                padding: 20px;
                margin: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .reports-header {
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #7d5fff;
            }

            .daily-summary {
                margin-bottom: 20px;
            }

            .category-stats {
                margin-top: 10px;
            }

            .category-stat {
                display: flex;
                justify-content: space-between;
                padding: 8px;
                background: #f8f9fa;
                border-radius: 4px;
                margin-bottom: 5px;
            }

            .category-name {
                font-weight: bold;
                color: #7d5fff;
            }

            .category-time {
                color: #666;
            }
        `
 }

 getScriptStyles() {
  return `
            .scripts-container {
                background: #1a1a1a;
                border-radius: 8px;
                padding: 20px;
                margin: 10px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                color: #ffffff;
            }

            .scripts-header {
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #7d5fff;
            }

            .scripts-header h3 {
                color: #ffffff;
                margin: 0;
            }

            .scripts-header p {
                color: #cccccc;
                margin-top: 5px;
            }

            .scripts-actions {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }

            .scripts-actions button {
                flex: 1;
                padding: 12px;
                border: none;
                border-radius: 4px;
                background: #2d2d2d;
                color: #ffffff;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: 500;
            }

            .scripts-actions button:hover {
                background: #7d5fff;
                transform: translateY(-2px);
            }

            .scripts-help {
                background: #2d2d2d;
                padding: 15px;
                border-radius: 4px;
                margin-top: 20px;
            }

            .scripts-help h4 {
                color: #ffffff;
                margin-top: 0;
                margin-bottom: 10px;
            }

            .scripts-help ul {
                margin: 0;
                padding-left: 20px;
                list-style-type: none;
            }

            .scripts-help li {
                margin-bottom: 8px;
                color: #cccccc;
                position: relative;
                padding-left: 15px;
            }

            .scripts-help li:before {
                content: "•";
                position: absolute;
                left: 0;
                color: #7d5fff;
            }

            .scripts-examples {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid #3d3d3d;
            }
        `
 }

 initializeChatInterface() {
  // Create chat container
  this.chatContainer =
   document.createElement('div')
  this.chatContainer.className =
   'chat-container'

  // Create chat button if it doesn't exist
  if (!document.querySelector('.chat-button')) {
   const chatButton =
    document.createElement('button')
   chatButton.className = 'chat-button'
   chatButton.innerHTML = '💬'
   chatButton.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: #7d5fff;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 999;
                display: none;
                align-items: center;
                justify-content: center;
            `
   chatButton.onclick = () => this.openChat()
   document.body.appendChild(chatButton)

   // Show chat button when chat is closed
   this.chatButton = chatButton
  }

  // Create menu button
  const menuButton =
   document.createElement('button')
  menuButton.className = 'menu-button'
  menuButton.innerHTML = '☰'
  menuButton.onclick = () =>
   this.toggleMainMenu()
  this.chatContainer.appendChild(menuButton)

  // Create messages area
  this.messagesArea =
   document.createElement('div')
  this.messagesArea.className = 'messages-area'
  this.chatContainer.appendChild(
   this.messagesArea
  )

  // Create input area
  this.inputArea = document.createElement('div')
  this.inputArea.className = 'input-area'

  // ... rest of the existing initialization code ...
 }

 toggleMainMenu() {
  // Remove any existing menu
  const existingMenu =
   this.messagesArea.querySelector(
    '.main-menu-container'
   )
  if (existingMenu) {
   existingMenu.remove()
   return
  }

  // Create and show the main menu
  const menuContainer = this.createMainMenu()

  // Remove any existing containers
  const existingContainers =
   this.messagesArea.querySelectorAll(
    '.task-form-container, .tasks-list-container, .schedule-container, .reminder-container, .reports-container, .scripts-container'
   )
  existingContainers.forEach((container) =>
   container.remove()
  )

  this.messagesArea.appendChild(menuContainer)
  this.messagesArea.scrollTop =
   this.messagesArea.scrollHeight
 }

 // Add these styles to the existing styles
 addStyles() {
  const style = document.createElement('style')
  style.textContent = `
            /* Existing styles ... */

            .menu-button {
                position: absolute;
                top: 10px;
                right: 10px;
                width: 40px;
                height: 40px;
                border: none;
                border-radius: 50%;
                background: #7d5fff;
                color: white;
                font-size: 20px;
                cursor: pointer;
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.3s;
            }

            .menu-button:hover {
                background: #6a4ddb;
            }

            /* Make sure the messages area accommodates the menu button */
            .messages-area {
                padding-top: 60px;
            }
        `
  document.head.appendChild(style)
 }

 handleScriptRequest(command) {
  if (!this.scriptManager) {
   this.scriptManager = {
    scripts: JSON.parse(
     localStorage.getItem('tagme_scripts') ||
      '[]'
    ),
    saveScripts: function () {
     localStorage.setItem(
      'tagme_scripts',
      JSON.stringify(this.scripts)
     )
    },
   }
  }

  const generateMatch = command.match(
   /^generate script:\s*(.+)/i
  )
  const listMatch = command.match(
   /^list scripts/i
  )
  const runMatch = command.match(
   /^run script:\s*(\d+)/i
  )
  const deleteMatch = command.match(
   /^delete script:\s*(\d+)/i
  )

  const channelId =
   this.currentChannel?.id || 'default'
  const channelScripts = JSON.parse(
   localStorage.getItem(
    `channel_${channelId}_scripts`
   ) || '[]'
  )

  if (generateMatch) {
   const prompt = generateMatch[1]
   this.generateScriptWithGemini(prompt)
   return
  }

  if (listMatch) {
   if (channelScripts.length === 0) {
    this.addMessage(
     "No scripts installed in this channel. Generate one using 'generate script: description'",
     'System'
    )
   } else {
    const scriptList = channelScripts
     .map(
      (script) =>
       `📜 ${script.name} (ID: ${script.id})\n\`\`\`javascript\n${script.code}\n\`\`\``
     )
     .join('\n\n')
    this.addMessage(
     `Installed Scripts in Current Channel:\n\n${scriptList}`,
     'System'
    )
   }
   return
  }

  if (runMatch) {
   const scriptId = runMatch[1]
   const script = channelScripts.find(
    (s) => s.id === scriptId
   )
   if (script) {
    try {
     eval(script.code)
     this.addMessage(
      `Script "${script.name}" executed successfully!`,
      'System'
     )
    } catch (error) {
     this.addMessage(
      `Error executing script: ${error.message}`,
      'System'
     )
    }
   } else {
    this.addMessage(
     `Script with ID ${scriptId} not found in this channel.`,
     'System'
    )
   }
   return
  }

  if (deleteMatch) {
   const scriptId = deleteMatch[1]
   const scriptIndex = channelScripts.findIndex(
    (s) => s.id === scriptId
   )
   if (scriptIndex !== -1) {
    channelScripts.splice(scriptIndex, 1)
    localStorage.setItem(
     `channel_${channelId}_scripts`,
     JSON.stringify(channelScripts)
    )
    this.addMessage(
     `Script deleted successfully from the channel!`,
     'System'
    )
   } else {
    this.addMessage(
     `Script with ID ${scriptId} not found in this channel.`,
     'System'
    )
   }
   return
  }

  this.addMessage(
   'Available commands:\n- generate script: description\n- list scripts\n- run script: ID\n- delete script: ID',
   'System'
  )
 }

 async generateScriptWithGemini(prompt) {
  try {
   this.addMessage(
    `Generating script for: "${prompt}"...`,
    'System'
   )

   // Create a basic script template based on the prompt
   const defaultScript = {
    id: Date.now().toString(),
    name:
     prompt.slice(0, 30) +
     (prompt.length > 30 ? '...' : ''),
    code:
     `// Generated script for: ${prompt}\n` +
     `function run${prompt.replace(
      /[^a-zA-Z0-9]/g,
      ''
     )}() {\n` +
     `    // Create container for the script\n` +
     `    const container = document.createElement('div');\n` +
     `    container.className = 'script-container';\n` +
     `    container.style.cssText = 'padding: 15px; background: #f5f5f5; border-radius: 8px; margin: 10px 0;';\n\n` +
     `    // Add title\n` +
     `    const title = document.createElement('h3');\n` +
     `    title.textContent = '${prompt}';\n` +
     `    container.appendChild(title);\n\n` +
     `    // Add content area\n` +
     `    const content = document.createElement('div');\n` +
     `    content.className = 'script-content';\n` +
     `    container.appendChild(content);\n\n` +
     `    // Add the container to the messages area\n` +
     `    const messagesArea = document.querySelector('.messages-area');\n` +
     `    if (messagesArea) {\n` +
     `        messagesArea.appendChild(container);\n` +
     `        messagesArea.scrollTop = messagesArea.scrollHeight;\n` +
     `    }\n` +
     `}\n\n` +
     `// Execute the script\n` +
     `run${prompt.replace(
      /[^a-zA-Z0-9]/g,
      ''
     )}();`,
    createdAt: new Date().toISOString(),
   }

   try {
    // Try to send the request through the chat interface
    const response = await fetch('/api/chat', {
     method: 'POST',
     headers: {
      'Content-Type': 'application/json',
     },
     body: JSON.stringify({
      message: `Generate a JavaScript script for: ${prompt}. The script should be self-contained and ready to run in the chat environment.`,
      type: 'script_generation',
      channelId:
       this.currentChannel?.id || 'default',
     }),
    })

    if (!response.ok) {
     throw new Error(
      `HTTP error! status: ${response.status}`
     )
    }

    const data = await response.json()

    if (data && data.content) {
     // Update the script code with the AI-generated content
     defaultScript.code = data.content.trim()
    }
   } catch (error) {
    console.warn(
     'Failed to get AI-generated script, using default template:',
     error
    )
    // Continue with the default script
   }

   // Save to channel scripts
   const channelId =
    this.currentChannel?.id || 'default'
   const channelScripts = JSON.parse(
    localStorage.getItem(
     `channel_${channelId}_scripts`
    ) || '[]'
   )
   channelScripts.push(defaultScript)
   localStorage.setItem(
    `channel_${channelId}_scripts`,
    JSON.stringify(channelScripts)
   )

   this.addMessage(
    `✨ Script generated and installed in channel!\n\n📜 Name: ${defaultScript.name}\n🔑 ID: ${defaultScript.id}\n\n💻 Generated Code:\n\`\`\`javascript\n${defaultScript.code}\n\`\`\`\n\nCommands:\n- Run: \`run script: ${defaultScript.id}\`\n- Delete: \`delete script: ${defaultScript.id}\``,
    'System'
   )

   // Try to run the script immediately
   try {
    eval(defaultScript.code)
   } catch (error) {
    console.error(
     'Error running script:',
     error
    )
    this.addMessage(
     `⚠️ Note: The script was saved but encountered an error when running: ${error.message}`,
     'System'
    )
   }
  } catch (error) {
   this.addMessage(
    `❌ Error handling script generation: ${error.message}`,
    'System'
   )
   console.error(
    'Script generation error:',
    error
   )
  }
 }

 initializeGemini() {
  // Check for API key in localStorage first
  this.apiKey = localStorage.getItem(
   'gemini_api_key'
  )

  if (!this.apiKey) {
   // Prompt user for API key
   const apiKey = prompt(
    'Please enter your Gemini API key to enable script generation:'
   )
   if (apiKey) {
    this.apiKey = apiKey
    localStorage.setItem(
     'gemini_api_key',
     apiKey
    )
   }
  }
 }

 showScriptsManager() {
  const messagesArea =
   this.chatContainer.querySelector(
    '.messages-area'
   )
  const existingContainer =
   messagesArea.querySelector(
    '.scripts-container'
   )
  if (existingContainer) {
   existingContainer.remove()
  }

  const scriptsContainer =
   document.createElement('div')
  scriptsContainer.className =
   'scripts-container'

  // Header
  const header = document.createElement('div')
  header.className = 'scripts-header'
  header.innerHTML = `
            <h3>Scripts Manager</h3>
            <p>Create interactive scripts powered by Gemini AI</p>
        `
  scriptsContainer.appendChild(header)

  // Actions
  const actions = document.createElement('div')
  actions.className = 'scripts-actions'

  const generateButton =
   document.createElement('button')
  generateButton.textContent =
   '✨ Generate with AI'
  generateButton.onclick = () => {
   const scriptPrompt = window.prompt(
    'Describe the script you want to create:'
   )
   if (scriptPrompt) {
    this.handleScriptRequest(
     `generate script: ${scriptPrompt}`
    )
   }
  }

  const listButton =
   document.createElement('button')
  listButton.textContent =
   '📋 Installed Scripts'
  listButton.onclick = () => {
   this.handleScriptRequest('list scripts')
  }

  actions.appendChild(generateButton)
  actions.appendChild(listButton)
  scriptsContainer.appendChild(actions)

  // Help section
  const help = document.createElement('div')
  help.className = 'scripts-help'
  help.innerHTML = `
            <h4>Available Commands</h4>
            <ul>
                <li>generate script: description - Create a new script using AI</li>
                <li>list scripts - Show installed scripts</li>
                <li>run script: ID - Execute a script</li>
                <li>delete script: ID - Remove script</li>
            </ul>
            <div class="scripts-examples">
                <h4>Example Prompts</h4>
                <ul>
                    <li>Create a poll system for voting</li>
                    <li>Make a simple quiz game</li>
                    <li>Create a countdown timer</li>
                </ul>
            </div>
        `
  scriptsContainer.appendChild(help)

  // Add styles
  const styles = document.createElement('style')
  styles.textContent = this.getScriptStyles()
  document.head.appendChild(styles)

  messagesArea.appendChild(scriptsContainer)
  messagesArea.scrollTop =
   messagesArea.scrollHeight
 }

 getScriptStyles() {
  return `
            .scripts-container {
                background: #1a1a1a;
                border-radius: 8px;
                padding: 20px;
                margin: 10px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                color: #ffffff;
            }

            .scripts-header {
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #7d5fff;
            }

            .scripts-header h3 {
                color: #ffffff;
                margin: 0;
            }

            .scripts-header p {
                color: #cccccc;
                margin-top: 5px;
            }

            .scripts-actions {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }

            .scripts-actions button {
                flex: 1;
                padding: 12px;
                border: none;
                border-radius: 4px;
                background: #2d2d2d;
                color: #ffffff;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: 500;
            }

            .scripts-actions button:hover {
                background: #7d5fff;
                transform: translateY(-2px);
            }

            .scripts-help {
                background: #2d2d2d;
                padding: 15px;
                border-radius: 4px;
                margin-top: 20px;
            }

            .scripts-help h4 {
                color: #ffffff;
                margin-top: 0;
                margin-bottom: 10px;
            }

            .scripts-help ul {
                margin: 0;
                padding-left: 20px;
                list-style-type: none;
            }

            .scripts-help li {
                margin-bottom: 8px;
                color: #cccccc;
                position: relative;
                padding-left: 15px;
            }

            .scripts-help li:before {
                content: "•";
                position: absolute;
                left: 0;
                color: #7d5fff;
            }

            .scripts-examples {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid #3d3d3d;
            }
        `
 }

 addStyles() {
  if (!document.getElementById('chat-styles')) {
   const styles =
    document.createElement('style')
   styles.id = 'chat-styles'
   styles.textContent = `
                .chat-container {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 400px;
                    max-height: 600px;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .chat-header {
                    display: flex;
                    align-items: center;
                    padding: 10px 15px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #eee;
                }

                .chat-header .menu-button {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 5px;
                    margin-right: 10px;
                }

                .chat-header .chat-title {
                    flex-grow: 1;
                    font-weight: bold;
                }

                .chat-header .header-actions {
                    display: flex;
                    gap: 10px;
                }

                .chat-header .history-button {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 5px;
                }

                .main-menu-container {
                    position: absolute;
                    top: 50px;
                    left: 10px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    z-index: 1000;
                    min-width: 200px;
                }

                .menu-content {
                    padding: 8px;
                }

                .menu-content .menu-button {
                    display: block;
                    width: 100%;
                    padding: 8px 12px;
                    margin: 4px 0;
                    border: none;
                    border-radius: 4px;
                    background: none;
                    text-align: left;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .menu-content .menu-button:hover {
                    background-color: #f0f0f0;
                }

                .messages-area {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    padding: 16px;
                    overflow-y: auto;
                    flex: 1;
                }

                .message {
                    align-self: flex-start;
                    background: #f1f1f1;
                    color: #222;
                    border-radius: 16px 16px 16px 4px;
                    margin-right: 40px;
                    margin-left: 0;
                    text-align: left;
                    max-width: 75%;
                    padding: 10px 14px 6px 14px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
                    position: relative;
                }

                /* User messages (right side) */
                .user-message {
                    align-self: flex-end;
                    background: #7d5fff;
                    color: #fff;
                    border-radius: 16px 16px 4px 16px;
                    margin-left: 40px;
                    margin-right: 0;
                    text-align: right;
                }

                .message-sender {
                    font-weight: bold;
                    font-size: 13px;
                    margin-bottom: 2px;
                }
                .user-message .message-sender {
                    color: #fff;
                }
                .message-time {
                    font-size: 11px;
                    color: #888;
                    margin-top: 4px;
                    text-align: right;
                }
                .user-message .message-time {
                    color: #e0e0ff;
                }

                .dark-mode .chat-container {
                    background: #2d2d2d;
                    color: #fff;
                }

                .dark-mode .chat-header {
                    background: #1a1a1a;
                    border-bottom-color: #333;
                }

                .dark-mode .menu-button,
                .dark-mode .history-button {
                    color: #fff;
                }

                .dark-mode .main-menu-container {
                    background: #2d2d2d;
                    border: 1px solid #333;
                }

                .dark-mode .menu-content .menu-button {
                    color: #fff;
                }

                .dark-mode .menu-content .menu-button:hover {
                    background-color: #3d3d3d;
                }
            `
   document.head.appendChild(styles)
  }
 }

 async updateChannelMetadata(
  channel,
  metadata
 ) {
  try {
   const response = await fetch(
    '/channel-info',
    {
     method: 'POST',
     headers: {
      'Content-Type': 'application/json',
     },
     body: JSON.stringify({
      channel,
      metadata,
     }),
    }
   )

   if (!response.ok) {
    throw new Error(
     'Failed to update channel metadata'
    )
   }

   return await response.json()
  } catch (error) {
   console.error(
    'Error updating channel metadata:',
    error
   )
   throw error
  }
 }

 async getChannelMetadata(channel) {
  try {
   const response = await fetch(
    `/channel-info?channel=${encodeURIComponent(
     channel
    )}`
   )
   if (!response.ok) {
    throw new Error(
     'Failed to fetch channel metadata'
    )
   }
   return await response.json()
  } catch (error) {
   console.error(
    'Error fetching channel metadata:',
    error
   )
   throw error
  }
 }

 // Add this to the createHeader method
 createHeader() {
  const header = document.createElement('div')
  header.className = 'chat-header'

  // Add conversations list button on left
  const listButton =
   document.createElement('button')
  listButton.className = 'chat-list-btn'
  listButton.innerHTML = '⛬'
  listButton.onclick = () =>
   this.toggleChatList()
  header.appendChild(listButton)

  // Add centered title with channel name
  const titleContainer =
   document.createElement('div')
  titleContainer.className = 'title-container'

  const title = document.createElement('h3')
  title.textContent = 'Chat'
  titleContainer.appendChild(title)

  // Always show the actual channel name
  const channelName =
   document.createElement('span')
  channelName.className = 'channel-name'
  // Use the home symbol for the default channel
  const displayChannel =
   this.currentChannel === 'default'
    ? this.HOME_CHANNEL
    : this.currentChannel
  channelName.textContent = ` #${displayChannel}`
  titleContainer.appendChild(channelName)

  header.appendChild(titleContainer)

  // Add buttons container for right side
  const headerButtons =
   document.createElement('div')
  headerButtons.className = 'header-buttons'

  // Add menu button
  const menuButton =
   document.createElement('button')
  menuButton.className = 'chat-menu-btn'
  menuButton.innerHTML = '☰'
  menuButton.onclick = () => this.toggleMenu()
  headerButtons.appendChild(menuButton)

  // Add close button
  const closeButton =
   document.createElement('button')
  closeButton.className = 'chat-close-btn'
  closeButton.innerHTML = '✖'
  closeButton.onclick = () => this.closeChat()
  headerButtons.appendChild(closeButton)

  header.appendChild(headerButtons)

  return header
 }

 async showChannelEditDialog() {
  try {
   const channel =
    this.currentChannel || 'default'
   let metadata = await this.getChannelMetadata(
    channel
   )

   if (!metadata) {
    metadata = {
     description: '',
     purpose: '',
     tags: [],
    }
   }

   // Create overlay
   const overlay = document.createElement('div')
   overlay.className = 'chat-overlay'

   // Create dialog
   const dialog = document.createElement('div')
   dialog.className = 'channel-edit-dialog'
   dialog.innerHTML = `
                <h3>Edit Channel Information</h3>
                <div class="form-group">
                    <label>Description:</label>
                    <textarea id="channel-description" placeholder="Channel description...">${
                     metadata.description || ''
                    }</textarea>
                </div>
                <div class="form-group">
                    <label>Purpose:</label>
                    <input type="text" id="channel-purpose" value="${
                     metadata.purpose || ''
                    }" placeholder="Channel purpose...">
                </div>
                <div class="form-group">
                    <label>Tags (comma-separated):</label>
                    <input type="text" id="channel-tags" value="${(
                     metadata.tags || []
                    ).join(
                     ', '
                    )}" placeholder="general, discussion, etc...">
                </div>
                <div class="dialog-buttons">
                    <button class="save-btn">Save</button>
                    <button class="cancel-btn">Cancel</button>
                </div>
            `

   overlay.appendChild(dialog)
   document.body.appendChild(overlay)

   // Handle save
   const saveBtn =
    dialog.querySelector('.save-btn')
   saveBtn.onclick = async () => {
    try {
     const updatedMetadata = {
      description: dialog
       .querySelector('#channel-description')
       .value.trim(),
      purpose: dialog
       .querySelector('#channel-purpose')
       .value.trim(),
      tags: dialog
       .querySelector('#channel-tags')
       .value.split(',')
       .map((tag) => tag.trim())
       .filter((tag) => tag),
      created:
       metadata.created ||
       new Date().toISOString(),
     }

     await this.updateChannelMetadata(
      channel,
      updatedMetadata
     )
     document.body.removeChild(overlay)
    } catch (error) {
     console.error(
      'Failed to update channel metadata:',
      error
     )
     alert(
      'Failed to update channel information. Please try again.'
     )
    }
   }

   // Handle cancel
   const cancelBtn = dialog.querySelector(
    '.cancel-btn'
   )
   cancelBtn.onclick = () => {
    document.body.removeChild(overlay)
   }

   // Handle click outside
   overlay.onclick = (e) => {
    if (e.target === overlay) {
     document.body.removeChild(overlay)
    }
   }
  } catch (error) {
   console.error(
    'Error showing channel edit dialog:',
    error
   )
   alert(
    'Failed to load channel information. Please try again.'
   )
  }
 }

 // Add these methods if they don't exist
 async getChannelMetadata(channel) {
  try {
   const response = await fetch(
    `/channel-info?channel=${encodeURIComponent(
     channel
    )}`
   )
   if (!response.ok) {
    throw new Error(
     'Failed to fetch channel metadata'
    )
   }
   return await response.json()
  } catch (error) {
   console.error(
    'Error fetching channel metadata:',
    error
   )
   return null
  }
 }

 async updateChannelMetadata(
  channel,
  metadata
 ) {
  try {
   const response = await fetch(
    '/channel-info',
    {
     method: 'POST',
     headers: {
      'Content-Type': 'application/json',
     },
     body: JSON.stringify({
      channel,
      metadata,
     }),
    }
   )

   if (!response.ok) {
    throw new Error(
     'Failed to update channel metadata'
    )
   }

   return await response.json()
  } catch (error) {
   console.error(
    'Error updating channel metadata:',
    error
   )
   throw error
  }
 }

 // Add the styles if they don't exist
 addStyles() {
  // ... existing styles ...

  const channelEditStyles = `
            .chat-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }
            
            .channel-edit-dialog {
                background: var(--color-bg-medium);
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                width: 400px;
                max-width: 90vw;
            }
            
            .channel-edit-dialog h3 {
                margin-top: 0;
                margin-bottom: 20px;
                color: var(--color-text-primary);
            }
            
            .form-group {
                margin-bottom: 15px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 5px;
                color: var(--color-text-primary);
            }
            
            .form-group input,
            .form-group textarea {
                width: 100%;
                padding: 8px;
                border: 1px solid var(--color-border-dark);
                border-radius: 4px;
                background: var(--color-bg-light);
                color: var(--color-text-primary);
            }
            
            .form-group textarea {
                height: 100px;
                resize: vertical;
            }
            
            .dialog-buttons {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }
            
            .dialog-buttons button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            }
            
            .dialog-buttons .save-btn {
                background: var(--color-bg-accent);
                color: white;
            }
            
            .dialog-buttons .cancel-btn {
                background: var(--color-bg-secondary);
                color: var(--color-text-primary);
            }
            
            .edit-channel-btn {
                background: transparent !important;
                border: none !important;
                font-size: 16px !important;
                cursor: pointer !important;
                padding: 8px !important;
                border-radius: 4px !important;
                color: var(--color-text-primary) !important;
                margin-right: 5px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            
            .edit-channel-btn:hover {
                background: var(--color-bg-secondary) !important;
            }
        `

  this.addStylesToHead(channelEditStyles)
 }
}

document.addEventListener(
 'DOMContentLoaded',
 function () {
  // Remove the chat container from the DOM on page load if it exists
  const chatContainer = document.getElementById(
   'chat-container'
  )
  if (chatContainer) {
   chatContainer.remove()
  }

  // Initialize the chat interface
  window.chatInterface = new ChatInterface()

  // Check URL for channel parameter
  const urlParams = new URLSearchParams(
   window.location.search
  )
  const channelParam = urlParams.get('channel')
  if (channelParam) {
   console.log(
    `Found channel in URL: ${channelParam}`
   )
   // Open chat with the specified channel
   setTimeout(() => {
    window.chatInterface.openChat({
     channel: channelParam,
    })
   }, 500)
  }

  // Add chat button to navigation area
  const fullscreenButton =
   document.querySelector('.fullscreen-icon')
  if (fullscreenButton) {
   const chatButton =
    document.createElement('button')
   chatButton.textContent = '🗨️'
   chatButton.className = 'btn-chat-global'
   chatButton.onclick = () => {
    // Check current page URL for channel context
    const urlParams = new URLSearchParams(
     window.location.search
    )
    const channelParam =
     urlParams.get('channel') || 'default'
    console.log(
     `Global chat button clicked, using channel: ${channelParam}`
    )
    window.chatInterface.openChat({
     channel: channelParam,
    })
   }
   fullscreenButton.parentNode.insertBefore(
    chatButton,
    fullscreenButton
   )
  }

  // Find direct send button in the navigation area
  const directSendBtn = document.getElementById(
   'directSendBtn'
  )
  if (directSendBtn) {
   directSendBtn.addEventListener(
    'click',
    function () {
     if (
      window.chatInterface.isRecordingDirect
     ) {
      window.chatInterface.stopRecordingDirect()
     } else {
      window.chatInterface.startRecordingDirect()
     }
    }
   )
  }
 }
)
