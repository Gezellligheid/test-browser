<template>
  <div
    v-show="!store.isFullscreen"
    class="shrink-0 flex items-center gap-1 px-2 h-10 border-b border-fg/5 bg-app transition-all"
    :style="store.windowControlsPos === 'top-right' ? 'padding-right: 136px' : ''"
  >
    <!-- Back -->
    <button
      class="nav-btn"
      :class="{ 'opacity-25 cursor-default': !tab?.canGoBack }"
      :disabled="!tab?.canGoBack"
      title="Back (Alt+Left)"
      @click="store.goBack()"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
    </button>

    <!-- Forward -->
    <button
      class="nav-btn"
      :class="{ 'opacity-25 cursor-default': !tab?.canGoForward }"
      :disabled="!tab?.canGoForward"
      title="Forward (Alt+Right)"
      @click="store.goForward()"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </button>

    <!-- Reload / Stop -->
    <button
      class="nav-btn"
      :title="tab?.loading ? 'Stop (Esc)' : 'Reload (Ctrl+R)'"
      @click="store.reload()"
    >
      <!-- Stop icon -->
      <svg v-if="tab?.loading" width="13" height="13" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
      </svg>
      <!-- Reload icon -->
      <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
    </button>

    <!-- Home -->
    <button class="nav-btn" title="Home (Alt+Home)" @click="store.goHome()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </button>

    <!-- URL display (read-only; click to focus sidebar address bar) -->
    <div
      class="flex-1 mx-1 px-3 py-1.5 rounded-lg bg-fg/4 border border-fg/6
             hover:border-fg/12 transition-colors cursor-text overflow-hidden"
      @click="$emit('focus-address-bar')"
    >
      <span v-if="displayUrl" class="text-xs text-fg/50 truncate block">{{ displayUrl }}</span>
      <span v-else class="text-xs text-fg/20 truncate block">Search or enter address…</span>
    </div>

    <!-- Zoom out -->
    <button class="nav-btn" title="Zoom Out (Ctrl+-)" @click="store.zoomOut()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M8 11h6"/>
      </svg>
    </button>

    <!-- Zoom in -->
    <button class="nav-btn" title="Zoom In (Ctrl++)" @click="store.zoomIn()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>
      </svg>
    </button>

    <!-- Dev tools -->
    <button class="nav-btn" title="Developer Tools (F12)" @click="store.toggleDevTools()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTabsStore } from '../store/tabs'

defineEmits(['focus-address-bar'])

const store = useTabsStore()
const tab   = computed(() => store.activeTab)

const isNewTab = (url) => !url || url.startsWith('file://') || url.includes('newtab.html')

const displayUrl = computed(() => {
  const url = tab.value?.url ?? ''
  if (isNewTab(url)) return ''
  return url.replace(/^https?:\/\//, '')
})
</script>

<style scoped>
.nav-btn {
  @apply p-1.5 rounded-lg text-fg/40 hover:text-fg/80 hover:bg-fg/5
         transition-all flex items-center justify-center shrink-0;
}
</style>
