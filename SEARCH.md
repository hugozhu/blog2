# Static search (static-search-fast)

Pure-frontend full-text search for this Hugo blog. Replaces the previous **Pizza WASM** path that fetched `/index.json` and ingested full post bodies on every visit.

## Architecture

1. **Build time** (`scripts/build-search-index.mjs`) tokenizes posts into an inverted `postings` map + slim `docs` meta (title / url / tags / summary). Full bodies are **not** shipped in the first payload; optional `static/search/bodies/*.txt` exist for deep fetch later.
2. **Artifacts**: `static/search/segment-{buildId}.json`, `static/search/latest.json`, and `static/js/search/build-meta.js` (ESM `export default { buildId }` — **never** load JSON as a JS module).
3. **Runtime**: `search-app.js` mounts into existing `#docsearch`, `fetch`es the segment (IndexedDB-cached by `buildId`), and queries in a **Worker** (`search-worker.js`) off the main thread.

| | Pizza WASM + `/index.json` | This path |
|---|---|---|
| Index when | Browser ingest | CI / local build |
| First payload | Often full `content` | meta + postings |
| Query | WASM | Worker + TF-IDF-ish postings |
| Cache | None | IndexedDB by `buildId` |

Tokenization is demo-grade (Latin words + CJK uni/bi-grams), enough for this blog’s bilingual posts.

## Build / run

```bash
# From repo root — index markdown under content/post/
node scripts/build-search-index.mjs

# After `hugo` (preferred in CI): use accurate Permalinks from index.json
hugo --gc --minify
node scripts/build-search-index.mjs --from-index public/index.json --out public/search \
  --meta-out public/js/search/build-meta.js

# Local preview
hugo server -D
# open site → navbar Search / Ctrl+K (⌘K on macOS)
```

Or via npm:

```bash
npm run build:search
```

## Test checklist

1. Run `node scripts/build-search-index.mjs` — expect a `buildId`, doc count ≈ number of posts, and files under `static/search/`.
2. `hugo server -D` → click **Search** (or Ctrl/⌘K).
3. Query Chinese and English terms from a known post title; results should appear in a few ms (worker timing in footer).
4. Reload and search again — console should log `from idb` (IndexedDB hit).
5. Confirm Network tab loads `segment-*.json` as `application/json` via `fetch`, not as a module script.

## CI

`.github/workflows/hugo.yaml` runs the index builder after Hugo so `public/search/` is published with the site.
