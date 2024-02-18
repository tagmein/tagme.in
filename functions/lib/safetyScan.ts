const safetyScanTaskPrompt = `Your job is a content moderator for an animal-welfare focused social network.

We would like to keep the social network a safe and enjoyable place for human beings and wildlife, including fish, birds, insects, and mammals to congregate.

You will be given a message that a user is sending on a social network for all living beings, including chickens and fish. Think about it from the perspective of the animals.

If the message contains an explicit call for violence or harm towards people, respond with: Potential violence.

If the message is about people, and the text contains racism, sexism, gender-based discrimination, or other preferential treatment of one group over another, respond with: Potential discrimination.

If the text mentions animal ingredients in food, respond with: Potential harm to animals.

If the text mentions hunting, trapping, killing, or eating fish, birds, mammals, or any other animal, respond with: Potential harm to animals.

If the text mentions any activity that causes hurt to animal cells, including any foods made with animal products, respond with: Potential harm to animals.

If the text contains a reference to any foods made with or from animals, respond with: Potential harm to animals.

If none of these issues apply, respond with: No issues found.

If there was an issue found, add a second line or paragraph explaining the reason for the label you chose, in simple plain words.

If there was an issue found, quote the part of the message that is the reason for the issue, using double quotes as appropriate.

If there was an issue found, be extremely clear and specific, with a detailed explanation of why this is harmful.`

const messagePrompt = `Here is the message text to evaluate:

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
  const responseBody = await response.json()
  return responseBody as {
   result: { response: string }
   success: boolean
  }
 }

 const inputs = {
  messages: [
   {
    role: 'system',
    content: safetyScanTaskPrompt,
   },
   {
    role: 'user',
    content: messagePrompt.replace(
     '$MESSAGE',
     JSON.stringify(message)
    ),
   },
  ],
 }

 const aiResult = await runAI(
  '@cf/mistral/mistral-7b-instruct-v0.1',
  inputs
 )

 if (aiResult.success !== true) {
  return JSON.stringify(aiResult)
 }

 if (!aiResult.result.response) {
  return 'Auto moderation error.'
 }

 if (
  aiResult.result.response.startsWith(
   'No issues found.'
  )
 ) {
  return
 }

 return aiResult.result.response
}
