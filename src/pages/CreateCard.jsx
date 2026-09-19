import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { safeStore, safeGet } from '../lib/storage'
import { embedCard } from '../api/embed'
import { VibeCardForm } from '../components/VibeCardForm'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export default function CreateCard() {
  const { eventId }  = useParams()
  const location     = useLocation()
  const navigate     = useNavigate()
  const isEditMode   = location.pathname.endsWith('/edit')
  const roomCode     = location.state?.roomCode ?? null

  const [submitting, setSubmitting]           = useState(false)
  const [error, setError]                     = useState(null)
  const [existingCard, setExistingCard]       = useState(null)
  const [loading, setLoading]                 = useState(isEditMode)
  const [sessionVerified, setSessionVerified]         = useState(false)
  const [eventDescription, setEventDescription] = useState(null)

  // Fetch event description to show context before the form
  useEffect(() => {
    supabase
      .from('events')
      .select('description')
      .eq('id', eventId)
      .single()
      .then(({ data }) => {
        if (data?.description) setEventDescription(data.description)
      })
  }, [eventId])

  // In edit mode, fetch the existing card once
  useEffect(() => {
    if (!isEditMode) return
    const cardId = safeGet('my_card_id')
    if (!cardId) { navigate(`/room/${eventId}`); return }

    supabase
      .from('vibe_cards')
      .select('*')
      .eq('id', cardId)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) { navigate(`/room/${eventId}`); return }
        supabase.auth.getUser().then(({data:{user}})=>{ if(data.owner_id!==user?.id)navigate(`/room/${eventId}`); else setSessionVerified(true) })
        setExistingCard(data)
        setLoading(false)
      })
  }, [isEditMode, eventId, navigate])

  // CREATE
  async function handleCreate(formData) {
    if (submitting) return
    setSubmitting(true)
    try {
      const { data: card, error: err } = await supabase
        .from('vibe_cards')
        .insert({ event_id: eventId, ...formData })
        .select()
        .single()

      if (err) throw err

      safeStore('my_card_id', card.id)
      safeStore('my_event_id', eventId)

      navigate(`/room/${eventId}`)
      embedCard(card) // fire-and-forget
    } catch (err) {
      setSubmitting(false)
      const msg = err?.message ?? ''
      if (msg.includes('room_full') || err?.code === 'P0001') {
        setError('This room is full.')
      } else {
        setError('Failed to create card. Try again.')
      }
    }
  }

  // UPDATE
  async function handleEdit(formData) {
    if (submitting) return
    setSubmitting(true)
    try {
      const { data: card, error: err } = await supabase
        .from('vibe_cards')
        .update(formData)
        .eq('id', existingCard.id)
        .select()
        .single()

      if (err) throw err

      navigate(`/room/${eventId}`)
      embedCard(card)
    } catch {
      setSubmitting(false)
      setError('Failed to save changes. Try again.')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-white/10 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center max-w-6xl">
          <button
            onClick={() => navigate(isEditMode ? `/room/${eventId}` : '/enter')}
            className="flex items-center gap-2 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back</span>
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">
            {isEditMode ? 'Edit Your Card' : 'Create Your Card'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? 'Update your info — your matches will see the new version.'
              : "Tell people what you do and what you're looking for."}
          </p>
        </div>

        {/* Event description banner — shown to all attendees */}
        {eventDescription && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">About this event</p>
            <p className="text-sm">{eventDescription}</p>
          </div>
        )}

        {/* Room code banner — shown to the creator */}
        {roomCode && (
          <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/10 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-primary/70 font-semibold uppercase tracking-widest">Room code</p>
              <p className="text-2xl font-black tracking-widest text-primary">{roomCode}</p>
            </div>
            <p className="text-xs text-muted-foreground text-right">Share this so<br/>others can join</p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Body */}
        {isEditMode && loading && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-sm text-muted-foreground">
            Loading your card...
          </div>
        )}

        {(!isEditMode || (existingCard && sessionVerified)) && (
          <VibeCardForm
            onSubmit={isEditMode ? handleEdit : handleCreate}
            initial={existingCard ?? {}}
            submitting={submitting}
            eventId={eventId}
          />
        )}
      </div>
    </div>
  )
}
