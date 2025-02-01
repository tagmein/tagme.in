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

 async function switchTo(
  tabObject,
  switchTo = true
 ) {
  tabs.forEach(({ tab: t }) =>
   t.classList.remove('active')
  )
  tabObject.tab.classList.add('active')
  tabObject.contentHandler.switchTo()
  if (switchTo) {
   tabObject.switchToHandler?.()
  }
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
   await switchTo(
    matchingTab,
    typeof lastKnownMode !== 'string'
   )
  } else {
   await switchTo(
    tabs[0],
    typeof lastKnownMode !== 'string'
   )
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

const themeSelectorThemeListContainer = elem({
 classes: ['theme-selector-theme-list'],
 children: themeNames.map((themeName) =>
  elem({
   attributes: {
    'data-theme': themeName,
   },
   children: [
    document.createTextNode(themeName),
   ],
   events: {
    click() {
     setTheme(themeName)
    },
   },
   tagName: 'button',
  })
 ),
})

const themeSelectorOpacitySliderLabel = elem({
 classes: [
  'theme-selector-opacity-slider-label',
 ],
 tagName: 'label',
 textContent: 'Opacity',
})

const THEME_OPACITY_STORAGE_KEY =
 'theme-opacity'

const currentThemeOpacityString =
 localStorage.getItem(THEME_OPACITY_STORAGE_KEY)
const currentThemeOpacity =
 currentThemeOpacityString &&
 !isNaN(parseFloat(currentThemeOpacityString))
  ? parseFloat(currentThemeOpacityString)
  : 50

// themeFilter.style.opacity = (
//  currentThemeOpacity / 100
// ).toString(10)

const themeSelectorOpacitySliderInput = elem({
 attributes: {
  type: 'range',
  value: currentThemeOpacity,
 },
 classes: [
  'theme-selector-opacity-slider-input',
 ],
 events: {
  input() {
   localStorage.setItem(
    THEME_OPACITY_STORAGE_KEY,
    this.value
   )
   //  themeFilter.style.opacity = (
   //   this.value / 100
   //  ).toString(10)
  },
 },
 tagName: 'input',
})

const themeSelectorOpacitySlider = elem({
 classes: ['theme-selector-opacity-slider'],
 children: [
  themeSelectorOpacitySliderLabel,
  themeSelectorOpacitySliderInput,
 ],
})

const themeSelectorResetButton = elem({
 classes: ['theme-selector-reset-button'],
 events: {
  click() {
   localStorage.removeItem(
    THEME_OPACITY_STORAGE_KEY
   )
   themeSelectorOpacitySliderInput.value = 50
   setTheme('none')
  },
 },
 tagName: 'button',
 textContent: 'Reset to default',
})

const themeSelectorCloseButton = elem({
 dataset: {
  themeBg: true,
 },
 classes: ['theme-selector-close-button'],
 events: {
  click() {
   exitThemeSelector()
  },
 },
 tagName: 'button',
 textContent: 'Done',
})

const themeSelector = elem({
 classes: ['theme-selector'],
 children: [
  themeSelectorThemeListContainer,
  // themeSelectorOpacitySlider,
  themeSelectorResetButton,
  themeSelectorCloseButton,
 ],
})

function exitThemeSelector() {
 document.body.removeAttribute('data-mode')
 if (
  localStorage.getItem('mode--1') ===
  'theme-selector'
 ) {
  switchToMode('main')()
 } else {
  restoreLastKnownMode(-1)
 }
 restoreScrollPosition()
}

function enterThemeSelector() {
 captureScrollPosition()
 switchToMode('theme-selector')(false)
 setTimeout(() => {
  currentThemeButton = document.querySelector(
   `button[data-theme="${
    currentTheme ?? 'none'
   }"]`
  )
  currentThemeButton.scrollIntoView({
   behavior: 'smooth',
   block: 'center',
  })
  currentThemeButton.focus()
 }, 100)
}
