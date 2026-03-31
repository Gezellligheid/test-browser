<template>
  <div
    class="tab-item group relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer
           transition-all duration-150 select-none slide-in"
    :class="{
      'bg-fg/10 text-fg shadow-glow-sm': isActive,
      'hover:bg-fg/5 text-fg/70 hover:text-fg': !isActive,
      'opacity-60': tab.sleeping,
    }"
    :title="tab.title"
    draggable="true"
    @click="onClick"
    @contextmenu.prevent="onContextMenu"
    @auxclick.middle="store.closeTab(tab.id)"
    @dragstart="onDragStart"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
    @dragend="onDragEnd"
  >
    <!-- Favicon / placeholder -->
    <div class="shrink-0 w-5 h-5 flex items-center justify-center">
      <img
        v-if="tab.favicon && !faviconError"
        :src="tab.favicon"
        class="w-4 h-4 rounded-sm object-contain"
        @error="faviconError = true"
      />
      <div
        v-else
        class="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold
               bg-accent/20 text-accent2"
      >
        {{ initial }}
      </div>
    </div>

    <!-- Title (hidden for pinned tabs) -->
    <template v-if="!tab.pinned">
      <span class="flex-1 text-xs truncate leading-tight">
        {{ tab.title }}
      </span>

      <!-- Sleeping badge -->
      <span v-if="tab.sleeping" class="shrink-0 text-[9px] text-fg/30">🌙</span>

      <!-- Loading spinner -->
      <span v-else-if="tab.loading" class="shrink-0">
        <svg class="w-3 h-3 animate-spin text-accent2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      </span>

      <!-- Close button -->
      <button
        class="shrink-0 w-4 h-4 rounded flex items-center justify-center
               opacity-0 group-hover:opacity-100 hover:bg-fg/15 transition-all"
        :class="{ 'opacity-100': isActive }"
        @click.stop="store.closeTab(tab.id)"
        title="Close tab"
      >
        <svg width="8" height="8" viewBox="0 0 12 12" fill="currentColor">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </template>

    <!-- Active indicator line -->
    <div
      v-if="isActive"
      class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-accent rounded-r"
    />

    <!-- Drag-over indicator -->
    <div
      v-if="dragOver"
      class="absolute inset-0 rounded-lg border border-accent/60 pointer-events-none"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTabsStore } from '../store/tabs'

const props = defineProps({
  tabId: { type: String, required: true },
})

const store = useTabsStore()
const tab   = computed(() => store.tabs[props.tabId])
const isActive = computed(() => store.activeTabId === props.tabId)
const faviconError = ref(false)
const dragOver = ref(false)

const initial = computed(() => {
  if (tab.value.title && tab.value.title !== 'New Tab') return tab.value.title[0].toUpperCase()
  try { return new URL(tab.value.url).hostname.replace(/^www\./, '')[0]?.toUpperCase() ?? 'T' }
  catch { return 'T' }
})

function onClick() {
  store.switchTab(props.tabId)
}

function onContextMenu(e) {
  store.showContextMenu(props.tabId, e.clientX, e.clientY)
}

/* ── Drag-to-reorder ── */
function onDragStart(e) {
  e.dataTransfer.setData('tabId', props.tabId)
  e.dataTransfer.effectAllowed = 'move'
}
function onDragOver(e) {
  if (e.dataTransfer.getData('tabId') === props.tabId) return
  dragOver.value = true
}
function onDragLeave() {
  dragOver.value = false
}
function onDrop(e) {
  dragOver.value = false
  const fromId = e.dataTransfer.getData('tabId')
  if (fromId && fromId !== props.tabId) store.reorderTab(fromId, props.tabId)
}
function onDragEnd() {
  dragOver.value = false
}
</script>
