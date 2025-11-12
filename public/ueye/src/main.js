const theme = document.createElement('style')
theme.textContent = `
.ueye--container {
  background-color: #808080f0;
  height: 100%;
  left: 0;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 999999;
}

.ueye--item--gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
}

.ueye--item--container {
  display: flex;
  flex-direction: column;
  height: 240px;
  width: 360px;
}

.ueye--menu--container {
  align-items: center;
  display: flex;
  flex-direction: row;
  gap: 1px;
  justify-content: center;
  overflow-x: auto;
  overflow-y: hidden;
}
`
document.head.appendChild(theme)

const originalTime = Date.now()
const timeout = 20000
console.log('hello world from ueye')
globalThis.ueyeComponents = {}
globalThis.ueyeComponentPromises = {}
globalThis.ueyeComponentPromiseResolvers = {}
globalThis.registerUeyeComponent =
 async function (path, componentFunction) {
  if (path in globalThis.ueyeComponents) {
   throw new Error(
    `Cannot re-register component with path ${JSON.stringify(
     path
    )}`
   )
  }
  if (
   !(
    path in
    globalThis.ueyeComponentPromiseResolvers
   )
  ) {
   throw new Error(
    `Cannot register component ${JSON.stringify(
     path
    )} which has not been requested with loadUeyeComponent()`
   )
  }
  const component = (globalThis.ueyeComponents[
   path
  ] = await componentFunction(
   globalThis.ueyeComponents
  ))
  globalThis.ueyeComponentPromiseResolvers[
   path
  ](component)
  return component
 }
globalThis.loadUeyeComponent = async function (
 path
) {
 if (path in globalThis.ueyeComponentPromises) {
  return globalThis.ueyeComponentPromises[path]
 }
 globalThis.ueyeComponentPromises[path] =
  new Promise(function (resolve, reject) {
   const timeoutTimeout = setTimeout(
    function () {
     reject(`timeout after ${timeout}ms`)
    },
    timeout
   )
   ueyeComponentPromiseResolvers[path] =
    function (x) {
     clearTimeout(timeoutTimeout)
     resolve(x)
    }
   const scriptElement =
    document.createElement('script')
   scriptElement.setAttribute(
    'src',
    `/ueye/src/${path}.js`
   )
   document.head.appendChild(scriptElement)
  })
 return globalThis.ueyeComponentPromises[path]
}

async function main() {
 await loadUeyeComponent('menu')
 const ueye = document.createElement('main')
 ueye.classList.add('ueye--container')
 const gallery =
  document.createElement('section')
 gallery.classList.add('ueye--item--gallery')
 ueye.appendChild(gallery)
 document.body.appendChild(ueye)
 const crown =
  await globalThis.loadUeyeComponent('crown')
 const mc = crown()
 const openItems = []
 function updateOpenItem(index, newItem) {
  openItems[index].label.textContent =
   newItem[0].label
 }
 function open(item) {
  const container =
   document.createElement('div')
  container.classList.add(
   'ueye--item--container'
  )
  const label = document.createElement('label')
  label.textContent = item[0].label
  container.appendChild(label)
  function attachSummonMenu() {
   const summonMenu =
    document.createElement('button')
   summonMenu.textContent = '...'
   summonMenu.addEventListener(
    'click',
    function () {
     const itemMenu =
      globalThis.ueyeComponents.menu([
       {
        label: '>',
        action() {
         container.removeChild(itemMenu.element)
         attachSummonMenu()
        },
       },
       {
        label: 'delete',
        action() {
         container.innerHTML = 'deleted'
        },
       },
       {
        label: 'rename',
        action() {
         const newName = prompt(
          'New name',
          item[0].label
         )
         if (typeof newName !== 'string') {
          return
         }
         item[0].label = newName
         updateOpenItem(item[0].index, item)
        },
       },
       {
        label: '<',
        action() {
         container.removeChild(itemMenu.element)
         attachSummonMenu()
        },
       },
      ])
     container.appendChild(itemMenu.element)
     container.removeChild(summonMenu)
    }
   )
   container.appendChild(summonMenu)
  }
  switch (item[0].type) {
   case mc.types.BRANCH:
    openItems.push({
     container,
     label,
    })
    break
   default:
    const input =
     document.createElement('input')
    input.setAttribute(
     'value',
     typeof item[1] === 'undefined'
      ? ''
      : String(item[1])
    )
    container.appendChild(input)
    openItems.push({
     container,
     label,
     input,
    })
    break
  }
  attachSummonMenu()
  gallery.appendChild(container)
 }
 const mainCrownMenu =
  globalThis.ueyeComponents.menu(
   Object.getOwnPropertyNames(mc)
    .filter((n) => n !== 'types')
    .map((n) => ({
     action() {
      open(mc[n]())
     },
     label: n,
    }))
  )
 ueye.appendChild(mainCrownMenu.element)
 console.dir({ mc })
 console.log(
  `ueye loaded in ${
   Date.now() - originalTime
  }ms`
 )
}

main().catch((e) => console.error(e))
