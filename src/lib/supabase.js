import { createClient } from '@supabase/supabase-js'
export const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321',import.meta.env.VITE_SUPABASE_ANON_KEY || 'unconfigured')
let pending
export async function ensureSession() {
  if (!configured) throw new Error('Rooms are not configured on this preview.')
  if (!pending) pending=(async()=>{
    const {data:{session}}=await supabase.auth.getSession()
    if(session)return session
    const {data,error}=await supabase.auth.signInAnonymously()
    if(error)throw error
    return data.session
  })().finally(()=>{pending=null})
  return pending
}
export async function authHeaders() {
  const session=await ensureSession()
  return {'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`}
}
