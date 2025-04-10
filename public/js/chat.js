class ChatInterface {
 constructor() {
  this.chatContainer = document.getElementById(
   'chat-container'
  )
  if (!this.chatContainer) {
   console.error(
    'Chat container element not found in the DOM.'
   )
   return
  }

  this.currentChannel = null
  this.chatHistory =
   JSON.parse(
    localStorage.getItem('chatHistory')
   ) || []
  this.chatURL = '/chat' // Default chat API URL
  this.menuVisible = false // Track menu visibility
  this.chatListVisible = false // Track chat list visibility
 }

 openChat(context = {}) {
  const { channel, messageId, message } =
   context

  this.currentChannel = channel || 'default'

  // Show the chat container
  this.chatContainer.style.display = 'block'
  this.chatContainer.innerHTML = '' // Clear previous content

  // Add header with menu and list
  const header = this.createHeader(channel)
  this.chatContainer.appendChild(header)

  // Add chat messages area
  const messagesArea =
   this.createMessagesArea(message)
  this.chatContainer.appendChild(messagesArea)

  // Add input area
  const inputArea =
   this.createInputArea(messageId)
  this.chatContainer.appendChild(inputArea)
 }

 createHeader(channel) {
  const header = document.createElement('div')
  header.className = 'chat-header'

  // List icon
  const listButton =
   document.createElement('button')
  listButton.textContent = '📋'
  listButton.className = 'chat-list-button'
  listButton.onclick = () =>
   this.toggleChatList()
  header.appendChild(listButton)

  // Chat title
  const title = document.createElement('span')
  title.textContent = channel
   ? `Chat with Channel: #${channel}`
   : 'New Chat'
  header.appendChild(title)

  // Menu button
  const menuButton =
   document.createElement('button')
  menuButton.textContent = '☰'
  menuButton.className = 'chat-menu-button'
  menuButton.onclick = () => this.toggleMenu()
  header.appendChild(menuButton)

  return header
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

   const setChatURL =
    document.createElement('button')
   setChatURL.textContent = 'Set Chat URL'
   setChatURL.onclick = () => {
    const newURL = prompt(
     'Enter new chat URL:',
     this.chatURL
    )
    if (newURL) {
     this.chatURL = newURL
     alert(
      `Chat URL updated to: ${this.chatURL}`
     )
    }
   }
   menu.appendChild(setChatURL)

   const resetChatURL =
    document.createElement('button')
   resetChatURL.textContent =
    'Reset to Tag Me In chatbot'
   resetChatURL.onclick = () => {
    this.chatURL = '/chat'
    alert('Chat URL reset to default: /chat')
   }
   menu.appendChild(resetChatURL)

   const deleteChat =
    document.createElement('button')
   deleteChat.textContent = 'Delete Chat'
   deleteChat.onclick = () => {
    this.chatHistory = []
    localStorage.removeItem('chatHistory')
    this.chatContainer.querySelector(
     '.chat-messages'
    ).innerHTML = ''
    alert('Chat history deleted.')
   }
   menu.appendChild(deleteChat)

   this.chatContainer.appendChild(menu)
   this.menuVisible = true
  }
 }

 toggleChatList() {
  let chatList =
   this.chatContainer.querySelector(
    '.chat-list'
   )
  if (chatList) {
   chatList.remove()
   this.chatListVisible = false
  } else {
   chatList = document.createElement('div')
   chatList.className = 'chat-list'

   this.chatHistory.forEach((chat, index) => {
    const chatItem =
     document.createElement('div')
    chatItem.className = 'chat-list-item'
    chatItem.textContent = `Chat ${index + 1}: ${chat}`
    chatList.appendChild(chatItem)
   })

   this.chatContainer.appendChild(chatList)
   this.chatListVisible = true
  }
 }

 createMessagesArea(message) {
  const messagesArea =
   document.createElement('div')
  messagesArea.className = 'chat-messages'

  if (message) {
   const contextMessage =
    document.createElement('div')
   contextMessage.className = 'chat-context'
   contextMessage.textContent = `Context: ${message}`
   messagesArea.appendChild(contextMessage)
  }

  this.chatHistory.forEach((chat) => {
   const messageElement =
    document.createElement('div')
   messageElement.className = 'chat-message'
   messageElement.textContent = chat
   messagesArea.appendChild(messageElement)
  })

  return messagesArea
 }

 createInputArea(messageId) {
  const inputArea =
   document.createElement('div')
  inputArea.className = 'chat-input-area'

  const input = document.createElement('input')
  input.type = 'text'
  input.placeholder = 'Type your message...'
  input.className = 'chat-input'
  inputArea.appendChild(input)

  const sendButton =
   document.createElement('button')
  sendButton.textContent = 'Send'
  sendButton.className = 'chat-send-button'
  sendButton.onclick = async () => {
   const userMessage = input.value.trim()
   if (userMessage) {
    this.addMessage(userMessage, 'You')
    const response = await this.sendMessage({
     channel: this.currentChannel,
     messageId,
     message: userMessage,
    })
    this.addMessage(response.reply, 'AI')
    this.displaySuggestedContent(
     response.suggestedContent
    )
    input.value = ''
   }
  }
  inputArea.appendChild(sendButton)

  return inputArea
 }

 addMessage(message, sender) {
  const messagesArea =
   this.chatContainer.querySelector(
    '.chat-messages'
   )
  const messageElement =
   document.createElement('div')
  messageElement.className = `chat-message ${sender.toLowerCase()}`
  messageElement.textContent = `${sender}: ${message}`
  messagesArea.appendChild(messageElement)

  // Save to history
  this.chatHistory.push(`${sender}: ${message}`)
  localStorage.setItem(
   'chatHistory',
   JSON.stringify(this.chatHistory)
  )
 }

 async sendMessage(context) {
  const response = await fetch(this.chatURL, {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json',
   },
   body: JSON.stringify(context),
  })
  return response.json()
 }

 displaySuggestedContent(suggestedContent) {
  if (
   !suggestedContent ||
   suggestedContent.length === 0
  ) {
   return
  }

  const messagesArea =
   this.chatContainer.querySelector(
    '.chat-messages'
   )

  const suggestionsHeader =
   document.createElement('div')
  suggestionsHeader.className =
   'suggestions-header'
  suggestionsHeader.textContent =
   'Suggested Replies:'
  messagesArea.appendChild(suggestionsHeader)

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
   }
   messagesArea.appendChild(suggestionElement)
  })
 }
}

document.addEventListener(
 'DOMContentLoaded',
 () => {
  window.chatInterface = new ChatInterface()

  // Add a global 🗨️ button to open the chatbot
  const fullscreenButton =
   document.querySelector('.fullscreen-icon')
  if (fullscreenButton) {
   const chatButton =
    document.createElement('button')
   chatButton.textContent = '🗨️'
   chatButton.className = 'btn-chat-global'
   chatButton.onclick = () => {
    window.chatInterface.openChat({
     channel: 'default',
    })
   }
   fullscreenButton.parentNode.insertBefore(
    chatButton,
    fullscreenButton
   )
  }
 }
)
