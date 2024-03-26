function explorerItem(
 item,
 store,
 onUpdate,
 itemAction
) {
 const element = elem({
  classes: ['explorer-item'],
  dataset: {
   id: item.id,
  },
  events: {
   click: (event) => {
    if (event.target.closest('.item-action')) {
     // Ignore clicks on the action button
     return
    }
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

 const noteElement = elem({
  attributes: {
   title: 'Edit note',
  },
  classes: ['explorer-item-note'],
  textContent: item.note,
  events: {
   async click() {
    const newNote = prompt(
     `"${item.name}" note`,
     item.note
    )
    if (typeof newNote === 'string') {
     await store.patch(item.id, {
      ...item,
      note: newNote,
     })
     item.note = newNote
     noteElement.textContent = newNote
    }
   },
  },
 })
 element.appendChild(noteElement)

 if (itemAction) {
  const actionButton = elem({
   tagName: 'button',
   classes: ['item-action'],
   textContent: itemAction.label,
   events: {
    click() {
     itemAction.handler(item)
    },
   },
  })
  element.appendChild(actionButton)
 }

 return { element }
}
