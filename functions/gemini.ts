import { GoogleGenerativeAI } from '@google/generative-ai'

const { GEMINI_API_KEY } = process.env

if (!GEMINI_API_KEY) {
 throw new Error(
  'GEMINI_API_KEY is not set in the environment variables.'
 )
}

const genAI = new GoogleGenerativeAI(
 GEMINI_API_KEY
)

export async function generateContent({
 model,
 contents,
}: {
 model: string
 contents: string
}) {
 const generativeModel =
  genAI.getGenerativeModel({ model })
 const result =
  await generativeModel.generateContent(
   contents
  )
 const response = await result.response
 const text = response.text()
 return text
}

export async function seekChannelMessages(
 channel: string,
 hour: number
) {
 // Simulate fetching messages from a channel
 return `Simulated messages for channel: ${channel}, hour: ${hour}`
}
