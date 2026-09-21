const { app, BrowserWindow, session, globalShortcut, ipcMain, screen, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let mainWindow;
let isMiniMode = false;
let currentVoiceHotkey = 'F8';
let autoPasteEnabled = true;

const NORMAL_SIZE = { width: 940, height: 800 };
const MINI_SIZE = { width: 480, height: 260 };

function getSettingsFilePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'javis_idio_settings.json');
}

function loadSettingsSync() {
  try {
    const filePath = getSettingsFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Lỗi đọc file settings:', err);
  }
  return null;
}

function saveSettingsSync(settings) {
  try {
    const filePath = getSettingsFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Lỗi lưu file settings:', err);
    return false;
  }
}

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

// Hàm gõ thẳng vào con trỏ chuột của ứng dụng đang mở (Word, Zalo, Excel...)
function pasteToActiveWindow(text) {
  if (text) {
    clipboard.writeText(text);
  }

  // Tạm ẩn hoặc chuyển focus về app trước đó rồi bấm Ctrl+V
  if (mainWindow && !isMiniMode) {
    mainWindow.minimize();
  }

  setTimeout(() => {
    // Kích hoạt phím tắt Ctrl+V qua PowerShell WScript / SendKeys
    const psScript = `powershell -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; Start-Sleep -Milliseconds 80; $ws.SendKeys('^v')"`;
    exec(psScript, (err) => {
      if (err) console.error('Auto-paste error:', err);
    });
  }, 120);
}

// Đăng ký lại phím tắt gõ giọng nói toàn hệ thống
function registerVoiceShortcut(hotkey) {
  if (currentVoiceHotkey) {
    try {
      globalShortcut.unregister(currentVoiceHotkey);
    } catch (e) {}
  }

  currentVoiceHotkey = hotkey || 'F8';

  try {
    const success = globalShortcut.register(currentVoiceHotkey, () => {
      if (mainWindow) {
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
        mainWindow.webContents.send('trigger-voice-typing');
      }
    });

    console.log(`[Voice Typing Hotkey] Đã đăng ký phím: ${currentVoiceHotkey} (Thành công: ${success})`);
  } catch (err) {
    console.error(`Lỗi đăng ký phím tắt ${currentVoiceHotkey}:`, err);
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

  ipcMain.on('update-voice-hotkey', (event, config) => {
    if (config?.hotkey) {
      registerVoiceShortcut(config.hotkey);
    }
    if (typeof config?.autoPaste === 'boolean') {
      autoPasteEnabled = config.autoPaste;
    }
  });

  ipcMain.on('paste-to-active-window', (event, text) => {
    if (autoPasteEnabled) {
      pasteToActiveWindow(text);
    }
  });

  ipcMain.handle('get-saved-settings', () => {
    return loadSettingsSync();
  });

  ipcMain.on('save-settings', (event, settings) => {
    saveSettingsSync(settings);
    if (settings?.voiceTypingHotkey) {
      registerVoiceShortcut(settings.voiceTypingHotkey);
    }
  });

  // Đăng ký phím tắt mặc định:
  // 1. Phím tắt gõ giọng nói tùy chỉnh (Mặc định F8)
  registerVoiceShortcut('F8');

  // 2. Alt + Space: Mở / Ẩn nhanh JAVIS Idio
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

    // 3. Alt + Z: Bật / Tắt chế độ Cửa sổ Mini Ghim Nổi Zalo
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
