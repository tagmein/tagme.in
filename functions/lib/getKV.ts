import { type EventContext } from '@cloudflare/workers-types'
import {
 CivilMemoryKV,
 civilMemoryKV,
} from '@tagmein/civil-memory'
import { Env } from './env'
import { sessionIsExpired } from './session'

export async function getKV({
 env,
 request,
}: EventContext<
 Env,
 any,
 Record<string, unknown>
>): Promise<CivilMemoryKV | undefined> {
 const authorization = request.headers.get(
  'authorization'
 )
 if (typeof authorization === 'string') {
  const authKV = civilMemoryKV.cloudflare({
   binding: env.TAGMEIN_AUTH_KV,
  })
  const sessionKey = `session.accessToken#${authorization}`
  const sessionString = await authKV.get(
   sessionKey
  )
  if (typeof sessionString !== 'string') {
   return
  }
  const session = JSON.parse(sessionString)
  if (!session || sessionIsExpired(session)) {
   return
  }
  if (!session.email?.includes?.('@')) {
   return
  }
  const privateKV = civilMemoryKV.cloudflare({
   binding: env.TAGMEIN_PRIVATE_KV,
  })
  const privateNamespacePrefix = `[email=${encodeURIComponent(
   session.email
  )}]`
  return {
   delete(key) {
    return privateKV.delete(
     `${privateNamespacePrefix}${key}`
    )
   },
   get(key) {
    return privateKV.get(
     `${privateNamespacePrefix}${key}`
    )
   },
   set(key, value) {
    return privateKV.set(
     `${privateNamespacePrefix}${key}`,
     value
    )
   },
  }
 } else {
  return civilMemoryKV.cloudflare({
   binding: env.TAGMEIN_KV,
  })
 }
}
