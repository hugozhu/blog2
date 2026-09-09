/* Pure-frontend search worker — adapted from static-search-fast */
let segment = null

function tokenize(text) {
  const s = String(text || '').toLowerCase()
  const out = []
  for (const m of s.matchAll(/[a-z0-9_]+/g)) out.push(m[0])
  const cjk = s.replace(/[^\u4e00-\u9fff]/g, ' ')
  for (const chunk of cjk.split(/\s+/)) {
    if (!chunk) continue
    for (let i = 0; i < chunk.length; i++) {
      out.push(chunk[i])
      if (i + 1 < chunk.length) out.push(chunk.slice(i, i + 2))
    }
  }
  return out
}

function scoreQuery(q, seg) {
  const terms = tokenize(q)
  if (!terms.length || !seg) return []
  const N = seg.docCount
  const acc = new Map()
  for (const t of terms) {
    const posting = seg.postings[t]
    if (!posting) continue
    const df = seg.df[t] || posting.length
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5))
    for (const [docId, tf] of posting) {
      const tfNorm = tf / (tf + 1.2)
      acc.set(docId, (acc.get(docId) || 0) + tfNorm * idf)
    }
  }
  return [...acc.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([docId, score]) => ({ ...seg.docs[docId], score: Number(score.toFixed(4)) }))
}

self.onmessage = (ev) => {
  const { type, payload } = ev.data || {}
  if (type === 'mount') {
    segment = payload
    self.postMessage({ type: 'ready', buildId: segment.buildId, docCount: segment.docCount })
    return
  }
  if (type === 'search') {
    const t0 = performance.now()
    const hits = scoreQuery(payload.q, segment)
    self.postMessage({ type: 'results', q: payload.q, hits, ms: +(performance.now() - t0).toFixed(2) })
  }
}
