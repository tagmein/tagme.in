function tabStrip(currentTabKey, setTabKey) {
 const element = elem({
  classes: ['tab-strip'],
 })
 const tabsContainer = elem({
  classes: ['tabs-container'],
  children: [
   elem({
    classes: ['tab-spacer'],
   }),
  ],
 })
 element.appendChild(tabsContainer)

 const tabs = []

 function add(
  key,
  label,
  contentHandler,
  switchToHandler
 ) {
  const tab = elem({
   classes: ['tab'],
   textContent: label,
   events: {
    async click() {
     await switchTo(tabObject)
    },
   },
  })
  tabsContainer.appendChild(tab)
  const tabObject = {
   key,
   tab,
   contentHandler,
   switchToHandler,
  }
  tabs.push(tabObject)

  return {
   switchTo: () => switchTo(tabObject),
   remove: () => remove(tabObject),
  }
 }

 async function switchTo(tabObject) {
  tabs.forEach(({ tab: t }) =>
   t.classList.remove('active')
  )
  tabObject.tab.classList.add('active')
  tabObject.contentHandler.switchTo()
  tabObject.switchToHandler?.()
  if (currentTabKey !== tabObject.key) {
   await setTabKey(tabObject.key)
   currentTabKey = tabObject.key
  }
 }

 function remove(tabObject) {
  const index = tabs.findIndex(
   (t) => t === tabObject
  )
  if (index !== -1) {
   const { contentHandler } = tabs[index]
   tabs.splice(index, 1)
   tabObject.tab.remove()
   contentHandler.remove()

   if (
    tabObject.tab.classList.contains('active')
   ) {
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

 async function activate() {
  tabsContainer.appendChild(
   elem({
    classes: ['tab-spacer'],
   })
  )
  const matchingTab = tabs.find(
   (t) => t.key === currentTabKey
  )
  if (matchingTab) {
   await switchTo(matchingTab)
  } else {
   await switchTo(tabs[0])
  }
 }

 return {
  activate,
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

function icon(...names) {
 return elem({
  classes: [
   'icon',
   ...names.map((name) => `icon-${name}`),
  ],
  tagName: 'span',
 })
}

let channelInputFocused = false
let expandedElement = undefined
let focusOnMessage = undefined
let lastKnownChannelInput

const channelInput = elem({
 attributes: {
  'data-tour':
   'See recently-visited channels, and switch to any channel.',
  maxlength: 25,
  placeholder: 'Search channels',
 },
 events: {
  blur() {
   channelInputFocused = false
   autocompleteChannels.close()
   setChannel(channelInput.value.trim())
  },
  focus() {
   lastKnownChannelInput = channelInput.value
   channelInputFocused = true
   autocompleteChannels.open()
  },
  input() {
   autocompleteChannels.filter(
    channelInput.value.trim()
   )
  },
  keydown({ key }) {
   if (key === 'Enter') {
    channelInput.blur()
   }
  },
 },
 tagName: 'input',
})

function cancelChannelInput() {
 channelInput.value = lastKnownChannelInput
}

let lastKnownActivityFilterInput
let activityFilterInputFocused = false

function cancelActivityFilterInput() {
 activityFilterInput.value =
  lastKnownActivityFilterInput
}

const loadingIndicator = elem({
 attributes: {
  inditerminate: 'true',
 },
 classes: ['loader'],
 tagName: 'progress',
})

let loaderCount = 0

async function withLoading(promise) {
 loaderCount++
 loadingIndicator.style.opacity = '1'
 try {
  const data = await promise
  return data
 } catch (e) {
  await politeAlert(
   e.message ?? e ?? 'Unknown error'
  )
  return false
 } finally {
  loaderCount--
  if (loaderCount === 0) {
   loadingIndicator.style.opacity = '0'
  }
 }
}
