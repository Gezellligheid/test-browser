const { app, BrowserWindow, ipcMain, Menu, shell, session, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 700,
    frame: false,
    transparent: false,
    backgroundColor: '#0f0f23',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', 'maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', 'normal');
  });

  mainWindow.on('focus', () => {
    mainWindow.webContents.send('window-focus', true);
  });

  mainWindow.on('blur', () => {
    mainWindow.webContents.send('window-focus', false);
  });

  // Set up Content Security Policy for webviews
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
      }
    });
  });

  buildMenu();
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-new-tab');
          }
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-close-tab');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Focus Address Bar',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-focus-address-bar');
          }
        },
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-toggle-sidebar');
          }
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-reload');
          }
        },
        {
          label: 'Hard Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-hard-reload');
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-dev-tools');
          }
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-zoom-in');
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-zoom-out');
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-zoom-reset');
          }
        }
      ]
    },
    {
      label: 'Navigation',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-go-back');
          }
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-go-forward');
          }
        },
        {
          label: 'Home',
          accelerator: 'Alt+Home',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-go-home');
          }
        }
      ]
    },
    {
      label: 'Tabs',
      submenu: [
        {
          label: 'Next Tab',
          accelerator: 'CmdOrCtrl+Tab',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-next-tab');
          }
        },
        {
          label: 'Previous Tab',
          accelerator: 'CmdOrCtrl+Shift+Tab',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-prev-tab');
          }
        },
        { type: 'separator' },
        {
          label: 'Pin/Unpin Tab',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-pin-tab');
          }
        },
        {
          label: 'Split View',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-split-view');
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'maximize' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('window-is-maximized', (event) => {
  event.returnValue = mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('open-external', async (event, url) => {
  const safeProtocols = ['http:', 'https:', 'mailto:'];
  try {
    const parsed = new URL(url);
    if (safeProtocols.includes(parsed.protocol)) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: 'Unsafe protocol' };
  } catch {
    return { success: false, error: 'Invalid URL' };
  }
});

ipcMain.handle('show-context-menu', async (event, options) => {
  return new Promise((resolve) => {
    const menuItems = options.items.map(item => {
      if (item.type === 'separator') return { type: 'separator' };
      return {
        label: item.label,
        enabled: item.enabled !== false,
        click: () => resolve(item.id)
      };
    });
    const menu = Menu.buildFromTemplate(menuItems);
    menu.popup({
      window: mainWindow,
      callback: () => resolve(null)
    });
  });
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const safeProtocols = ['http:', 'https:', 'file:', 'about:'];
    if (!safeProtocols.includes(parsedUrl.protocol)) {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    const safeProtocols = ['http:', 'https:'];
    try {
      const parsed = new URL(url);
      if (safeProtocols.includes(parsed.protocol)) {
        if (mainWindow) {
          mainWindow.webContents.send('open-url-new-tab', url);
        }
      }
    } catch {}
    return { action: 'deny' };
  });
});
