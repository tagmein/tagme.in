const documentsElement = elem({
 classes: ['mode-documents', 'documents-area'],
 children: [],
})

function documentsArea() {
 return { element: documentsElement }
}

function getShareParams() {
 try {
  const u = new URL(window.location.href)
  const id = u.searchParams.get('doc')
  const view = u.searchParams.get('view')
  if (id && id.length > 0) {
   return { id, view: view === 'preview' ? 'preview' : 'view' }
  }
 } catch {
  // ignore
 }
 return null
}

const documentsToolbar = elem({
 classes: ['mode-documents', 'toolbar'],
})

appHeader.appendChild(documentsToolbar)

let documentsState = {
 view: 'list',
 selectedTags: [],
 tagMode: 'OR',
 status: 'published',
 openDocument: null,
 openDocumentRev: null,
}

const DOCUMENTS_STATUS_STORAGE_KEY = 'tagme.documents.status'
try {
 const savedStatus = localStorage.getItem(DOCUMENTS_STATUS_STORAGE_KEY)
 if (savedStatus === 'published' || savedStatus === 'draft' || savedStatus === 'all') {
  documentsState.status = savedStatus
 }
} catch {
 // ignore
}

function networkRootUrl() {
  return globalThis.env?.TAGMEIN_API_BASEURL ?? ''
 }

function documentPreviewUrl(id) {
 const base = networkRootUrl()
 const encoded = encodeURIComponent(id)
 return `${base}/documents?id=${encoded}&format=html`
}

function openDocumentPreview(id) {
 window.open(documentPreviewUrl(id), '_blank', 'noopener')
}

function safeText(text) {
 return (text ?? '').toString()
}

function escapeHtml(s) {
 return safeText(s)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')
}

function renderMarkdown(md) {
 const text = safeText(md)
 const lines = text.replaceAll('\r\n', '\n').split('\n')
 let html = ''
 let inCode = false
 let codeLang = ''
 let listOpen = false

 function closeList() {
  if (listOpen) {
   html += '</ul>'
   listOpen = false
  }
 }

 function inline(s) {
  let out = escapeHtml(s)
  out = out.replaceAll(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replaceAll(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replaceAll(/\*([^*]+)\*/g, '<em>$1</em>')
  out = out.replaceAll(/\[([^\]]+)\]\(([^)]+)\)/g, '<a target="_blank" href="$2">$1</a>')
  return out
 }

 for (const rawLine of lines) {
  const line = rawLine
  if (line.startsWith('```')) {
   if (!inCode) {
    closeList()
    inCode = true
    codeLang = line.slice(3).trim()
    html += `<pre><code data-lang="${escapeHtml(codeLang)}">`
   } else {
    inCode = false
    codeLang = ''
    html += '</code></pre>'
   }
   continue
  }

  if (inCode) {
   html += `${escapeHtml(line)}\n`
   continue
  }

  const trimmed = line.trim()
  if (trimmed.length === 0) {
   closeList()
   html += '<br />'
   continue
  }

  if (trimmed.startsWith('#')) {
   closeList()
   const level = Math.min(trimmed.match(/^#+/)[0].length, 6)
   const content = trimmed.replace(/^#+\s*/, '')
   html += `<h${level}>${inline(content)}</h${level}>`
   continue
  }

  const bullet = trimmed.match(/^[-*]\s+(.*)$/)
  if (bullet) {
   if (!listOpen) {
    html += '<ul>'
    listOpen = true
   }
   html += `<li>${inline(bullet[1])}</li>`
   continue
  }

  closeList()
  html += `<p>${inline(trimmed)}</p>`
 }

 if (inCode) {
  html += '</code></pre>'
 }
 if (listOpen) {
  html += '</ul>'
 }
 return html
}

function normalizeTags(tags) {
 const seen = new Set()
 const out = []
 for (const t of tags) {
  const v = safeText(t).trim()
  if (!v) continue
  if (seen.has(v)) continue
  seen.add(v)
  out.push(v)
 }
 return out
}

function parseTagInput(text) {
 return normalizeTags(
  safeText(text)
   .split(',')
   .map((x) => x.trim())
   .filter((x) => x.length > 0)
 )
}

function toFiniteNumber(value) {
 const n =
  typeof value === 'number'
   ? value
   : typeof value === 'string' && value.trim().length > 0
    ? Number(value)
    : NaN
 return Number.isFinite(n) ? n : null
}

function formatScore(value) {
 const n = toFiniteNumber(value)
 if (n == null) return '—'
 return `${Math.round(n * 10) / 10}`
}

function localDateTime(msOrIso) {
 if (msOrIso == null || msOrIso === '') return '—'
 const d = new Date(msOrIso)
 if (Number.isNaN(d.getTime())) return '—'
 return d.toLocaleString()
}

function getDocumentStatusText(doc) {
 const draft = doc.isDraft ? 'Draft' : 'Published'
 const velocity = toFiniteNumber(doc?.velocity) ?? 0
 const velocityText = velocity !== 0 ? ` (${velocity > 0 ? '+' : ''}${velocity}/hr)` : ''
 return `${draft}${velocityText}`
}

function computeDocumentStatusMessage(doc, now = Date.now()) {
 const isDraft = !!doc?.isDraft
 const velocity = typeof doc?.velocity === 'number' ? doc.velocity : 0
 const score = typeof doc?.score === 'number' ? doc.score : 0
 const charCount = typeof doc?.charCount === 'number' ? doc.charCount : 0
 if (velocity === 0) return ''

 if (!isDraft && velocity < 0) {
  const delta = score - charCount
  if (delta <= 0) return ''
  const hours = delta / Math.abs(velocity)
  const unpublishesAt = new Date(now + hours * 60 * 60 * 1000)
  return `Unpublishes on ${unpublishesAt.toLocaleString()}`
 }

 if (isDraft && velocity > 0) {
  const delta = charCount - score
  if (delta <= 0) return ''
  const hours = delta / velocity
  const publishesAt = new Date(now + hours * 60 * 60 * 1000)
  return `Publishes on ${publishesAt.toLocaleString()}`
 }

 if (isDraft && velocity < 0) {
  if (score <= 0) {
   const expiresAt = new Date(now)
   return `Draft expires on ${expiresAt.toLocaleString()}`
  }
  const hours = score / Math.abs(velocity)
  const expiresAt = new Date(now + hours * 60 * 60 * 1000)
  return `Draft expires on ${expiresAt.toLocaleString()}`
 }

 return ''
}

function downloadMarkdown(filename, content) {
 const safeName = safeText(filename)
  .replaceAll(/[^a-zA-Z0-9 _.-]/g, '')
  .trim()
  .slice(0, 100)
 const blob = new Blob([safeText(content)], { type: 'text/markdown' })
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a')
 a.href = url
 a.download = `${safeName || 'document'}.md`
 document.body.appendChild(a)
 a.click()
 a.remove()
 URL.revokeObjectURL(url)
}

async function fetchDocumentsList() {
 const params = new URLSearchParams()
 if (documentsState.selectedTags.length > 0) {
  params.set('tags', documentsState.selectedTags.join(','))
 }
 if (documentsState.tagMode !== 'OR') {
  params.set('tagMode', documentsState.tagMode)
 }
 if (documentsState.status !== 'published') {
  params.set('status', documentsState.status)
 }
 const url = `${networkRootUrl()}/documents${params.toString() ? `?${params.toString()}` : ''}`
 const response = await fetch(url)
 const data = await response.json()
 return data
}

async function fetchDocument(id) {
  const url = `${networkRootUrl()}/documents?id=${encodeURIComponent(id)}`
  const response = await fetch(url)
  if (!response.ok) {
   throw new Error(await response.text())
  }
  return response.json()
}

async function postDocuments(body) {
  const url = `${networkRootUrl()}/documents`
  const response = await fetch(url, {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify(body),
  })
  if (!response.ok) {
   throw new Error(await response.text())
  }
  return response.json()
 }

function clearDocumentsUI() {
 documentsElement.innerHTML = ''
}

function renderToolbar(listData) {
 documentsToolbar.innerHTML = ''

 const backBtn = elem({
  tagName: 'button',
  classes: ['documents-toolbar-back'],
  attributes: { title: 'Back' },
  children: [elem({ tagName: 'span', classes: ['icon', 'icon-back', 'icon-sm'] })],
 })
 backBtn.addEventListener('click', () => {
  documentsState.view = 'list'
  documentsState.openDocument = null
  documentsState.openDocumentRev = null
  withLoading(loadDocuments())
 })

 if (documentsState.view !== 'list') {
  documentsToolbar.appendChild(backBtn)
  return
 }

 const tagInput = elem({
  tagName: 'input',
  attributes: {
   placeholder: 'Filter tags (comma-separated)',
   value: documentsState.selectedTags.join(', '),
  },
 })

 tagInput.addEventListener('blur', () => {
  if (tagInput) {
   documentsState.selectedTags = parseTagInput(tagInput.value)
   withLoading(loadDocuments())
  }
 })

 tagInput.addEventListener('keydown', (e) => {
  if (tagInput && e.key === 'Enter') {
   e.preventDefault()
   tagInput.blur()
  }
 })

 const tagModeSelect = elem({
  tagName: 'select',
  children: [
   elem({ tagName: 'option', attributes: { value: 'OR' }, textContent: 'OR' }),
   elem({ tagName: 'option', attributes: { value: 'AND' }, textContent: 'AND' }),
  ],
 })
 tagModeSelect.value = documentsState.tagMode
 tagModeSelect.addEventListener('change', () => {
  documentsState.tagMode = tagModeSelect.value === 'AND' ? 'AND' : 'OR'
  withLoading(loadDocuments())
 })

 const statusSelect = elem({
  tagName: 'select',
  classes: ['status-select'],
  children: [
   elem({ tagName: 'option', attributes: { value: 'published' }, textContent: 'Published' }),
   elem({ tagName: 'option', attributes: { value: 'draft' }, textContent: 'Drafts' }),
   elem({ tagName: 'option', attributes: { value: 'all' }, textContent: 'All' }),
  ],
 })
 statusSelect.value = documentsState.status
 statusSelect.addEventListener('change', () => {
  const v = statusSelect.value
  documentsState.status = v === 'draft' ? 'draft' : v === 'all' ? 'all' : 'published'
  try {
   localStorage.setItem(DOCUMENTS_STATUS_STORAGE_KEY, documentsState.status)
  } catch {
   // ignore
  }
  withLoading(loadDocuments())
 })

 documentsToolbar.appendChild(tagInput)
 documentsToolbar.appendChild(tagModeSelect)
 documentsToolbar.appendChild(statusSelect)

 if (documentsState.view === 'list') {
  const tags = listData?.response?.tags
  if (Array.isArray(tags) && tags.length > 0) {
   const tagRow = elem({
    tagName: 'div',
    classes: ['documents-tag-row'],
    children: tags.map((t) => {
     const name = t?.name
     const score = t?.score
     const btn = elem({
      tagName: 'button',
      classes: ['documents-tag-pill'],
      textContent: `${name}`,
      events: {
       click() {
        documentsState.selectedTags = normalizeTags([
         ...documentsState.selectedTags,
         safeText(name),
        ])
        withLoading(loadDocuments())
       },
      },
     })
     btn.setAttribute('title', `Score ${formatScore(score)}`)
     return btn
    }),
   })
   documentsToolbar.appendChild(tagRow)
  }
 }
}

function renderEmptyState() {
 clearDocumentsUI()
 const msg =
  documentsState.selectedTags.length > 0
   ? `No documents found for tags ${documentsState.selectedTags.join(', ')}`
   : 'No documents found'
 documentsElement.appendChild(
  elem({ classes: ['documents-empty'], textContent: msg })
 )
}

function createDocumentCard(doc) {
 const statusMessage = safeText(computeDocumentStatusMessage(doc))
 const topTags = Array.isArray(doc.topTags) ? doc.topTags : []
 const allTags = Array.isArray(doc.tags) ? doc.tags : []
 const displayTags = topTags.length > 0 ? topTags : allTags
 const tile = elem({
  classes: ['doc-tile'],
  children: [
   elem({ tagName: 'h3', textContent: safeText(doc.title) }),
   elem({
    tagName: 'div',
    textContent: `Score: ${formatScore(doc?.score)}`,
   }),
   elem({
    tagName: 'div',
    textContent: getDocumentStatusText(doc),
   }),
   elem({
    tagName: 'div',
    textContent: `Tags: ${displayTags.length > 0 ? displayTags.join(', ') : ''}`,
   }),
   ...(statusMessage ? [elem({ tagName: 'div', textContent: statusMessage })] : []),
  ],
  events: {
   click() {
    withLoading(showView(doc.id))
   },
  },
 })
 return tile
}

function renderDocumentsList(listData) {
 clearDocumentsUI()
 
 const newDocForm = elem({
  tagName: 'div',
  classes: ['documents-new-form'],
  children: [
   elem({
    tagName: 'div',
    classes: ['documents-new-row'],
    children: [
     elem({
      tagName: 'input',
      classes: ['documents-new-input'],
      attributes: {
       placeholder: 'Document title...',
       type: 'text',
      },
     }),
     elem({
      tagName: 'input',
      classes: ['documents-new-tags'],
      attributes: {
       placeholder: 'Tags (comma-separated)...',
       type: 'text',
      },
     }),
    ],
   }),
   elem({
    tagName: 'textarea',
    classes: ['documents-new-body'],
    attributes: {
     placeholder: 'Document body...',
    },
   }),
   elem({
    tagName: 'div',
    classes: ['documents-new-compose'],
    children: [
     elem({
      tagName: 'button',
      classes: ['documents-new-submit'],
      attributes: {
       title: 'Create',
      },
      events: {
       async click(e) {
        e.preventDefault()
        const titleInput = newDocForm.querySelector('.documents-new-input')
        const tagsInput = newDocForm.querySelector('.documents-new-tags')
        const bodyInput = newDocForm.querySelector('.documents-new-body')

        const title = titleInput?.value?.trim() ?? ''
        const body = bodyInput?.value ?? ''
        const tags = parseTagInput(tagsInput?.value ?? '')

        if (!title) {
         alert('missing title')
         return
        }
        if (!body || body.trim().length === 0) {
         alert('missing body')
         return
        }

        const payload = {
         action: 'create',
         title,
         body,
         tags,
        }

        try {
         const data = await postDocuments(payload)
         if (data?.response?.document) {
          titleInput.value = ''
          tagsInput.value = ''
          bodyInput.value = ''
          withLoading(loadDocuments())
         }
        } catch (err) {
         alert(err?.message ?? err)
        }
       },
      },
      children: [
       elem({ tagName: 'span', classes: ['icon', 'icon-plane'] }),
      ],
     }),
    ],
   }),
  ],
 })
 
 documentsElement.appendChild(newDocForm)
 
 const documents = listData?.response?.documents
 if (!Array.isArray(documents) || documents.length === 0) {
  const msg =
   documentsState.selectedTags.length > 0
    ? `No documents found for tags ${documentsState.selectedTags.join(', ')}`
    : 'No documents found'
  documentsElement.appendChild(
   elem({ classes: ['documents-empty'], textContent: msg })
  )
  return
 }

 const grid = elem({ tagName: 'div', classes: ['documents-grid'] })
 for (const doc of documents) {
  grid.appendChild(createDocumentCard(doc))
 }
 documentsElement.appendChild(grid)
}

function renderVoteRow(doc) {
 const agreeButton = elem({
  tagName: 'button',
  classes: ['agree'],
  children: [icon('yes')],
  attributes: { title: 'I agree with this' },
  events: {
   async click(e) {
    e.preventDefault()
    const data = await postDocuments({ action: 'vote', id: doc.id, delta: 1 })
    if (data?.response?.document) {
     documentsState.openDocument = data.response.document
     documentsState.openDocumentRev = data.response.document.rev
     renderDocumentView(data.response.document)
    }
   },
  },
 })

 const disagreeButton = elem({
  tagName: 'button',
  classes: ['disagree'],
  children: [icon('no')],
  attributes: { title: 'I disagree with this' },
  events: {
   async click(e) {
    e.preventDefault()
    const data = await postDocuments({ action: 'vote', id: doc.id, delta: -1 })
    if (data?.response?.document) {
     documentsState.openDocument = data.response.document
     documentsState.openDocumentRev = data.response.document.rev
     renderDocumentView(data.response.document)
    }
   },
  },
 })

 return elem({
  tagName: 'div',
  classes: ['article-tool-buttons'],
  children: [agreeButton, disagreeButton],
 })
}

function renderTagVotes(doc) {
 const tagScores = doc.tagScores || {}
 const wrap = elem({
  tagName: 'div',
  children: (Array.isArray(doc.tags) ? doc.tags : []).map((t) => {
   const score = tagScores[t]

   const agreeButton = elem({
    tagName: 'button',
    classes: ['agree'],
    children: [icon('yes')],
    attributes: { title: 'I agree with this' },
    events: {
     async click(e) {
      e.preventDefault()
      const data = await postDocuments({ action: 'tagVote', id: doc.id, tag: t, delta: 1 })
      if (data?.response?.document) {
       documentsState.openDocument = data.response.document
       documentsState.openDocumentRev = data.response.document.rev
       renderDocumentView(data.response.document)
      }
     },
    },
   })

   const disagreeButton = elem({
    tagName: 'button',
    classes: ['disagree'],
    children: [icon('no')],
    attributes: { title: 'I disagree with this' },
    events: {
     async click(e) {
      e.preventDefault()
      const data = await postDocuments({ action: 'tagVote', id: doc.id, tag: t, delta: -1 })
      if (data?.response?.document) {
       documentsState.openDocument = data.response.document
       documentsState.openDocumentRev = data.response.document.rev
       renderDocumentView(data.response.document)
      }
     },
    },
   })

   const buttons = elem({
    tagName: 'div',
    classes: ['article-tool-buttons'],
    children: [agreeButton, disagreeButton],
   })

   return elem({
    tagName: 'div',
    classes: ['documents-tag-vote-row'],
    children: [
     elem({ tagName: 'span', textContent: `${t}${typeof score === 'number' && Number.isFinite(score) ? ` (${Math.round(score * 10) / 10})` : ''}` }),
     buttons,
    ],
   })
  }),
 })
 return wrap
}

function renderDocumentView(doc) {
 documentsState.view = 'view'
 clearDocumentsUI()
 const statusMessage = safeText(computeDocumentStatusMessage(doc))
 const header = elem({
  tagName: 'header',
  classes: ['documents-view-header'],
  children: [
   elem({ tagName: 'h2', classes: ['documents-view-title'], textContent: safeText(doc.title) }),
   elem({
    tagName: 'div',
    classes: ['documents-view-meta'],
    children: [
     elem({ tagName: 'div', textContent: `Score: ${formatScore(doc?.score)}` }),
     elem({ tagName: 'div', textContent: getDocumentStatusText(doc) }),
     ...(statusMessage ? [elem({ tagName: 'div', textContent: statusMessage })] : []),
     elem({ tagName: 'div', textContent: `Created: ${localDateTime(doc.created)}` }),
     elem({ tagName: 'div', textContent: `Edited: ${localDateTime(doc.modified)}` }),
    ],
   }),
  ],
 })
 const article = elem({ tagName: 'article' })
 article.innerHTML = renderMarkdown(doc.body)

 const sep = () => elem({ tagName: 'span', classes: ['documents-view-sep'], textContent: ' • ' })
 const link = (text, onClick) =>
  elem({
   tagName: 'a',
   textContent: text,
   attributes: { href: '#' },
   events: {
    click(e) {
     e.preventDefault()
     onClick()
    },
   },
  })

 const actions = [
  link('Preview', () => openDocumentPreview(doc.id)),
  sep(),
  link('copy preview link', async () => {
   const shareUrl = documentPreviewUrl(doc.id)
   try {
    await navigator.clipboard.writeText(shareUrl)
   } catch {
    const ta = document.createElement('textarea')
    ta.value = shareUrl
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
   }
   alert('Preview link copied')
  }),
  sep(),
  link('download', () => downloadMarkdown(doc.title, doc.body)),
 ]

 if (doc.isDraft) {
  actions.push(sep())
  actions.push(link('edit', () => withLoading(showEdit(doc.id))))
 }

 const buttons = elem({
  tagName: 'div',
  classes: ['documents-view-links'],
  children: actions,
 })

 const wrap = elem({
  tagName: 'div',
  classes: ['documents-view'],
  children: [
   header,
   elem({
    tagName: 'div',
    classes: ['documents-view-votes'],
    children: [
     renderVoteRow(doc),
     elem({
      tagName: 'div',
      classes: ['documents-view-tags'],
      textContent: `Tags: ${Array.isArray(doc.tags) ? doc.tags.join(', ') : ''}`,
     }),
     renderTagVotes(doc),
    ],
   }),
   buttons,
   article,
  ],
 })

 documentsElement.appendChild(wrap)
}

function renderDocumentEditor(doc, isCreate) {
 documentsState.view = 'edit'
 clearDocumentsUI()

 const titleInput = elem({
  tagName: 'input',
  classes: ['documents-editor-input'],
  attributes: {
   placeholder: 'Title',
   value: safeText(doc?.title ?? ''),
  },
 })

 const tagsInput = elem({
  tagName: 'input',
  classes: ['documents-editor-input'],
  attributes: {
   placeholder: 'Tags (comma-separated)',
   value: Array.isArray(doc?.tags) ? doc.tags.join(', ') : '',
  },
 })

 const bodyArea = elem({
  tagName: 'textarea',
  classes: ['documents-editor-body'],
  textContent: safeText(doc?.body ?? ''),
 })

 async function submitDocument() {
  const payload = isCreate
   ? {
      action: 'create',
      title: titleInput.value,
      body: bodyArea.value,
      tags: parseTagInput(tagsInput.value),
     }
   : {
      action: 'save',
      id: safeText(doc?.id ?? ''),
      ifRev: doc?.rev,
      title: titleInput.value,
      body: bodyArea.value,
      tags: parseTagInput(tagsInput.value),
     }
  try {
   const data = await postDocuments(payload)
   const updated = data?.response?.document
   if (updated) {
    documentsState.openDocument = updated
    documentsState.openDocumentRev = updated.rev
    renderToolbar({})
    renderDocumentView(updated)
    return
   }
   alert('Unable to save document')
  } catch (err) {
   alert(err?.message ?? err)
  }
 }

 bodyArea.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
   e.preventDefault()
   submitDocument()
  }
 })

 const sendBtn = elem({
  tagName: 'button',
  classes: ['documents-editor-submit'],
  attributes: {
   title: isCreate ? 'Create' : 'Save',
  },
  events: {
   async click(e) {
    e.preventDefault()
    await submitDocument()
   },
  },
  children: [
   elem({ tagName: 'span', classes: ['icon', 'icon-plane'] }),
  ],
 })

 const compose = elem({
  tagName: 'div',
  classes: ['documents-editor-compose'],
  children: [bodyArea, sendBtn],
 })

 const downloadBtn =
  !isCreate
   ? elem({
      tagName: 'button',
      textContent: 'Download',
      events: {
       click(e) {
        e.preventDefault()
        downloadMarkdown(titleInput.value || 'document', bodyArea.value)
       },
      },
     })
   : null

 const formWrap = elem({
  tagName: 'div',
  classes: ['documents-editor'],
  children: [
   elem({
    tagName: 'h2',
    classes: ['documents-editor-title'],
    textContent: isCreate ? 'New Document' : 'Edit Document',
   }),
   elem({
    tagName: 'div',
    classes: ['documents-editor-fields'],
    children: [titleInput, tagsInput],
   }),
   compose,
   ...(downloadBtn
    ? [
       elem({
        tagName: 'div',
        classes: ['documents-editor-actions'],
        children: [downloadBtn],
       }),
      ]
    : []),
  ],
 })

 documentsElement.appendChild(formWrap)
}
async function showView(id) {
 const data = await fetchDocument(id)
 const doc = data?.response?.document
 if (doc) {
  documentsState.openDocument = doc
  documentsState.openDocumentRev = doc.rev
  renderToolbar(data)
  renderDocumentView(doc)
 }
}

async function showEdit(id) {
 const data = await fetchDocument(id)
 const doc = data?.response?.document
 if (doc) {
  documentsState.openDocument = doc
  documentsState.openDocumentRev = doc.rev
  renderToolbar(data)
  if (!doc.isDraft) {
   alert('document is locked')
   renderDocumentView(doc)
   return
  }
  renderDocumentEditor(doc, false)
 }
}

function showCreate() {
 documentsState.openDocument = null
 documentsState.openDocumentRev = null
 renderToolbar({})
 renderDocumentEditor({ title: '', body: '', tags: [] }, true)
}

async function loadDocuments() {
 const shared = getShareParams()
 if (shared?.id) {
  // Allow opening a document directly via share link.
  if (shared.view === 'preview') {
   window.location.href = documentPreviewUrl(shared.id)
   return
  } else {
   await showView(shared.id)
  }
  return
 }
 const listData = await fetchDocumentsList()
 renderToolbar(listData)
 renderDocumentsList(listData)
}
