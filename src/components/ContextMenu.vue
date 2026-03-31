<template>
  <Teleport to="body">
    <Transition name="ctx">
      <div
        v-if="store.contextMenu.visible"
        class="fixed z-[9999] min-w-[170px] rounded-xl border border-fg/10
               bg-app2/95 backdrop-blur-sm shadow-2xl py-1 text-xs overflow-hidden"
        :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
        @click.stop
      >
        <template v-for="item in menuItems" :key="item.id">
          <div v-if="item.id === 'separator'" class="border-t border-fg/8 my-1" />
          <button
            v-else
            class="w-full flex items-center gap-2.5 px-3 py-1.5 text-left
                   text-fg/70 hover:text-fg hover:bg-fg/5 transition-colors"
            :class="{ 'opacity-30 pointer-events-none': item.disabled }"
            @click="store.runContextAction(item.id)"
          >
            <span class="w-4 text-center shrink-0">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useTabsStore } from '../store/tabs'

const store = useTabsStore()

const pos = computed(() => {
  const { x, y } = store.contextMenu
  const pw = 180, ph = 220
  return {
    x: Math.min(x, window.innerWidth  - pw - 8),
    y: Math.min(y, window.innerHeight - ph - 8),
  }
})

const menuItems = computed(() => {
  const tab = store.tabs[store.contextMenu.tabId]
  if (!tab) return []
  return [
    { id: 'sleep',       icon: tab.sleeping ? '☀️' : '🌙', label: tab.sleeping ? 'Wake Tab' : 'Sleep Tab', disabled: tab.pinned && !tab.sleeping },
    { id: 'separator' },
    { id: 'pin',         icon: '📌', label: tab.pinned ? 'Unpin Tab' : 'Pin Tab' },
    { id: 'duplicate',   icon: '⧉',  label: 'Duplicate Tab' },
    { id: 'split',       icon: '⬜', label: 'Open in Split View' },
    { id: 'separator' },
    { id: 'reload',      icon: '↺',  label: 'Reload' },
    { id: 'separator' },
    { id: 'close',       icon: '✕',  label: 'Close Tab' },
    { id: 'closeOthers', icon: '⊠',  label: 'Close Other Tabs' },
  ]
})
</script>

<style scoped>
.ctx-enter-active, .ctx-leave-active { transition: opacity 0.1s, transform 0.1s; }
.ctx-enter-from, .ctx-leave-to       { opacity: 0; transform: scale(0.95) translateY(-4px); }
</style>
