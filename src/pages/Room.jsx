import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QrCode, Users, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { safeGet } from '../lib/storage'
import { useRoom } from '../hooks/useRoom'
import { useMatches } from '../hooks/useMatches'
import { useSuggested } from '../hooks/useSuggested'
import { MatchFeed } from '../components/MatchFeed'
import { SuggestedFeed } from '../components/SuggestedFeed'
import { MatchModal } from '../components/MatchModal'
import { ShootYourShot } from '../components/ShootYourShot'
import { RoomQR } from '../components/RoomQR'
import { RoomFilters } from '../components/EnergyFilter'
import { Button } from '../components/ui/button'
import { Avatar } from '../components/Avatar'

export default function Room() {
  const { eventId } = useParams()
  const navigate    = useNavigate()
  const myCardId    = safeGet('my_card_id')

  const { cards, loading, connected, error:roomError } = useRoom(eventId)

  const [matchQueue,  setMatchQueue]  = useState([])
  const [targetCard,  setTargetCard]  = useState(null)
  const [toastMsg,    setToastMsg]    = useState(null)
  const [showQR,      setShowQR]      = useState(false)
  const [minEnergy,   setMinEnergy]   = useState(1)
  const [tagFilter,   setTagFilter]   = useState(null)

  const activeMatch = matchQueue[0] ?? null

  const myCard = cards.find(c => c.id === myCardId) ?? null

  // Incoming match notifications
  useMatches(myCardId, (match) => {
    setMatchQueue(prev => [...prev, match])
    const senderName = match.card_a_snapshot?.name ?? match.card_b_snapshot?.name ?? 'Someone'
    showToast(`${senderName} wants to connect!`)
  })

  // AI-suggested cards (pgvector) — pass full cards list for tag-boost re-ranking
  const suggestionIds = useSuggested(myCard, eventId, cards.length, cards)

  // Filtered card list (energy + optional tag)
  const visibleCards = cards.filter(c => {
    if (c.id === myCardId) return true
    if (c.energy < minEnergy) return false
    if (tagFilter && !(c.roles ?? []).includes(tagFilter)) return false
    return true
  })

  function showToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }

  async function handleDeleteCard() {
    if (!myCardId) return
    if (!window.confirm('Remove your card from this room?')) return
    await supabase.from('vibe_cards').delete().eq('id', myCardId)
    try { localStorage.removeItem('my_card_id') } catch {}
    navigate('/')
  }

  // Resolve event details for QR, header, description, and extras config
  const [eventCode, setEventCode]           = useState(null)
  const [eventName, setEventName]           = useState(null)
  const [discordUrl, setDiscordUrl]         = useState(null)
  const [orgLinkedin, setOrgLinkedin]       = useState(null)
  const [eventDescription, setEventDescription] = useState(null)
  const [eventExtras, setEventExtras]       = useState({ looking_for: true, favorite_song: false, custom_prompt: null })
  if (!eventCode && myCard) {
    supabase
      .from('events')
      .select('code, name, discord_url, organizer_linkedin, description, extras')
      .eq('id', eventId)
      .single()
      .then(({ data }) => {
        if (data?.code)               setEventCode(data.code)
        if (data?.name)               setEventName(data.name)
        if (data?.discord_url)        setDiscordUrl(data.discord_url)
        if (data?.organizer_linkedin) setOrgLinkedin(data.organizer_linkedin)
        if (data?.description)        setEventDescription(data.description)
        if (data?.extras)             setEventExtras(data.extras)
      })
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-yellow-400 animate-pulse'}`} />
                <span className="text-sm text-muted-foreground">{roomError?'Refresh delayed':connected ? 'Live' : 'Reconnecting...'}</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <h2 className="font-bold flex items-center gap-2">
                {eventName ? `${eventName}` : `Room`}
                {discordUrl && (
                  <a href={discordUrl} target="_blank" rel="noopener noreferrer" title="Event Discord" className="text-[#5865F2] hover:text-[#5865F2]/80 transition">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>
                  </a>
                )}
                {orgLinkedin && (
                  <a href={orgLinkedin.startsWith('http') ? orgLinkedin : `https://${orgLinkedin}`} target="_blank" rel="noopener noreferrer" title="Organizer LinkedIn" className="text-[#0A66C2] hover:text-[#0A66C2]/80 transition">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </a>
                )}
                <span className="text-muted-foreground text-sm font-normal">
                  {cards.length} {cards.length === 1 ? 'person' : 'people'}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQR(v => !v)}
                className="rounded-xl border-white/10"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-white/10 hover:border-primary hover:text-primary"
                onClick={() => navigate(`/matches/${eventId}`)}
              >
                <Users className="w-4 h-4 mr-2" />
                Matches
              </Button>
            </div>
          </div>

          {/* My Card Bar */}
          {myCard && (
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-3">
              <div className="flex items-center gap-3">
                <Avatar photoUrl={myCard.photo_url} emoji={myCard.emoji} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{myCard.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{myCard.project}</p>
                </div>
                <div className="text-sm font-semibold text-primary">{myCard.energy}/10</div>
                <button
                  onClick={() => navigate(`/room/${eventId}/edit`)}
                  className="text-xs text-muted-foreground hover:text-white transition font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={handleDeleteCard}
                  className="text-xs text-red-400 hover:text-red-300 transition font-medium"
                >
                  Leave
                </button>
              </div>
            </div>
          )}

          {/* QR panel */}
          {showQR && eventCode && (
            <div className="mt-3">
              <RoomQR code={eventCode} />
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="container mx-auto max-w-6xl space-y-6">

          {/* Event description banner */}
          {eventDescription && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">About this event</p>
              <p className="text-sm">{eventDescription}</p>
            </div>
          )}

          {/* Filters */}
          {!loading && cards.length > 1 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <RoomFilters
                value={minEnergy}
                onChange={setMinEnergy}
                tagFilter={tagFilter}
                onTagChange={setTagFilter}
              />
            </div>
          )}

          {/* Suggested rail */}
          {suggestionIds.length > 0 && (
            <SuggestedFeed
              suggestionIds={suggestionIds}
              allCards={cards}
              onShoot={setTargetCard}
              extras={eventExtras}
            />
          )}

          {/* Section label */}
          {!loading && cards.length > 0 && (
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {visibleCards.length === 0 ? 'No one matches your filters' : 'In the Room'}
            </h3>
          )}

          {/* Card feed */}
          <MatchFeed
            cards={visibleCards}
            loading={loading}
            onShoot={setTargetCard}
            extras={eventExtras}
          />

          {/* Empty state */}
          {!loading && cards.length === 0 && (
            <div className="text-center py-16 space-y-2">
              <p className="text-4xl">👀</p>
              <p className="font-bold text-muted-foreground">No cards yet</p>
              <p className="text-muted-foreground text-sm">Be the first — share the QR above</p>
            </div>
          )}
        </div>
      </main>

      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-secondary border border-white/20 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl z-40 animate-bounce whitespace-nowrap">
          {toastMsg}
        </div>
      )}

      {/* Shoot Your Shot modal */}
      {targetCard && myCard && (
        <ShootYourShot
          myCard={myCard}
          targetCard={targetCard}
          onClose={() => setTargetCard(null)}
        />
      )}

      {/* Incoming match modal */}
      {activeMatch && (
        <MatchModal
          key={activeMatch.id}
          match={activeMatch}
          onClose={() => setMatchQueue(prev => prev.slice(1))}
        />
      )}
    </div>
  )
}
