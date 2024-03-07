function explorer(store) {
 const element = elem({
  classes: ['explorer'],
 })

 const toolbarElement = explorerToolbar(store, {
  onViewModeChange(mode) {
   itemsContainer.classList.remove(
    'list-view',
    'grid-view'
   )
   itemsContainer.classList.add(mode)
  },
  onSelectAll(selected) {
   Array.from(itemsContainer.children).forEach(
    (item) => {
     item.classList.toggle('selected', selected)
    }
   )
   updateDeleteButton()
  },
  async onDelete() {
   const selectedItems = Array.from(
    itemsContainer.querySelectorAll('.selected')
   )
   await Promise.all(
    selectedItems.map((item) =>
     store.delete(item.dataset.id)
    )
   )
   loadItems()
  },
  async onNewItem(name) {
   await store.insert(name, { name })
   loadItems()
  },
  onPageChange(page) {
   currentPage = page
   loadItems()
  },
 })
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
   const it = explorerItem(
    item,
    store,
    updateDeleteButton
   )
   itemsContainer.appendChild(it.element)
  })

  updateDeleteButton()
  toolbarElement.updateItemCount(items.length)
  toolbarElement.updatePagination(
   currentPage,
   items.length === itemsPerPage
  )
 }

 function updateDeleteButton() {
  const selectedItems = Array.from(
   itemsContainer.querySelectorAll('.selected')
  )
  toolbarElement.updateDeleteButton(
   selectedItems.length > 0
  )
 }

 loadItems()

 return { element }
}
