function explorer(store) {
 const element = elem({
  classes: ['explorer'],
 })

 const toolbarElement = toolbar(store)
 element.appendChild(toolbarElement.element)

 const itemsContainer = elem({
  classes: ['explorer-items', 'list-view'],
 })
 element.appendChild(itemsContainer)

 let currentPage = 1
 const itemsPerPage = 100

 async function loadItems() {
  const skip = (currentPage - 1) * itemsPerPage
  const items = await store.list(
   ['id', 'name'],
   skip,
   itemsPerPage
  )
  itemsContainer.innerHTML = ''

  items.forEach((item) => {
   const itemElement = itemComponent(
    item,
    store,
    loadItems
   )
   itemsContainer.appendChild(itemElement)
  })

  toolbarElement.updateItemCount(items.length)
  toolbarElement.updatePagination(
   currentPage,
   items.length === itemsPerPage
  )
 }

 toolbarElement.onViewModeChange((mode) => {
  itemsContainer.classList.remove(
   'list-view',
   'grid-view'
  )
  itemsContainer.classList.add(mode)
 })

 toolbarElement.onSelectAll((selected) => {
  Array.from(itemsContainer.children).forEach(
   (item) => {
    item.classList.toggle('selected', selected)
   }
  )
 })

 toolbarElement.onDelete(() => {
  const selectedItems = Array.from(
   itemsContainer.querySelectorAll('.selected')
  )
  selectedItems.forEach((item) => {
   store.delete(item.dataset.id)
  })
  loadItems()
 })

 toolbarElement.onNewItem(async (name) => {
  await store.insert(name, { name })
  loadItems()
 })

 toolbarElement.onPageChange((page) => {
  currentPage = page
  loadItems()
 })

 loadItems()

 return { element }
}

function toolbar(store) {
 const element = elem({
  classes: ['explorer-toolbar'],
 })

 const itemCountElement = elem({
  classes: ['explorer-item-count'],
 })
 element.appendChild(itemCountElement)

 const selectAllCheckbox = elem({
  tag: 'input',
  type: 'checkbox',
  classes: ['explorer-select-all'],
  events: {
   change: () => {
    onSelectAllCallback(
     selectAllCheckbox.checked
    )
   },
  },
 })
 element.appendChild(selectAllCheckbox)

 const deleteButton = elem({
  tag: 'button',
  textContent: 'Delete',
  events: {
   click: () => {
    onDeleteCallback()
   },
  },
 })
 element.appendChild(deleteButton)

 const previousPageButton = elem({
  tag: 'button',
  textContent: 'Previous page',
  events: {
   click: () => {
    onPageChangeCallback(currentPage - 1)
   },
  },
 })
 element.appendChild(previousPageButton)

 const nextPageButton = elem({
  tag: 'button',
  textContent: 'Next page',
  events: {
   click: () => {
    onPageChangeCallback(currentPage + 1)
   },
  },
 })
 element.appendChild(nextPageButton)

 const viewModeSelect = elem({
  tag: 'select',
  classes: ['explorer-view-mode'],
  events: {
   change: () => {
    onViewModeChangeCallback(
     viewModeSelect.value
    )
   },
  },
  innerHTML: `
     <option value="list-view">List</option>
     <option value="grid-view">Grid</option>
   `,
 })
 element.appendChild(viewModeSelect)

 const newItemButton = elem({
  tag: 'button',
  textContent: 'New Item',
  events: {
   click: () => {
    const name = prompt(
     'Enter the new item name:'
    )
    if (name) {
     onNewItemCallback(name)
    }
   },
  },
 })
 element.appendChild(newItemButton)

 let currentPage = 1
 let onSelectAllCallback = () => {}
 let onDeleteCallback = () => {}
 let onViewModeChangeCallback = () => {}
 let onNewItemCallback = () => {}
 let onPageChangeCallback = () => {}

 function updateItemCount(count) {
  itemCountElement.textContent = `${count} items`
 }

 function updatePagination(page, hasNextPage) {
  currentPage = page
  previousPageButton.disabled = page === 1
  nextPageButton.disabled = !hasNextPage
 }

 return {
  element,
  updateItemCount,
  updatePagination,
  onSelectAll: (callback) => {
   onSelectAllCallback = callback
  },
  onDelete: (callback) => {
   onDeleteCallback = callback
  },
  onViewModeChange: (callback) => {
   onViewModeChangeCallback = callback
  },
  onNewItem: (callback) => {
   onNewItemCallback = callback
  },
  onPageChange: (callback) => {
   onPageChangeCallback = callback
  },
 }
}

function itemComponent(item, store, onUpdate) {
 const element = elem({
  classes: ['explorer-item'],
  dataset: {
   id: item.id,
  },
  events: {
   click: () => {
    element.classList.toggle('selected')
   },
  },
 })

 const nameElement = elem({
  classes: ['explorer-item-name'],
  textContent: item.name,
 })
 element.appendChild(nameElement)

 return element
}
