function networkStore(session, collectionName) {
 async function sendRequest(
  path,
  method,
  body
 ) {
  const headers = {
   Authorization: session.accessToken,
   'Content-Type': 'application/json',
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
  return sendRequest(
   `get?collectionName=${encodeURIComponent(
    collectionName
   )}&id=${encodeURIComponent(id)}`,
   'GET'
  )
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
  return sendRequest('list', 'POST', {
   collectionName,
   fieldList,
   skip,
   limit,
  })
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
