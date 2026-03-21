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
 const articles = mainContent.querySelectorAll('article')
 articles.forEach((article) => {
  if (currentSearchTerms.length === 0) {
   article.style.display = ''
   return
  }

  const text = article.textContent.toLowerCase()
  const matches = currentSearchTerms.every((term) =>
   text.includes(term)
  )
  article.style.display = matches ? '' : 'none'
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
   classes: ['search-icon'],
   children: [icon('search')],
  }),
  searchInput,
  elem({
   classes: ['search-clear'],
   children: [icon('close')],
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
