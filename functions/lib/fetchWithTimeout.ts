export async function fetchWithTimeout(
 url: string,
 options: { timeout?: number } = {}
) {
 const { timeout = 5000 } = options

 const controller = new AbortController()
 const id = setTimeout(
  () => controller.abort(),
  timeout
 )

 const response = await fetch(url, {
  ...options,
  signal: controller.signal,
 })
 clearTimeout(id)

 return response
}
