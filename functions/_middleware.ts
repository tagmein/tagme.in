export const onRequestOptions: PagesFunction =
 async function () {
  return new Response(null, {
   status: 204,
   headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
     '*, Authorization',
    'Access-Control-Allow-Methods':
     'GET, OPTIONS, POST',
    'Access-Control-Max-Age': '86400',
   },
  })
 }

export const onRequest: PagesFunction =
 async function (context) {
  const response = await context.next()
  response.headers.set(
   'Access-Control-Allow-Origin',
   '*'
  )
  response.headers.set(
   'Access-Control-Max-Age',
   '86400'
  )
  return response
 }
