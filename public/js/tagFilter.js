// Tag filter functionality
function createTagFilterBar() {
 const filterContainer = elem({
  classes: ['tag-filter-container'],
  children: [
   elem({
    tagName: 'span',
    textContent: 'Filter by tags:',
   }),
   elem({
    classes: ['tag-filter-buttons'],
    children: [
     elem({
      classes: ['tag-filter-btn'],
      textContent: '+tmi:feedback',
      events: {
       click() {
        toggleTagFilter('tmi:feedback', this)
       }
      },
      tagName: 'button',
     }),
     elem({
      classes: ['tag-filter-btn'],
      textContent: '+abundance',
      events: {
       click() {
        toggleTagFilter('abundance', this)
       }
      },
      tagName: 'button',
     }),
    ],
   }),
  ],
 })

 return filterContainer
}

function toggleTagFilter(tag, button) {
 const newsItems = mainContent.querySelectorAll('.news')
 const isActive = button.classList.contains('active')
 
 newsItems.forEach((newsItem) => {
  const itemTags = newsItem.dataset.tags || ''
  const hasTag = itemTags.includes(tag)
  
  if (isActive) {
   // Remove filter
   button.classList.remove('active')
   if (itemTags === '') {
    newsItem.style.display = '' // Show items with no tags
   }
  } else {
   // Apply filter
   button.classList.add('active')
   newsItem.style.display = hasTag ? '' : 'none'
  }
 })
}

// Make functions globally available
window.createTagFilterBar = createTagFilterBar
