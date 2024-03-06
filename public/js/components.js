function tabStrip() {
 const element = elem({
  classes: ['tab-strip'],
 })
 const tabsContainer = elem({
  classes: ['tabs-container'],
 })
 element.appendChild(tabsContainer)

 const tabs = []

 function add(label, contentHandler) {
  const tab = elem({
   classes: ['tab'],
   textContent: label,
   events: {
    click: () => {
     switchTo(tab)
     contentHandler.switchTo()
    },
   },
  })
  tabsContainer.appendChild(tab)
  tabs.push({ tab, contentHandler })

  if (tabs.length === 1) {
   switchTo(tab)
   contentHandler.switchTo()
  }

  return {
   switchTo: () => switchTo(tab),
   remove: () => remove(tab),
  }
 }

 function switchTo(tab) {
  tabs.forEach(({ tab: t }) =>
   t.classList.remove('active')
  )
  tab.classList.add('active')
 }

 function remove(tab) {
  const index = tabs.findIndex(
   ({ tab: t }) => t === tab
  )
  if (index !== -1) {
   const { contentHandler } = tabs[index]
   tabs.splice(index, 1)
   tab.remove()
   contentHandler.remove()

   if (tab.classList.contains('active')) {
    const newIndex =
     index === tabs.length ? index - 1 : index
    if (newIndex >= 0) {
     const {
      tab: newTab,
      contentHandler: newContentHandler,
     } = tabs[newIndex]
     switchTo(newTab)
     newContentHandler.switchTo()
    }
   }
  }
 }

 return {
  add,
  element,
 }
}

function tabContents() {
 const element = elem({
  classes: ['tab-contents'],
 })

 let currentContent = null
 const cachedContents = new Map()

 function add(callback) {
  let content = null

  function switchTo() {
   if (
    content !== null &&
    currentContent === content
   ) {
    return
   }

   if (!content) {
    content = elem()
    callback(content)
    cachedContents.set(switchTo, content)
   }

   if (currentContent) {
    element.removeChild(currentContent)
   }

   element.appendChild(content)
   currentContent = content
  }

  function remove() {
   if (content) {
    cachedContents.delete(switchTo)
    if (currentContent === content) {
     element.removeChild(content)
     currentContent = null
    }
    content = null
   }
  }

  return {
   switchTo,
   remove,
  }
 }

 return {
  element,
  add,
 }
}
