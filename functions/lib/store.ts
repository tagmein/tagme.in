import { CivilMemoryKV } from '../modules/civil-memory/index.mjs'

interface CollectionIndex {
 [collectionName: string]: string[]
}

export function store(kv: CivilMemoryKV) {
 function collectionIndexKey(
  collectionName: string
 ) {
  return `store.index#${encodeURIComponent(
   collectionName
  )}`
 }
 function collectionItemKey(
  collectionName: string,
  id: string
 ) {
  return `store.item:${encodeURIComponent(
   collectionName
  )}#${encodeURIComponent(id)}`
 }
 async function getCollectionIndex(
  collectionName: string
 ): Promise<string[]> {
  const indexString = await kv.get(
   collectionIndexKey(collectionName)
  )
  return indexString
   ? JSON.parse(indexString)
   : []
 }

 async function updateCollectionIndex(
  collectionName: string,
  ids: string[]
 ): Promise<void> {
  await kv.set(
   collectionIndexKey(collectionName),
   JSON.stringify(ids)
  )
 }

 async function _delete(
  collectionName: string,
  id: string
 ): Promise<void> {
  const ids = await getCollectionIndex(
   collectionName
  )
  const index = ids.indexOf(id)
  if (index !== -1) {
   ids.splice(index, 1)
   await updateCollectionIndex(
    collectionName,
    ids
   )
  }

  await kv.delete(
   collectionItemKey(collectionName, id)
  )
 }

 async function get(
  collectionName: string,
  id: string
 ): Promise<Record<string, any> | null> {
  const itemString = await kv.get(
   collectionItemKey(collectionName, id)
  )
  if (itemString) {
   const item = JSON.parse(itemString)
   return { id, ...item }
  }
  return null
 }

 async function insert(
  collectionName: string,
  id: string,
  item: Record<string, any>
 ): Promise<void> {
  const ids = await getCollectionIndex(
   collectionName
  )
  const itemExists = await kv.get(
   collectionItemKey(collectionName, id)
  )

  if (itemExists) {
   throw new Error(
    `Item with id ${id} already exists in collection ${collectionName}`
   )
  }

  await kv.set(
   collectionItemKey(collectionName, id),
   JSON.stringify(item)
  )

  if (!ids.includes(id)) {
   ids.push(id)
   await updateCollectionIndex(
    collectionName,
    ids
   )
  }
 }

 async function list(
  collectionName: string,
  fieldList?: string[],
  skip: number = 0,
  limit: number = 100
 ): Promise<Record<string, any>[]> {
  const ids = await getCollectionIndex(
   collectionName
  )
  const selectedIds = ids.slice(
   skip,
   skip + limit
  )

  const itemPromises = selectedIds.map(
   async (id) => {
    const itemString = await kv.get(
     collectionItemKey(collectionName, id)
    )
    if (itemString) {
     const item = JSON.parse(itemString)
     const filteredItem: Record<string, any> = {
      id,
     }
     if (fieldList) {
      for (const field of fieldList) {
       if (field in item) {
        filteredItem[field] = item[field]
       }
      }
     } else {
      Object.assign(filteredItem, item)
     }
     return filteredItem
    }
    return null
   }
  )

  const items = await Promise.all(itemPromises)
  return items.filter(
   (item): item is Record<string, any> =>
    item !== null
  )
 }

 async function patch(
  collectionName: string,
  id: string,
  item: Record<string, any>
 ): Promise<void> {
  const itemKey = collectionItemKey(
   collectionName,
   id
  )
  const existingItemString = await kv.get(
   itemKey
  )
  const existingItem = existingItemString
   ? JSON.parse(existingItemString)
   : {}

  Object.assign(existingItem, item)
  await kv.set(
   itemKey,
   JSON.stringify(existingItem)
  )

  const ids = await getCollectionIndex(
   collectionName
  )
  if (!ids.includes(id)) {
   ids.push(id)
   await updateCollectionIndex(
    collectionName,
    ids
   )
  }
 }

 return {
  delete: _delete,
  get,
  insert,
  list,
  patch,
 }
}
