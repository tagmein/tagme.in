function networkStore(session, collectionName) {
 async function sendRequest(
  path,
  method,
  body
 ) {
  const headers = {
   Authorization: session.accessToken,
   'Content-Type': 'application/json',
   'X-Realm': session.realm,
  }
  const postBody = body
   ? JSON.stringify(body)
   : undefined
  if (body) {
   headers['Content-Length'] = postBody.length
  }
  const response = await fetch(
   `${networkRootUrl()}/store/${path}`,
   {
    method,
    headers,
    body: postBody,
   }
  )
  if (!response.ok) {
   throw new Error(
    `${
     response.statusText
    }: ${await response.text()}`
   )
  }
  return response.json()
 }

 async function get(id) {
  const response = await sendRequest(
   `get?collectionName=${encodeURIComponent(
    collectionName
   )}&id=${encodeURIComponent(id)}`,
   'GET'
  )
  if ('item' in response) {
   return response.item
  }
 }

 async function _delete(id) {
  return sendRequest('delete', 'POST', {
   collectionName,
   id,
  })
 }

 async function insert(id, item) {
  return sendRequest('insert', 'POST', {
   collectionName,
   id,
   item,
  })
 }

 async function list(fieldList, skip, limit) {
  const response = await sendRequest(
   'list',
   'POST',
   {
    collectionName,
    fieldList,
    skip,
    limit,
   }
  )
  if ('items' in response) {
   return response.items
  }
 }

 async function patch(id, item) {
  return sendRequest('patch', 'POST', {
   collectionName,
   id,
   item,
  })
 }

 return {
  get,
  delete: _delete,
  insert,
  list,
  patch,
 }
}
