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

function ensureDocumentsInlineStyle() {
 const id = 'tmi-documents-inline-style'
 if (document.getElementById(id)) return
 const style = document.createElement('style')
 style.id = id
 style.textContent = `
  .mode-documents.toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 12px;box-sizing:border-box;border-bottom:1px solid var(--color-border-dark)}
  .mode-documents.toolbar input,.mode-documents.toolbar select{height:34px;border-radius:8px;border:1px solid var(--color-border-dark);background:var(--color-bg-medium);color:var(--color-text);padding:6px 10px;box-sizing:border-box}
  .mode-documents.toolbar input{min-width:240px;flex:1}
  .mode-documents.toolbar button{height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:var(--color-text);padding:0 12px;cursor:pointer;white-space:nowrap}
  .mode-documents.toolbar button:hover{background:rgba(255,255,255,.12)}
  .documents-area{padding:16px;box-sizing:border-box;min-height:100dvh}
  .doc-tile{max-width:920px;width:min(920px,calc(100% - 24px));padding:16px;margin:12px auto;border-radius:10px;border:1px solid var(--color-border-dark);background:var(--color-bg-medium);text-align:left;box-sizing:border-box}
  .doc-tile h3{margin:0 0 8px 0}
  .doc-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  .documents-view{max-width:920px;width:min(920px,100%);margin:12px auto 0 auto;text-align:left}
  .documents-view-header{padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04)}
  .documents-view-meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;font-size:13px;opacity:.92}
  @media(max-width:700px){.documents-view-meta{grid-template-columns:1fr}}
  .documents-view-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  .documents-view-actions button{height:32px}
  .documents-area article{margin:12px auto 0 auto;max-width:920px;width:min(920px,100%);padding:14px;border-radius:10px;border:1px solid var(--color-border-dark);background:rgba(0,0,0,.25);box-sizing:border-box}
  .documents-area article pre{overflow:auto;padding:10px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}
  .documents-editor{max-width:920px;width:min(920px,100%);margin:16px auto 0 auto;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);box-sizing:border-box;text-align:left}
  .documents-editor-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  @media(max-width:700px){.documents-editor-fields{grid-template-columns:1fr}}
  .documents-editor-input,.documents-editor-body{width:100%;box-sizing:border-box;border-radius:8px;border:1px solid var(--color-border-dark);background:var(--color-bg-medium);color:var(--color-text);padding:10px}
  .documents-editor-input{height:36px}
  .documents-editor-body{min-height:260px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;line-height:1.35;margin-top:10px}
  .documents-editor-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
 `
 document.head.appendChild(style)
}

let documentsState = {
 view: 'list',
 selectedTags: [],
 tagMode: 'OR',
 status: 'published',
 openDocument: null,
 openDocumentRev: null,
}

function networkRootUrl() {
  return globalThis.env?.TAGMEIN_API_BASEURL ?? ''
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

function localDateTime(msOrIso) {
 const d =
  typeof msOrIso === 'number'
   ? new Date(msOrIso)
   : new Date(msOrIso)
 return d.toLocaleString()
}

function getDocumentStatusText(doc) {
 const draft = doc.isDraft ? 'Draft' : 'Published'
 const velocity = typeof doc.velocity === 'number' ? doc.velocity : 0
 const velocityText = velocity !== 0 ? ` (${velocity > 0 ? '+' : ''}${velocity}/hr)` : ''
 return `${draft}${velocityText}`
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
  withLoading(loadDocuments())
 })

 const newBtn = elem({
  tagName: 'button',
  textContent: 'New',
 })
 newBtn.addEventListener('click', () => {
  showCreate()
 })

 const backBtn = elem({
  tagName: 'button',
  textContent: 'Back',
 })
 backBtn.addEventListener('click', () => {
  documentsState.view = 'list'
  documentsState.openDocument = null
  documentsState.openDocumentRev = null
  withLoading(loadDocuments())
 })

 if (documentsState.view !== 'list') {
  documentsToolbar.appendChild(backBtn)
 }

 documentsToolbar.appendChild(tagInput)
 documentsToolbar.appendChild(tagModeSelect)
 documentsToolbar.appendChild(statusSelect)
 documentsToolbar.appendChild(newBtn)

 if (documentsState.view === 'list') {
  const tags = listData?.response?.tags
  if (Array.isArray(tags) && tags.length > 0) {
   const tagRow = elem({
    tagName: 'div',
    children: tags.map((t) => {
     const name = t?.name
     const score = t?.score
     const btn = elem({
      tagName: 'button',
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
     btn.setAttribute('title', `Score ${Math.round(score * 10) / 10}`)
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
  elem({ classes: ['doc-tile'], textContent: msg })
 )
}

function createDocumentCard(doc) {
 const statusMessage = safeText(doc.statusMessage)
 const topTags = Array.isArray(doc.topTags) ? doc.topTags : []
 const tile = elem({
  classes: ['doc-tile'],
  children: [
   elem({ tagName: 'h3', textContent: safeText(doc.title) }),
   elem({
    tagName: 'div',
    textContent: `Score: ${Math.round(doc.score * 10) / 10}`,
   }),
   elem({
    tagName: 'div',
    textContent: getDocumentStatusText(doc),
   }),
   elem({
    tagName: 'div',
    textContent: `Created: ${localDateTime(doc.created)}`,
   }),
   elem({
    tagName: 'div',
    textContent: `Edited: ${localDateTime(doc.modified)}`,
   }),
   elem({
    tagName: 'div',
    textContent: `Tags: ${topTags.length > 0 ? topTags.join(', ') : ''}`,
   }),
   ...(statusMessage ? [elem({ tagName: 'div', textContent: statusMessage })] : []),
   elem({
    tagName: 'div',
    classes: ['doc-actions'],
    children: [
     elem({
      tagName: 'button',
      textContent: 'Open',
      events: {
       click(e) {
        e.preventDefault()
        e.stopPropagation()
        withLoading(showView(doc.id))
       },
      },
     }),
     elem({
      tagName: 'button',
      textContent: 'Preview',
      events: {
       click(e) {
        e.preventDefault()
        e.stopPropagation()
        withLoading(showPreview(doc.id))
       },
      },
     }),
     ...(doc.isDraft
      ? [
         elem({
          tagName: 'button',
          textContent: 'Edit',
          events: {
           click(e) {
            e.preventDefault()
            e.stopPropagation()
            withLoading(showEdit(doc.id))
           },
          },
         }),
        ]
      : []),
    ],
   }),
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
 const documents = listData?.response?.documents
 if (!Array.isArray(documents) || documents.length === 0) {
  renderEmptyState()
  return
 }
 for (const doc of documents) {
  documentsElement.appendChild(createDocumentCard(doc))
 }
}

function renderVoteRow(doc) {
 const voteRow = elem({
  tagName: 'div',
  children: [
   elem({
    tagName: 'button',
    textContent: '✅',
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
   }),
   elem({
    tagName: 'button',
    textContent: '❎',
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
   }),
  ],
 })
 return voteRow
}

function renderTagVotes(doc) {
 const tagScores = doc.tagScores || {}
 const wrap = elem({
  tagName: 'div',
  children: (Array.isArray(doc.tags) ? doc.tags : []).map((t) => {
   const score = tagScores[t]
   const row = elem({
    tagName: 'div',
    children: [
     elem({ tagName: 'span', textContent: `${t}${typeof score === 'number' ? ` (${Math.round(score * 10) / 10})` : ''}` }),
     elem({
      tagName: 'button',
      textContent: '✅',
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
     }),
     elem({
      tagName: 'button',
      textContent: '❎',
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
     }),
    ],
   })
   return row
  }),
 })
 return wrap
}

function renderDocumentView(doc) {
 documentsState.view = 'view'
 clearDocumentsUI()
 const statusMessage = safeText(doc.statusMessage)
 const header = elem({
  tagName: 'header',
  classes: ['documents-view-header'],
  children: [
   elem({ tagName: 'h2', classes: ['documents-view-title'], textContent: safeText(doc.title) }),
   elem({
    tagName: 'div',
    classes: ['documents-view-meta'],
    children: [
     elem({ tagName: 'div', textContent: `Score: ${Math.round(doc.score * 10) / 10}` }),
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

 const buttons = elem({
  tagName: 'div',
  classes: ['documents-view-actions'],
  children: [
   elem({
    tagName: 'button',
    textContent: '🔙 Back to List',
    events: {
     click(e) {
      e.preventDefault()
      loadDocuments()
     },
    },
   }),
   elem({
    tagName: 'button',
    textContent: 'Preview',
    events: {
     click(e) {
      e.preventDefault()
      renderDocumentPreview(doc)
     },
    },
   }),
   elem({
    tagName: 'button',
    textContent: 'Download',
    events: {
     click(e) {
      e.preventDefault()
      downloadMarkdown(doc.title, doc.body)
     },
    },
   }),
   ...(doc.isDraft
    ? [
       elem({
        tagName: 'button',
        textContent: 'Edit',
        events: {
         click(e) {
          e.preventDefault()
          withLoading(showEdit(doc.id))
         },
        },
       }),
      ]
    : []),
  ],
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

function renderDocumentPreview(doc) {
 documentsState.view = 'preview'
 clearDocumentsUI()
 const statusMessage = safeText(doc.statusMessage)
 const header = elem({
  tagName: 'header',
  classes: ['documents-view-header'],
  children: [
   elem({ tagName: 'h2', classes: ['documents-view-title'], textContent: safeText(doc.title) }),
   elem({
    tagName: 'div',
    classes: ['documents-view-meta'],
    children: [
     elem({ tagName: 'div', textContent: getDocumentStatusText(doc) }),
     ...(statusMessage ? [elem({ tagName: 'div', textContent: statusMessage })] : []),
     elem({
      tagName: 'div',
      classes: ['documents-view-tags'],
      textContent: `Tags: ${Array.isArray(doc.tags) ? doc.tags.join(', ') : ''}`,
     }),
    ],
   }),
  ],
 })

 const article = elem({ tagName: 'article' })
 article.innerHTML = renderMarkdown(doc.body)

 const buttons = elem({
  tagName: 'div',
  classes: ['documents-view-actions'],
  children: [
   elem({
    tagName: 'button',
    textContent: '🔙 Back to List',
    events: {
     click(e) {
      e.preventDefault()
      loadDocuments()
     },
    },
   }),
   elem({
    tagName: 'button',
    textContent: 'Copy Share Link',
    events: {
     async click(e) {
      e.preventDefault()
      const shareUrl = `${window.location.origin}${window.location.pathname}?doc=${encodeURIComponent(doc.id)}&view=preview`
      try {
       await navigator.clipboard.writeText(shareUrl)
      } catch {
       // fallback
       const ta = document.createElement('textarea')
       ta.value = shareUrl
       document.body.appendChild(ta)
       ta.select()
       document.execCommand('copy')
       ta.remove()
      }
      alert('Share link copied')
     },
    },
   }),
   elem({
    tagName: 'button',
    textContent: 'Back to View',
    events: {
     click(e) {
      e.preventDefault()
      renderDocumentView(doc)
     },
    },
   }),
   elem({
    tagName: 'button',
    textContent: 'Download',
    events: {
     click(e) {
      e.preventDefault()
      downloadMarkdown(doc.title, doc.body)
     },
    },
   }),
  ],
 })

 const wrap = elem({
  tagName: 'div',
  classes: ['documents-view'],
  children: [
   header,
   renderVoteRow(doc),
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
  attributes: { value: safeText(doc?.title ?? ''), placeholder: 'Title' },
 })
 const tagsInput = elem({
  tagName: 'input',
  classes: ['documents-editor-input'],
  attributes: { value: Array.isArray(doc?.tags) ? doc.tags.join(', ') : '', placeholder: 'Tags (comma-separated)' },
 })
 const bodyArea = elem({
  tagName: 'textarea',
  classes: ['documents-editor-body'],
  attributes: { placeholder: 'Markdown body' },
 })
 bodyArea.value = safeText(doc?.body ?? '')

 const saveBtn = elem({
  tagName: 'button',
  textContent: 'Save',
  events: {
   async click(e) {
    e.preventDefault()
    const payload = {
     action: isCreate ? 'create' : 'save',
     id: doc?.id,
     ifRev: documentsState.openDocumentRev,
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
      renderDocumentView(updated)
     }
    } catch (err) {
     alert(err?.message ?? err)
    }
   },
  },
 })

 const downloadBtn = elem({
  tagName: 'button',
  textContent: 'Download',
  events: {
   click(e) {
    e.preventDefault()
    downloadMarkdown(titleInput.value || 'document', bodyArea.value)
   },
  },
 })

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
   bodyArea,
   elem({
    tagName: 'div',
    classes: ['documents-editor-actions'],
    children: [saveBtn, downloadBtn],
   }),
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

async function showPreview(id) {
 const data = await fetchDocument(id)
 const doc = data?.response?.document
 if (doc) {
  documentsState.openDocument = doc
  documentsState.openDocumentRev = doc.rev
  renderToolbar(data)
  renderDocumentPreview(doc)
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
 ensureDocumentsInlineStyle()
 const shared = getShareParams()
 if (shared?.id) {
  // Allow opening a document directly via share link.
  if (shared.view === 'preview') {
   await showPreview(shared.id)
  } else {
   await showView(shared.id)
  }
  return
 }
 const listData = await fetchDocumentsList()
 renderToolbar(listData)
 renderDocumentsList(listData)
}
