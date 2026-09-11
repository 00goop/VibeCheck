import {useEffect,useState} from 'react'
import {supabase} from '../lib/supabase'
export function useRoom(eventId) {
 const [cards,setCards]=useState([]),[loading,setLoading]=useState(true),[connected,setConnected]=useState(false),[error,setError]=useState('')
 useEffect(()=>{
  let active=true,generation=0
  setCards([]);setLoading(true)
  const refresh=async()=>{
   const current=++generation
   const {data,error}=await supabase.from('vibe_cards').select('*').eq('event_id',eventId).order('created_at')
   if(!active||current!==generation)return
   if(error)setError('Could not refresh the room. Reconnecting…')
   else{setCards(data||[]);setError('')}
   setLoading(false)
  }
  refresh()
  const channel=supabase.channel(`room-${eventId}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'vibe_cards',filter:`event_id=eq.${eventId}`},refresh)
   .subscribe(status=>{if(!active)return;setConnected(status==='SUBSCRIBED');if(status==='SUBSCRIBED')refresh()})
  const recovery=setInterval(refresh,30000)
  return()=>{active=false;clearInterval(recovery);supabase.removeChannel(channel)}
 },[eventId])
 return {cards,loading,connected,error}
}
