function explorer(
 store,
 preferencesStore,
 { itemAction } = {}
) {
 const element = elem({
  classes: ['explorer'],
 })

 let currentViewMode

 const toolbarElement = explorerToolbar(store, {
  async onViewModeChange(mode) {
   itemsContainer.classList.remove(
    'list-view',
    'grid-view'
   )
   itemsContainer.classList.add(mode)
   if (mode !== currentViewMode) {
    await preferencesStore.patch('view-mode', {
     value: mode,
    })
    currentViewMode = mode
   }
  },
  onSelectAll(selected) {
   Array.from(itemsContainer.children).forEach(
    (item) => {
     item.classList.toggle('selected', selected)
    }
   )
   updateToolbarState()
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
   await loadItems()
   toolbarElement.updateSelectAllCheckbox(false)
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

 otherToolbar.innerHTML = ''
 otherToolbar.appendChild(
  toolbarElement.element
 )

 const itemsContainer = elem({
  classes: ['explorer-items'],
 })
 element.appendChild(itemsContainer)

 let currentPage = 1
 const itemsPerPage = 100

 async function loadItems() {
  const skip = (currentPage - 1) * itemsPerPage
  const items = await store.list(
   ['id', 'name', 'note'],
   skip,
   itemsPerPage
  )
  itemsContainer.innerHTML = ''

  items.forEach((item) => {
   const it = explorerItem(
    item,
    store,
    updateToolbarState,
    itemAction
   )
   itemsContainer.appendChild(it.element)
  })

  updateToolbarState()
  toolbarElement.updateItemCount(items.length)
  toolbarElement.updatePagination(
   currentPage,
   items.length === itemsPerPage
  )
 }

 function updateToolbarState() {
  const selectedItems = Array.from(
   itemsContainer.querySelectorAll('.selected')
  )
  const allSelected =
   selectedItems.length ===
   itemsContainer.children.length
  toolbarElement.updateDeleteButton(
   selectedItems.length > 0
  )
  toolbarElement.updateSelectAllCheckbox(
   itemsContainer.children.length > 0 &&
    allSelected
  )
 }

 async function initialize() {
  currentViewMode =
   (await preferencesStore.get('view-mode'))
    ?.value ?? 'list-view'
  itemsContainer.classList.add(currentViewMode)
  toolbarElement.updateViewMode(currentViewMode)
  await loadItems()
 }

 initialize().catch((e) => console.error(e))

 return { element }
}
