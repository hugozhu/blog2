#!/usr/bin/env node
/**
 * Build-time inverted index for pure-frontend search.
 * Adapted from dingtalk-fde/static-search-fast.
 *
 * Modes:
 *   node scripts/build-search-index.mjs
 *     → read content/post/ (recursive markdown), write static/search/
 *   node scripts/build-search-index.mjs --from-index public/index.json --out public/search
 *     → post-Hugo: accurate Permalinks from index.json
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const out = { fromIndex: null, outDir: path.join(root, 'static', 'search'), metaOut: path.join(root, 'static', 'js', 'search', 'build-meta.js') }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from-index') out.fromIndex = path.resolve(root, argv[++i])
    else if (argv[i] === '--out') out.outDir = path.resolve(root, argv[++i])
    else if (argv[i] === '--meta-out') out.metaOut = path.resolve(root, argv[++i])
  }
  return out
}

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

function stripFrontMatter(raw) {
  if (!raw.startsWith('---')) return { fm: {}, body: raw }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { fm: {}, body: raw }
  const yaml = raw.slice(3, end).trim()
  const body = raw.slice(end + 4).replace(/^\s+/, '')
  const fm = {}
  for (const line of yaml.split('\n')) {
    const m = line.match(/^(\w+)\s*:\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    }
    fm[m[1]] = v
  }
  return { fm, body }
}

function walkMd(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walkMd(p, acc)
    else if (name.endsWith('.md')) acc.push(p)
  }
  return acc
}

function loadPostsFromMarkdown() {
  const postRoot = path.join(root, 'content', 'post')
  const files = walkMd(postRoot)
  const posts = []
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8')
    const { fm, body } = stripFrontMatter(raw)
    const rel = path.relative(postRoot, file).replace(/\\/g, '/')
    const slugPath = rel.replace(/\.md$/, '')
    const id = slugPath.replace(/[\/]/g, '-')
    const plain = body
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/[#>*_`~]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const summary =
      (typeof fm.summary === 'string' && fm.summary) ||
      (typeof fm.subtitle === 'string' && fm.subtitle) ||
      plain.slice(0, 180)
    const tags = Array.isArray(fm.tags) ? fm.tags : typeof fm.tags === 'string' ? [fm.tags] : []
    posts.push({
      id,
      title: fm.title || slugPath,
      url: `/post/${slugPath}/`,
      tags,
      summary,
      body: plain,
      category: fm.categories || fm.category || 'Blog',
    })
  }
  posts.sort((a, b) => a.id.localeCompare(b.id))
  return posts
}

function loadPostsFromIndex(indexPath) {
  const arr = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
  if (!Array.isArray(arr)) throw new Error('index.json must be an array')
  return arr.map((p, i) => {
    let url = p.url || ''
    try {
      const u = new URL(url)
      url = u.pathname
    } catch {
      /* already path */
    }
    const id = (url.replace(/\/+/g, '-').replace(/^-|-$/g, '') || `doc-${i}`).slice(0, 120)
    return {
      id,
      title: p.title || '',
      url,
      tags: p.tags || [],
      summary: (p.summary || '').slice(0, 240) || String(p.content || '').slice(0, 180),
      body: String(p.content || ''),
      category: p.category || 'Blog',
    }
  })
}

function buildSegment(posts) {
  const docs = posts.map((p, i) => ({
    id: i,
    slug: p.id,
    title: p.title,
    url: p.url,
    tags: p.tags,
    summary: p.summary,
    category: p.category || 'Blog',
  }))

  const postings = new Map()
  function addField(docId, text, weight = 1) {
    const counts = new Map()
    for (const t of tokenize(text)) counts.set(t, (counts.get(t) || 0) + 1)
    for (const [t, c] of counts) {
      if (!postings.has(t)) postings.set(t, new Map())
      const m = postings.get(t)
      m.set(docId, (m.get(docId) || 0) + c * weight)
    }
  }

  posts.forEach((p, i) => {
    addField(i, p.title, 4)
    addField(i, (p.tags || []).join(' '), 3)
    addField(i, p.summary, 2)
    addField(i, p.body, 1)
  })

  const inverted = {}
  for (const [term, m] of [...postings.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    inverted[term] = [...m.entries()].sort((a, b) => a[0] - b[0])
  }

  const buildId = crypto
    .createHash('sha1')
    .update(JSON.stringify({ docs, inverted }))
    .digest('hex')
    .slice(0, 12)

  return {
    version: 1,
    buildId,
    createdAt: new Date().toISOString(),
    docCount: docs.length,
    docs,
    df: Object.fromEntries(Object.entries(inverted).map(([t, arr]) => [t, arr.length])),
    postings: inverted,
    posts,
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const posts = args.fromIndex ? loadPostsFromIndex(args.fromIndex) : loadPostsFromMarkdown()
  if (!posts.length) {
    console.error('No posts found')
    process.exit(1)
  }

  const { posts: _posts, ...segment } = buildSegment(posts)
  const { buildId } = segment

  fs.mkdirSync(args.outDir, { recursive: true })
  const outFile = path.join(args.outDir, `segment-${buildId}.json`)
  fs.writeFileSync(outFile, JSON.stringify(segment))
  fs.writeFileSync(
    path.join(args.outDir, 'latest.json'),
    JSON.stringify({ buildId, url: `/search/segment-${buildId}.json` }, null, 2) + '\n'
  )

  // Optional body store for deep-search (not in first payload)
  const bodiesDir = path.join(args.outDir, 'bodies')
  fs.mkdirSync(bodiesDir, { recursive: true })
  for (const p of posts) {
    fs.writeFileSync(path.join(bodiesDir, `${p.id}.txt`), p.body)
  }

  fs.mkdirSync(path.dirname(args.metaOut), { recursive: true })
  fs.writeFileSync(args.metaOut, `export default ${JSON.stringify({ buildId }, null, 2)}\n`)
  // tiny json sidecar for tooling — never import as a module script
  fs.writeFileSync(args.metaOut.replace(/\.js$/, '.json'), JSON.stringify({ buildId }, null, 2) + '\n')

  const sizeKb = (fs.statSync(outFile).size / 1024).toFixed(1)
  console.log(
    `built segment buildId=${buildId} docs=${segment.docCount} terms=${Object.keys(segment.postings).length} size=${sizeKb}KB → ${outFile}`
  )
}

main()
