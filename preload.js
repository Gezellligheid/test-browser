const { contextBridge, ipcRenderer } = require('electron');

// Whitelist of valid IPC channels for security
const validSendChannels = [
  'window-minimize',
  'window-maximize',
  'window-close',
];

const validReceiveChannels = [
  'menu-new-tab',
  'menu-close-tab',
  'menu-focus-address-bar',
  'menu-toggle-sidebar',
  'menu-reload',
  'menu-hard-reload',
  'menu-dev-tools',
  'menu-zoom-in',
  'menu-zoom-out',
  'menu-zoom-reset',
  'menu-go-back',
  'menu-go-forward',
  'menu-go-home',
  'menu-next-tab',
  'menu-prev-tab',
  'menu-pin-tab',
  'menu-split-view',
  'window-state-changed',
  'window-focus',
  'open-url-new-tab',
];

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.sendSync('window-is-maximized'),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Context menu
  showContextMenu: (options) => ipcRenderer.invoke('show-context-menu', options),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Save dialog
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

  // Event listeners
  on: (channel, callback) => {
    if (validReceiveChannels.includes(channel)) {
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
    console.warn(`Blocked IPC receive on invalid channel: ${channel}`);
    return () => {};
  },

  once: (channel, callback) => {
    if (validReceiveChannels.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => callback(...args));
    }
  },

  removeAllListeners: (channel) => {
    if (validReceiveChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  }
});
