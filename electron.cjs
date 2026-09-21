const { app, BrowserWindow, session, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;
let isMiniMode = false;
const NORMAL_SIZE = { width: 940, height: 800 };
const MINI_SIZE = { width: 480, height: 260 };

function createWindow() {
  mainWindow = new BrowserWindow({
    width: NORMAL_SIZE.width,
    height: NORMAL_SIZE.height,
    minWidth: 420,
    minHeight: 240,
    title: "JAVIS Idio - AI Voice & Live Translator Premium",
    backgroundColor: '#070a12',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    show: false
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function setMiniMode(enabled) {
  if (!mainWindow) return;
  isMiniMode = enabled;

  const display = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = display.workAreaSize;

  if (enabled) {
    // Thu nhỏ thành thanh nổi góc phải dưới màn hình (ngay cạnh khay hệ thống / Zalo)
    mainWindow.setAlwaysOnTop(true, 'floating');
    mainWindow.setSize(MINI_SIZE.width, MINI_SIZE.height);
    mainWindow.setPosition(screenWidth - MINI_SIZE.width - 24, screenHeight - MINI_SIZE.height - 24);
  } else {
    // Trở về kích thước đầy đủ
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setSize(NORMAL_SIZE.width, NORMAL_SIZE.height);
    mainWindow.center();
  }
}

app.on('ready', () => {
  createWindow();

  // IPC Handlers từ Renderer
  ipcMain.on('toggle-mini-mode', (event, isMini) => {
    setMiniMode(isMini);
  });

  ipcMain.on('set-always-on-top', (event, isTop) => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(isTop, 'floating');
    }
  });

  // Đăng ký phím tắt toàn hệ thống:
  // 1. Alt + Space: Mở / Ẩn nhanh JAVIS Idio
  // 2. Alt + Z: Bật / Tắt chế độ Cửa sổ Mini Ghim Nổi Zalo (Always On Top)
  try {
    globalShortcut.register('Alt+Space', () => {
      if (mainWindow) {
        if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });

    globalShortcut.register('Alt+Z', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        isMiniMode = !isMiniMode;
        setMiniMode(isMiniMode);
        mainWindow.webContents.send('toggle-mini-from-shortcut', isMiniMode);
      }
    });
  } catch (err) {
    console.log('Global shortcut registration error:', err);
  }
  
  // Tự động cấp quyền Micro (Audio) cho Electron
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      return callback(true);
    }
    callback(false);
  });
  
  session.defaultSession.setPermissionCheckHandler((webContents, permission, origin) => {
    if (permission === 'media') {
      return true;
    }
    return false;
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
