import { fetchWithTimeout } from './fetchWithTimeout.js'

export async function extractTags(
 url: string
): Promise<Record<string, string>> {
 const tags: Record<string, string> = {}
 try {
  const response = await fetchWithTimeout(url)
  const html = await response.text()
  const tagRegex =
   /<meta\s+property="og:([^"]+)"\s+content="([^"]*)"\s*\/?>/gi
  let match: null | string[]
  while ((match = tagRegex.exec(html))) {
   tags[match[1]] = match[2]
  }
 } catch (e) {
  tags.title = `Error: ${e.message}`
 }
 return tags
}
