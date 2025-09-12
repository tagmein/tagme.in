const workbenchContainer =
 document.createElement('div')
workbenchContainer.classList.add(
 'workbench-container'
)
document.body.appendChild(workbenchContainer)

// Storage keys for workbench settings
const GEMINI_API_KEY_STORAGE =
 'workbench:gemini-api-key'
const WORKBENCH_OPERATION_STORAGE =
 'workbench:operation'

function createWorkbenchControls() {
 const controlsContainer =
  document.createElement('div')
 controlsContainer.classList.add(
  'workbench-controls'
 )

 // API Key input
 const apiKeyContainer =
  document.createElement('div')
 apiKeyContainer.classList.add(
  'workbench-field'
 )

 const apiKeyLabel =
  document.createElement('label')
 apiKeyLabel.textContent = 'Gemini API Key:'
 apiKeyLabel.setAttribute(
  'for',
  'workbench-api-key'
 )

 const apiKeyInput =
  document.createElement('input')
 apiKeyInput.type = 'password'
 apiKeyInput.id = 'workbench-api-key'
 apiKeyInput.placeholder =
  'Enter your Gemini API key...'
 apiKeyInput.classList.add('workbench-input')

 // Load saved API key
 const savedApiKey = localStorage.getItem(
  GEMINI_API_KEY_STORAGE
 )
 if (savedApiKey) {
  apiKeyInput.value = savedApiKey
 }

 // Save API key on change
 apiKeyInput.addEventListener('input', () => {
  localStorage.setItem(
   GEMINI_API_KEY_STORAGE,
   apiKeyInput.value
  )
 })

 apiKeyContainer.appendChild(apiKeyLabel)
 apiKeyContainer.appendChild(apiKeyInput)

 // Operation selector
 const operationContainer =
  document.createElement('div')
 operationContainer.classList.add(
  'workbench-field'
 )

 const operationLabel =
  document.createElement('label')
 operationLabel.textContent = 'Operation:'
 operationLabel.setAttribute(
  'for',
  'workbench-operation'
 )

 const operationSelect =
  document.createElement('select')
 operationSelect.id = 'workbench-operation'
 operationSelect.classList.add(
  'workbench-select'
 )

 const operations = [
  {
   value: 'synthesize',
   label:
    'Synthesize - Find common themes and insights',
  },
  {
   value: 'contrast',
   label:
    'Contrast - Identify differences and opposing views',
  },
  {
   value: 'subtract',
   label:
    'Subtract - Find gaps and redundancies',
  },
  {
   value: 'add',
   label:
    'Add - Suggest extensions and enhancements',
  },
 ]

 operations.forEach((op) => {
  const option =
   document.createElement('option')
  option.value = op.value
  option.textContent = op.label
  operationSelect.appendChild(option)
 })

 // Load saved operation
 const savedOperation = localStorage.getItem(
  WORKBENCH_OPERATION_STORAGE
 )
 if (savedOperation) {
  operationSelect.value = savedOperation
 }

 // Save operation on change
 operationSelect.addEventListener(
  'change',
  () => {
   localStorage.setItem(
    WORKBENCH_OPERATION_STORAGE,
    operationSelect.value
   )
  }
 )

 operationContainer.appendChild(operationLabel)
 operationContainer.appendChild(operationSelect)

 // Generate button
 const generateButton =
  document.createElement('button')
 generateButton.textContent =
  'Generate Analysis'
 generateButton.classList.add(
  'workbench-generate-btn'
 )
 generateButton.addEventListener(
  'click',
  () => {
   generateAnalysis(
    apiKeyInput.value,
    operationSelect.value
   )
  }
 )

 controlsContainer.appendChild(apiKeyContainer)
 controlsContainer.appendChild(
  operationContainer
 )
 controlsContainer.appendChild(generateButton)

 return controlsContainer
}

function createWorkbenchMessages(
 workbenchMessages
) {
 const messagesContainer =
  document.createElement('div')
 messagesContainer.classList.add(
  'workbench-messages'
 )

 const messagesHeader =
  document.createElement('h3')
 messagesHeader.textContent = `Workbench Messages (${workbenchMessages.length})`
 messagesContainer.appendChild(messagesHeader)

 if (workbenchMessages.length === 0) {
  const emptyMessage =
   document.createElement('p')
  emptyMessage.textContent =
   'No messages in workbench. Add messages using "add to workbench" links in the discussion.'
  emptyMessage.classList.add('workbench-empty')
  messagesContainer.appendChild(emptyMessage)
  return messagesContainer
 }

 for (const message of workbenchMessages) {
  const messageElement =
   document.createElement('div')
  messageElement.classList.add(
   'workbench-message'
  )

  // Message text
  const messageText =
   document.createElement('div')
  messageText.classList.add(
   'workbench-message-text'
  )
  messageText.textContent = message.text

  // Message metadata
  const messageMetadata =
   document.createElement('div')
  messageMetadata.classList.add(
   'workbench-message-metadata'
  )

  const timestamp = new Date(
   message.data.timestamp
  ).toLocaleString()
  const velocity = message.data.velocity
  const replies = message.data.replies.count

  messageMetadata.textContent = `${timestamp} • Velocity: ${velocity} • Replies: ${replies}`

  // Remove button
  const removeButton =
   document.createElement('button')
  removeButton.textContent = '×'
  removeButton.classList.add(
   'workbench-remove-btn'
  )
  removeButton.title = 'Remove from workbench'
  removeButton.addEventListener('click', () => {
   removeFromWorkbench(message)
  })

  messageElement.appendChild(messageText)
  messageElement.appendChild(messageMetadata)
  messageElement.appendChild(removeButton)
  messagesContainer.appendChild(messageElement)
 }

 return messagesContainer
}

function createWorkbenchResults() {
 const resultsContainer =
  document.createElement('div')
 resultsContainer.classList.add(
  'workbench-results'
 )
 resultsContainer.id = 'workbench-results'
 return resultsContainer
}

async function generateAnalysis(
 apiKey,
 operation
) {
 if (!apiKey.trim()) {
  alert('Please enter your Gemini API key')
  return
 }

 // Get workbench messages
 const workbenchEntries = Object.entries(
  sessionStorage
 )
  .filter(([key]) =>
   key.startsWith('workbench:')
  )
  .map(([key, value]) => JSON.parse(value))

 if (workbenchEntries.length === 0) {
  alert('No messages in workbench to analyze')
  return
 }

 const generateButton = document.querySelector(
  '.workbench-generate-btn'
 )
 const resultsContainer =
  document.getElementById('workbench-results')

 // Show loading state
 generateButton.textContent = 'Generating...'
 generateButton.disabled = true

 resultsContainer.innerHTML =
  '<div class="workbench-loading">Analyzing messages with Gemini AI...</div>'

 try {
  const response = await fetch('/generate', {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json',
   },
   body: JSON.stringify({
    apiKey,
    operation,
    messages: workbenchEntries,
   }),
  })

  const result = await response.json()

  if (result.success) {
   displayAnalysisResult(result)
  } else {
   throw new Error(
    result.error || 'Unknown error occurred'
   )
  }
 } catch (error) {
  console.error('Analysis error:', error)
  resultsContainer.innerHTML = `
   <div class="workbench-error">
    <h4>Error generating analysis:</h4>
    <p>${error.message}</p>
   </div>
  `
 } finally {
  generateButton.textContent =
   'Generate Analysis'
  generateButton.disabled = false
 }
}

function displayAnalysisResult(result) {
 const resultsContainer =
  document.getElementById('workbench-results')

 resultsContainer.innerHTML = `
  <div class="workbench-result">
   <div class="workbench-result-header">
    <h3>Analysis Result</h3>
    <div class="workbench-result-meta">
     Operation: ${
      result.operation
     } • Messages: ${result.messageCount}
    </div>
   </div>
   <div class="workbench-result-content">
    ${result.result
     .split('\n')
     .map((line) => `<p>${line}</p>`)
     .join('')}
   </div>
   <div class="workbench-result-actions">
    <button onclick="copyAnalysisToClipboard()" class="workbench-copy-btn">Copy to Clipboard</button>
    <button onclick="sendAnalysisToChannel()" class="workbench-send-btn">Send to Channel</button>
   </div>
  </div>
 `

 // Store the result for copying/sending
 window.lastAnalysisResult = result.result
}

function copyAnalysisToClipboard() {
 if (window.lastAnalysisResult) {
  navigator.clipboard
   .writeText(window.lastAnalysisResult)
   .then(() => {
    const copyBtn = document.querySelector(
     '.workbench-copy-btn'
    )
    const originalText = copyBtn.textContent
    copyBtn.textContent = '✓ Copied!'
    setTimeout(() => {
     copyBtn.textContent = originalText
    }, 2000)
   })
   .catch((err) => {
    console.error('Failed to copy: ', err)
    alert('Failed to copy to clipboard')
   })
 }
}

function sendAnalysisToChannel() {
 if (window.lastAnalysisResult) {
  // Get the current channel from URL
  const { messageChannel } = getUrlData()

  // Fill the compose textarea with the analysis
  composeTextarea.value =
   window.lastAnalysisResult
  composeTextarea.focus()

  // Switch to discussion tab if we're on workbench
  const discussionTab = document.querySelector(
   '[data-tab="discussion"]'
  )
  if (discussionTab) {
   discussionTab.click()
  }
 }
}

function removeFromWorkbench(message) {
 // Find the workbench key for this message
 const workbenchEntries = Object.entries(
  sessionStorage
 ).filter(([key]) =>
  key.startsWith('workbench:')
 )

 for (const [key, value] of workbenchEntries) {
  const storedMessage = JSON.parse(value)
  if (
   storedMessage.text === message.text &&
   storedMessage.data.timestamp ===
    message.data.timestamp
  ) {
   sessionStorage.removeItem(key)
   break
  }
 }

 // Re-render workbench
 const updatedMessages = Object.entries(
  sessionStorage
 )
  .filter(([key]) =>
   key.startsWith('workbench:')
  )
  .map(([key, value]) => JSON.parse(value))

 renderWorkbench(updatedMessages)
}

function renderWorkbench(workbenchMessages) {
 workbenchContainer.innerHTML = ''

 // Create workbench header
 const header = document.createElement('div')
 header.classList.add('workbench-header')
 header.innerHTML =
  '<h2>AI Workbench</h2><p>Analyze your saved messages with Gemini AI</p>'

 // Create controls
 const controls = createWorkbenchControls()

 // Create messages section
 const messages = createWorkbenchMessages(
  workbenchMessages
 )

 // Create results section
 const results = createWorkbenchResults()

 workbenchContainer.appendChild(header)
 workbenchContainer.appendChild(controls)
 workbenchContainer.appendChild(messages)
 workbenchContainer.appendChild(results)
}
