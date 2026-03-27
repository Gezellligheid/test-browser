'use strict';

/* ============================================================
   Arc Browser - Renderer Process
   ============================================================ */

const NEW_TAB_URL = 'newtab.html';
const HOME_URL = 'newtab.html';
const SLEEP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_HISTORY_ENTRIES = 50;

/* ============================================================
   Utility helpers
   ============================================================ */
function generateId() {
  return 'tab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function normalizeUrl(input) {
  if (!input || !input.trim()) return resolveFile(NEW_TAB_URL);
  const trimmed = input.trim();
  if (trimmed === 'newtab' || trimmed === 'new tab' || trimmed === 'about:newtab') {
    return resolveFile(NEW_TAB_URL);
  }
  if (trimmed.startsWith('about:') || trimmed.startsWith('data:')) return trimmed;
  if (trimmed.startsWith('file://')) return trimmed;
  if (/^(https?|ftp):\/\//i.test(trimmed)) return trimmed;
  // Local file or just a hostname?
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(\/.*)?$/.test(trimmed) && !trimmed.includes(' ')) {
    return 'https://' + trimmed;
  }
  // Search query
  return 'https://www.google.com/search?q=' + encodeURIComponent(trimmed);
}

function resolveFile(name) {
  // Use the current page's directory to resolve newtab.html
  const base = window.location.href.replace(/[^/]+$/, '');
  return base + name;
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch { return ''; }
}

function isHttpUrl(url) {
  return /^https?:\/\//i.test(url);
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function getInitial(title, url) {
  if (title && title.length > 0 && title !== 'New Tab') return title[0].toUpperCase();
  const domain = getDomain(url);
  return domain ? domain[0].toUpperCase() : 'T';
}

/* ============================================================
   TabManager
   ============================================================ */
class TabManager {
  constructor() {
    this.tabs = new Map();       // id -> TabState
    this.activeTabId = null;
    this.tabOrder = [];          // ordered array of tab ids
    this.sleepTimers = new Map(); // id -> timer
    this.splitViewTabId = null;  // second tab in split view
    this.splitViewActive = false;

    // DOM refs
    this.tabsList = document.getElementById('tabsList');
    this.pinnedTabsList = document.getElementById('pinnedTabs');
    this.tabContents = document.getElementById('tabContents');
    this.addressBar = document.getElementById('addressBar');
    this.suggestions = document.getElementById('suggestions');
    this.loadingBar = document.getElementById('loadingBar');
    this.navUrlText = document.getElementById('navUrlText');
    this.backBtn = document.getElementById('backBtn');
    this.forwardBtn = document.getElementById('forwardBtn');
    this.reloadBtn = document.getElementById('reloadBtn');
    this.reloadIcon = document.getElementById('reloadIcon');
    this.splitViewContainer = document.getElementById('splitViewContainer');
    this.splitPane1 = document.getElementById('splitPane1');
    this.splitPane2 = document.getElementById('splitPane2');
    this.pinnedSection = document.getElementById('pinnedSection');
    this.pinnedDivider = document.getElementById('pinnedDivider');

    this.dragState = null;
    this.dropIndicator = null;
    this.zoomLevel = 1.0;

    this._initDropIndicator();
    this._bindGlobalEvents();
  }

  /* ----- Tab creation ----- */
  createTab(url, options = {}) {
    const id = generateId();
    const resolvedUrl = url ? normalizeUrl(url) : resolveFile(NEW_TAB_URL);
    const tab = {
      id,
      url: resolvedUrl,
      title: 'New Tab',
      favicon: null,
      sleeping: false,
      pinned: options.pinned || false,
      lastActive: Date.now(),
      history: [resolvedUrl],
      historyIndex: 0,
      scrollY: 0,
      loading: false,
      canGoBack: false,
      canGoForward: false,
      zoomFactor: 1.0,
    };
    this.tabs.set(id, tab);
    if (options.pinned) {
      this.tabOrder.unshift(id);
    } else {
      // Insert after active tab, or at end
      const activeIdx = this.tabOrder.indexOf(this.activeTabId);
      if (activeIdx >= 0 && !options.atEnd) {
        this.tabOrder.splice(activeIdx + 1, 0, id);
      } else {
        this.tabOrder.push(id);
      }
    }
    this._createTabDOM(tab);
    this._createTabPane(tab);
    this._renderTabList();
    if (!options.background) {
      this.switchTab(id);
    }
    return id;
  }

  /* ----- Tab DOM element ----- */
  _createTabDOM(tab) {
    const el = document.createElement('div');
    el.className = 'tab-item' + (tab.pinned ? ' pinned' : '') + ' new-tab-animation';
    el.dataset.tabId = tab.id;
    el.title = tab.title;

    el.innerHTML = `
      <div class="tab-favicon-wrapper">
        <div class="tab-favicon-placeholder" data-initial="${getInitial(tab.title, tab.url)}">${getInitial(tab.title, tab.url)}</div>
      </div>
      ${tab.pinned ? '' : `
        <div class="tab-info">
          <div class="tab-title">${escapeHtml(tab.title)}</div>
        </div>
      `}
      ${tab.pinned ? '' : `<button class="tab-close" data-tab-id="${tab.id}" title="Close tab">${closeSVG()}</button>`}
    `;

    el.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) return;
      this.switchTab(tab.id);
    });

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._showTabContextMenu(tab.id, e.clientX, e.clientY);
    });

    el.querySelector('.tab-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tab.id);
    });

    // Drag to reorder
    el.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', (e) => this._onDragStart(e, tab.id));
    el.addEventListener('dragover', (e) => this._onDragOver(e, tab.id));
    el.addEventListener('dragleave', (e) => this._onDragLeave(e));
    el.addEventListener('drop', (e) => this._onDrop(e, tab.id));
    el.addEventListener('dragend', () => this._onDragEnd());

    // Middle click to close
    el.addEventListener('auxclick', (e) => {
      if (e.button === 1) this.closeTab(tab.id);
    });

    return el;
  }

  /* ----- Tab pane (webview container) ----- */
  _createTabPane(tab) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.tabId = tab.id;

    const webview = document.createElement('webview');
    webview.setAttribute('src', tab.url);
    webview.setAttribute('allowpopups', '');
    webview.setAttribute('webpreferences', 'contextIsolation=true');
    webview.style.flex = '1';
    webview.style.width = '100%';
    webview.style.height = '100%';
    webview.style.display = 'flex';

    this._bindWebviewEvents(webview, tab.id);
    pane.appendChild(webview);
    this.tabContents.appendChild(pane);
  }

  /* ----- Webview event binding ----- */
  _bindWebviewEvents(webview, tabId) {
    webview.addEventListener('did-start-loading', () => {
      const tab = this.tabs.get(tabId);
      if (!tab) return;
      tab.loading = true;
      this._updateTabDOM(tabId, { loading: true });
      if (tabId === this.activeTabId) {
        this._startLoadingBar();
        this._updateNavButtons(tabId);
      }
    });

    webview.addEventListener('did-stop-loading', () => {
      const tab = this.tabs.get(tabId);
      if (!tab) return;
      tab.loading = false;
      this._updateTabDOM(tabId, { loading: false });
      if (tabId === this.activeTabId) {
        this._stopLoadingBar();
        this._updateNavButtons(tabId);
      }
    });

    webview.addEventListener('did-navigate', (e) => {
      const tab = this.tabs.get(tabId);
      if (!tab) return;
      const newUrl = e.url;
      tab.url = newUrl;
      this._addToHistory(tab, newUrl);
      this._updateTabDOM(tabId);
      if (tabId === this.activeTabId) {
        this._updateAddressBar(newUrl);
        this._updateNavUrlDisplay(newUrl);
        this._updateNavButtons(tabId);
        this._updateSecurityIcon(newUrl);
      }
      this._resetSleepTimer(tabId);
    });

    webview.addEventListener('did-navigate-in-page', (e) => {
      if (!e.isMainFrame) return;
      const tab = this.tabs.get(tabId);
      if (!tab) return;
      tab.url = e.url;
      this._addToHistory(tab, e.url);
      if (tabId === this.activeTabId) {
        this._updateAddressBar(e.url);
        this._updateNavUrlDisplay(e.url);
        this._updateNavButtons(tabId);
        this._updateSecurityIcon(e.url);
      }
    });

    webview.addEventListener('page-title-updated', (e) => {
      const tab = this.tabs.get(tabId);
      if (!tab) return;
      tab.title = e.title || 'New Tab';
      this._updateTabDOM(tabId, { title: true });
    });

    webview.addEventListener('page-favicon-updated', (e) => {
      const tab = this.tabs.get(tabId);
      if (!tab) return;
      if (e.favicons && e.favicons.length > 0) {
        tab.favicon = e.favicons[0];
        this._updateTabDOM(tabId, { favicon: true });
      }
    });

    webview.addEventListener('did-fail-load', (e) => {
      if (e.errorCode === -3) return; // Aborted (normal on navigation)
      const tab = this.tabs.get(tabId);
      if (!tab) return;
      tab.loading = false;
      this._updateTabDOM(tabId, { loading: false });
      if (tabId === this.activeTabId) {
        this._stopLoadingBar();
      }
    });

    webview.addEventListener('new-window', (e) => {
      this.createTab(e.url);
    });

    webview.addEventListener('enter-html-full-screen', () => {
      document.getElementById('sidebar').style.display = 'none';
      document.getElementById('sidebarResizer').style.display = 'none';
      document.getElementById('navBar').style.display = 'none';
    });

    webview.addEventListener('leave-html-full-screen', () => {
      document.getElementById('sidebar').style.display = '';
      document.getElementById('sidebarResizer').style.display = '';
      document.getElementById('navBar').style.display = '';
    });
  }

  /* ----- Switch tab ----- */
  switchTab(id) {
    if (!this.tabs.has(id)) return;

    // Deactivate previous
    if (this.activeTabId && this.activeTabId !== id) {
      const prevPane = this._getPane(this.activeTabId);
      if (prevPane) prevPane.classList.remove('active');
      const prevTabEl = this._getTabEl(this.activeTabId);
      if (prevTabEl) prevTabEl.classList.remove('active');
      // Reset sleep timer on old tab
      this._resetSleepTimer(this.activeTabId);
    }

    this.activeTabId = id;
    const tab = this.tabs.get(id);
    tab.lastActive = Date.now();

    // Wake if sleeping
    if (tab.sleeping) {
      this.wakeTab(id);
    } else {
      this._resetSleepTimer(id);
    }

    // Activate pane
    const pane = this._getPane(id);
    if (pane) pane.classList.add('active');

    // Activate tab element
    const tabEl = this._getTabEl(id);
    if (tabEl) {
      tabEl.classList.add('active');
      tabEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    // Update address bar and nav
    this._updateAddressBar(tab.url);
    this._updateNavUrlDisplay(tab.url);
    this._updateNavButtons(id);
    this._updateSecurityIcon(tab.url);

    // Update split view if active
    if (this.splitViewActive && this.splitViewTabId === id) {
      // Don't handle split view tabs the same way
    }
  }

  /* ----- Close tab ----- */
  closeTab(id) {
    if (!this.tabs.has(id)) return;
    const wasActive = this.activeTabId === id;
    const idx = this.tabOrder.indexOf(id);

    // Clear sleep timer
    clearTimeout(this.sleepTimers.get(id));
    this.sleepTimers.delete(id);

    // Remove DOM
    const pane = this._getPane(id);
    if (pane) pane.remove();
    const tabEl = this._getTabEl(id);
    if (tabEl) tabEl.remove();

    this.tabs.delete(id);
    this.tabOrder.splice(idx, 1);

    if (this.tabOrder.length === 0) {
      this.activeTabId = null;
      this.createTab(null);
      return;
    }

    if (wasActive) {
      // Prefer next, then prev
      const newIdx = Math.min(idx, this.tabOrder.length - 1);
      this.switchTab(this.tabOrder[newIdx]);
    }

    this._renderTabList();
    this._updatePinnedVisibility();
  }

  /* ----- Pin/Unpin tab ----- */
  togglePin(id) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.pinned = !tab.pinned;

    // Move in order
    this.tabOrder.splice(this.tabOrder.indexOf(id), 1);
    if (tab.pinned) {
      const firstUnpinned = this.tabOrder.findIndex(tid => !this.tabs.get(tid)?.pinned);
      if (firstUnpinned >= 0) {
        this.tabOrder.splice(firstUnpinned, 0, id);
      } else {
        this.tabOrder.unshift(id);
      }
    } else {
      const lastPinned = this._lastPinnedIndex();
      this.tabOrder.splice(lastPinned + 1, 0, id);
    }

    this._renderTabList();
    this._updatePinnedVisibility();
  }

  _lastPinnedIndex() {
    let last = -1;
    for (let i = 0; i < this.tabOrder.length; i++) {
      if (this.tabs.get(this.tabOrder[i])?.pinned) last = i;
    }
    return last;
  }

  /* ----- Tab sleep ----- */
  sleepTab(id) {
    const tab = this.tabs.get(id);
    if (!tab || tab.sleeping || tab.pinned) return;
    // Don't sleep active tab
    if (id === this.activeTabId) return;

    const webview = this._getWebview(id);
    if (!webview) return;

    // Save scroll position
    try {
      webview.executeJavaScript('window.scrollY').then(y => {
        tab.scrollY = y;
      }).catch(() => {});
    } catch {}

    // Save the URL before blanking
    tab.savedUrl = tab.url;
    tab.sleeping = true;

    // Show sleep overlay instead of unloading (less jarring)
    const pane = this._getPane(id);
    if (pane) {
      pane.classList.add('sleeping');
      let overlay = pane.querySelector('.sleep-overlay');
      if (!overlay) {
        const tmpl = document.getElementById('sleepOverlayTemplate');
        overlay = tmpl.content.cloneNode(true).querySelector('.sleep-overlay');
        overlay.querySelector('.sleep-title').textContent = truncate(tab.title, 60);
        overlay.querySelector('.sleep-wake-btn').addEventListener('click', () => {
          this.wakeTab(id);
          this.switchTab(id);
        });
        pane.appendChild(overlay);
      }
      // Blank webview to free memory
      webview.src = 'about:blank';
    }

    this._updateTabDOM(id);
    clearTimeout(this.sleepTimers.get(id));
    this.sleepTimers.delete(id);
  }

  wakeTab(id) {
    const tab = this.tabs.get(id);
    if (!tab || !tab.sleeping) return;

    tab.sleeping = false;
    const pane = this._getPane(id);
    if (pane) {
      pane.classList.remove('sleeping');
      const overlay = pane.querySelector('.sleep-overlay');
      if (overlay) overlay.remove();

      const webview = this._getWebview(id);
      if (webview) {
        webview.src = tab.savedUrl || tab.url;
      }
    }

    this._updateTabDOM(id);
    this._resetSleepTimer(id);
  }

  /* ----- Sleep timer management ----- */
  _resetSleepTimer(id) {
    clearTimeout(this.sleepTimers.get(id));
    const timer = setTimeout(() => {
      this.sleepTab(id);
    }, SLEEP_TIMEOUT_MS);
    this.sleepTimers.set(id, timer);
  }

  /* ----- Duplicate tab ----- */
  duplicateTab(id) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    this.createTab(tab.url);
  }

  /* ----- Navigation ----- */
  navigate(id, url) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    const resolved = normalizeUrl(url);
    tab.url = resolved;
    const webview = this._getWebview(id);
    if (webview) {
      if (tab.sleeping) this.wakeTab(id);
      webview.src = resolved;
    }
    if (id === this.activeTabId) {
      this._updateAddressBar(resolved);
      this._updateNavUrlDisplay(resolved);
    }
    this._resetSleepTimer(id);
  }

  goBack(id) {
    const webview = this._getWebview(id || this.activeTabId);
    if (webview && webview.canGoBack()) webview.goBack();
  }

  goForward(id) {
    const webview = this._getWebview(id || this.activeTabId);
    if (webview && webview.canGoForward()) webview.goForward();
  }

  reload(id, force = false) {
    const webview = this._getWebview(id || this.activeTabId);
    if (webview) {
      if (force) webview.reloadIgnoringCache();
      else webview.reload();
    }
  }

  goHome(id) {
    this.navigate(id || this.activeTabId, resolveFile(HOME_URL));
  }

  /* ----- History tracking ----- */
  _addToHistory(tab, url) {
    // If we've navigated back and then navigated forward normally, trim forward history
    if (tab.historyIndex < tab.history.length - 1) {
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
    }
    if (tab.history[tab.history.length - 1] !== url) {
      tab.history.push(url);
      if (tab.history.length > MAX_HISTORY_ENTRIES) {
        tab.history.shift();
      }
    }
    tab.historyIndex = tab.history.length - 1;
  }

  /* ----- Nav button state ----- */
  _updateNavButtons(id) {
    const webview = this._getWebview(id);
    const tab = this.tabs.get(id);
    if (!tab) return;
    const canBack = webview ? webview.canGoBack() : false;
    const canForward = webview ? webview.canGoForward() : false;
    tab.canGoBack = canBack;
    tab.canGoForward = canForward;
    this.backBtn.disabled = !canBack;
    this.forwardBtn.disabled = !canForward;
    if (tab.loading) {
      this.reloadBtn.title = 'Stop (Esc)';
      this.reloadIcon.innerHTML = `<path d="M18 6L6 18M6 6l12 12"/>`;
    } else {
      this.reloadBtn.title = 'Reload (Ctrl+R)';
      this.reloadIcon.innerHTML = `<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>`;
    }
  }

  /* ----- Zoom ----- */
  zoomIn(id) {
    const tab = this.tabs.get(id || this.activeTabId);
    if (!tab) return;
    tab.zoomFactor = Math.min(3.0, (tab.zoomFactor || 1.0) + 0.1);
    const wv = this._getWebview(tab.id);
    if (wv) wv.setZoomFactor(tab.zoomFactor);
  }

  zoomOut(id) {
    const tab = this.tabs.get(id || this.activeTabId);
    if (!tab) return;
    tab.zoomFactor = Math.max(0.3, (tab.zoomFactor || 1.0) - 0.1);
    const wv = this._getWebview(tab.id);
    if (wv) wv.setZoomFactor(tab.zoomFactor);
  }

  zoomReset(id) {
    const tab = this.tabs.get(id || this.activeTabId);
    if (!tab) return;
    tab.zoomFactor = 1.0;
    const wv = this._getWebview(tab.id);
    if (wv) wv.setZoomFactor(1.0);
  }

  toggleDevTools(id) {
    const wv = this._getWebview(id || this.activeTabId);
    if (wv) {
      if (wv.isDevToolsOpened()) wv.closeDevTools();
      else wv.openDevTools();
    }
  }

  /* ----- Split view ----- */
  toggleSplitView() {
    if (this.splitViewActive) {
      this._disableSplitView();
    } else {
      this._enableSplitView();
    }
  }

  _enableSplitView() {
    if (this.tabOrder.length < 2) {
      this.createTab(null, { background: true });
    }
    this.splitViewActive = true;
    this.splitViewContainer.style.display = 'flex';
    this.tabContents.style.display = 'none';

    // Primary pane: active tab's webview
    const activePane = this._getPane(this.activeTabId);
    if (activePane) {
      this.splitPane1.innerHTML = '';
      this.splitPane1.appendChild(activePane.querySelector('webview').cloneNode(true));
    }

    // Secondary pane: next tab
    const otherIds = this.tabOrder.filter(id => id !== this.activeTabId);
    if (otherIds.length > 0) {
      this.splitViewTabId = otherIds[0];
      const otherWv = document.createElement('webview');
      const otherTab = this.tabs.get(this.splitViewTabId);
      otherWv.setAttribute('src', otherTab ? otherTab.url : resolveFile(NEW_TAB_URL));
      otherWv.setAttribute('allowpopups', '');
      otherWv.style.flex = '1';
      otherWv.style.width = '100%';
      otherWv.style.height = '100%';
      this.splitPane2.innerHTML = '';
      this.splitPane2.appendChild(otherWv);
    }
    this._initSplitDrag();
  }

  _disableSplitView() {
    this.splitViewActive = false;
    this.splitViewContainer.style.display = 'none';
    this.tabContents.style.display = '';
    this.splitPane1.innerHTML = '';
    this.splitPane2.innerHTML = '';
    this.splitViewTabId = null;
  }

  _initSplitDrag() {
    const handle = document.getElementById('splitHandle');
    let dragging = false;
    let startX, startWidth;

    handle.addEventListener('mousedown', (e) => {
      dragging = true;
      startX = e.clientX;
      startWidth = this.splitPane1.offsetWidth;
      handle.classList.add('dragging');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    const onMove = (e) => {
      if (!dragging) return;
      const delta = e.clientX - startX;
      const container = this.splitViewContainer;
      const totalW = container.offsetWidth - 4;
      const newW = Math.max(200, Math.min(totalW - 200, startWidth + delta));
      this.splitPane1.style.flex = 'none';
      this.splitPane1.style.width = newW + 'px';
      this.splitPane2.style.flex = '1';
      this.splitPane2.style.width = '';
    };

    const onUp = () => {
      dragging = false;
      handle.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }

  /* ----- Next/Prev tab ----- */
  nextTab() {
    const idx = this.tabOrder.indexOf(this.activeTabId);
    const next = (idx + 1) % this.tabOrder.length;
    this.switchTab(this.tabOrder[next]);
  }

  prevTab() {
    const idx = this.tabOrder.indexOf(this.activeTabId);
    const prev = (idx - 1 + this.tabOrder.length) % this.tabOrder.length;
    this.switchTab(this.tabOrder[prev]);
  }

  /* ----- DOM helpers ----- */
  _getPane(id) {
    return this.tabContents.querySelector(`.tab-pane[data-tab-id="${id}"]`);
  }

  _getWebview(id) {
    const pane = this._getPane(id);
    return pane ? pane.querySelector('webview') : null;
  }

  _getTabEl(id) {
    return document.querySelector(`.tab-item[data-tab-id="${id}"]`);
  }

  /* ----- Render tab list ----- */
  _renderTabList() {
    this.tabsList.innerHTML = '';
    this.pinnedTabsList.innerHTML = '';

    for (const id of this.tabOrder) {
      const tab = this.tabs.get(id);
      if (!tab) continue;
      const el = this._buildTabElement(tab);
      if (tab.pinned) {
        this.pinnedTabsList.appendChild(el);
      } else {
        this.tabsList.appendChild(el);
      }
    }
    this._updatePinnedVisibility();
  }

  _buildTabElement(tab) {
    const el = document.createElement('div');
    el.className = 'tab-item' +
      (tab.pinned ? ' pinned' : '') +
      (tab.sleeping ? ' sleeping' : '') +
      (tab.id === this.activeTabId ? ' active' : '');
    el.dataset.tabId = tab.id;
    el.title = tab.title;

    const faviconHtml = tab.favicon
      ? `<img class="tab-favicon" src="${escapeHtml(tab.favicon)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const placeholderHtml = `<div class="tab-favicon-placeholder" style="display:${tab.favicon ? 'none' : 'flex'}">${escapeHtml(getInitial(tab.title, tab.url))}</div>`;
    const loadingHtml = tab.loading ? `<div class="tab-loading-spinner"></div>` : '';

    if (tab.pinned) {
      el.innerHTML = `
        <div class="tab-favicon-wrapper">
          ${loadingHtml || (tab.favicon ? faviconHtml : '') + placeholderHtml}
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="tab-favicon-wrapper">
          ${loadingHtml || (tab.favicon ? faviconHtml : '') + placeholderHtml}
        </div>
        <div class="tab-info">
          <div class="tab-title">${escapeHtml(truncate(tab.title, 40))}</div>
        </div>
        ${tab.pinned ? `<span class="tab-pin-icon">📌</span>` : ''}
        <button class="tab-close" data-tab-id="${tab.id}" title="Close tab">${closeSVG()}</button>
      `;
    }

    el.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) return;
      this.switchTab(tab.id);
    });

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._showTabContextMenu(tab.id, e.clientX, e.clientY);
    });

    const closeBtn = el.querySelector('.tab-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(tab.id);
      });
    }

    el.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', (e) => this._onDragStart(e, tab.id));
    el.addEventListener('dragover', (e) => this._onDragOver(e, tab.id));
    el.addEventListener('dragleave', () => this._onDragLeave());
    el.addEventListener('drop', (e) => this._onDrop(e, tab.id));
    el.addEventListener('dragend', () => this._onDragEnd());

    el.addEventListener('auxclick', (e) => {
      if (e.button === 1) this.closeTab(tab.id);
    });

    return el;
  }

  _updateTabDOM(id, changes = {}) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    const el = this._getTabEl(id);
    if (!el) {
      this._renderTabList();
      return;
    }

    // Update classes
    el.classList.toggle('sleeping', tab.sleeping);
    el.classList.toggle('active', id === this.activeTabId);

    if (changes.title || changes.favicon !== undefined || changes.loading !== undefined) {
      // Rebuild the inner favicon area
      const faviconWrapper = el.querySelector('.tab-favicon-wrapper');
      if (faviconWrapper) {
        if (tab.loading) {
          faviconWrapper.innerHTML = `<div class="tab-loading-spinner"></div>`;
        } else if (tab.favicon) {
          faviconWrapper.innerHTML = `
            <img class="tab-favicon" src="${escapeHtml(tab.favicon)}" alt=""
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="tab-favicon-placeholder" style="display:none">${escapeHtml(getInitial(tab.title, tab.url))}</div>
          `;
        } else {
          faviconWrapper.innerHTML = `<div class="tab-favicon-placeholder">${escapeHtml(getInitial(tab.title, tab.url))}</div>`;
        }
      }
    }

    if (changes.title || changes.title === undefined) {
      const titleEl = el.querySelector('.tab-title');
      if (titleEl) titleEl.textContent = truncate(tab.title, 40);
      el.title = tab.title;
    }
  }

  _updatePinnedVisibility() {
    const hasPinned = this.tabOrder.some(id => this.tabs.get(id)?.pinned);
    this.pinnedSection.style.display = hasPinned ? '' : 'none';
    this.pinnedDivider.style.display = hasPinned ? '' : 'none';
  }

  /* ----- Address bar helpers ----- */
  _updateAddressBar(url) {
    if (document.activeElement !== this.addressBar) {
      const display = url.startsWith('file://') ? 'New Tab' : url;
      this.addressBar.value = display === resolveFile(NEW_TAB_URL) ? '' : display;
    }
  }

  _updateNavUrlDisplay(url) {
    const display = url.startsWith('file://') ? 'New Tab' : truncate(url, 80);
    this.navUrlText.textContent = display;
  }

  _updateSecurityIcon(url) {
    const icon = document.getElementById('securityIcon');
    if (!icon) return;
    if (url.startsWith('https://')) {
      icon.classList.add('secure');
      icon.title = 'Secure connection';
      icon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    } else {
      icon.classList.remove('secure');
      icon.title = '';
      icon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;
    }
  }

  /* ----- Loading bar ----- */
  _startLoadingBar() {
    this.loadingBar.style.transition = 'none';
    this.loadingBar.style.width = '0%';
    this.loadingBar.style.opacity = '1';
    this.loadingBar.classList.remove('done');
    // Trigger reflow
    this.loadingBar.offsetHeight;
    this.loadingBar.classList.add('loading');
  }

  _stopLoadingBar() {
    this.loadingBar.classList.remove('loading');
    this.loadingBar.classList.add('done');
    setTimeout(() => {
      this.loadingBar.classList.remove('done');
      this.loadingBar.style.width = '0%';
    }, 600);
  }

  /* ----- Drag & drop for tab reorder ----- */
  _initDropIndicator() {
    this.dropIndicator = document.createElement('div');
    this.dropIndicator.className = 'tab-drop-indicator';
    this.dropIndicator.style.display = 'none';
  }

  _onDragStart(e, id) {
    this.dragState = { id };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    const el = this._getTabEl(id);
    if (el) {
      setTimeout(() => el.classList.add('dragging'), 0);
    }
  }

  _onDragOver(e, targetId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!this.dragState || this.dragState.id === targetId) return;
    const el = this._getTabEl(targetId);
    if (el) el.classList.add('drag-over');
  }

  _onDragLeave() {
    document.querySelectorAll('.tab-item.drag-over').forEach(el => el.classList.remove('drag-over'));
  }

  _onDrop(e, targetId) {
    e.preventDefault();
    if (!this.dragState || this.dragState.id === targetId) return;
    const fromId = this.dragState.id;
    const fromIdx = this.tabOrder.indexOf(fromId);
    const toIdx = this.tabOrder.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    this.tabOrder.splice(fromIdx, 1);
    this.tabOrder.splice(toIdx, 0, fromId);
    this._renderTabList();
    document.querySelectorAll('.tab-item.drag-over').forEach(el => el.classList.remove('drag-over'));
  }

  _onDragEnd() {
    this.dragState = null;
    document.querySelectorAll('.tab-item.dragging, .tab-item.drag-over').forEach(el => {
      el.classList.remove('dragging', 'drag-over');
    });
  }

  /* ----- Context menu ----- */
  _showTabContextMenu(id, x, y) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    const menu = document.getElementById('contextMenu');
    const items = document.getElementById('contextMenuItems');
    items.innerHTML = '';

    const menuItems = [
      { label: tab.sleeping ? '☀️  Wake Tab' : '🌙  Sleep Tab', action: () => tab.sleeping ? this.wakeTab(id) : this.sleepTab(id), disabled: tab.pinned && !tab.sleeping },
      { label: tab.pinned ? '📌  Unpin Tab' : '📌  Pin Tab', action: () => this.togglePin(id) },
      { type: 'sep' },
      { label: '⧉  Duplicate Tab', action: () => this.duplicateTab(id) },
      { label: '↗  Move to Split View', action: () => { this.splitViewTabId = id; this._enableSplitView(); } },
      { type: 'sep' },
      { label: '🔄  Reload', action: () => this.reload(id) },
      { type: 'sep' },
      { label: '✕  Close Tab', action: () => this.closeTab(id), danger: true },
      { label: '✕  Close Other Tabs', action: () => this._closeOtherTabs(id), danger: true },
    ];

    for (const item of menuItems) {
      if (item.type === 'sep') {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        items.appendChild(sep);
      } else {
        const el = document.createElement('div');
        el.className = 'context-menu-item' + (item.danger ? ' danger' : '');
        if (item.disabled) el.style.opacity = '0.4';
        el.textContent = item.label;
        el.addEventListener('click', () => {
          if (!item.disabled) item.action();
          this._hideContextMenu();
        });
        items.appendChild(el);
      }
    }

    // Position
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    // Clamp to viewport
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';
  }

  _hideContextMenu() {
    document.getElementById('contextMenu').style.display = 'none';
  }

  _closeOtherTabs(keepId) {
    const toClose = this.tabOrder.filter(id => id !== keepId);
    for (const id of toClose) this.closeTab(id);
  }

  /* ----- Global event binding ----- */
  _bindGlobalEvents() {
    // Electron menu events
    if (window.electronAPI) {
      window.electronAPI.on('menu-new-tab', () => this.createTab(null));
      window.electronAPI.on('menu-close-tab', () => { if (this.activeTabId) this.closeTab(this.activeTabId); });
      window.electronAPI.on('menu-focus-address-bar', () => this._focusAddressBar());
      window.electronAPI.on('menu-toggle-sidebar', () => toggleSidebar());
      window.electronAPI.on('menu-reload', () => this.reload());
      window.electronAPI.on('menu-hard-reload', () => this.reload(null, true));
      window.electronAPI.on('menu-dev-tools', () => this.toggleDevTools());
      window.electronAPI.on('menu-zoom-in', () => this.zoomIn());
      window.electronAPI.on('menu-zoom-out', () => this.zoomOut());
      window.electronAPI.on('menu-zoom-reset', () => this.zoomReset());
      window.electronAPI.on('menu-go-back', () => this.goBack());
      window.electronAPI.on('menu-go-forward', () => this.goForward());
      window.electronAPI.on('menu-go-home', () => this.goHome());
      window.electronAPI.on('menu-next-tab', () => this.nextTab());
      window.electronAPI.on('menu-prev-tab', () => this.prevTab());
      window.electronAPI.on('menu-pin-tab', () => { if (this.activeTabId) this.togglePin(this.activeTabId); });
      window.electronAPI.on('menu-split-view', () => this.toggleSplitView());
      window.electronAPI.on('open-url-new-tab', (url) => this.createTab(url));
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 't') { e.preventDefault(); this.createTab(null); }
      if (ctrl && e.key === 'w') { e.preventDefault(); if (this.activeTabId) this.closeTab(this.activeTabId); }
      if (ctrl && e.key === 'l') { e.preventDefault(); this._focusAddressBar(); }
      if (ctrl && e.key === 'r') { e.preventDefault(); this.reload(); }
      if (ctrl && e.shiftKey && e.key === 'R') { e.preventDefault(); this.reload(null, true); }
      if (ctrl && e.key === 'b') { e.preventDefault(); toggleSidebar(); }
      if (ctrl && e.key === 'Tab') { e.preventDefault(); this.nextTab(); }
      if (ctrl && e.shiftKey && e.key === 'Tab') { e.preventDefault(); this.prevTab(); }
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); this.goBack(); }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); this.goForward(); }
      if (e.key === 'F12') { this.toggleDevTools(); }
      if (e.key === 'Escape') {
        this._hideContextMenu();
        this.addressBar.blur();
        document.getElementById('suggestions').classList.remove('visible');
      }
      // Number shortcuts for tabs
      if (ctrl && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        const unpinned = this.tabOrder.filter(id => !this.tabs.get(id)?.pinned);
        if (idx < unpinned.length) this.switchTab(unpinned[idx]);
      }
    });

    // Address bar events
    this.addressBar.addEventListener('focus', () => {
      this.addressBar.select();
      this._showSuggestions(this.addressBar.value);
    });

    this.addressBar.addEventListener('blur', () => {
      setTimeout(() => {
        document.getElementById('suggestions').classList.remove('visible');
      }, 150);
    });

    this.addressBar.addEventListener('input', () => {
      this._showSuggestions(this.addressBar.value);
    });

    this.addressBar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = this.addressBar.value.trim();
        if (val) this.navigate(this.activeTabId, val);
        this.addressBar.blur();
        document.getElementById('suggestions').classList.remove('visible');
      }
      if (e.key === 'Escape') {
        this.addressBar.blur();
        document.getElementById('suggestions').classList.remove('visible');
        // Restore current URL
        const tab = this.tabs.get(this.activeTabId);
        if (tab) this._updateAddressBar(tab.url);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this._moveSuggestionSelection(1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this._moveSuggestionSelection(-1);
      }
    });

    document.getElementById('addressGoBtn').addEventListener('click', () => {
      const val = this.addressBar.value.trim();
      if (val) this.navigate(this.activeTabId, val);
      document.getElementById('suggestions').classList.remove('visible');
    });

    // Nav bar click to focus address bar
    document.getElementById('navAddressDisplay').addEventListener('click', () => {
      this._focusAddressBar();
    });

    // Nav button events
    this.backBtn.addEventListener('click', () => this.goBack());
    this.forwardBtn.addEventListener('click', () => this.goForward());
    this.reloadBtn.addEventListener('click', () => {
      const tab = this.tabs.get(this.activeTabId);
      if (tab && tab.loading) {
        const wv = this._getWebview(this.activeTabId);
        if (wv) wv.stop();
      } else {
        this.reload();
      }
    });
    document.getElementById('homeBtn').addEventListener('click', () => this.goHome());
    document.getElementById('newTabBtn').addEventListener('click', () => this.createTab(null));
    document.getElementById('splitViewBtn').addEventListener('click', () => this.toggleSplitView());
    document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
    document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
    document.getElementById('devToolsBtn').addEventListener('click', () => this.toggleDevTools());

    // Window controls
    document.getElementById('btnClose').addEventListener('click', () => window.electronAPI?.closeWindow());
    document.getElementById('btnMinimize').addEventListener('click', () => window.electronAPI?.minimizeWindow());
    document.getElementById('btnMaximize').addEventListener('click', () => window.electronAPI?.maximizeWindow());

    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => toggleSidebar());

    // Close context menu on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#contextMenu')) this._hideContextMenu();
    });

    // Sidebar resize
    this._initSidebarResize();
  }

  /* ----- Address bar suggestions ----- */
  _focusAddressBar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('collapsed')) {
      toggleSidebar();
    }
    this.addressBar.focus();
    this.addressBar.select();
  }

  _showSuggestions(query) {
    const suggestionsEl = document.getElementById('suggestions');
    if (!query || query.length < 2) {
      suggestionsEl.classList.remove('visible');
      return;
    }

    const staticSuggestions = [
      { text: 'https://www.google.com', label: 'Google' },
      { text: 'https://github.com', label: 'GitHub' },
      { text: 'https://www.youtube.com', label: 'YouTube' },
      { text: 'https://www.reddit.com', label: 'Reddit' },
      { text: 'https://stackoverflow.com', label: 'Stack Overflow' },
      { text: 'https://www.wikipedia.org', label: 'Wikipedia' },
      { text: 'https://www.twitter.com', label: 'Twitter/X' },
      { text: 'https://www.linkedin.com', label: 'LinkedIn' },
      { text: 'https://news.ycombinator.com', label: 'Hacker News' },
    ];

    const q = query.toLowerCase();
    const matches = staticSuggestions.filter(s =>
      s.text.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
    ).slice(0, 5);

    // Add a search suggestion
    const searchSuggestion = {
      text: 'https://www.google.com/search?q=' + encodeURIComponent(query),
      label: `Search Google for "${truncate(query, 40)}"`,
      isSearch: true
    };

    const allSuggestions = [searchSuggestion, ...matches];

    suggestionsEl.innerHTML = '';
    for (const s of allSuggestions) {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${s.isSearch
            ? '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>'
            : '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'}
        </svg>
        <span class="suggestion-text">${escapeHtml(s.label)}</span>
      `;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.navigate(this.activeTabId, s.text);
        this.addressBar.value = s.text;
        suggestionsEl.classList.remove('visible');
      });
      suggestionsEl.appendChild(item);
    }

    if (allSuggestions.length > 0) {
      suggestionsEl.classList.add('visible');
    } else {
      suggestionsEl.classList.remove('visible');
    }
  }

  _moveSuggestionSelection(dir) {
    const items = document.querySelectorAll('.suggestion-item');
    if (!items.length) return;
    let current = -1;
    items.forEach((item, i) => { if (item.classList.contains('selected')) current = i; });
    items.forEach(item => item.classList.remove('selected'));
    const next = (current + dir + items.length) % items.length;
    items[next].classList.add('selected');
    const text = items[next].querySelector('.suggestion-text')?.textContent;
    if (text) this.addressBar.value = text;
  }

  /* ----- Sidebar resize ----- */
  _initSidebarResize() {
    const resizer = document.getElementById('sidebarResizer');
    const sidebar = document.getElementById('sidebar');
    let dragging = false;
    let startX, startW;

    resizer.addEventListener('mousedown', (e) => {
      if (sidebar.classList.contains('collapsed')) return;
      dragging = true;
      startX = e.clientX;
      startW = sidebar.offsetWidth;
      resizer.classList.add('resizing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const delta = e.clientX - startX;
      const newW = Math.max(180, Math.min(400, startW + delta));
      sidebar.style.width = newW + 'px';
      sidebar.style.minWidth = newW + 'px';
      document.documentElement.style.setProperty('--sidebar-width', newW + 'px');
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }
}

/* ============================================================
   Sidebar toggle
   ============================================================ */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
}

/* ============================================================
   HTML escape utility
   ============================================================ */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function closeSVG() {
  return `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>`;
}

/* ============================================================
   Bootstrap
   ============================================================ */
let tabManager;

document.addEventListener('DOMContentLoaded', () => {
  tabManager = new TabManager();
  // Create initial tab
  tabManager.createTab(null);
});
