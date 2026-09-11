import {csvCell,vcardText,resolveTheirCard} from '../lib/exports'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { safeGet } from '../lib/storage'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Avatar } from '../components/Avatar'

// Fix #5: anchor must be in the DOM for Firefox to trigger the download
function triggerDownload(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

function exportVCard(card) {
  const vcf_escape=vcardText

  // Normalize linkedin to a username handle for the URL
  const linkedinHandle = card.linkedin
    ? card.linkedin.match(/linkedin\.com\/in\/([^/?#\s]+)/i)?.[1] ?? card.linkedin
    : null

  const lines = [
    'BEGIN:VCARD', 'VERSION:3.0',
    `FN:${vcf_escape(card.name)}`,
    `NOTE:Building: ${vcf_escape(card.project)}\\nNeeds: ${vcf_escape(card.need)}\\nOffers: ${vcf_escape(card.offer)}`,
  ]
  if (linkedinHandle) lines.push(`URL:https://linkedin.com/in/${vcf_escape(linkedinHandle)}`)
  if (card.instagram)  lines.push(`URL:https://instagram.com/${vcf_escape(card.instagram)}`)
  lines.push('END:VCARD')

  const safeName = String(card.name).replace(/[^\w\s-]/g, '').trim() || 'contact'
  triggerDownload(`${safeName}.vcf`, lines.join('\r\n'), 'text/vcard')
}

function exportCSV(matches, myCardId) {
  const sanitize=csvCell
  const header = 'Name,Project,Need,Offer,LinkedIn,Instagram,Icebreaker,Status'
  const rows = matches.map((match) => {
    const c = resolveTheirCard(match, myCardId)
    const linkedinHandle = c?.linkedin
      ? c.linkedin.match(/linkedin\.com\/in\/([^/?#\s]+)/i)?.[1] ?? c.linkedin
      : ''
    const linkedinUrl  = linkedinHandle ? `https://linkedin.com/in/${linkedinHandle}` : ''
    const instagramUrl = c?.instagram ? `https://instagram.com/${c.instagram}` : ''
    return `"${sanitize(c?.name)}","${sanitize(c?.project)}","${sanitize(c?.need)}","${sanitize(c?.offer)}","${sanitize(linkedinUrl)}","${sanitize(instagramUrl)}","${sanitize(match.icebreaker)}","${sanitize(match.status)}"`
  })
  triggerDownload('vibecheck-matches.csv', [header, ...rows].join('\n'), 'text/csv')
}

function getStatusColor(status) {
  switch (status) {
    case 'accepted': return 'bg-green-500/20 text-green-400 border-green-500/30'
    case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'declined': return 'bg-red-500/20 text-red-400 border-red-500/30'
    default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  }
}

function MatchCard({ match, myCardId }) {
  const theirCard = resolveTheirCard(match, myCardId)

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-primary/50 transition-all flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar photoUrl={theirCard?.photo_url} emoji={theirCard?.emoji} size="lg" />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-lg">{theirCard?.name}</h3>
              {theirCard?.linkedin && (
                <a
                  href={theirCard.linkedin.startsWith('http') ? theirCard.linkedin : `https://linkedin.com/in/${theirCard.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0A66C2] hover:text-[#0A66C2]/80 transition shrink-0"
                  title="View LinkedIn profile"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              )}
              {theirCard?.instagram && (
                <a
                  href={`https://instagram.com/${theirCard.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-400 hover:text-pink-300 transition shrink-0"
                  title="View Instagram profile"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
        <Badge className={`${getStatusColor(match.status)} rounded-full px-3 capitalize`}>
          {match.status}
        </Badge>
      </div>

      {/* Project */}
      <div className="mb-4 flex-1">
        <p className="text-sm text-muted-foreground mb-1">Project:</p>
        <p className="text-sm line-clamp-2">{theirCard?.project}</p>
      </div>

      {/* Needs/Offers */}
      <div className="mb-4 space-y-1">
        <p className="text-xs text-muted-foreground">Needs: {theirCard?.need}</p>
        <p className="text-xs text-muted-foreground">Offers: {theirCard?.offer}</p>
      </div>

      {/* Icebreaker */}
      {match.icebreaker && (
        <div className="mb-4 bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1">Icebreaker:</p>
          <p className="text-sm italic line-clamp-3">"{match.icebreaker}"</p>
        </div>
      )}

      {/* Action Button */}
      {match.status === 'accepted' && theirCard && (
        <Button
          onClick={() => exportVCard(theirCard)}
          size="sm"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold"
        >
          Save Contact
        </Button>
      )}
      {match.status === 'pending' && (
        <Button size="sm" variant="outline" className="w-full rounded-xl border-white/10" disabled>
          Awaiting Response...
        </Button>
      )}
      {match.status === 'declined' && (
        <Button size="sm" variant="outline" className="w-full rounded-xl border-red-500/30 text-red-400" disabled>
          Declined
        </Button>
      )}
    </div>
  )
}

function MatchesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10" />
            <div className="space-y-1.5">
              <div className="w-24 h-3 rounded bg-white/10" />
              <div className="w-16 h-2 rounded bg-white/10" />
            </div>
          </div>
          <div className="w-full h-2 rounded bg-white/10" />
          <div className="w-3/4 h-2 rounded bg-white/10" />
        </div>
      ))}
    </div>
  )
}

export default function Matches() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const myCardId = safeGet('my_card_id')

  const [matches, setMatches]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [cardMismatch, setCardMismatch] = useState(false)

  const fetchMatches = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [cardRes, matchRes] = await Promise.all([
      supabase
        .from('vibe_cards')
        .select('event_id')
        .eq('id', myCardId)
        .single(),
      supabase
        .from('matches')
        .select('*')
        .or(`card_a.eq.${myCardId},card_b.eq.${myCardId}`)
        .order('created_at', { ascending: false }),
    ])

    if (cardRes.error || cardRes.data?.event_id !== eventId) {
      setCardMismatch(true)
      setLoading(false)
      return
    }

    if (matchRes.error) {
      setError('Failed to load matches.')
    } else {
      setMatches(matchRes.data ?? [])
    }
    setLoading(false)
  }, [myCardId, eventId])

  useEffect(() => {
    if (!myCardId) {
      setLoading(false)
      return
    }
    fetchMatches()
  }, [myCardId, eventId, fetchMatches])

  useEffect(() => {
    if (!myCardId) return

    const handleUpdate = ({ new: updated }) => {
      setMatches(prev => prev.map(m =>
        m.id === updated.id
          ? { ...m, status: updated.status, icebreaker: updated.icebreaker }
          : m
      ))
    }

    const handleInsert = ({ new: inserted }) => {
      setMatches(prev => {
        if (prev.some(m => m.id === inserted.id)) return prev
        return [inserted, ...prev]
      })
    }

    const channel = supabase
      .channel(`matches-page-${myCardId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `card_a=eq.${myCardId}` },
        handleUpdate
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `card_b=eq.${myCardId}` },
        handleUpdate
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches', filter: `card_a=eq.${myCardId}` },
        handleInsert
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches', filter: `card_b=eq.${myCardId}` },
        handleInsert
      )
      .subscribe(status=>{if(status==='SUBSCRIBED')fetchMatches()})

    return () => supabase.removeChannel(channel)
  }, [myCardId,fetchMatches])

  const acceptedCount = matches.filter(m => m.status === 'accepted').length
  const pendingCount = matches.filter(m => m.status === 'pending').length

  // No card in localStorage at all
  if (!myCardId || cardMismatch) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-4xl">🪪</p>
          <p className="text-white font-bold">No card found</p>
          <p className="text-muted-foreground text-sm">You need to create a vibe card first.</p>
          <Button
            onClick={() => navigate(`/create/${eventId}`)}
            className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl"
          >
            Create card
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-white/10 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
          <button
            onClick={() => navigate(`/room/${eventId}`)}
            className="flex items-center gap-2 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back to Room</span>
          </button>

          {!loading && matches.length > 0 && (
            <Button
              onClick={() => exportCSV(matches, myCardId)}
              variant="outline"
              className="rounded-2xl border-white/10 hover:border-primary hover:text-primary font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Stats */}
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-4">Your Matches</h1>
          {!loading && matches.length > 0 && (
            <div className="flex gap-4 flex-wrap">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
                <span className="text-muted-foreground text-sm">Total:</span>
                <span className="ml-2 font-bold text-lg">{matches.length}</span>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl px-4 py-2">
                <span className="text-green-400 text-sm">Accepted:</span>
                <span className="ml-2 font-bold text-lg text-green-400">{acceptedCount}</span>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-4 py-2">
                <span className="text-yellow-400 text-sm">Pending:</span>
                <span className="ml-2 font-bold text-lg text-yellow-400">{pendingCount}</span>
              </div>
            </div>
          )}
        </div>

        {loading && <MatchesSkeleton />}

        {!loading && error && (
          <div className="text-center py-16 space-y-3">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={fetchMatches}
              className="text-sm text-muted-foreground hover:text-white underline transition"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <p className="text-4xl">🎯</p>
            <p className="text-white font-bold">No matches yet</p>
            <p className="text-muted-foreground text-sm">Head back to the room and shoot your shot.</p>
            <Button
              onClick={() => navigate(`/room/${eventId}`)}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl"
            >
              Back to room
            </Button>
          </div>
        )}

        {/* Matches Grid */}
        {!loading && !error && matches.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map(match => (
              <MatchCard key={match.id} match={match} myCardId={myCardId} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
