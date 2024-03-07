function explorerItem(item, store, onUpdate) {
 const element = elem({
  classes: ['explorer-item'],
  dataset: {
   id: item.id,
  },
  events: {
   click: (event) => {
    if (event.shiftKey) {
     element.classList.toggle('selected')
    } else {
     Array.from(
      element.parentNode.children
     ).forEach((item) => {
      item.classList.remove('selected')
     })
     element.classList.add('selected')
    }
    onUpdate()
   },
  },
 })

 const nameElement = elem({
  classes: ['explorer-item-name'],
  textContent: item.name,
 })
 element.appendChild(nameElement)

 return { element }
}
