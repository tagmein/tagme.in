import { type PagesFunction } from '@cloudflare/workers-types'
import { Env } from './lib/env.js'
import { getKV } from './lib/getKV.js'
import { scroll } from './lib/scroll.js'

export const onRequestGet: PagesFunction<
 Env
> = async (context) => {
 const documents = [
  { id: 1 },
 ]
 return new Response(
  JSON.stringify({
   success: true,
   response: {
    documents,
   },
  }),
  {
   headers: {
    'Content-Type': 'application/json',
   },
  }
 )
}
