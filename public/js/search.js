// Message search toolbar functionality
//
// IMPORTANT: This file must not create DOM nodes at load time because
// `elem` / `icon` are defined in components.js (loaded later), and the
// `mainContent` element is created in main.js.

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
   newsItem.style.display = ''
   return
  }

  const text = newsItem.textContent.toLowerCase()
  const matches = currentSearchTerms.every((term) =>
   text.includes(term)
  )
  newsItem.style.display = matches ? '' : 'none'
 })
}

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

const clearSearch = () => {
 searchInput.value = ''
 currentSearchTerms = []
 filterMessages()
}

const element = elem({
 classes: ['search-toolbar', 'mode-main'],
 children: [
  elem({
   tagName: 'span',
   textContent: 'Search:',
  }),
  elem({
   classes: ['grow'],
   children: [searchInput],
  }),
  elem({
   classes: ['clear-btn'],
   textContent: 'Clear',
   events: {
    click() {
     clearSearch()
    },
   },
   tagName: 'button',
  }),
 ],
})

return {
 clearSearch,
 element,
 filterMessages,
 searchInputFocused,
}
}

window.initSearchToolbar = initSearchToolbar
