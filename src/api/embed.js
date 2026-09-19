import { supabase, authHeaders } from '../lib/supabase'

export async function embedCard(card, { isRetry = false } = {}) {
  try {
    // Stagger to avoid rate-limit spikes when many cards are created at once
    await new Promise(r => setTimeout(r, Math.random() * 2000))

    // need + looking_for → query vector (what you're searching for)
    // offer + roles     → index vector (what you bring / what you are)
    const lookingForSuffix = card.looking_for?.length
      ? ` Looking for: ${card.looking_for.join(', ')}`
      : ''
    const rolesSuffix = card.roles?.length
      ? ` I am: ${card.roles.join(', ')}`
      : ''

    const [needVec, offerVec] = await Promise.all([
      fetchEmbedding(card.need + lookingForSuffix),
      fetchEmbedding(card.offer + rolesSuffix),
    ])

    const {error:saveError}=await supabase
      .from('vibe_cards')
      .update({ need_embedding: needVec, offer_embedding: offerVec })
      .eq('id', card.id)
    if(saveError)throw saveError

    if (isRetry) {
      await supabase.from('failed_embeds').delete().eq('card_id', card.id)
    }
  } catch {
    if (!isRetry) {
      await supabase.from('failed_embeds').insert({ card_id: card.id })
      setTimeout(() => embedCard(card, { isRetry: true }), 5000)
    }
  }
}

async function fetchEmbedding(text) {
  const res = await fetch(`${import.meta.env.VITE_PROXY_URL}/embed`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error('Embed failed')
  const { embedding } = await res.json()
  if(!Array.isArray(embedding)||embedding.length!==768||!embedding.every(Number.isFinite))throw new Error('Invalid embedding')
  return embedding
}
