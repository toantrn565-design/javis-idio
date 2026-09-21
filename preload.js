const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleMiniMode: (isMini) => ipcRenderer.send('toggle-mini-mode', isMini),
  setAlwaysOnTop: (isTop) => ipcRenderer.send('set-always-on-top', isTop),
  onToggleMiniShortcut: (callback) => ipcRenderer.on('toggle-mini-from-shortcut', () => callback()),
  isElectron: true
});
