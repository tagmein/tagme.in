registerUeyeComponent(
 'menu',
 async function (components) {
  return function (initialItems) {
   let items = initialItems
   const element = document.createElement('div')
   element.classList.add(
    'ueye--menu--container'
   )
   function render() {
    element.innerHTML = ''
    for (const item of items) {
     const itemElement =
      document.createElement('button')
     itemElement.textContent = item.label
     itemElement.addEventListener(
      'click',
      item.action
     )
     element.appendChild(itemElement)
    }
   }
   function updateItems(newItems) {
    items = newItems
    render()
   }
   function updateItem(index, newItem) {
    items[index] = newItem
    render()
   }
   render()
   return {
    element,
    render,
    updateItems,
    updateItem,
   }
  }
 }
)
