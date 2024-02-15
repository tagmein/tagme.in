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
 workersAIApiToken: string,
 message: string
): Promise<string | undefined> {
 async function runAI(
  model: string,
  input: object
 ) {
  const response = await fetch(
   `https://api.cloudflare.com/client/v4/accounts/0b2831b75e4f98d2b5526e33da07b55a/ai/run/${model}`,
   {
    headers: {
     Authorization: `Bearer ${workersAIApiToken}`,
    },
    method: 'POST',
    body: JSON.stringify(input),
   }
  )
  const result = await response.json()
  return result as {
   response: string
   success: boolean
  }
 }

 const inputs = {
  messages: [
   {
    role: 'system',
    content:
     'You are a friendly assistan that helps write stories',
   },
   {
    role: 'user',
    content: safetyScanTaskPrompt.replace(
     '$MESSAGE',
     message
    ),
   },
  ],
 }

 const result = await runAI(
  '@cf/mistral/mistral-7b-instruct-v0.1',
  inputs
 )

 console.log(JSON.stringify(result))

 if (result.success !== true) {
  return (
   JSON.stringify(result) +
   typeof workersAIApiToken +
   workersAIApiToken?.slice?.(0, 10)
  )
 }

 if (!result.response) {
  return 'Auto moderation error.'
 }

 if (result.response === 'No issues found.') {
  return
 }

 if (result.response.split(' ').length > 4) {
  return 'Auto moderation error.'
 }

 return result.response
}
