<template>
  <div class="flex-1 flex overflow-hidden bg-app">
    <!-- ── Left nav ── -->
    <nav
      class="w-52 shrink-0 flex flex-col gap-0.5 px-3 py-6 border-r border-fg/5"
    >
      <div class="flex items-center justify-between px-3 mb-3">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-fg/25">
          Settings
        </p>
        <button
          class="p-1 rounded-md text-fg/20 hover:text-fg/60 hover:bg-fg/5 transition-colors"
          title="Close settings (Esc)"
          @click="store.showSettings = false"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M1 1l10 10M11 1L1 11"/>
          </svg>
        </button>
      </div>
      <button
        v-for="s in sections"
        :key="s.id"
        class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left"
        :class="
          active === s.id
            ? 'bg-accent/15 text-accent2'
            : 'text-fg/45 hover:text-fg/80 hover:bg-fg/5'
        "
        @click="active = s.id"
      >
        <span class="text-base leading-none">{{ s.icon }}</span>
        {{ s.label }}
      </button>
    </nav>

    <!-- ── Content ── -->
    <div class="flex-1 overflow-y-auto px-10 py-8">
      <!-- ════ Appearance ════ -->
      <section v-if="active === 'appearance'">
        <h2 class="settings-heading">Appearance</h2>

        <div class="settings-card">
          <div class="settings-row">
            <div>
              <p class="settings-label">Window controls position</p>
              <p class="settings-hint">
                Where to show the minimize / maximize / close buttons
              </p>
            </div>
            <div class="seg-control">
              <button
                :class="
                  store.windowControlsPos === 'sidebar'
                    ? 'seg-active'
                    : 'seg-inactive'
                "
                @click="store.windowControlsPos = 'sidebar'"
              >
                Sidebar
              </button>
              <button
                :class="
                  store.windowControlsPos === 'top-right'
                    ? 'seg-active'
                    : 'seg-inactive'
                "
                @click="store.windowControlsPos = 'top-right'"
              >
                Top right
              </button>
            </div>
          </div>

          <div class="settings-divider" />

          <div class="settings-row">
            <div>
              <p class="settings-label">Sidebar width</p>
              <p class="settings-hint">{{ store.sidebarWidth }}px</p>
            </div>
            <input
              type="range"
              min="160"
              max="400"
              step="4"
              :value="store.sidebarWidth"
              @input="store.sidebarWidth = +$event.target.value"
              class="range-input"
            />
          </div>
        </div>
      </section>

      <!-- ════ Tabs ════ -->
      <section v-if="active === 'tabs'">
        <h2 class="settings-heading">Tabs</h2>

        <div class="settings-card">
          <div class="settings-row">
            <div>
              <p class="settings-label">Tab sleep</p>
              <p class="settings-hint">
                Inactive tabs are suspended after 5 minutes to save memory
              </p>
            </div>
            <span class="text-xs text-fg/30 bg-fg/5 px-2 py-1 rounded-md"
              >5 min</span
            >
          </div>

          <div class="settings-divider" />

          <div class="settings-row">
            <div>
              <p class="settings-label">Open links in new tab</p>
              <p class="settings-hint">
                Links that open in a new window become a new tab instead
              </p>
            </div>
            <div class="toggle on"><div class="toggle-thumb" /></div>
          </div>
        </div>
      </section>

      <!-- ════ Quick Links ════ -->
      <section v-if="active === 'quicklinks'">
        <h2 class="settings-heading">Quick Links</h2>
        <p class="text-sm text-fg/40 mb-5">
          These appear on the new tab page. Edit them directly from the new tab
          page by clicking <span class="text-fg/60">Edit</span>.
        </p>

        <div class="settings-card">
          <div v-for="(link, i) in quickLinks" :key="link.id">
            <div class="flex items-center gap-3 py-2.5 px-4">
              <span class="text-xl w-8 text-center">{{ link.emoji }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-fg/80 truncate">
                  {{ link.label || "(no label)" }}
                </p>
                <p class="text-xs text-fg/30 truncate">{{ link.url }}</p>
              </div>
              <button
                class="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-fg/20 hover:bg-red-500/15 hover:text-red-400 transition-colors"
                @click="removeQuickLink(i)"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                >
                  <path d="M1 1l8 8M9 1L1 9" />
                </svg>
              </button>
            </div>
            <div v-if="i < quickLinks.length - 1" class="settings-divider" />
          </div>

          <div
            v-if="quickLinks.length === 0"
            class="py-6 text-center text-sm text-fg/25"
          >
            No quick links. Add some from the new tab page.
          </div>
        </div>

        <button
          class="mt-3 text-xs text-fg/25 hover:text-fg/50 transition-colors"
          @click="resetQuickLinks"
        >
          Reset to defaults
        </button>
      </section>

      <!-- ════ Theme ════ -->
      <section v-if="active === 'theme'">
        <h2 class="settings-heading">Theme</h2>

        <!-- Light / Dark toggle -->
        <div class="settings-card mb-4">
          <div class="settings-row">
            <div>
              <p class="settings-label">Mode</p>
              <p class="settings-hint">Light or dark chrome — your chosen color tints both</p>
            </div>
            <div class="flex rounded-xl overflow-hidden border border-fg/10 shrink-0">
              <button
                class="flex items-center gap-2 px-4 py-2 text-xs transition-colors"
                :class="currentMode === 'dark'
                  ? 'bg-accent/20 text-accent2'
                  : 'text-fg/40 hover:text-fg/70 hover:bg-fg/5'"
                @click="setMode('dark')"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                Dark
              </button>
              <button
                class="flex items-center gap-2 px-4 py-2 text-xs transition-colors border-l border-fg/10"
                :class="currentMode === 'light'
                  ? 'bg-accent/20 text-accent2'
                  : 'text-fg/40 hover:text-fg/70 hover:bg-fg/5'"
                @click="setMode('light')"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
                Light
              </button>
            </div>
          </div>
        </div>

        <!-- Color picker + presets -->
        <div class="settings-card mb-4">
          <div class="settings-row">
            <div>
              <p class="settings-label">Accent color</p>
              <p class="settings-hint">Pick any color — the browser builds a full palette around its hue</p>
            </div>
            <!-- Native color wheel -->
            <input
              type="color"
              :value="pickedHex"
              class="color-wheel-input"
              @input="onColorPick($event.target.value)"
            />
          </div>

          <div class="settings-divider" />

          <!-- Preset swatches -->
          <div class="settings-row flex-wrap gap-y-3">
            <p class="settings-label">Presets</p>
            <div class="flex items-center gap-2 flex-wrap">
              <button
                v-for="p in PRESETS"
                :key="p.name"
                class="flex flex-col items-center gap-1.5 group"
                :title="p.name"
                @click="applyPreset(p)"
              >
                <span
                  class="w-7 h-7 rounded-full ring-2 ring-offset-2 ring-offset-surface transition-all"
                  :style="{ background: presetAccentHex(p), ringColor: activePreset?.name === p.name ? presetAccentHex(p) : 'transparent' }"
                  :class="activePreset?.name === p.name ? 'ring-fg/40 scale-110' : 'ring-transparent group-hover:ring-fg/20'"
                />
                <span class="text-[10px] text-fg/30 group-hover:text-fg/50 transition-colors">{{ p.name }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Live preview -->
        <p class="text-xs text-fg/30 mb-3 uppercase tracking-widest font-semibold">Preview</p>
        <div class="settings-card overflow-visible">
          <div class="px-4 py-4 flex flex-col gap-3">
            <!-- Fake sidebar tab -->
            <div class="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-accent/15 border border-accent/20">
              <div class="w-3.5 h-3.5 rounded-sm bg-accent/60 shrink-0" />
              <span class="text-xs text-accent2 flex-1">example.com</span>
              <div class="w-2 h-2 rounded-full bg-accent/40" />
            </div>
            <div class="flex items-center gap-2.5 px-3 py-2 rounded-lg">
              <div class="w-3.5 h-3.5 rounded-sm bg-fg/10 shrink-0" />
              <span class="text-xs text-fg/40 flex-1">another-tab.io</span>
            </div>
            <!-- Fake address bar -->
            <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-fg/8 mt-1">
              <div class="w-2 h-2 rounded-full bg-accent/50 shrink-0" />
              <span class="text-xs text-fg/50 flex-1">https://example.com</span>
              <div class="flex gap-1">
                <div class="w-4 h-1.5 rounded bg-accent/30" />
                <div class="w-4 h-1.5 rounded bg-fg/10" />
              </div>
            </div>
            <!-- Fake buttons -->
            <div class="flex items-center gap-2 mt-1">
              <button class="px-3 py-1.5 rounded-lg bg-accent text-fg text-xs font-medium">Primary</button>
              <button class="px-3 py-1.5 rounded-lg bg-fg/8 text-fg/60 text-xs">Secondary</button>
              <button class="px-3 py-1.5 rounded-lg border border-accent/30 text-accent2 text-xs">Outlined</button>
            </div>
          </div>
        </div>

        <button
          class="mt-3 text-xs text-fg/25 hover:text-fg/50 transition-colors"
          @click="onResetTheme"
        >Reset to default</button>
      </section>

      <!-- ════ About ════ -->
      <section v-if="active === 'about'">
        <h2 class="settings-heading">About</h2>

        <div class="settings-card">
          <div class="settings-row">
            <p class="settings-label">Arc Browser</p>
            <span class="text-xs text-fg/30">v1.0.0</span>
          </div>
          <div class="settings-divider" />
          <div class="settings-row">
            <p class="settings-label">Engine</p>
            <span class="text-xs text-fg/30"
              >Chromium 120 · Electron 28</span
            >
          </div>
          <div class="settings-divider" />
          <div class="settings-row">
            <p class="settings-label">Built with</p>
            <span class="text-xs text-fg/30"
              >Vue 3 · Pinia · Tailwind CSS · Vite</span
            >
          </div>
        </div>
      </section>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useTabsStore } from "../store/tabs";
import { applyTheme, resetTheme, hexToHsl, hueToAccentHex, PRESETS } from "../useTheme";
import webviewRegistry from "../webviewRegistry";

const THEME_VARS = [
  '--color-app', '--color-app2', '--color-surface', '--color-surface2',
  '--color-accent', '--color-accent2', '--color-accent3', '--color-fg',
]

function syncThemeToNewTabs() {
  // Read the freshly-set values from the main document
  const style = getComputedStyle(document.documentElement)
  const js = THEME_VARS.map(v =>
    `document.documentElement.style.setProperty('${v}', '${style.getPropertyValue(v).trim()}')`
  ).join(';')

  store.tabOrder.forEach(id => {
    if (store.tabs[id]?.url?.includes('newtab.html')) {
      webviewRegistry.get(id)?.executeJavaScript(js).catch(() => {})
    }
  })
}

const store = useTabsStore();
const active = ref("appearance");

const sections = [
  { id: "appearance", icon: "🎨", label: "Appearance" },
  { id: "theme",      icon: "🌈", label: "Theme" },
  { id: "tabs",       icon: "🗂️", label: "Tabs" },
  { id: "quicklinks", icon: "⚡", label: "Quick Links" },
  { id: "about",      icon: "ℹ️", label: "About" },
];

/* ── Quick links (shared with NewTab via localStorage) ── */
const DEFAULT_LINKS = [
  { id: 1, label: "Google", url: "https://www.google.com", emoji: "🔍" },
  { id: 2, label: "GitHub", url: "https://github.com", emoji: "🐙" },
  { id: 3, label: "YouTube", url: "https://www.youtube.com", emoji: "▶️" },
  { id: 4, label: "Reddit", url: "https://www.reddit.com", emoji: "🤖" },
  { id: 5, label: "Wikipedia", url: "https://www.wikipedia.org", emoji: "📚" },
  {
    id: 6,
    label: "Hacker News",
    url: "https://news.ycombinator.com",
    emoji: "🔥",
  },
  { id: 7, label: "Twitter / X", url: "https://twitter.com", emoji: "🐦" },
  { id: 8, label: "Gmail", url: "https://mail.google.com", emoji: "✉️" },
];

const quickLinks = ref(loadLinks());

function loadLinks() {
  try {
    const s = localStorage.getItem("quicklinks");
    return s ? JSON.parse(s) : DEFAULT_LINKS.map((l) => ({ ...l }));
  } catch {
    return DEFAULT_LINKS.map((l) => ({ ...l }));
  }
}

function removeQuickLink(i) {
  quickLinks.value.splice(i, 1);
  localStorage.setItem("quicklinks", JSON.stringify(quickLinks.value));
}

function resetQuickLinks() {
  quickLinks.value = DEFAULT_LINKS.map((l) => ({ ...l }));
  localStorage.setItem("quicklinks", JSON.stringify(quickLinks.value));
}

/* ── Theme ── */
const savedHue  = parseFloat(localStorage.getItem('theme-hue')  ?? '248')
const savedSat  = parseFloat(localStorage.getItem('theme-sat')  ?? '72')
const savedMode = (localStorage.getItem('theme-mode') ?? 'dark')

const currentHue  = ref(savedHue)
const currentSat  = ref(savedSat)
const currentMode = ref(savedMode)

// The hex shown in the color input = current accent color
const pickedHex = computed(() => hueToAccentHex(currentHue.value, currentMode.value))

// Which preset matches the current hue (within ±5°)
const activePreset = computed(() =>
  PRESETS.find(p => Math.abs(p.hue - currentHue.value) < 5 && Math.abs(p.sat - currentSat.value) < 5) ?? null
)

function presetAccentHex(p) { return hueToAccentHex(p.hue, currentMode.value) }

function onColorPick(hex) {
  const [h, s] = hexToHsl(hex)
  currentHue.value = h
  currentSat.value = Math.max(40, s)
  applyTheme(currentHue.value, currentSat.value, currentMode.value)
  syncThemeToNewTabs()
}

function applyPreset(p) {
  currentHue.value = p.hue
  currentSat.value = p.sat
  applyTheme(p.hue, p.sat, currentMode.value)
  syncThemeToNewTabs()
}

function setMode(mode) {
  currentMode.value = mode
  applyTheme(currentHue.value, currentSat.value, mode)
  syncThemeToNewTabs()
}

function onResetTheme() {
  resetTheme()
  currentHue.value  = 248
  currentSat.value  = 72
  currentMode.value = 'dark'
  syncThemeToNewTabs()
}

/* ── Close on Escape ── */
function onKey(e) {
  if (e.key === "Escape") store.showSettings = false;
}
onMounted(() => document.addEventListener("keydown", onKey));
onUnmounted(() => document.removeEventListener("keydown", onKey));
</script>

<style>
.settings-heading {
  @apply text-lg font-semibold text-fg/85 mb-5;
}
.settings-card {
  @apply bg-fg/5 border border-fg/10 rounded-2xl overflow-hidden;
}
.settings-row {
  @apply flex items-center justify-between gap-6 px-4 py-3.5;
}
.settings-label {
  @apply text-sm text-fg/75;
}
.settings-hint {
  @apply text-xs text-fg/30 mt-0.5;
}
.settings-divider {
  @apply border-t border-fg/5 mx-4;
}

/* Segmented control */
.seg-control {
  @apply flex rounded-lg overflow-hidden border border-fg/10 shrink-0;
}
.seg-active {
  @apply px-3 py-1.5 text-xs bg-accent/25 text-accent2 transition-colors;
}
.seg-inactive {
  @apply px-3 py-1.5 text-xs text-fg/35 hover:text-fg/60 transition-colors border-l border-fg/10 first:border-l-0;
}

/* Range input */
.range-input {
  @apply w-32 accent-accent;
}

/* Color wheel input */
.color-wheel-input {
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  background: none;
  overflow: hidden;
  box-shadow: 0 0 0 2px rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.4);
  transition: box-shadow 0.2s;
}
.color-wheel-input:hover {
  box-shadow: 0 0 0 2px rgba(255,255,255,0.25), 0 4px 16px rgba(0,0,0,0.5);
}
.color-wheel-input::-webkit-color-swatch-wrapper { padding: 0; }
.color-wheel-input::-webkit-color-swatch { border: none; border-radius: 50%; }

/* Toggle (decorative for now) */
.toggle {
  @apply w-10 h-6 rounded-full flex items-center px-0.5 shrink-0;
}
.toggle.on {
  @apply bg-accent/70;
}
.toggle.off {
  @apply bg-fg/15;
}
.toggle-thumb {
  @apply w-5 h-5 rounded-full bg-white shadow transition-transform;
}
.toggle.on .toggle-thumb {
  @apply translate-x-4;
}
</style>
