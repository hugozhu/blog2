/**
 * Drop-in replacement for Pizza WASM DocSearch path.
 * Mounts into #docsearch; queries run in a Worker against a prebuilt segment.
 * Segment JSON is always fetched (never imported as a JS module).
 */
import meta from './build-meta.js'

const DB = 'blog2-static-search'
const STORE = 'segments'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

async function idbSet(key, val) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(val, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function loadSegment(buildId) {
  const cached = await idbGet(buildId)
  if (cached) return { segment: cached, from: 'idb' }
  // Prefer latest.json so a stale build-meta still finds the current segment
  let url = `/search/segment-${buildId}.json`
  try {
    const latest = await fetch('/search/latest.json').then((r) => (r.ok ? r.json() : null))
    if (latest?.url) url = latest.url
    if (latest?.buildId) buildId = latest.buildId
  } catch {
    /* keep hashed url */
  }
  const cached2 = await idbGet(buildId)
  if (cached2) return { segment: cached2, from: 'idb' }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const segment = await res.json()
  await idbSet(segment.buildId || buildId, segment)
  return { segment, from: 'network' }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function debounce(fn, ms) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

function isMac() {
  return /Mac|iPhone|iPod|iPad/i.test(navigator.platform || '')
}

function createUI(root) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'docsearch-btn'
  btn.setAttribute('aria-label', 'Search')
  btn.innerHTML = `
    <span class="docsearch-btn-icon-container" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="docsearch-modal-btn-icon"><path fill="currentColor" d="M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0a1 1 0 0 0 0-1.39ZM11 18a7 7 0 1 1 7-7a7 7 0 0 1-7 7Z"/></svg>
    </span>
    <span class="docsearch-btn-placeholder">Search</span>
    <span class="docsearch-btn-keys"><kbd class="docsearch-btn-key">${isMac() ? '⌘' : 'Ctrl'}</kbd><kbd class="docsearch-btn-key">K</kbd></span>
  `
  root.appendChild(btn)

  let overlay = null
  let input = null
  let hitsEl = null
  let statusEl = null
  let active = -1
  let hits = []

  function close() {
    if (overlay) {
      overlay.remove()
      overlay = null
    }
    document.body.classList.remove('docsearch--active')
    active = -1
    hits = []
  }

  function renderHits(list, q, ms) {
    hits = list
    active = list.length ? 0 : -1
    if (!hitsEl) return
    if (!q) {
      hitsEl.innerHTML = `<div class="docsearch-modal-empty-query"></div>`
      if (statusEl) statusEl.textContent = ''
      return
    }
    if (!list.length) {
      hitsEl.innerHTML = `<div class="docsearch-modal-no-search-hits"><p class="docsearch-modal-title">No results for "${escapeHtml(q)}"</p></div>`
      if (statusEl) statusEl.textContent = `${ms ?? 0}ms`
      return
    }
    const byCat = new Map()
    for (const h of list) {
      const cat = h.category || 'Blog'
      if (!byCat.has(cat)) byCat.set(cat, [])
      byCat.get(cat).push(h)
    }
    let html = ''
    let idx = 0
    for (const [cat, items] of byCat) {
      html += `<section><div class="docsearch-modal-search-hits-category">${escapeHtml(String(cat))}</div><ul role="listbox">`
      for (const h of items) {
        const i = idx++
        html += `<li role="option" class="docsearch-modal-search-hits-item${i === active ? ' docsearch-modal-search-hits-item--active' : ''}" id="docsearch-hit-item-${i}" data-idx="${i}" aria-selected="${i === active}">
          <a href="${escapeHtml(h.url)}">
            <span class="docsearch-modal-search-hits-item-text-container">
              <p class="docsearch-modal-search-hits-item-title">${escapeHtml(h.title)}</p>
              <p class="docsearch-modal-search-hits-item-text">${escapeHtml(h.summary || '')}</p>
            </span>
          </a>
        </li>`
      }
      html += `</ul></section>`
    }
    hitsEl.innerHTML = html
    if (statusEl) statusEl.textContent = `${list.length} hits · ${ms ?? 0}ms (worker)`
    hitsEl.querySelectorAll('[data-idx]').forEach((el) => {
      el.addEventListener('mouseenter', () => setActive(+el.dataset.idx))
    })
  }

  function setActive(i) {
    active = i
    hitsEl?.querySelectorAll('.docsearch-modal-search-hits-item').forEach((el, j) => {
      el.classList.toggle('docsearch-modal-search-hits-item--active', j === i)
      el.setAttribute('aria-selected', j === i ? 'true' : 'false')
    })
    document.getElementById(`docsearch-hit-item-${i}`)?.scrollIntoView({ block: 'nearest' })
  }

  function open(onSearch) {
    if (overlay) return
    document.body.classList.add('docsearch--active')
    overlay = document.createElement('div')
    overlay.className = 'docsearch-modal-container'
    overlay.setAttribute('role', 'button')
    overlay.tabIndex = 0
    overlay.innerHTML = `
      <div class="docsearch-modal">
        <header class="docsearch-modal-search-container">
          <form class="docsearch-modal-search-input-form">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="docsearch-modal-search-input-icon"><path fill="currentColor" d="M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0a1 1 0 0 0 0-1.39ZM11 18a7 7 0 1 1 7-7a7 7 0 0 1-7 7Z"/></svg>
            <input type="search" class="docsearch-modal-search-input" placeholder="Search posts…" autocomplete="off" spellcheck="false" />
            <button type="reset" class="docsearch-modal-search-input-reset" title="Clear" hidden>×</button>
          </form>
          <button type="button" class="docsearch-modal-search-cancel-btn">Cancel</button>
        </header>
        <main class="docsearch-modal-search-hits-container"><div class="docsearch-modal-empty-query"></div></main>
        <footer class="docsearch-modal-footer">
          <span class="docsearch-modal-footer-commands">
            <li><kbd class="docsearch-modal-footer-commands-key">↵</kbd><span class="docsearch-modal-footer-commands-label">to select</span></li>
            <li><kbd class="docsearch-modal-footer-commands-key">↑</kbd><kbd class="docsearch-modal-footer-commands-key">↓</kbd><span class="docsearch-modal-footer-commands-label">to navigate</span></li>
            <li><kbd class="docsearch-modal-footer-commands-key">esc</kbd><span class="docsearch-modal-footer-commands-label">to close</span></li>
          </span>
          <span class="docsearch-modal-footer-logo"><span class="docsearch-modal-footer-logo-label" data-status></span></span>
        </footer>
      </div>`
    document.body.appendChild(overlay)
    input = overlay.querySelector('.docsearch-modal-search-input')
    hitsEl = overlay.querySelector('.docsearch-modal-search-hits-container')
    statusEl = overlay.querySelector('[data-status]')
    const form = overlay.querySelector('form')
    const resetBtn = overlay.querySelector('.docsearch-modal-search-input-reset')
    const cancelBtn = overlay.querySelector('.docsearch-modal-search-cancel-btn')

    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) close()
    })
    cancelBtn.addEventListener('click', close)
    form.addEventListener('submit', (e) => e.preventDefault())
    form.addEventListener('reset', () => {
      input.value = ''
      resetBtn.hidden = true
      renderHits([], '')
    })
    input.addEventListener('input', () => {
      resetBtn.hidden = !input.value
      onSearch(input.value.trim())
    })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (hits.length) setActive((active + 1) % hits.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (hits.length) setActive((active - 1 + hits.length) % hits.length)
        return
      }
      if (e.key === 'Enter' && active >= 0 && hits[active]) {
        e.preventDefault()
        const url = hits[active].url
        if (e.metaKey || e.ctrlKey) window.open(url, '_blank', 'noopener')
        else {
          window.location.assign(url)
          close()
        }
      }
    })
    input.focus()
  }

  return { btn, open, close, renderHits, get openState() { return !!overlay } }
}

;(async () => {
  const root = document.querySelector('#docsearch')
  if (!root) return

  const ui = createUI(root)
  let worker
  try {
    worker = new Worker(new URL('./search-worker.js', import.meta.url), { type: 'module' })
  } catch (e) {
    // Fallback for hosts that dislike module workers: classic worker via blob
    console.warn('module worker failed, using blob worker', e)
    const src = await fetch(new URL('./search-worker.js', import.meta.url)).then((r) => r.text())
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })))
  }

  let ready = false
  worker.onmessage = (ev) => {
    const msg = ev.data
    if (msg.type === 'ready') {
      ready = true
      return
    }
    if (msg.type === 'results') ui.renderHits(msg.hits, msg.q, msg.ms)
  }

  const runSearch = debounce((q) => {
    if (!ready) return
    if (!q) {
      ui.renderHits([], '')
      return
    }
    worker.postMessage({ type: 'search', payload: { q } })
  }, 80)

  function openModal() {
    ui.open(runSearch)
  }

  ui.btn.addEventListener('click', openModal)

  window.addEventListener('keydown', (e) => {
    const isHot =
      ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') ||
      (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === '/' || e.key.toLowerCase() === 's') &&
        !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && !e.target.isContentEditable)
    if (e.key === 'Escape' && ui.openState) {
      e.preventDefault()
      ui.close()
      return
    }
    if (isHot) {
      e.preventDefault()
      openModal()
    }
  })

  try {
    const { segment, from } = await loadSegment(meta.buildId)
    console.log(`[static-search] mounted build ${segment.buildId} from ${from}, docs=${segment.docCount}`)
    worker.postMessage({ type: 'mount', payload: segment })
  } catch (e) {
    console.error('[static-search] load failed', e)
    ui.btn.title = `Search unavailable: ${e.message}`
  }
})()
