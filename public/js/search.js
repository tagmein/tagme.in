// Message search toolbar functionality
let currentSearchTerms = []
let searchInputFocused = false

const searchInput = elem({
 attributes: {
  placeholder: 'Search messages...',
  maxlength: 100,
 },
 events: {
  blur() {
   searchInputFocused = false
  },
  focus() {
   searchInputFocused = true
  },
  input() {
   const value = searchInput.value.trim().toLowerCase()
   currentSearchTerms = value ? value.split(/\s+/) : []
   filterMessages()
  },
 },
 tagName: 'input',
})

const searchToolbar = elem({
 classes: ['search-toolbar', 'mode-main'],
 children: [
  elem({
   classes: ['search-icon'],
   children: [icon('search')],
  }),
  searchInput,
  elem({
   classes: ['search-clear'],
   children: [icon('close')],
   events: {
    click() {
     searchInput.value = ''
     currentSearchTerms = []
     filterMessages()
    },
   },
   tagName: 'button',
  }),
 ],
})

function filterMessages() {
 const articles = mainContent.querySelectorAll('article')
 articles.forEach((article) => {
  if (currentSearchTerms.length === 0) {
   article.style.display = ''
   return
  }
  const text = article.textContent.toLowerCase()
  const matches = currentSearchTerms.every(term => text.includes(term))
  article.style.display = matches ? '' : 'none'
 })
}

// Clear search on navigation
function clearSearch() {
 searchInput.value = ''
 currentSearchTerms = []
}

// Expose searchToolbar for adding to DOM
window.searchToolbar = searchToolbar
window.clearSearch = clearSearch
