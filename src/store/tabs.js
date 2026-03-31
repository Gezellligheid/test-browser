import { defineStore } from 'pinia'
import { ref, reactive, computed, nextTick, watch } from 'vue'
import webviewRegistry from '../webviewRegistry'

/* ── Constants ── */
const NEW_TAB_FILE  = 'newtab.html'
const SLEEP_TIMEOUT = 5 * 60 * 1000   // 5 min

/* ── Helpers ── */
function generateId() {
  return 'tab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
}

function resolveFile(name) {
  const base = window.location.href.replace(/[^/]+$/, '')
  return base + name
}

function normalizeUrl(input) {
  if (!input?.trim()) return resolveFile(NEW_TAB_FILE)
  const t = input.trim()
  if (['newtab', 'new tab', 'about:newtab'].includes(t)) return resolveFile(NEW_TAB_FILE)
  if (t.startsWith('about:') || t.startsWith('data:') || t.startsWith('file://')) return t
  if (/^(https?|ftp):\/\//i.test(t)) return t
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(\/.*)?$/.test(t) && !t.includes(' ')) return 'https://' + t
  return 'https://www.google.com/search?q=' + encodeURIComponent(t)
}

const SUGGESTION_SITES = [
  { title: 'Google',       url: 'https://www.google.com' },
  { title: 'GitHub',       url: 'https://github.com' },
  { title: 'YouTube',      url: 'https://www.youtube.com' },
  { title: 'Reddit',       url: 'https://www.reddit.com' },
  { title: 'Wikipedia',    url: 'https://en.wikipedia.org' },
  { title: 'Hacker News',  url: 'https://news.ycombinator.com' },
  { title: 'Twitter / X',  url: 'https://twitter.com' },
  { title: 'Gmail',        url: 'https://mail.google.com' },
  { title: 'Stack Overflow', url: 'https://stackoverflow.com' },
]

/* ══════════════════════════════════════════════
   Pinia store
   ══════════════════════════════════════════════ */
export const useTabsStore = defineStore('tabs', () => {

  /* ─── State ─── */
  const tabs        = reactive({})   // { [id]: TabObject }
  const tabOrder    = ref([])        // ordered array of ids
  const activeTabId = ref(null)

  const splitViewActive = ref(false)
  const splitViewTabId  = ref(null)

  const sidebarCollapsed    = ref(false)
  const sidebarWidth        = ref(260)
  const isFullscreen        = ref(false)
  const windowControlsPos   = ref('sidebar')
  const showSettings        = ref(false)
  const showCommandPalette  = ref(false)

  const addressBarValue  = ref('')
  const suggestions      = ref([])
  const suggestionIndex  = ref(-1)

  const contextMenu = ref({ visible: false, x: 0, y: 0, tabId: null })

  const sleepTimers = new Map()

  /* ─── Computed ─── */
  const pinnedTabs  = computed(() => tabOrder.value.filter(id => tabs[id]?.pinned))
  const regularTabs = computed(() => tabOrder.value.filter(id => !tabs[id]?.pinned))
  const activeTab   = computed(() => tabs[activeTabId.value] ?? null)

  /* ─── Create tab ─── */
  function createTab(url, opts = {}) {
    const id  = generateId()
    const src = url ? normalizeUrl(url) : resolveFile(NEW_TAB_FILE)

    tabs[id] = {
      id,
      url:           src,
      title:         'New Tab',
      favicon:       null,
      sleeping:      false,
      pinned:        opts.pinned ?? false,
      lastActive:    Date.now(),
      history:       [src],
      historyIndex:  0,
      loading:       false,
      canGoBack:     false,
      canGoForward:  false,
      zoomFactor:    1.0,
      savedUrl:      null,
    }

    if (opts.pinned) {
      tabOrder.value.unshift(id)
    } else {
      const idx = tabOrder.value.indexOf(activeTabId.value)
      if (idx >= 0 && !opts.atEnd) tabOrder.value.splice(idx + 1, 0, id)
      else tabOrder.value.push(id)
    }

    if (!opts.background) nextTick(() => switchTab(id))
    return id
  }

  /* ─── Close tab ─── */
  function closeTab(id) {
    if (!tabs[id]) return
    const wasActive = activeTabId.value === id
    const idx       = tabOrder.value.indexOf(id)

    clearTimeout(sleepTimers.get(id))
    sleepTimers.delete(id)
    webviewRegistry.delete(id)

    delete tabs[id]
    tabOrder.value.splice(idx, 1)

    if (tabOrder.value.length === 0) {
      activeTabId.value = null
      createTab(null)
      return
    }

    if (wasActive) {
      switchTab(tabOrder.value[Math.min(idx, tabOrder.value.length - 1)])
    }
  }

  /* ─── Switch tab ─── */
  function switchTab(id) {
    if (!tabs[id]) return
    if (activeTabId.value && activeTabId.value !== id) resetSleepTimer(activeTabId.value)

    activeTabId.value = id
    tabs[id].lastActive = Date.now()

    if (tabs[id].sleeping) wakeTab(id)
    else resetSleepTimer(id)

    addressBarValue.value = tabs[id].url
  }

  /* ─── Navigate ─── */
  function navigate(id, url) {
    if (!tabs[id]) return
    const src = normalizeUrl(url || '')
    tabs[id].url = src
    const wv = webviewRegistry.get(id)
    if (wv) wv.src = src
    addressBarValue.value = src
  }

  function goBack(id = activeTabId.value) {
    const wv = webviewRegistry.get(id)
    if (wv?.canGoBack()) wv.goBack()
  }

  function goForward(id = activeTabId.value) {
    const wv = webviewRegistry.get(id)
    if (wv?.canGoForward()) wv.goForward()
  }

  function reload(id = activeTabId.value, force = false) {
    const wv = webviewRegistry.get(id)
    if (!wv) return
    if (tabs[id]?.loading) { wv.stop(); return }
    if (force) wv.reloadIgnoringCache()
    else wv.reload()
  }

  function goHome() {
    navigate(activeTabId.value, null)
  }

  /* ─── Pin / unpin ─── */
  function togglePin(id) {
    const tab = tabs[id]
    if (!tab) return
    tab.pinned = !tab.pinned

    tabOrder.value.splice(tabOrder.value.indexOf(id), 1)
    if (tab.pinned) {
      const firstUnpinned = tabOrder.value.findIndex(tid => !tabs[tid]?.pinned)
      tabOrder.value.splice(firstUnpinned >= 0 ? firstUnpinned : 0, 0, id)
    } else {
      let lastPinned = -1
      tabOrder.value.forEach((tid, i) => { if (tabs[tid]?.pinned) lastPinned = i })
      tabOrder.value.splice(lastPinned + 1, 0, id)
    }
  }

  /* ─── Duplicate tab ─── */
  function duplicateTab(id) {
    const tab = tabs[id]
    if (tab) createTab(tab.url)
  }

  /* ─── Sleep / wake ─── */
  function sleepTab(id) {
    const tab = tabs[id]
    if (!tab || tab.sleeping || tab.pinned || id === activeTabId.value) return
    const wv = webviewRegistry.get(id)
    if (!wv) return

    wv.executeJavaScript('window.scrollY').then(y => { tab.scrollY = y }).catch(() => {})
    tab.savedUrl  = tab.url
    tab.sleeping  = true

    nextTick(() => {
      const w = webviewRegistry.get(id)
      if (w) w.src = 'about:blank'
    })

    clearTimeout(sleepTimers.get(id))
    sleepTimers.delete(id)
  }

  function wakeTab(id) {
    const tab = tabs[id]
    if (!tab?.sleeping) return
    tab.sleeping = false
    const url = tab.savedUrl || tab.url
    nextTick(() => {
      const wv = webviewRegistry.get(id)
      if (wv) wv.src = url
    })
    resetSleepTimer(id)
  }

  function resetSleepTimer(id) {
    clearTimeout(sleepTimers.get(id))
    sleepTimers.set(id, setTimeout(() => sleepTab(id), SLEEP_TIMEOUT))
  }

  /* ─── Zoom ─── */
  function zoomIn() {
    const tab = tabs[activeTabId.value]
    if (!tab) return
    tab.zoomFactor = Math.min(tab.zoomFactor + 0.1, 3.0)
    webviewRegistry.get(activeTabId.value)?.setZoomFactor(tab.zoomFactor)
  }
  function zoomOut() {
    const tab = tabs[activeTabId.value]
    if (!tab) return
    tab.zoomFactor = Math.max(tab.zoomFactor - 0.1, 0.3)
    webviewRegistry.get(activeTabId.value)?.setZoomFactor(tab.zoomFactor)
  }
  function zoomReset() {
    const tab = tabs[activeTabId.value]
    if (!tab) return
    tab.zoomFactor = 1.0
    webviewRegistry.get(activeTabId.value)?.setZoomFactor(1.0)
  }

  /* ─── Developer tools ─── */
  function toggleDevTools() {
    const wv = webviewRegistry.get(activeTabId.value)
    if (!wv) return
    wv.isDevToolsOpened() ? wv.closeDevTools() : wv.openDevTools()
  }

  /* ─── Split view ─── */
  function toggleSplitView(secondTabId = null) {
    splitViewActive.value = !splitViewActive.value
    splitViewTabId.value  = splitViewActive.value ? (secondTabId || null) : null
  }

  /* ─── Context menu ─── */
  function showContextMenu(tabId, x, y) {
    contextMenu.value = { visible: true, x, y, tabId }
  }
  function hideContextMenu() {
    contextMenu.value.visible = false
  }
  function runContextAction(action) {
    const id = contextMenu.value.tabId
    hideContextMenu()
    switch (action) {
      case 'sleep':
        tabs[id]?.sleeping ? (wakeTab(id), switchTab(id)) : sleepTab(id)
        break
      case 'pin':        togglePin(id);   break
      case 'duplicate':  duplicateTab(id); break
      case 'reload':     reload(id);       break
      case 'split':      toggleSplitView(id); break
      case 'close':      closeTab(id);    break
      case 'closeOthers':
        tabOrder.value.filter(tid => tid !== id).forEach(tid => closeTab(tid))
        break
    }
  }

  /* ─── Suggestions ─── */
  function updateSuggestions(query) {
    if (!query.trim()) { suggestions.value = []; suggestionIndex.value = -1; return }
    const q = query.toLowerCase()
    const matched = SUGGESTION_SITES.filter(s =>
      s.title.toLowerCase().includes(q) || s.url.includes(q)
    ).slice(0, 5)
    suggestions.value = [
      ...matched,
      { title: `Search "${query}"`, url: 'https://www.google.com/search?q=' + encodeURIComponent(query), isSearch: true },
    ]
    suggestionIndex.value = -1
  }
  function clearSuggestions() {
    suggestions.value = []
    suggestionIndex.value = -1
  }

  /* ─── Webview event callbacks (called from TabView.vue) ─── */
  function onNavigate(id, url) {
    const tab = tabs[id]
    if (!tab) return
    tab.url = url
    if (tab.history[tab.historyIndex] !== url) {
      tab.history.splice(tab.historyIndex + 1)
      tab.history.push(url)
      if (tab.history.length > 50) tab.history.shift()
      tab.historyIndex = tab.history.length - 1
    }
    if (id === activeTabId.value) addressBarValue.value = url
    resetSleepTimer(id)
  }

  function onTitleUpdate(id, title)   { if (tabs[id]) tabs[id].title   = title || 'New Tab' }
  function onFaviconUpdate(id, url)   { if (tabs[id]) tabs[id].favicon  = url }

  function onLoadStart(id) {
    if (!tabs[id]) return
    tabs[id].loading = true
    const wv = webviewRegistry.get(id)
    if (wv) { tabs[id].canGoBack = wv.canGoBack(); tabs[id].canGoForward = wv.canGoForward() }
  }

  function onLoadStop(id) {
    if (!tabs[id]) return
    tabs[id].loading = false
    const wv = webviewRegistry.get(id)
    if (wv) { tabs[id].canGoBack = wv.canGoBack(); tabs[id].canGoForward = wv.canGoForward() }
  }

  function onNewWindow(url) { createTab(url) }

  /* ─── Drag-to-reorder ─── */
  function reorderTab(fromId, toId) {
    const from = tabOrder.value.indexOf(fromId)
    const to   = tabOrder.value.indexOf(toId)
    if (from === -1 || to === -1 || from === to) return
    tabOrder.value.splice(from, 1)
    tabOrder.value.splice(to, 0, fromId)
  }

  return {
    // state
    tabs, tabOrder, activeTabId,
    splitViewActive, splitViewTabId,
    sidebarCollapsed, sidebarWidth, isFullscreen, windowControlsPos, showSettings, showCommandPalette,
    addressBarValue, suggestions, suggestionIndex,
    contextMenu,
    // computed
    pinnedTabs, regularTabs, activeTab,
    // actions
    createTab, closeTab, switchTab,
    navigate, goBack, goForward, reload, goHome,
    togglePin, duplicateTab,
    sleepTab, wakeTab,
    zoomIn, zoomOut, zoomReset,
    toggleDevTools, toggleSplitView,
    showContextMenu, hideContextMenu, runContextAction,
    updateSuggestions, clearSuggestions,
    onNavigate, onTitleUpdate, onFaviconUpdate,
    onLoadStart, onLoadStop, onNewWindow,
    reorderTab,
  }
})
