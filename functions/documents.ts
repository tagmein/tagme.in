import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'
import { getKV } from './lib/getKV.js'
import { store } from './lib/store.js'

const ONE_HOUR_MS = 60 * 60 * 1000
const DOCUMENTS_COLLECTION = 'documents'

type TagMode = 'OR' | 'AND'
type StatusFilter = 'published' | 'draft' | 'all'

interface VoteData {
 position: number
 velocity: number
 timestamp: number
}

interface StoredDocument {
 id: string
 title: string
 body: string
 tags: string[]
 created: number
 modified: number
 rev: number
 vote: VoteData
 tagVotes: Record<string, VoteData>
}

interface DocumentComputed {
 id: string
 title: string
 body?: string
 tags: string[]
 topTags?: string[]
 created: number
 modified: number
 rev: number
 score: number
 velocity: number
 charCount: number
 isDraft: boolean
 tagScores?: Record<string, number>
 tagVelocities?: Record<string, number>
}

function clampVelocity(v: number) {
 if (v > 10) return 10
 if (v < -10) return -10
 return v
}

function asStringArray(input: unknown): string[] {
 if (!Array.isArray(input)) return []
 return input
  .filter((x) => typeof x === 'string')
  .map((x) => x.trim())
  .filter((x) => x.length > 0)
}

function normalizeTag(tag: string) {
 return tag.trim()
}

function normalizeTags(tags: string[]) {
 return Array.from(
  new Set(tags.map(normalizeTag).filter((t) => t.length > 0))
 ).slice(0, 25)
}

function calculateScore(v: VoteData, now = Date.now()) {
 return v.position + (v.velocity * (now - v.timestamp)) / ONE_HOUR_MS
}

function updateVelocity(v: VoteData, delta: number, now = Date.now()): VoteData {
 const scoreNow = calculateScore(v, now)
 return {
  position: scoreNow,
  velocity: clampVelocity(v.velocity + delta),
  timestamp: now,
 }
}

function toComputed(
 doc: StoredDocument,
 includeBody: boolean,
 now = Date.now()
): DocumentComputed {
 const score = calculateScore(doc.vote, now)
 const velocity = doc.vote.velocity
 const charCount = doc.body.length
 const isDraft = score < charCount

 const tagScores: Record<string, number> = {}
 const tagVelocities: Record<string, number> = {}
 for (const tag of doc.tags) {
  const vote = doc.tagVotes[tag]
  const effectiveVote = vote ?? {
   position: 0,
   velocity: 0,
   timestamp: doc.created,
  }
  tagScores[tag] = calculateScore(effectiveVote, now)
  tagVelocities[tag] = effectiveVote.velocity
 }

 const computed: DocumentComputed = {
  id: doc.id,
  title: doc.title,
  tags: doc.tags,
  created: doc.created,
  modified: doc.modified,
  rev: doc.rev,
  score,
  velocity,
  charCount,
  isDraft,
 }

 // In list mode, expose only the top tags (net score > 1) per spec.
 if (!includeBody) {
  const topTags = doc.tags
   .map((t) => {
    const vote = doc.tagVotes[t] ?? {
     position: 0,
     velocity: 0,
     timestamp: doc.created,
    }
    return { tag: t, score: calculateScore(vote, now) }
   })
   .filter((x) => x.score > 1)
   .sort((a, b) => b.score - a.score)
   .slice(0, 3)
   .map((x) => x.tag)
  computed.topTags = topTags
 }
 if (includeBody) {
  computed.body = doc.body
  computed.tagScores = tagScores
  computed.tagVelocities = tagVelocities
 }
 return computed
}

function json(data: unknown, status = 200) {
 return new Response(JSON.stringify(data), {
  status,
  headers: {
   'Content-Type': 'application/json',
  },
 })
}

function errorText(message: string, status = 400) {
 return new Response(message, { status })
}

async function listAllDocs(kv: any): Promise<StoredDocument[]> {
 const s = store(kv)
 const items = await s.list(DOCUMENTS_COLLECTION)
 return items as StoredDocument[]
}

async function getDoc(kv: any, id: string): Promise<StoredDocument | null> {
 const s = store(kv)
 const item = await s.get(DOCUMENTS_COLLECTION, id)
 return (item as StoredDocument) ?? null
}

async function insertDoc(kv: any, doc: StoredDocument) {
 const s = store(kv)
 await s.insert(DOCUMENTS_COLLECTION, doc.id, doc as any)
}

async function patchDoc(kv: any, id: string, patch: Partial<StoredDocument>) {
 const s = store(kv)
 await s.patch(DOCUMENTS_COLLECTION, id, patch as any)
}

async function deleteDoc(kv: any, id: string) {
 const s = store(kv)
 await s.delete(DOCUMENTS_COLLECTION, id)
}

function shouldHideExpiredDraft(doc: StoredDocument, now = Date.now()) {
 const score = calculateScore(doc.vote, now)
 const isDraft = score < doc.body.length
 if (!isDraft) return false
 return score <= 0
}

function tagsMatch(docTags: string[], selected: string[], tagMode: TagMode) {
 if (selected.length === 0) return true
 const set = new Set(docTags)
 if (tagMode === 'AND') {
  return selected.every((t) => set.has(t))
 }
 return selected.some((t) => set.has(t))
}

function safeId() {
 return typeof crypto?.randomUUID === 'function'
  ? crypto.randomUUID()
  : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export const onRequestGet: PagesFunction<
 Env
> = async (context) => {
 const url = new URL(context.request.url)
 const kvUrl = url.searchParams.get('kv')
 const kv = await getKV(context, true, kvUrl ?? undefined)
 if (!kv) {
  return json({ error: 'not authorized' }, 401)
 }

 const id = url.searchParams.get('id')
 if (typeof id === 'string' && id.length > 0) {
  const doc = await getDoc(kv, id)
  if (!doc) {
   return errorText('document not found', 404)
  }
  const now = Date.now()
  if (shouldHideExpiredDraft(doc, now)) {
   await deleteDoc(kv, id)
   return errorText('document not found', 404)
  }
  return json({ success: true, response: { document: toComputed(doc, true, now) } })
 }

 const tagsParam = url.searchParams.get('tags')
 const tags = typeof tagsParam === 'string' && tagsParam.length > 0
  ? normalizeTags(tagsParam.split(',').map((t) => t.trim()).filter((t) => t.length > 0))
  : []
 const tagMode = (url.searchParams.get('tagMode') ?? 'OR') as TagMode
 const status = (url.searchParams.get('status') ?? 'published') as StatusFilter
 const now = Date.now()

 const allDocs = await listAllDocs(kv)
 const visibleDocs: StoredDocument[] = []
 for (const doc of allDocs) {
  if (shouldHideExpiredDraft(doc, now)) {
   await deleteDoc(kv, doc.id)
   continue
  }
  visibleDocs.push(doc)
 }

 const filteredDocs = visibleDocs.filter((doc) => {
  const score = calculateScore(doc.vote, now)
  const isDraft = score < doc.body.length
  if (status === 'published' && isDraft) return false
  if (status === 'draft' && !isDraft) return false
  return tagsMatch(doc.tags, tags, tagMode)
 })

 const documents = filteredDocs
  .map((d) => toComputed(d, false, now))
  .sort((a, b) => b.score - a.score)

 const tagTotals: Record<string, number> = {}
 for (const doc of visibleDocs) {
  const score = calculateScore(doc.vote, now)
  const isDraft = score < doc.body.length
  if (status === 'published' && isDraft) continue
  if (status === 'draft' && !isDraft) continue
  for (const tag of doc.tags) {
   const vote = doc.tagVotes[tag] ?? { position: 0, velocity: 0, timestamp: doc.created }
   tagTotals[tag] = (tagTotals[tag] ?? 0) + calculateScore(vote, now)
  }
 }
 const topTags = Object.entries(tagTotals)
  .map(([name, score]) => ({ name, score }))
  .filter((t) => t.score > 1)
  .sort((a, b) => b.score - a.score)
  .slice(0, 25)

 return json({ success: true, response: { documents, tags: topTags } })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
 const url = new URL(context.request.url)
 const kvUrl = url.searchParams.get('kv')
 const kv = await getKV(context, true, kvUrl ?? undefined)
 if (!kv) {
  return json({ error: 'not authorized' }, 401)
 }

 let body: any
 try {
  body = await context.request.json()
 } catch {
  return errorText('unable to parse incoming JSON post body', 400)
 }

 const action = body?.action
 const now = Date.now()

 if (action === 'create') {
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const docBody = typeof body?.body === 'string' ? body.body : ''
  const tags = normalizeTags(asStringArray(body?.tags))
  if (title.length === 0) return errorText('missing title', 400)
  if (docBody.length === 0) return errorText('missing body', 400)

  const initialVotePosition =
   docBody.length > 0
    ? Math.min(1, docBody.length - 0.0001)
    : 0

  const id = safeId()
  const tagVotes: Record<string, VoteData> = {}
  for (const tag of tags) {
   tagVotes[tag] = { position: 0, velocity: 0, timestamp: now }
  }
  const doc: StoredDocument = {
   id,
   title,
   body: docBody,
   tags,
   created: now,
   modified: now,
   rev: 1,
   vote: { position: initialVotePosition, velocity: 0, timestamp: now },
   tagVotes,
  }
  await insertDoc(kv, doc)
  return json({ success: true, response: { document: toComputed(doc, true, now) } })
 }

 if (action === 'save') {
  const id = typeof body?.id === 'string' ? body.id : ''
  const ifRev = typeof body?.ifRev === 'number' ? body.ifRev : NaN
  if (!id) return errorText('missing id', 400)
  if (isNaN(ifRev)) return errorText('missing ifRev', 400)

  const existing = await getDoc(kv, id)
  if (!existing) return errorText('document not found', 404)
  if (existing.rev !== ifRev) {
   return errorText(
    'The document has been modified since you opened it and cannot be saved.',
    409
   )
  }

  const score = calculateScore(existing.vote, now)
  const charCount = existing.body.length
  if (score >= charCount) {
   return errorText('document is locked', 403)
  }

  const title = typeof body?.title === 'string' ? body.title.trim() : existing.title
  const docBody = typeof body?.body === 'string' ? body.body : existing.body
  if (typeof body?.body === 'string' && docBody.length === 0) {
   return errorText('missing body', 400)
  }
  const tags = normalizeTags(asStringArray(body?.tags))
  const nextRev = existing.rev + 1

  const nextTagVotes: Record<string, VoteData> = { ...existing.tagVotes }
  for (const tag of tags) {
   if (!nextTagVotes[tag]) {
    nextTagVotes[tag] = { position: 0, velocity: 0, timestamp: now }
   }
  }
  for (const tag of Object.keys(nextTagVotes)) {
   if (!tags.includes(tag)) {
    delete nextTagVotes[tag]
   }
  }

  await patchDoc(kv, id, {
   title,
   body: docBody,
   tags,
   tagVotes: nextTagVotes,
   modified: now,
   rev: nextRev,
  })

  const updated = await getDoc(kv, id)
  if (!updated) return errorText('document not found', 404)
  return json({ success: true, response: { document: toComputed(updated, true, now) } })
 }

 if (action === 'vote') {
  const id = typeof body?.id === 'string' ? body.id : ''
  const delta = typeof body?.delta === 'number' ? body.delta : 0
  if (!id) return errorText('missing id', 400)
  if (delta !== 1 && delta !== -1) return errorText('delta must be 1 or -1', 400)
  const existing = await getDoc(kv, id)
  if (!existing) return errorText('document not found', 404)
  const nextVote = updateVelocity(existing.vote, delta, now)
  await patchDoc(kv, id, {
   vote: nextVote,
   modified: now,
   rev: existing.rev + 1,
  })
  const updated = await getDoc(kv, id)
  if (!updated) return errorText('document not found', 404)
  if (shouldHideExpiredDraft(updated, now)) {
   await deleteDoc(kv, id)
   return errorText('document not found', 404)
  }
  return json({ success: true, response: { document: toComputed(updated, true, now) } })
 }

 if (action === 'tagVote') {
  const id = typeof body?.id === 'string' ? body.id : ''
  const tag = typeof body?.tag === 'string' ? normalizeTag(body.tag) : ''
  const delta = typeof body?.delta === 'number' ? body.delta : 0
  if (!id) return errorText('missing id', 400)
  if (!tag) return errorText('missing tag', 400)
  if (delta !== 1 && delta !== -1) return errorText('delta must be 1 or -1', 400)
  const existing = await getDoc(kv, id)
  if (!existing) return errorText('document not found', 404)
  if (!existing.tags.includes(tag)) {
   return errorText('tag not found on document', 404)
  }
  const vote = existing.tagVotes[tag] ?? { position: 0, velocity: 0, timestamp: existing.created }
  const nextVote = updateVelocity(vote, delta, now)
  await patchDoc(kv, id, {
   tagVotes: { ...existing.tagVotes, [tag]: nextVote },
   modified: now,
   rev: existing.rev + 1,
  })
  const updated = await getDoc(kv, id)
  if (!updated) return errorText('document not found', 404)
  return json({ success: true, response: { document: toComputed(updated, true, now) } })
 }

 return errorText('unknown action', 400)
}
