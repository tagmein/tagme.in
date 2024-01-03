import { CivilMemoryKV } from '@tagmein/civil-memory'

export async function voteForMessage(
 kv: CivilMemoryKV,
 messageId: string,
 hourId: string,
 hour: number
): Promise<number> {
 const key = {
  messageVotesCount: `message_votes#${messageId}`,
  messageVotesHour: `message_voted_hour_${hourId}#${messageId}`,
 }

 // Initialize or update message votes
 const existingVoteHour = await kv.get(
  key.messageVotesHour
 )

 const existingMessageVoteCount = await kv.get(
  key.messageVotesCount
 )

 // Message was already voted on this hour, do nothing
 if (existingVoteHour) {
  return typeof existingMessageVoteCount ===
   'string'
   ? parseInt(existingMessageVoteCount)
   : 0
 }

 // Claim the vote for this message for this hour
 await kv.set(key.messageVotesHour, '1')

 // Update the total vote count for the message

 const newMessageVotesCount =
  typeof existingMessageVoteCount === 'string'
   ? parseInt(existingMessageVoteCount) + 1
   : hour
 await kv.set(
  key.messageVotesCount,
  newMessageVotesCount.toString(10)
 )

 return newMessageVotesCount
}
