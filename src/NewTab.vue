<template>
  <div
    class="relative flex flex-col items-center justify-center h-screen min-h-screen bg-app overflow-hidden"
  >
    <!-- ── Animated background orbs ── -->
    <div
      class="float-orb pointer-events-none fixed w-[500px] h-[500px] rounded-full blur-[80px] opacity-15 bg-gradient-radial from-accent to-transparent -top-24 -left-24"
      style="animation-delay: 0s"
    />
    <div
      class="float-orb pointer-events-none fixed w-[400px] h-[400px] rounded-full blur-[80px] opacity-15 bg-gradient-radial from-accent2 to-transparent -bottom-20 -right-20"
      style="animation-delay: -4s"
    />
    <div
      class="float-orb pointer-events-none fixed w-[300px] h-[300px] rounded-full blur-[80px] opacity-[0.08] bg-gradient-radial from-accent3 to-transparent"
      style="top: 30%; left: 60%; animation-delay: -2s"
    />

    <!-- ── Main content ── -->
    <div
      class="relative z-10 flex flex-col items-center gap-10 w-full max-w-[700px] px-6 py-10"
    >
      <!-- Clock & greeting -->
      <div class="text-center">
        <p
          class="text-7xl font-light tracking-[-2px] tabular-nums text-fg/90"
          style="text-shadow: 0 0 40px rgb(var(--color-accent) / 0.3)"
        >
          {{ time }}
        </p>
        <p class="text-sm text-fg/50 mt-2">{{ date }}</p>
        <p class="text-lg text-fg/50 mt-1">{{ greeting }}</p>
      </div>

      <!-- Search bar -->
      <div class="w-full max-w-[580px]">
        <div class="relative flex items-center">
          <span
            class="absolute left-5 text-fg/30 pointer-events-none transition-colors"
            :class="{ 'text-accent2': searchFocused }"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            ref="searchRef"
            v-model="searchQuery"
            type="text"
            placeholder="Search the web or enter a URL…"
            autocomplete="off"
            spellcheck="false"
            class="w-full pl-12 pr-5 py-4 rounded-[50px] text-[15px] text-fg/90 placeholder-fg/25 outline-none transition-all duration-200 bg-fg/7 border-[1.5px] border-fg/10 focus:bg-fg/10 focus:border-accent focus:shadow-glow"
            @keydown.enter="doSearch"
            @focus="searchFocused = true"
            @blur="searchFocused = false"
          />
        </div>
      </div>

      <!-- Quick links -->
      <div class="w-full">
        <!-- Header row -->
        <div class="flex items-center justify-between mb-3 px-0.5">
          <p class="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg/25">
            Quick Links
          </p>
          <button
            class="text-[11px] px-2 py-0.5 rounded-md transition-colors"
            :class="editMode
              ? 'bg-accent/20 text-accent2 hover:bg-accent/30'
              : 'text-fg/25 hover:text-fg/60 hover:bg-fg/5'"
            @click="editMode = !editMode"
          >
            {{ editMode ? 'Done' : 'Edit' }}
          </button>
        </div>

        <!-- Normal grid view -->
        <div v-if="!editMode" class="grid grid-cols-4 gap-3">
          <a
            v-for="link in quickLinks"
            :key="link.id"
            :href="link.url"
            class="flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer no-underline bg-fg/5 border border-fg/8 text-fg/55 transition-all duration-200 hover:bg-fg/9 hover:border-accent/30 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:text-fg"
            @click.prevent="navigate(link.url)"
          >
            <div class="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg bg-fg/8">
              {{ link.emoji }}
            </div>
            <span class="text-[11.5px] font-medium text-center leading-tight">{{ link.label }}</span>
          </a>
        </div>

        <!-- Edit mode -->
        <div v-else class="space-y-2">
          <div
            v-for="(link, i) in quickLinks"
            :key="link.id"
            class="flex items-center gap-2 p-2 rounded-xl bg-fg/4 border border-fg/6"
          >
            <!-- Emoji -->
            <input
              v-model="link.emoji"
              maxlength="4"
              class="w-10 text-center bg-fg/6 border border-fg/10 rounded-lg py-1.5 text-base outline-none focus:border-accent/50 transition-colors"
              placeholder="🔍"
            />
            <!-- Label -->
            <input
              v-model="link.label"
              class="w-24 bg-fg/6 border border-fg/10 rounded-lg px-2 py-1.5 text-xs text-fg/80 outline-none focus:border-accent/50 transition-colors placeholder-fg/25"
              placeholder="Label"
            />
            <!-- URL -->
            <input
              v-model="link.url"
              class="flex-1 bg-fg/6 border border-fg/10 rounded-lg px-2 py-1.5 text-xs text-fg/60 outline-none focus:border-accent/50 transition-colors placeholder-fg/25"
              placeholder="https://…"
            />
            <!-- Delete -->
            <button
              class="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-fg/25 hover:bg-red-500/20 hover:text-red-400 transition-colors"
              title="Remove"
              @click="removeLink(i)"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <path d="M1 1l8 8M9 1L1 9"/>
              </svg>
            </button>
          </div>

          <!-- Add new link -->
          <button
            class="w-full py-2 rounded-xl border border-dashed border-fg/10 text-fg/30
                   hover:border-accent/40 hover:text-accent2 transition-colors text-xs
                   flex items-center justify-center gap-1.5"
            @click="addLink"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add link
          </button>

          <!-- Reset -->
          <button
            class="w-full py-1.5 text-[11px] text-fg/20 hover:text-fg/40 transition-colors"
            @click="resetToDefaults"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
    <div
      class="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[11px] text-fg/25 z-10"
    >
      <span>Arc Browser</span>
      <span>·</span>
      <span>{{ now.getFullYear() }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { loadTheme } from "./useTheme";

// Apply theme immediately — before first render — so there's no flash
loadTheme();

/* ── Clock ── */
const now = ref(new Date());
let clockTimer = null;

onMounted(() => {
  clockTimer = setInterval(() => { now.value = new Date(); }, 1000);
  setTimeout(() => searchRef.value?.focus(), 100);
});
onUnmounted(() => clearInterval(clockTimer));

const time = computed(() => {
  const h = now.value.getHours().toString().padStart(2, "0");
  const m = now.value.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
});

const date = computed(() => {
  const days   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const d = now.value;
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
});

const userName = localStorage.getItem('user-name') || ''

const greeting = computed(() => {
  const h = now.value.getHours();
  const suffix = userName ? `, ${userName}` : '';
  if (h >= 5  && h < 12) return `Good morning${suffix}`;
  if (h >= 12 && h < 17) return `Good afternoon${suffix}`;
  if (h >= 17 && h < 21) return `Good evening${suffix}`;
  return `Good night${suffix}`;
});

/* ── Search ── */
const searchRef     = ref(null);
const searchQuery   = ref("");
const searchFocused = ref(false);

function navigate(url) { window.location.href = url; }

function doSearch() {
  const val = searchQuery.value.trim();
  if (!val) return;
  if (/^(https?:\/\/)/.test(val)) { navigate(val); return; }
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(val) && !val.includes(" ")) {
    navigate("https://" + val); return;
  }
  navigate("https://www.google.com/search?q=" + encodeURIComponent(val));
}

/* ── Quick links ── */
const DEFAULT_LINKS = [
  { id: 1, label: "Google",      url: "https://www.google.com",       emoji: "🔍" },
  { id: 2, label: "GitHub",      url: "https://github.com",           emoji: "🐙" },
  { id: 3, label: "YouTube",     url: "https://www.youtube.com",      emoji: "▶️" },
  { id: 4, label: "Reddit",      url: "https://www.reddit.com",       emoji: "🤖" },
  { id: 5, label: "Wikipedia",   url: "https://www.wikipedia.org",    emoji: "📚" },
  { id: 6, label: "Hacker News", url: "https://news.ycombinator.com", emoji: "🔥" },
  { id: 7, label: "Twitter / X", url: "https://twitter.com",          emoji: "🐦" },
  { id: 8, label: "Gmail",       url: "https://mail.google.com",      emoji: "✉️" },
];

function loadLinks() {
  try {
    const stored = localStorage.getItem("quicklinks");
    return stored ? JSON.parse(stored) : DEFAULT_LINKS.map(l => ({ ...l }));
  } catch {
    return DEFAULT_LINKS.map(l => ({ ...l }));
  }
}

const quickLinks = ref(loadLinks());
const editMode   = ref(false);

watch(quickLinks, (val) => {
  localStorage.setItem("quicklinks", JSON.stringify(val));
}, { deep: true });

function addLink() {
  quickLinks.value.push({ id: Date.now(), label: "", url: "https://", emoji: "🌐" });
}

function removeLink(index) {
  quickLinks.value.splice(index, 1);
}

function resetToDefaults() {
  quickLinks.value = DEFAULT_LINKS.map(l => ({ ...l }));
}
</script>
