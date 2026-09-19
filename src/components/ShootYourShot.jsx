import { useState, useRef } from 'react'
import { Share2, Sparkles, Flame, TrendingDown, Lightbulb, Briefcase } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { streamIcebreaker } from '../api/gemini'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Avatar } from './Avatar'

const MODES = [
  { key: 'default',     label: 'Default',     icon: Sparkles },
  { key: 'hype',        label: 'Hype',        icon: Flame },
  { key: 'roast',       label: 'Roast',       icon: TrendingDown },
  { key: 'philosopher', label: 'Philosopher',  icon: Lightbulb },
  { key: 'investor',    label: 'Investor',     icon: Briefcase },
]

export function ShootYourShot({ myCard, targetCard, onClose }) {
  const [personality, setPersonality] = useState('default')
  const [firing, setFiring]           = useState(false)
  const [icebreaker, setIcebreaker]   = useState('')
  const [done, setDone]               = useState(false)
  const abortRef = useRef(null)

  const shoot = async () => {
    if (firing) return
    setFiring(true)
    setDone(false)
    setIcebreaker('')

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const text = await streamIcebreaker(
        myCard, targetCard, personality,
        (partial) => setIcebreaker(partial),
        abortRef.current.signal,
      )

      const [lo, hi] = [myCard.id, targetCard.id].sort()
      const isLo = myCard.id === lo

      // Check if a match already exists and is accepted — don't overwrite it
      const { data: existing } = await supabase
        .from('matches')
        .select('id, status')
        .eq('card_a', lo)
        .eq('card_b', hi)
        .maybeSingle()

      if (existing) {
        // Already matched — no need to send again
        setDone(true)
        return
      }

      const {error:saveError}=await supabase.from('matches').insert(
        {
          card_a: lo,
          card_b: hi,
          initiator_card: myCard.id,
          icebreaker: text,
          status: 'pending',
          card_a_snapshot: isLo ? myCard : targetCard,
          card_b_snapshot: isLo ? targetCard : myCard,
        }
      )
      if(saveError)throw saveError
      setDone(true)
    } catch {
      setIcebreaker('Could not save this introduction. Try again.'); setDone(false)
    } finally {
      setFiring(false)
    }
  }

  const switchPersonality = (key) => {
    if (firing) {
      abortRef.current?.abort()
      setFiring(false)
      setIcebreaker('')
      setDone(false)
    }
    setPersonality(key)
  }

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="bg-background border-white/10 rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Shoot Your Shot</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Target Card Preview */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Avatar photoUrl={targetCard.photo_url} emoji={targetCard.emoji} size="md" />
              <div>
                <p className="font-bold">{targetCard.name}</p>
                <p className="text-sm text-muted-foreground">{targetCard.project}</p>
              </div>
            </div>
          </div>

          {/* Personality Picker */}
          <div>
            <p className="font-semibold mb-3">Pick your vibe:</p>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <Button
                  key={m.key}
                  type="button"
                  onClick={() => switchPersonality(m.key)}
                  variant={personality === m.key ? 'default' : 'outline'}
                  size="sm"
                  className={`rounded-full font-semibold ${
                    personality === m.key
                      ? 'bg-primary text-primary-foreground'
                      : 'border-white/10'
                  }`}
                >
                  <m.icon className="w-4 h-4 mr-2" />
                  {m.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Icebreaker Preview */}
          {(firing || icebreaker) && (
            <div>
              <p className="font-semibold mb-2">Your icebreaker:</p>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[100px]">
                <p className="text-sm">
                  {icebreaker || <span className="text-muted-foreground">Generating icebreaker...</span>}
                  {firing && <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 rounded-2xl border-white/10"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={done ? onClose : shoot}
              disabled={firing}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-semibold"
            >
              {done ? (
                'Sent!'
              ) : firing ? (
                'Generating...'
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  Shoot
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
