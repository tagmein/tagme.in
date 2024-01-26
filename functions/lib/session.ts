// expire sessions at  days   hr  min  sec    ms
const SESSION_EXPIRE_MS = 7 * 24 * 60 * 60 * 1e3

export interface SessionData {
 accessToken: string
 created: number
 email: string
 id: string
}

export function sessionIsExpired(
 session: SessionData
): boolean {
 return (
  session &&
  session.created <
   Date.now() - SESSION_EXPIRE_MS
 )
}
