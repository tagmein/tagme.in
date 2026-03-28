// Message search functionality
function initSearchToolbar({ mainContent }) {
 if (!mainContent) {
  throw new Error('initSearchToolbar: mainContent is required')
 }

let currentSearchTerms = []
let searchInputFocused = false

const filterMessages = () => {
 const newsItems = mainContent.querySelectorAll('.news')
 newsItems.forEach((newsItem) => {
  if (currentSearchTerms.length === 0) {
   // If no search terms, show all messages (restore to default)
   newsItem.style.display = ''
   return
  }

  // Only search within messages that are currently visible (not hidden by tag filters)
  const isVisible = newsItem.style.display !== 'none'
  if (!isVisible) {
   return // Skip messages already hidden by tag filters
  }

  const text = newsItem.textContent.toLowerCase()
  const matches = currentSearchTerms.every((term) =>
   text.includes(term)
  )
  newsItem.style.display = matches ? '' : 'none'
 })
}

const searchInput = document.createElement('input')
searchInput.type = 'text'
searchInput.placeholder = 'Search messages...'
searchInput.maxLength = 100
searchInput.addEventListener('blur', () => {
 searchInputFocused = false
})
searchInput.addEventListener('focus', () => {
 searchInputFocused = true
})
searchInput.addEventListener('input', () => {
 const value = searchInput.value.trim().toLowerCase()
 currentSearchTerms = value ? value.split(/\s+/) : []
 filterMessages()
})

const clearSearch = () => {
 searchInput.value = ''
 currentSearchTerms = []
 filterMessages()
}

// Create search toolbar element
const element = document.createElement('div')
element.className = 'search-toolbar mode-main'

// Create search label
const searchLabel = document.createElement('span')
searchLabel.textContent = 'Search:'

// Create search icon (hidden)
const searchIcon = document.createElement('span')
searchIcon.className = 'search-icon'
searchIcon.textContent = '🔍'

// Create clear button
const clearBtn = document.createElement('button')
clearBtn.className = 'clear-btn'
clearBtn.textContent = 'Clear'
clearBtn.addEventListener('click', () => {
 clearSearch()
})

// Assemble the toolbar
element.appendChild(searchLabel)
element.appendChild(searchIcon)
element.appendChild(searchInput)
element.appendChild(clearBtn)

return {
 clearSearch,
 element,
 filterMessages,
 searchInputFocused,
}
}

// Make function globally available
window.initSearchToolbar = initSearchToolbar
