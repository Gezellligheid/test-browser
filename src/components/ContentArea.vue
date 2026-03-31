<template>
  <main class="flex-1 flex flex-col overflow-hidden min-w-0 relative">

    <!-- Settings page (overlays everything when open) -->
    <Transition name="settings-slide">
      <SettingsPage v-if="store.showSettings" class="absolute inset-0 z-40" />
    </Transition>

    <!-- Navigation bar -->
    <NavBar @focus-address-bar="$emit('focus-address-bar')" />

    <!-- Tab content area (single or split) -->
    <div class="flex-1 flex overflow-hidden min-h-0 relative">

      <!-- ── Primary tab container ── -->
      <div
        class="flex flex-col overflow-hidden"
        :style="store.splitViewActive ? 'width: var(--split-left, 50%)' : 'flex: 1'"
      >
        <!-- Loading bar -->
        <div class="relative h-0.5 shrink-0 overflow-hidden">
          <div
            v-if="store.activeTab?.loading"
            class="absolute inset-0 h-full bg-gradient-to-r from-accent to-accent3
                   loading-bar-active"
          />
        </div>

        <!-- Webviews (one per tab, CSS-controlled visibility) -->
        <div class="relative flex-1 overflow-hidden">
          <TabView
            v-for="id in store.tabOrder"
            :key="id"
            :tabId="id"
          />
        </div>
      </div>

      <!-- ── Split view divider + second pane ── -->
      <template v-if="store.splitViewActive && store.splitViewTabId">
        <!-- Drag handle -->
        <div
          class="w-1 bg-fg/5 hover:bg-accent/40 cursor-col-resize shrink-0 transition-colors"
          @mousedown="onSplitDragStart"
        />

        <!-- Second pane — needs relative so the absolute tab-pane fills it -->
        <div class="flex-1 relative overflow-hidden border-l border-fg/5">
          <TabView :tabId="store.splitViewTabId" :force-show="true" />
        </div>
      </template>

    </div>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useTabsStore } from '../store/tabs'
import NavBar from './NavBar.vue'
import TabView from './TabView.vue'
import SettingsPage from './SettingsPage.vue'

defineEmits(['focus-address-bar'])

const store = useTabsStore()

/* ── Split-view drag resize ── */
let dragging = false
let startX   = 0
let startPct = 50

function onSplitDragStart(e) {
  dragging = true
  startX   = e.clientX
  const el = e.currentTarget.parentElement
  startPct = (el.firstElementChild.offsetWidth / el.offsetWidth) * 100
  document.addEventListener('mousemove', onSplitDrag)
  document.addEventListener('mouseup',   onSplitDragEnd)
}
function onSplitDrag(e) {
  if (!dragging) return
  const parent = document.querySelector('main > div')
  if (!parent) return
  const delta = ((e.clientX - startX) / parent.offsetWidth) * 100
  const pct   = Math.min(80, Math.max(20, startPct + delta))
  parent.style.setProperty('--split-left', pct + '%')
}
function onSplitDragEnd() {
  dragging = false
  document.removeEventListener('mousemove', onSplitDrag)
  document.removeEventListener('mouseup',   onSplitDragEnd)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onSplitDrag)
  document.removeEventListener('mouseup',   onSplitDragEnd)
})
</script>

<style scoped>
.settings-slide-enter-active,
.settings-slide-leave-active { transition: opacity 0.18s, transform 0.18s; }
.settings-slide-enter-from,
.settings-slide-leave-to     { opacity: 0; transform: translateY(8px); }
</style>
