<template>
  <aside
    class="flex flex-col bg-app border-r border-fg/5 h-screen shrink-0 transition-all duration-200 overflow-hidden"
    :style="{ width: store.sidebarCollapsed ? '0px' : store.sidebarWidth + 'px' }"
  >
    <!-- ─── Header: drag region ─── -->
    <div class="drag-region flex items-center justify-between shrink-0 h-9">
      <!-- Sidebar toggle (left) -->
      <button
        class="no-drag h-full px-3 text-fg/30 hover:text-fg/70 hover:bg-fg/5
               transition-all flex items-center"
        title="Toggle Sidebar (Ctrl+B)"
        @click="store.sidebarCollapsed = !store.sidebarCollapsed"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <path d="M9 3v18"/>
        </svg>
      </button>

      <!-- Windows controls (only when docked to sidebar) -->
      <div v-if="store.windowControlsPos === 'sidebar'" class="no-drag flex items-stretch h-full">
        <button
          class="w-11 flex items-center justify-center text-fg/50 hover:bg-fg/10 hover:text-fg transition-colors"
          title="Minimize" @click="win.minimize()"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1.5" rx="0.5"/></svg>
        </button>
        <button
          class="w-11 flex items-center justify-center text-fg/50 hover:bg-fg/10 hover:text-fg transition-colors"
          title="Maximize" @click="win.maximize()"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2">
            <rect x="0.6" y="0.6" width="8.8" height="8.8" rx="0.5"/>
          </svg>
        </button>
        <button
          class="w-11 flex items-center justify-center text-fg/50 hover:bg-red-600 hover:text-fg transition-colors"
          title="Close" @click="win.close()"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
            <path d="M1 1l8 8M9 1L1 9"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ─── Address bar ─── -->
    <AddressBar ref="addressBarRef" />

    <!-- ─── Tab list ─── -->
    <TabList />

    <!-- ─── Footer ─── -->
    <div class="relative shrink-0 border-t border-fg/5 no-drag">

      <!-- Footer row -->
      <div class="flex items-center justify-between px-2 py-2">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-fg/60 hover:text-fg
                 hover:bg-fg/5 transition-all text-xs"
          title="New Tab (Ctrl+T)"
          @click="store.createTab(null)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span>New Tab</span>
        </button>

        <div class="flex items-center gap-0.5">
          <!-- Split view -->
          <button
            class="p-1.5 rounded-lg text-fg/30 hover:text-fg/70 hover:bg-fg/5 transition-all"
            :class="{ 'text-accent': store.splitViewActive }"
            title="Split View (Ctrl+Shift+D)"
            @click="store.toggleSplitView()"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M12 3v18"/>
            </svg>
          </button>

          <!-- Settings toggle -->
          <button
            class="p-1.5 rounded-lg transition-all"
            :class="store.showSettings
              ? 'text-accent2 bg-accent/15'
              : 'text-fg/30 hover:text-fg/70 hover:bg-fg/5'"
            title="Settings"
            @click="store.showSettings = !store.showSettings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06
                       a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09
                       A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83
                       l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09
                       A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83
                       l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09
                       a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83
                       l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09
                       a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue'
import { useTabsStore } from '../store/tabs'
import AddressBar from './AddressBar.vue'
import TabList from './TabList.vue'

const store        = useTabsStore()
const addressBarRef = ref(null)

const win = {
  close:    () => window.electronAPI?.closeWindow(),
  minimize: () => window.electronAPI?.minimizeWindow(),
  maximize: () => window.electronAPI?.maximizeWindow(),
}

defineExpose({
  focusAddressBar: () => addressBarRef.value?.focus(),
})
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active { transition: opacity 0.15s, transform 0.15s; }
.slide-up-enter-from,
.slide-up-leave-to     { opacity: 0; transform: translateY(6px); }
</style>
