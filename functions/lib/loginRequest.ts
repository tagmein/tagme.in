import { CivilMemoryKV } from '@tagmein/civil-memory'
import { randomId } from './randomId.js'

const LOGIN_REQUEST_EXPIRES_AFTER =
 5 * 60 * 1000 // 5 minutes

export async function createLoginRequest(
 kv: CivilMemoryKV,
 email: string
): Promise<string> {
 const uniqueId = randomId()

 const key = {
  emailUniqueIdList: `auth.email.uniqueIdList#${email}`,
  uniqueId: `auth.email.uniqueId#${uniqueId}`,
 }

 const emailUniqueIdString = await kv.get(
  key.emailUniqueIdList
 )
 const emailUniqueIdList = [
  ...(typeof emailUniqueIdString === 'string'
   ? JSON.parse(emailUniqueIdString)
   : []),
  uniqueId,
 ]

 await kv.set(
  key.emailUniqueIdList,
  JSON.stringify(emailUniqueIdList)
 )

 await kv.set(
  key.uniqueId,
  JSON.stringify({
   created: Date.now(),
   email,
  })
 )
 return uniqueId
}

export async function deleteLoginRequest(
 kv: CivilMemoryKV,
 email: string,
 uniqueId: string
) {
 const key = {
  uniqueId: `auth.email.uniqueId#${uniqueId}`,
 }

 await kv.delete(key.uniqueId)

 const key2 = {
  emailUniqueIdList: `auth.email.uniqueIdList#${email}`,
 }

 const emailUniqueIdString = await kv.get(
  key2.emailUniqueIdList
 )

 const emailUniqueIdList = [
  ...(typeof emailUniqueIdString === 'string'
   ? JSON.parse(emailUniqueIdString)
   : []),
 ].filter((x) => x !== uniqueId)

 await kv.set(
  key2.emailUniqueIdList,
  JSON.stringify(emailUniqueIdList)
 )
}

export async function approveLoginRequest(
 kv: CivilMemoryKV,
 uniqueId: string,
 code: string
): Promise<string | true> {
 const key = {
  uniqueId: `auth.email.uniqueId#${uniqueId}`,
 }

 const loginRequestString = await kv.get(
  key.uniqueId
 )

 if (!loginRequestString) {
  return 'log in request not found'
 }

 const { created, email } = JSON.parse(
  loginRequestString
 )

 if (
  Date.now() >
  created + LOGIN_REQUEST_EXPIRES_AFTER
 ) {
  await deleteLoginRequest(kv, email, uniqueId)
  return 'log in request has expired'
 }

 await kv.set(
  key.uniqueId,
  JSON.stringify({
   created,
   email,
   code,
  })
 )
 return true
}
