const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleMiniMode: (isMini) => ipcRenderer.send('toggle-mini-mode', isMini),
  setAlwaysOnTop: (isTop) => ipcRenderer.send('set-always-on-top', isTop),
  updateVoiceHotkey: (config) => ipcRenderer.send('update-voice-hotkey', config),
  pasteToActiveWindow: (text) => ipcRenderer.send('paste-to-active-window', text),
  saveSettingsToFile: (settings) => ipcRenderer.send('save-settings', settings),
  loadSettingsFromFile: () => ipcRenderer.invoke('get-saved-settings'),
  onToggleMiniShortcut: (callback) => ipcRenderer.on('toggle-mini-from-shortcut', () => callback()),
  onTriggerVoiceTyping: (callback) => ipcRenderer.on('trigger-voice-typing', () => callback()),
  isElectron: true
});
