function explorerToolbar(
 store,
 {
  onSelectAll,
  onDelete,
  onViewModeChange,
  onNewItem,
  onPageChange,
 }
) {
 const element = elem({
  classes: ['explorer-toolbar'],
 })

 const selectAllCheckbox = elem({
  attributes: {
   type: 'checkbox',
  },
  tagName: 'input',
  classes: ['explorer-select-all'],
  events: {
   change: () => {
    onSelectAll(selectAllCheckbox.checked)
   },
  },
 })
 element.appendChild(selectAllCheckbox)

 const itemCountElement = elem({
  classes: ['explorer-item-count'],
  textContent: 'Loading',
 })
 element.appendChild(itemCountElement)

 const deleteButton = elem({
  attributes: {
   disabled: true,
  },
  tagName: 'button',
  textContent: 'Delete',
  classes: ['delete-button'],
  events: {
   click: () => {
    onDelete()
   },
  },
 })
 element.appendChild(deleteButton)

 const spacerLeft = elem({
  classes: ['explorer-spacer'],
 })
 element.appendChild(spacerLeft)

 const paginationElement = elem({
  classes: ['explorer-pagination'],
 })

 const previousPageButton = elem({
  attributes: {
   disabled: true,
  },
  tagName: 'button',
  textContent: 'Previous',
  events: {
   click: () => {
    onPageChange(currentPage - 1)
   },
  },
 })
 paginationElement.appendChild(
  previousPageButton
 )

 const pageNumberElement = elem({
  classes: ['explorer-page-number'],
  textContent: 'Page 1',
 })
 paginationElement.appendChild(
  pageNumberElement
 )

 const nextPageButton = elem({
  attributes: {
   disabled: true,
  },
  tagName: 'button',
  textContent: 'Next',
  events: {
   click: () => {
    onPageChange(currentPage + 1)
   },
  },
 })
 paginationElement.appendChild(nextPageButton)

 element.appendChild(paginationElement)

 const spacerRight = elem({
  classes: ['explorer-spacer'],
 })
 element.appendChild(spacerRight)

 function updatePagination(page, hasNextPage) {
  currentPage = page
  previousPageButton.disabled = page === 1
  nextPageButton.disabled = !hasNextPage
  pageNumberElement.textContent = `Page ${page}`
 }

 function updateDeleteButton(hasSelection) {
  deleteButton.disabled = !hasSelection
 }

 const emptyMode = elem({
  tagName: 'option',
  textContent: '',
 })
 const viewModeSelect = elem({
  tagName: 'select',
  classes: ['explorer-view-mode'],
  events: {
   change: () => {
    onViewModeChange(viewModeSelect.value)
   },
  },
  children: [
   emptyMode,
   elem({
    tagName: 'option',
    textContent: 'List',
    attributes: {
     value: 'list-view',
    },
   }),
   elem({
    tagName: 'option',
    textContent: 'Grid',
    attributes: {
     value: 'grid-view',
    },
   }),
  ],
 })
 element.appendChild(viewModeSelect)

 const newItemButton = elem({
  tagName: 'button',
  textContent: 'New',
  events: {
   click: () => {
    const name = prompt('Enter the new item:')
    if (name) {
     onNewItem(name)
    }
   },
  },
 })
 element.appendChild(newItemButton)

 let currentPage = 1

 function updateItemCount(count) {
  itemCountElement.textContent = `${count} items`
 }

 function updatePagination(page, hasNextPage) {
  currentPage = page
  previousPageButton.disabled = page === 1
  nextPageButton.disabled = !hasNextPage
 }

 function updateSelectAllCheckbox(allSelected) {
  selectAllCheckbox.checked = allSelected
 }

 function updateViewMode(mode) {
  if (
   emptyMode.parentElement === viewModeSelect
  ) {
   viewModeSelect.removeChild(emptyMode)
  }
  viewModeSelect.value = mode
 }

 return {
  element,
  updateDeleteButton,
  updateItemCount,
  updatePagination,
  updateSelectAllCheckbox,
  updateViewMode,
 }
}
