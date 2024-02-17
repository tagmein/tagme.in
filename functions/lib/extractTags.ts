import { fetchWithTimeout } from './fetchWithTimeout.js'

export async function extractTags(
 url: string
): Promise<Record<string, string>> {
 const tags: Record<string, string> = {}
 try {
  const response = await fetchWithTimeout(url)
  const html = await response.text()

  let inTag = false
  let currentTag: string = ''
  for (let i = 0; i < html.length; i++) {
   if (html[i] === '<') {
    inTag = true
    currentTag = ''
   } else if (html[i] === '>') {
    inTag = false
    const parts = currentTag.split(' ')
    if (
     parts[0] === 'meta' &&
     parts[1]?.startsWith('property="og:')
    ) {
     const key = parts[1]
      .split('=')[1]
      .slice(1, -1)
     const content = parts[2]
      ?.split('=')[1]
      .slice(1, -1)
     tags[key] = content
    }
   } else if (inTag) {
    currentTag += html[i]
   }
  }
 } catch (e) {
  tags.title = `Error: ${e.message}`
 }
 return tags
}
