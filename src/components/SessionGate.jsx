import {useEffect,useState} from 'react'
import {ensureSession} from '../lib/supabase'
export function SessionGate({children}) {
 const [ready,setReady]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0)
 useEffect(()=>{let active=true;setError(false);ensureSession().then(()=>{if(active)setReady(true)}).catch(()=>{if(active)setError(true)});return()=>{active=false}},[attempt])
 if(ready)return children
 return <main className="min-h-screen bg-background text-foreground grid place-items-center p-6"><div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 space-y-4"><h1 className="text-3xl font-black">VibeCheck</h1><p role="status">{error?'Rooms are unavailable right now. Your existing session stays on this device.':'Connecting your private session…'}</p>{error&&<button className="rounded-xl bg-primary text-primary-foreground px-6 py-3 font-bold" onClick={()=>setAttempt(x=>x+1)}>Try again</button>}<p className="text-sm text-muted-foreground">Your session controls your card. Keep this browser’s data to return later. Profiles are visible to signed-in attendees.</p><a href="/" className="underline">Back to overview</a></div></main>
}
