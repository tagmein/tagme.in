import { type EventContext } from '@cloudflare/workers-types'
import {
 CivilMemoryKV,
 civilMemoryKV,
} from '../modules/civil-memory/index.mjs'
import { Env } from './env.js'
import { sessionIsExpired } from './session.js'
import { store } from './store.js'

export async function getKV(
 {
  env,
  request,
 }: EventContext<
  Env,
  any,
  Record<string, unknown>
 >,
 allowPublic: boolean = true,
 overrideKVUrl?: string
): Promise<CivilMemoryKV | undefined> {
 if (
  typeof overrideKVUrl === 'string' &&
  overrideKVUrl.length > 0
 ) {
  return civilMemoryKV.http({
   baseUrl: overrideKVUrl,
  })
 }
 const authorization = request.headers.get(
  'authorization'
 )
 if (typeof authorization === 'string') {
  const authKV =
   env.TAGMEIN_LOCAL_KV === 'true'
    ? civilMemoryKV.http({
       baseUrl:
        typeof env.TAGMEIN_LOCAL_KV_BASEURL ===
        'string'
         ? `${env.TAGMEIN_LOCAL_KV_BASEURL}?mode=disk&modeOptions.disk.basePath=./.kv-auth`
         : 'http://localhost:3333?mode=disk&modeOptions.disk.basePath=./.kv-auth',
      })
    : civilMemoryKV.cloudflare({
       binding: env.TAGMEIN_AUTH_KV,
      })
  const sessionKey = `session.accessToken#${authorization}`
  const sessionString =
   await authKV.get(sessionKey)
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
  const privateKV =
   env.TAGMEIN_LOCAL_KV === 'true'
    ? civilMemoryKV.http({
       baseUrl:
        typeof env.TAGMEIN_LOCAL_KV_BASEURL ===
        'string'
         ? `${env.TAGMEIN_LOCAL_KV_BASEURL}?mode=disk&modeOptions.disk.basePath=./.kv-private`
         : 'http://localhost:3333?mode=disk&modeOptions.disk.basePath=./.kv-private',
      })
    : civilMemoryKV.cloudflare({
       binding: env.TAGMEIN_PRIVATE_KV,
      })
  const realm = request.headers.get('x-realm')
  if (realm) {
   return getPermittedRealmNamespaceKV(
    privateKV,
    session.email,
    realm
   )
  }
  const emailNamespace = `[email=${encodeURIComponent(
   session.email
  )}]`
  return namespacedKV(privateKV, emailNamespace)
 } else if (allowPublic) {
  return env.TAGMEIN_LOCAL_KV === 'true'
   ? civilMemoryKV.http({
      baseUrl:
       typeof env.TAGMEIN_LOCAL_KV_BASEURL ===
       'string'
        ? `${env.TAGMEIN_LOCAL_KV_BASEURL}?mode=disk&modeOptions.disk.basePath=./.kv-public`
        : 'http://localhost:3333?mode=disk&modeOptions.disk.basePath=./.kv-public',
     })
   : civilMemoryKV.cloudflare({
      binding: env.TAGMEIN_KV,
     })
 }
}

function namespacedKV(
 kv: CivilMemoryKV,
 namespace: string
) {
 return {
  delete(key: string) {
   return kv.delete(`${namespace}${key}`)
  },
  get(key: string) {
   return kv.get(`${namespace}${key}`)
  },
  set(key: string, value: string) {
   return kv.set(`${namespace}${key}`, value)
  },
 }
}

async function getPermittedRealmNamespaceKV(
 privateKV: CivilMemoryKV,
 email: string,
 realm: string
): Promise<CivilMemoryKV | undefined> {
 const realmKV = namespacedKV(
  privateKV,
  `[realm=${encodeURIComponent(realm)}]`
 )
 const [encodedEmail] = realm.split('#')
 const realmOwnerEmail =
  decodeURIComponent(encodedEmail)
 const realmStore = store(realmKV)
 if (realmOwnerEmail === email) {
  // always grant permission to realm owner
  return realmKV
 }
 if (
  await realmStore.get('system.members', email)
 ) {
  // grant permission to realm members
  return realmKV
 }
}
