<template>
  <div
    class="tab-pane"
    :class="{ active: isActive, 'split-active': forceShow }"
    :data-tab-id="tabId"
  >
    <!-- Sleep overlay -->
    <div
      v-if="tab.sleeping"
      class="flex-1 flex flex-col items-center justify-center bg-app text-fg gap-4"
    >
      <div class="text-5xl">🌙</div>
      <div class="text-center">
        <p class="text-base font-medium text-fg/80 mb-1">{{ tab.title }}</p>
        <p class="text-sm text-fg/40">Tab is sleeping to save memory</p>
      </div>
      <button
        class="mt-2 px-5 py-2 rounded-xl bg-accent hover:bg-accent2 text-fg text-sm
               font-medium transition-colors shadow-glow"
        @click="wake"
      >
        Wake Up
      </button>
    </div>

    <!-- Webview -->
    <webview
      v-show="!tab.sleeping"
      ref="webviewEl"
      :src="tab.url"
      allowpopups=""
      webpreferences="contextIsolation=true"
      @did-start-loading="store.onLoadStart(tabId)"
      @did-stop-loading="store.onLoadStop(tabId)"
      @did-navigate="e => store.onNavigate(tabId, e.url)"
      @did-navigate-in-page="e => e.isMainFrame && store.onNavigate(tabId, e.url)"
      @page-title-updated="e => store.onTitleUpdate(tabId, e.title)"
      @page-favicon-updated="e => e.favicons?.length && store.onFaviconUpdate(tabId, e.favicons[0])"
      @did-fail-load="e => e.errorCode !== -3 && store.onLoadStop(tabId)"
      @new-window="e => store.onNewWindow(e.url)"
      @enter-html-full-screen="store.isFullscreen = true"
      @leave-html-full-screen="store.isFullscreen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTabsStore } from '../store/tabs'
import webviewRegistry from '../webviewRegistry'

const props = defineProps({
  tabId:     { type: String,  required: true },
  forceShow: { type: Boolean, default: false },
})

const store     = useTabsStore()
const webviewEl = ref(null)
const tab       = computed(() => store.tabs[props.tabId])
const isActive  = computed(() => store.activeTabId === props.tabId)

onMounted(() => {
  if (webviewEl.value) webviewRegistry.set(props.tabId, webviewEl.value)
})

onUnmounted(() => {
  webviewRegistry.delete(props.tabId)
})

function wake() {
  store.wakeTab(props.tabId)
  store.switchTab(props.tabId)
}
</script>
