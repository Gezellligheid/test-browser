<template>
  <div
    class="flex h-screen overflow-hidden bg-app"
    @click="store.hideContextMenu()"
    @keydown.stop
  >
    <!-- ─── Sidebar ─── -->
    <Sidebar ref="sidebarRef" v-show="!store.isFullscreen" />

    <!-- ─── Sidebar resize handle ─── -->
    <div
      v-show="!store.sidebarCollapsed && !store.isFullscreen"
      class="w-1 cursor-col-resize shrink-0 hover:bg-accent/30 transition-colors"
      @mousedown="onSidebarDragStart"
    />

    <!-- ─── Content area ─── -->
    <ContentArea @focus-address-bar="focusAddressBar" />

    <!-- ─── Floating window controls (top-right mode) ─── -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="store.windowControlsPos === 'top-right'"
          class="fixed top-0 right-0 z-[9999] flex items-stretch h-9"
          style="-webkit-app-region: no-drag"
        >
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
      </Transition>
    </Teleport>

    <!-- ─── Context menu (portal) ─── -->
    <ContextMenu />

    <!-- ─── Command palette (portal) ─── -->
    <CommandPalette />

    <!-- ─── Onboarding (first launch only) ─── -->
    <Onboarding v-if="showOnboarding" @done="showOnboarding = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useTabsStore } from "./store/tabs";
import { loadTheme } from "./useTheme";
import Sidebar from "./components/Sidebar.vue";
import ContentArea from "./components/ContentArea.vue";
import ContextMenu from "./components/ContextMenu.vue";
import CommandPalette from "./components/CommandPalette.vue";
import Onboarding from "./components/Onboarding.vue";

const store = useTabsStore();
const sidebarRef = ref(null);
const showOnboarding = ref(!localStorage.getItem('user-name'));

const win = {
  close:    () => window.electronAPI?.closeWindow(),
  minimize: () => window.electronAPI?.minimizeWindow(),
  maximize: () => window.electronAPI?.maximizeWindow(),
};

/* ── Bootstrap: open first tab ── */
onMounted(() => {
  loadTheme();
  store.createTab(null);
  bindIPC();
  bindKeyboard();
});

onUnmounted(() => {
  unbindIPC();
  document.removeEventListener("keydown", handleKey);
});

function focusAddressBar() {
  sidebarRef.value?.focusAddressBar();
}

/* ══════════════════════════════════════
   Keyboard shortcuts
   ══════════════════════════════════════ */
function handleKey(e) {
  const ctrl = e.ctrlKey || e.metaKey;

  if (ctrl && e.key === "t") {
    e.preventDefault();
    store.showCommandPalette = !store.showCommandPalette;
  } else if (ctrl && e.key === "w") {
    e.preventDefault();
    store.closeTab(store.activeTabId);
  } else if (ctrl && e.key === "l") {
    e.preventDefault();
    focusAddressBar();
  } else if (ctrl && e.key === "r" && !e.shiftKey) {
    e.preventDefault();
    store.reload();
  } else if (ctrl && e.key === "R") {
    e.preventDefault();
    store.reload(undefined, true);
  } else if (ctrl && e.key === "b") {
    e.preventDefault();
    store.sidebarCollapsed = !store.sidebarCollapsed;
  } else if (ctrl && e.key === "Tab" && !e.shiftKey) {
    e.preventDefault();
    const idx = store.tabOrder.indexOf(store.activeTabId);
    store.switchTab(store.tabOrder[(idx + 1) % store.tabOrder.length]);
  } else if (ctrl && e.shiftKey && e.key === "Tab") {
    e.preventDefault();
    const idx = store.tabOrder.indexOf(store.activeTabId);
    store.switchTab(
      store.tabOrder[(idx - 1 + store.tabOrder.length) % store.tabOrder.length],
    );
  } else if (ctrl && e.key === "p") {
    e.preventDefault();
    store.togglePin(store.activeTabId);
  } else if (ctrl && e.shiftKey && e.key === "D") {
    e.preventDefault();
    store.toggleSplitView();
  } else if (e.key === "F12") {
    store.toggleDevTools();
  } else if (e.altKey && e.key === "ArrowLeft") {
    store.goBack();
  } else if (e.altKey && e.key === "ArrowRight") {
    store.goForward();
  } else if (e.altKey && e.key === "Home") {
    store.goHome();
  } else if (ctrl && e.key === "+") {
    e.preventDefault();
    store.zoomIn();
  } else if (ctrl && e.key === "-") {
    e.preventDefault();
    store.zoomOut();
  } else if (ctrl && e.key === "0") {
    e.preventDefault();
    store.zoomReset();
  }
  // Ctrl+1-9: switch to tab by index
  else if (ctrl && /^[1-9]$/.test(e.key)) {
    e.preventDefault();
    const idx = parseInt(e.key) - 1;
    if (store.tabOrder[idx]) store.switchTab(store.tabOrder[idx]);
  }
}

function bindKeyboard() {
  document.addEventListener("keydown", handleKey);
}

/* ══════════════════════════════════════
   Electron IPC menu events
   ══════════════════════════════════════ */
const ipcListeners = [];

function bindIPC() {
  if (!window.electronAPI) return;

  const add = (channel, fn) => {
    window.electronAPI.on(channel, fn);
    ipcListeners.push({ channel, fn });
  };

  add("menu-new-tab", () => { store.showCommandPalette = true });
  add("menu-close-tab", () => store.closeTab(store.activeTabId));
  add("menu-reload", () => store.reload());
  add("menu-hard-reload", () => store.reload(undefined, true));
  add("menu-focus-address-bar", () => focusAddressBar());
  add("menu-toggle-sidebar", () => {
    store.sidebarCollapsed = !store.sidebarCollapsed;
  });
  add("menu-go-back", () => store.goBack());
  add("menu-go-forward", () => store.goForward());
  add("menu-go-home", () => store.goHome());
  add("menu-next-tab", () => {
    const idx = store.tabOrder.indexOf(store.activeTabId);
    store.switchTab(store.tabOrder[(idx + 1) % store.tabOrder.length]);
  });
  add("menu-prev-tab", () => {
    const idx = store.tabOrder.indexOf(store.activeTabId);
    store.switchTab(
      store.tabOrder[(idx - 1 + store.tabOrder.length) % store.tabOrder.length],
    );
  });
  add("menu-pin-tab", () => store.togglePin(store.activeTabId));
  add("menu-split-view", () => store.toggleSplitView());
  add("menu-dev-tools", () => store.toggleDevTools());
  add("menu-zoom-in", () => store.zoomIn());
  add("menu-zoom-out", () => store.zoomOut());
  add("menu-zoom-reset", () => store.zoomReset());
  add("open-url-new-tab", (_, url) => store.createTab(url));
  add("window-state-changed", (_, state) => {
    // could track maximized state here if needed
  });
}

function unbindIPC() {
  ipcListeners.forEach(({ channel }) =>
    window.electronAPI?.removeAllListeners(channel),
  );
}

/* ══════════════════════════════════════
   Sidebar resize drag
   ══════════════════════════════════════ */
let sidebarDragging = false;
let sidebarStartX = 0;
let sidebarStartW = 260;

function onSidebarDragStart(e) {
  sidebarDragging = true;
  sidebarStartX = e.clientX;
  sidebarStartW = store.sidebarWidth;
  document.addEventListener("mousemove", onSidebarDrag);
  document.addEventListener("mouseup", onSidebarDragEnd);
}
function onSidebarDrag(e) {
  if (!sidebarDragging) return;
  const w = Math.max(
    160,
    Math.min(400, sidebarStartW + (e.clientX - sidebarStartX)),
  );
  store.sidebarWidth = w;
}
function onSidebarDragEnd() {
  sidebarDragging = false;
  document.removeEventListener("mousemove", onSidebarDrag);
  document.removeEventListener("mouseup", onSidebarDragEnd);
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }
</style>
