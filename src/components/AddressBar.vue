<template>
  <div class="relative px-3 py-2 no-drag">
    <!-- Input wrapper -->
    <div
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-200"
      :class="focused
        ? 'bg-fg/8 border-accent/60 shadow-glow-sm'
        : 'bg-fg/4 border-fg/8 hover:border-fg/15'"
    >
      <!-- Security / search icon -->
      <div class="shrink-0 text-fg/30">
        <svg v-if="isHttps" width="11" height="11" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      </div>

      <!-- URL input -->
      <input
        ref="inputEl"
        v-model="inputValue"
        type="text"
        placeholder="Search or enter URL…"
        autocomplete="off"
        spellcheck="false"
        class="flex-1 bg-transparent text-xs text-fg/90 placeholder-fg/25
               outline-none min-w-0"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
        @input="onInput"
      />

      <!-- Go button -->
      <button
        v-show="focused && inputValue"
        class="shrink-0 text-fg/40 hover:text-fg transition-colors"
        @mousedown.prevent="commit"
        title="Go"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
    </div>

    <!-- Suggestions dropdown -->
    <Transition name="suggestions">
      <div
        v-if="focused && store.suggestions.length > 0"
        class="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl border border-fg/10
               bg-app2/95 backdrop-blur-sm shadow-xl overflow-hidden"
      >
        <div
          v-for="(s, i) in store.suggestions"
          :key="s.url"
          class="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors text-xs"
          :class="i === store.suggestionIndex
            ? 'bg-accent/20 text-fg'
            : 'text-fg/60 hover:bg-fg/5 hover:text-fg'"
          @mousedown.prevent="pickSuggestion(s)"
        >
          <span class="shrink-0 text-fg/30">
            <svg v-if="s.isSearch" width="11" height="11" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </span>
          <span class="flex-1 truncate">{{ s.title }}</span>
          <span class="shrink-0 text-fg/20 text-[10px] truncate max-w-[100px]">
            {{ s.isSearch ? '' : s.url.replace(/^https?:\/\//, '') }}
          </span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useTabsStore } from '../store/tabs'

const store    = useTabsStore()
const inputEl  = ref(null)
const focused  = ref(false)
const inputValue = ref('')

const isHttps = computed(() =>
  /^https:\/\//i.test(store.activeTab?.url ?? '')
)

const isNewTab = (url) => !url || url.includes('newtab.html')

const displayValue = (url) => isNewTab(url) ? '' : (url ?? '')

/* Sync input with active tab's URL when not focused */
watch(() => store.activeTab?.url, url => {
  if (!focused.value) inputValue.value = displayValue(url)
}, { immediate: true })

/* Also watch addressBarValue set by the store (e.g. after navigate) */
watch(() => store.addressBarValue, val => {
  if (!focused.value) inputValue.value = displayValue(val)
})

function onFocus() {
  focused.value = true
  // Show actual URL when focused so user can edit it (even on newtab)
  const url = store.activeTab?.url ?? ''
  inputValue.value = isNewTab(url) ? '' : url
  setTimeout(() => inputEl.value?.select(), 0)
}

function onBlur() {
  focused.value = false
  store.clearSuggestions()
  inputValue.value = displayValue(store.activeTab?.url)
}

function onInput() {
  store.updateSuggestions(inputValue.value)
}

function onKeydown(e) {
  const len = store.suggestions.length
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    store.suggestionIndex = (store.suggestionIndex + 1) % len
    if (store.suggestions[store.suggestionIndex]) {
      inputValue.value = store.suggestions[store.suggestionIndex].url
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    store.suggestionIndex = (store.suggestionIndex - 1 + len) % len
    if (store.suggestions[store.suggestionIndex]) {
      inputValue.value = store.suggestions[store.suggestionIndex].url
    }
  } else if (e.key === 'Enter') {
    commit()
  } else if (e.key === 'Escape') {
    inputEl.value?.blur()
  }
}

function commit() {
  const val = inputValue.value.trim()
  if (!val) return
  store.navigate(store.activeTabId, val)
  store.clearSuggestions()
  inputEl.value?.blur()
}

function pickSuggestion(s) {
  inputValue.value = s.url
  commit()
}

/* Expose focus method for keyboard shortcut Ctrl+L */
defineExpose({ focus: () => { inputEl.value?.focus() } })
</script>

<style scoped>
.suggestions-enter-active,
.suggestions-leave-active { transition: opacity 0.1s, transform 0.1s; }
.suggestions-enter-from,
.suggestions-leave-to     { opacity: 0; transform: translateY(-4px); }
</style>
