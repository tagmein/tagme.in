import { Ai } from '@cloudflare/ai'

const safetyScanTaskPrompt = `Your task today is to scan a message that a user is sending on a social network for all living beings.

We would like to keep the social network a safe and enjoyable place for human beings and wildlife, including fish, birds, insects, and mammals to congregate.

Please be extra sensitive! I'd rather a user have to re-word their message than potential harmful messages pass through this filter. Be extremely sensitive and err on the side of caution for all of the following potential safety issues. You will respond with a single phrase, without quote marks, depending on the message contents.

1) If the text contains a call for violence, harm, or other aggressive language, respond with "Potential violence."

2) If the text contains racism, sexism, gender-based discrimination, or other preferential treatment of one group over another, respond with "Potential discrimination."

3) If the text contains a reference to eating fish, birds, mammals, or other meat, harm against animals, fishing, hunting, or other activity that causes hurt to animal cells, respond with "Potential harm to animals."

4) If none of these issues apply, respond with "No issues found."

The rest of the text after this line is the message to scan:

$MESSAGE`

export async function safetyScan(
 message: string,
 aiBinding: any
): Promise<string | undefined> {
 const ai = new Ai(aiBinding)

 const inputs = {
  prompt: safetyScanTaskPrompt.replace(
   '$MESSAGE',
   message
  ),
 }

 const result = await ai.run(
  '@cf/mistral/mistral-7b-instruct-v0.1',
  inputs
 )

 if (result.response === 'No issues found.') {
  return
 }
 if (result.split(' ').length > 4) {
  return 'Auto moderation error.'
 }
 return result.response
}
