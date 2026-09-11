import { useState, useRef } from 'react'
import { Sparkles, Camera, Link as LinkIcon } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Slider } from './ui/slider'
import { Avatar } from './Avatar'
import { useEventExtras } from '../hooks/useEventExtras'

const LOOKING_FOR_TAGS = [
  'co-founder', 'mentor', 'hiring', 'job seeking',
  'collaborator', 'investor', 'friends', 'learning',
]

function normalizeLinkedin(val) {
  if (!val) return null
  const trimmed = val.trim()
  const match = trimmed.match(/linkedin\.com\/in\/([^/?#\s]+)/i)
  if (match) return match[1]
  return trimmed.replace(/^[@/]+/, '') || null
}

export function VibeCardForm({ onSubmit, initial = {}, submitting = false, eventId = null }) {
  const extras = useEventExtras(eventId)

  const [form, setForm] = useState({
    name:                   initial.name                   ?? '',
    emoji:                  initial.emoji                  ?? '👋',
    project:                initial.project                ?? '',
    need:                   initial.need                   ?? '',
    offer:                  initial.offer                  ?? '',
    energy:                 initial.energy                 ?? 5,
    linkedin:               initial.linkedin               ?? '',
    instagram:              initial.instagram              ?? '',
    looking_for:            initial.looking_for            ?? [],
    roles:                  initial.roles                  ?? [],
    photo_url:              initial.photo_url              ?? '',
    favorite_song:          initial.favorite_song          ?? '',
    custom_prompt_response: initial.custom_prompt_response ?? '',
  })
  const [errors, setErrors]         = useState({})
  const [emojiOpen, setEmojiOpen]   = useState(false)
  const [avatarMode, setAvatarMode] = useState(initial.photo_url ? 'photo' : 'emoji')
  const [photoTab, setPhotoTab]     = useState('upload')
  const [uploading, setUploading]   = useState(false)
  const fileInputRef = useRef(null)

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {setErrors(prev=>({...prev,photo:'Use a JPEG, PNG or WebP image'}));return}
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photo: 'Photo must be under 5MB' }))
      return
    }
    setUploading(true)
    setErrors(prev => ({ ...prev, photo: undefined }))
    try {
      const ext = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type]
      const {data:{user}}=await supabase.auth.getUser()
      if(!user)throw Error('Session required')
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      set('photo_url', publicUrl)
    } catch {
      setErrors(prev => ({ ...prev, photo: 'Upload failed — try pasting a URL instead' }))
      setPhotoTab('url')
    } finally {
      setUploading(false)
    }
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function toggleLookingFor(tag) {
    setForm(f => {
      const current = f.looking_for ?? []
      if (current.includes(tag)) return { ...f, looking_for: current.filter(t => t !== tag) }
      if (current.length >= 3) return f
      return { ...f, looking_for: [...current, tag] }
    })
  }

  function toggleRole(tag) {
    setForm(f => {
      const current = f.roles ?? []
      if (current.includes(tag)) return { ...f, roles: current.filter(t => t !== tag) }
      if (current.length >= 3) return f
      return { ...f, roles: [...current, tag] }
    })
  }

  function validate() {
    const e = {}
    if (!form.name.trim())             e.name    = 'Name is required'
    if (!form.project.trim())          e.project = 'What are you working on?'
    if (form.need.trim().length < 10)  e.need    = `${10 - form.need.trim().length} more chars needed`
    if (form.offer.trim().length < 10) e.offer   = `${10 - form.offer.trim().length} more chars needed`
    if (form.instagram && !/^[a-zA-Z0-9._]+$/.test(form.instagram)) {
      e.instagram = 'Only letters, numbers, . and _ allowed'
    }
    return e
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSubmit({
      name:                   form.name.trim(),
      emoji:                  form.emoji,
      project:                form.project.trim(),
      need:                   form.need.trim(),
      offer:                  form.offer.trim(),
      energy:                 form.energy,
      linkedin:               normalizeLinkedin(form.linkedin),
      instagram:              form.instagram.trim() || null,
      looking_for:            form.looking_for,
      roles:                  form.roles,
      photo_url:              form.photo_url.trim() || null,
      favorite_song:          form.favorite_song.trim() || null,
      custom_prompt_response: form.custom_prompt_response.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-6">
          {/* Name */}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Alex Chen"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              maxLength={80}
              className="mt-2 bg-white/5 border-white/10 rounded-2xl"
            />
            {errors.name && <p className="text-destructive text-sm mt-2">{errors.name}</p>}
          </div>

          {/* Avatar: Emoji or Photo */}
          <div>
            <Label>Your Avatar</Label>
            <div className="flex gap-2 mt-2 mb-3">
              <Button
                type="button"
                variant={avatarMode === 'emoji' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setAvatarMode('emoji'); set('photo_url', '') }}
                className={`rounded-xl font-semibold ${avatarMode === 'emoji' ? 'bg-primary text-primary-foreground' : 'border-white/10'}`}
              >
                Emoji
              </Button>
              <Button
                type="button"
                variant={avatarMode === 'photo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAvatarMode('photo')}
                className={`rounded-xl font-semibold ${avatarMode === 'photo' ? 'bg-primary text-primary-foreground' : 'border-white/10'}`}
              >
                Photo
              </Button>
            </div>

            {avatarMode === 'emoji' && (
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEmojiOpen(o => !o)}
                  className="w-full justify-start bg-white/5 border-white/10 rounded-2xl hover:bg-white/10"
                >
                  <span className="text-3xl mr-2">{form.emoji}</span>
                  <span className="text-muted-foreground">Click to change</span>
                </Button>
                {emojiOpen && (
                  <div className="absolute z-50 mt-2 left-0">
                    <EmojiPicker
                      onEmojiClick={(emojiData) => { set('emoji', emojiData.emoji); setEmojiOpen(false) }}
                      theme="dark"
                      width={320}
                      height={400}
                    />
                  </div>
                )}
              </div>
            )}

            {avatarMode === 'photo' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={photoTab === 'upload' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setPhotoTab('upload')}
                    className="rounded-lg text-xs"
                  >
                    <Camera className="w-3 h-3 mr-1" />
                    Upload
                  </Button>
                  <Button
                    type="button"
                    variant={photoTab === 'url' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setPhotoTab('url')}
                    className="rounded-lg text-xs"
                  >
                    <LinkIcon className="w-3 h-3 mr-1" />
                    Paste URL
                  </Button>
                </div>

                {photoTab === 'upload' && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full bg-white/5 border-white/10 rounded-2xl hover:bg-white/10 py-8"
                    >
                      {uploading ? 'Uploading...' : 'Take Photo or Choose from Gallery'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">Max 5MB. Opens camera on mobile.</p>
                  </div>
                )}

                {photoTab === 'url' && (
                  <div>
                    <Input
                      id="photo_url"
                      placeholder="https://example.com/your-photo.jpg"
                      value={form.photo_url}
                      onChange={(e) => set('photo_url', e.target.value)}
                      maxLength={500}
                      className="bg-white/5 border-white/10 rounded-2xl"
                    />
                  </div>
                )}

                {errors.photo && <p className="text-destructive text-sm">{errors.photo}</p>}

                {form.photo_url && (
                  <div className="flex items-center gap-3">
                    <Avatar photoUrl={form.photo_url} emoji={form.emoji} size="lg" />
                    <div>
                      <p className="text-sm font-medium">Looking good!</p>
                      <button
                        type="button"
                        onClick={() => set('photo_url', '')}
                        className="text-xs text-red-400 hover:text-red-300 transition"
                      >
                        Remove photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">Your card belongs to this browser session. Keep your browser data to edit it later.</p>

          {/* Project Description */}
          <div>
            <Label htmlFor="project">What are you working on?</Label>
            <Textarea
              id="project"
              placeholder="AI-powered recipe app that turns your fridge into a personal chef"
              value={form.project}
              onChange={(e) => set('project', e.target.value)}
              rows={3}
              maxLength={200}
              className="mt-2 bg-white/5 border-white/10 rounded-2xl resize-none"
            />
            {errors.project && <p className="text-destructive text-sm mt-2">{errors.project}</p>}
          </div>

          {/* I need */}
          <div>
            <Label htmlFor="need">I need...</Label>
            <Textarea
              id="need"
              placeholder="A backend wizard, design feedback, someone who knows React Native"
              value={form.need}
              onChange={(e) => set('need', e.target.value)}
              rows={2}
              maxLength={400}
              className="mt-2 bg-white/5 border-white/10 rounded-2xl resize-none"
            />
            {errors.need && <p className="text-destructive text-sm mt-2">{errors.need}</p>}
            {!errors.need && form.need.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{form.need.length} chars</p>
            )}
          </div>

          {/* I offer */}
          <div>
            <Label htmlFor="offer">I offer...</Label>
            <Textarea
              id="offer"
              placeholder="Frontend skills, UX expertise, can explain blockchain without putting you to sleep"
              value={form.offer}
              onChange={(e) => set('offer', e.target.value)}
              rows={2}
              maxLength={400}
              className="mt-2 bg-white/5 border-white/10 rounded-2xl resize-none"
            />
            {errors.offer && <p className="text-destructive text-sm mt-2">{errors.offer}</p>}
            {!errors.offer && form.offer.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{form.offer.length} chars</p>
            )}
          </div>

          {/* Energy Slider */}
          <div>
            <Label>Energy Level: {form.energy}/10</Label>
            <Slider
              value={[form.energy]}
              onValueChange={(value) => set('energy', value[0])}
              min={1}
              max={10}
              step={1}
              className="mt-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Low-key</span>
              <span>High energy</span>
            </div>
          </div>

          {/* LinkedIn */}
          <div>
            <Label htmlFor="linkedin">LinkedIn (optional)</Label>
            <Input
              id="linkedin"
              placeholder="username or linkedin.com/in/yourname"
              value={form.linkedin}
              onChange={(e) => set('linkedin', e.target.value)}
              maxLength={200}
              className="mt-2 bg-white/5 border-white/10 rounded-2xl"
            />
            <p className="text-xs text-muted-foreground mt-1">So your matches can connect with you</p>
          </div>

          {/* Instagram */}
          <div>
            <Label htmlFor="instagram">Instagram (optional)</Label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">@</span>
              <Input
                id="instagram"
                placeholder="yourhandle"
                value={form.instagram}
                onChange={(e) => set('instagram', e.target.value.replace(/^@/, '').replace(/[^a-zA-Z0-9._]/g, ''))}
                maxLength={30}
                className="pl-7 bg-white/5 border-white/10 rounded-2xl"
              />
            </div>
            {errors.instagram && <p className="text-destructive text-sm mt-2">{errors.instagram}</p>}
          </div>

          {/* Looking For Tags */}
          {extras.looking_for && (
            <div>
              <Label>
                Looking For{' '}
                <span className="text-muted-foreground font-normal">(pick up to 3)</span>
              </Label>
              <div className="flex flex-wrap gap-2 mt-3">
                {LOOKING_FOR_TAGS.map(tag => {
                  const selected = form.looking_for.includes(tag)
                  const disabled = !selected && form.looking_for.length >= 3
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => !disabled && toggleLookingFor(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : disabled
                          ? 'border-white/10 text-muted-foreground opacity-40 cursor-not-allowed'
                          : 'border-white/20 text-foreground hover:border-primary/50 hover:bg-white/5'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* I Am — Roles (supply signal, always shown) */}
          <div>
            <Label>
              I am...{' '}
              <span className="text-muted-foreground font-normal">(pick up to 3)</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Helps others find you when they're looking for what you bring</p>
            <div className="flex flex-wrap gap-2">
              {LOOKING_FOR_TAGS.map(tag => {
                const selected = form.roles.includes(tag)
                const disabled = !selected && form.roles.length >= 3
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => !disabled && toggleRole(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      selected
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                        : disabled
                        ? 'border-white/10 text-muted-foreground opacity-40 cursor-not-allowed'
                        : 'border-white/20 text-foreground hover:border-emerald-500/40 hover:bg-white/5'
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Favorite Song (organizer-enabled) */}
          {extras.favorite_song && (
            <div>
              <Label htmlFor="favorite_song">Favorite Song (optional)</Label>
              <Input
                id="favorite_song"
                placeholder="Artist — Song Title"
                value={form.favorite_song}
                onChange={(e) => set('favorite_song', e.target.value)}
                maxLength={100}
                className="mt-2 bg-white/5 border-white/10 rounded-2xl"
              />
            </div>
          )}

          {/* Custom Prompt (organizer-defined) */}
          {extras.custom_prompt && (
            <div>
              <Label htmlFor="custom_prompt_response">{extras.custom_prompt}</Label>
              <Textarea
                id="custom_prompt_response"
                placeholder="Your answer..."
                value={form.custom_prompt_response}
                onChange={(e) => set('custom_prompt_response', e.target.value)}
                rows={2}
                maxLength={300}
                className="mt-2 bg-white/5 border-white/10 rounded-2xl resize-none"
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-2xl py-6 text-lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {submitting ? 'Saving...' : 'Enter Room'}
          </Button>
        </div>

        {/* Card Preview */}
        <div>
          <div className="sticky top-24">
            <h3 className="font-bold text-lg mb-4">Preview</h3>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-primary/50 transition-all">
              <div className="flex items-start gap-4 mb-4">
                <Avatar photoUrl={form.photo_url} emoji={form.emoji} size="xl" />
                <div className="flex-1">
                  <h3 className="font-bold text-xl">{form.name || 'Your Name'}</h3>
                  <p className="text-muted-foreground text-sm">Energy: {form.energy}/10</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Building:</p>
                  <p className="text-sm">{form.project || 'Your project description...'}</p>
                </div>

                {form.need && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Need:</p>
                    <p className="text-sm">{form.need}</p>
                  </div>
                )}

                {form.offer && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Offer:</p>
                    <p className="text-sm">{form.offer}</p>
                  </div>
                )}

                {form.looking_for?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {form.looking_for.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {form.roles?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {form.roles.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {form.instagram && (
                  <p className="text-xs text-muted-foreground">@{form.instagram}</p>
                )}

                <div className="pt-3">
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${form.energy * 10}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
