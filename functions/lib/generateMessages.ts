const generateMessagesTaskPrompt = `You are a bot designed to uplift and inspire humanity with all the enthusiasm your training data can muster.

You will be given the name of a "channel" and you should come up with 10 unique messages that are suitable for that channel.

Try to make the messages as relevant to the channel name and any additional context provided as possible.

Feel free to have a sense of humor in your replies, or keep it plain. Maybe you can mix it up.

The home page channel will be given as "", which means you can generate the most uplifting ideas you can conjure with no limits!

Print the messages as 10 separate lines of text with no extra adornment. Keep each message on a single line, without quote marks.

Keep the messages to $LENGTH characters or less. Be sure to capitalize the messages properly with Sentence case.`

const channelOnlyPrompt = `Consider this channel name when formulating your ideas:

$CHANNEL`

const channelAndMessagePrompt = `Here is the name of the channel:

$CHANNEL

Here is some text to consider in generating your responses:

$MESSAGE`

const excludeMessagesPrompts = `

Don't include the following responses, we already have these:

$EXCLUDE`

export async function generateMessages(
 maxMessageLength: number,
 workersAIApiToken: string,
 exclude: string[],
 channel: string,
 message?: string
): Promise<string[] | undefined> {
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
    content:
     generateMessagesTaskPrompt.replace(
      '$LENGTH',
      (maxMessageLength - 10).toString(10)
     ) +
     (Array.isArray(exclude) &&
     exclude.length > 0
      ? excludeMessagesPrompts.replace(
         '$EXCLUDE',
         exclude
          .map((x) => JSON.stringify(x))
          .join('\n\n')
        )
      : ''),
   },
   {
    role: 'user',
    content:
     typeof message === 'string'
      ? channelAndMessagePrompt
         .replace(
          '$CHANNEL',
          JSON.stringify(channel)
         )
         .replace(
          '$MESSAGE',
          JSON.stringify(message)
         )
      : channelOnlyPrompt.replace(
         '$CHANNEL',
         JSON.stringify(channel)
        ),
   },
  ],
 }

 const aiResult = await runAI(
  '@cf/mistral/mistral-7b-instruct-v0.1',
  inputs
 )

 if (aiResult.success !== true) {
  return [JSON.stringify(aiResult)]
 }

 if (!aiResult.result.response) {
  return ['Generation error.']
 }

 return aiResult.result.response
  .split('\n')
  .filter((x) => x.trim().length > 0)
  .map(cleanMessage)
}

function cleanMessage(message: string): string {
 const cleaned = message.replace(
  /^\d*\.?\s?/,
  ''
 )
 if (
  cleaned.startsWith('"') &&
  cleaned.endsWith('"')
 ) {
  return cleaned
   .replace(/^\"/, '')
   .replace(/\"$/, '')
 }
 return cleaned
}
