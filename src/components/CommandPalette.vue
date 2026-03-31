<template>
  <Teleport to="body">
    <Transition name="palette">
      <div
        v-if="s.showCommandPalette"
        class="fixed inset-0 z-[9998] flex items-start justify-center pt-32"
        @click.self="close"
        @keydown.escape="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="close" />

        <!-- Panel -->
        <div class="relative w-[580px] max-w-[90vw] rounded-2xl border border-fg/10 bg-app2 shadow-2xl overflow-hidden">

          <!-- Input row -->
          <div class="flex items-center gap-3 px-4 py-3.5 border-b border-fg/8">
            <!-- Icon: slash for commands, search otherwise -->
            <svg v-if="isSlashMode" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-accent shrink-0">
              <line x1="7" y1="3" x2="17" y2="21"/>
            </svg>
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-fg/30 shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>

            <input
              ref="inputRef"
              v-model="query"
              class="flex-1 bg-transparent text-sm text-fg/90 placeholder-fg/25 outline-none"
              placeholder="Search or type / for commands…"
              @keydown="onKeydown"
            />

            <kbd class="text-[10px] text-fg/20 border border-fg/10 rounded px-1.5 py-0.5 shrink-0">Esc</kbd>
          </div>

          <!-- Results list -->
          <div class="max-h-80 overflow-y-auto py-1.5">

            <!-- Slash commands -->
            <template v-if="isSlashMode">
              <button
                v-for="(cmd, i) in filteredCommands"
                :key="cmd.id"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                :class="i === selectedIndex ? 'bg-accent/15 text-fg' : 'text-fg/60 hover:bg-fg/5 hover:text-fg/85'"
                @click="runCommand(cmd)"
                @mouseenter="selectedIndex = i"
              >
                <span class="text-base w-5 text-center shrink-0">{{ cmd.icon }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm">{{ cmd.label }}</p>
                  <p class="text-xs text-fg/30 truncate">{{ cmd.description }}</p>
                </div>
                <span class="text-[10px] text-fg/20 font-mono shrink-0">{{ cmd.shortcut }}</span>
              </button>

              <div v-if="filteredCommands.length === 0" class="px-4 py-6 text-center text-sm text-fg/25">
                No matching commands
              </div>
            </template>

            <!-- Search mode -->
            <template v-else>
              <!-- Open URL suggestion (when query looks like a URL) -->
              <button
                v-if="looksLikeUrl"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                :class="selectedIndex === 0 ? 'bg-accent/15 text-fg' : 'text-fg/60 hover:bg-fg/5 hover:text-fg/85'"
                @click="openUrl(query)"
                @mouseenter="selectedIndex = 0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 text-accent">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                <div class="flex-1 min-w-0">
                  <p class="text-sm truncate">{{ query }}</p>
                  <p class="text-xs text-fg/30">Open URL</p>
                </div>
              </button>

              <!-- Google search -->
              <button
                v-if="query.trim()"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                :class="selectedIndex === (looksLikeUrl ? 1 : 0) ? 'bg-accent/15 text-fg' : 'text-fg/60 hover:bg-fg/5 hover:text-fg/85'"
                @click="searchGoogle"
                @mouseenter="selectedIndex = looksLikeUrl ? 1 : 0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 text-fg/40">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <div class="flex-1 min-w-0">
                  <p class="text-sm truncate">Search "{{ query }}"</p>
                  <p class="text-xs text-fg/30">Google Search</p>
                </div>
              </button>

              <!-- Site suggestions -->
              <button
                v-for="(s, i) in siteSuggestions"
                :key="s.url"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                :class="selectedIndex === baseOffset + i ? 'bg-accent/15 text-fg' : 'text-fg/60 hover:bg-fg/5 hover:text-fg/85'"
                @click="openUrl(s.url)"
                @mouseenter="selectedIndex = baseOffset + i"
              >
                <span class="text-base w-5 text-center shrink-0">{{ s.emoji }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm">{{ s.title }}</p>
                  <p class="text-xs text-fg/30 truncate">{{ s.url }}</p>
                </div>
              </button>

              <!-- Hint when empty -->
              <div v-if="!query.trim()" class="px-4 py-5 text-center text-xs text-fg/20">
                Type to search · <span class="text-fg/30">/</span> for commands
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useTabsStore } from '../store/tabs'

const s = useTabsStore()

const query        = ref('')
const inputRef     = ref(null)
const selectedIndex = ref(0)

/* ── Slash commands registry ── */
const COMMANDS = [
  { id: 'settings',   icon: '⚙️',  label: 'Settings',        description: 'Open the settings page',          shortcut: '/settings',  action: () => { s.showSettings = true } },
  { id: 'newtab',     icon: '➕',  label: 'New Tab',          description: 'Open a new tab',                  shortcut: '/new',       action: () => { s.createTab(null) } },
  { id: 'close',      icon: '✕',   label: 'Close Tab',        description: 'Close the current tab',           shortcut: '/close',     action: () => { s.closeTab(s.activeTabId) } },
  { id: 'pin',        icon: '📌',  label: 'Pin / Unpin Tab',  description: 'Toggle pin on current tab',       shortcut: '/pin',       action: () => { s.togglePin(s.activeTabId) } },
  { id: 'split',      icon: '⬜',  label: 'Split View',       description: 'Toggle split view',               shortcut: '/split',     action: () => { s.toggleSplitView() } },
  { id: 'home',       icon: '🏠',  label: 'Go Home',          description: 'Navigate to new tab page',        shortcut: '/home',      action: () => { s.goHome() } },
  { id: 'devtools',   icon: '🛠️',  label: 'Developer Tools',  description: 'Open DevTools for current tab',   shortcut: '/devtools',  action: () => { s.toggleDevTools() } },
  { id: 'reload',     icon: '🔄',  label: 'Reload',           description: 'Reload current tab',              shortcut: '/reload',    action: () => { s.reload() } },
  { id: 'sidebar',    icon: '◧',   label: 'Toggle Sidebar',   description: 'Show or hide the sidebar',        shortcut: '/sidebar',   action: () => { s.sidebarCollapsed = !s.sidebarCollapsed } },
]

/* ── Common sites for suggestions ── */
const SITES = [
  { title: 'Google',       url: 'https://www.google.com',        emoji: '🔍' },
  { title: 'GitHub',       url: 'https://github.com',            emoji: '🐙' },
  { title: 'YouTube',      url: 'https://www.youtube.com',       emoji: '▶️' },
  { title: 'Reddit',       url: 'https://www.reddit.com',        emoji: '🤖' },
  { title: 'Wikipedia',    url: 'https://en.wikipedia.org',      emoji: '📚' },
  { title: 'Hacker News',  url: 'https://news.ycombinator.com',  emoji: '🔥' },
  { title: 'Twitter / X',  url: 'https://twitter.com',           emoji: '🐦' },
  { title: 'Gmail',        url: 'https://mail.google.com',       emoji: '✉️' },
  { title: 'Stack Overflow', url: 'https://stackoverflow.com',   emoji: '📦' },
]

/* ── Computed ── */
const isSlashMode = computed(() => query.value.startsWith('/'))

const filteredCommands = computed(() => {
  if (!isSlashMode.value) return []
  const q = query.value.slice(1).toLowerCase()
  if (!q) return COMMANDS
  return COMMANDS.filter(c =>
    c.id.includes(q) || c.label.toLowerCase().includes(q) || c.shortcut.slice(1).includes(q)
  )
})

const looksLikeUrl = computed(() => {
  const t = query.value.trim()
  return /^(https?:\/\/|www\.)[^\s]+/.test(t) ||
    (/^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(\/.*)?$/.test(t) && !t.includes(' '))
})

const siteSuggestions = computed(() => {
  if (!query.value.trim() || isSlashMode.value) return []
  const q = query.value.toLowerCase()
  return SITES.filter(s => s.title.toLowerCase().includes(q) || s.url.includes(q)).slice(0, 4)
})

// index offset for site suggestions (after URL + search rows)
const baseOffset = computed(() => {
  let offset = 0
  if (looksLikeUrl.value) offset++
  if (query.value.trim()) offset++
  return offset
})

const totalItems = computed(() => {
  if (isSlashMode.value) return filteredCommands.value.length
  return baseOffset.value + siteSuggestions.value.length
})

/* ── Watch palette open → focus & reset ── */
watch(() => s.showCommandPalette, (val) => {
  if (val) {
    query.value = ''
    selectedIndex.value = 0
    nextTick(() => inputRef.value?.focus())
  }
})

watch(query, () => { selectedIndex.value = 0 })

/* ── Actions ── */
function close() {
  s.showCommandPalette = false
}

function openUrl(url) {
  const normalized = /^https?:\/\//.test(url) ? url : 'https://' + url
  s.navigate(s.activeTabId, normalized)
  close()
}

function searchGoogle() {
  s.navigate(s.activeTabId, 'https://www.google.com/search?q=' + encodeURIComponent(query.value))
  close()
}

function runCommand(cmd) {
  cmd.action()
  close()
}

function onKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, totalItems.value - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    confirmSelection()
  }
}

function confirmSelection() {
  if (isSlashMode.value) {
    const cmd = filteredCommands.value[selectedIndex.value]
    if (cmd) runCommand(cmd)
    return
  }

  const idx = selectedIndex.value
  if (looksLikeUrl.value && idx === 0) { openUrl(query.value); return }

  const searchIdx = looksLikeUrl.value ? 1 : 0
  if (idx === searchIdx && query.value.trim()) { searchGoogle(); return }

  const siteIdx = idx - baseOffset.value
  if (siteIdx >= 0 && siteIdx < siteSuggestions.value.length) {
    openUrl(siteSuggestions.value[siteIdx].url)
  }
}
</script>

<style scoped>
.palette-enter-active,
.palette-leave-active { transition: opacity 0.15s, transform 0.15s; }
.palette-enter-from,
.palette-leave-to     { opacity: 0; transform: translateY(-8px) scale(0.97); }
</style>
