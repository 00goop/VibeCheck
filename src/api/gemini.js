import {authHeaders} from '../lib/supabase'
export async function streamIcebreaker(cardA, cardB, personality, onChunk, signal) {
  let fullText = ''
  try {
    const res = await fetch(`${import.meta.env.VITE_PROXY_URL}/icebreaker`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ cardA, cardB, personality }),
      signal,
    })

    if(!res.ok||!res.body)throw new Error('Icebreaker unavailable')
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    // Buffer incomplete lines across TCP chunk boundaries
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      // SSE events are terminated by \n\n — only process complete events
      const events = buffer.split('\n\n')
      buffer = events.pop() // last element may be incomplete — keep buffering
      for (const event of events) {
        for (const line of event.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (['[DONE]', '[TIMEOUT]', '[ERROR]'].includes(payload)) return fullText || fallback(cardA, cardB)
          try {
            const chunk = JSON.parse(payload)
            fullText += chunk
            onChunk(fullText) // update UI incrementally
          } catch { /* ignore malformed chunk */ }
        }
      }
    }
    return fullText || fallback(cardA, cardB)
  } catch(error) {
    if(signal?.aborted)throw error
    return fallback(cardA, cardB)
  }
}

const fallback = (a, b) => `${a.name} and ${b.name} — you two clearly need to talk. Go!`
