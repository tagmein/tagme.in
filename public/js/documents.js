const documentsElement = elem({
 classes: ['mode-documents', 'documents-area'],
 children: [],
})

function documentsArea() {
 return { element: documentsElement }
}

const documentsToolbar = elem({
 classes: ['mode-documents', 'toolbar'],
})

appHeader.appendChild(documentsToolbar)

function renderDocuments(documents) {
 documentsElement.innerHTML = ''
 for (const document of documents) {
  const docElement = elem({
   classes: ['doc-tile'],
   textContent: 'Hello',
  })
  documentsElement.appendChild(docElement)
 }
}

async function loadDocuments(area) {
 const response = await fetch('/documents')
 const data = await response.json()
 if (data?.response?.documents) {
  renderDocuments(data.response.documents)
 }
}
