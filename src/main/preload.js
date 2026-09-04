const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Suscripción a métricas cada 250ms
  onHardwareMetrics: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('hardware-metrics', subscription);
    return () => ipcRenderer.removeListener('hardware-metrics', subscription);
  },

  // Suscripción a evento de Game Over disparado por el Watchdog
  onGameOver: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('game-over', subscription);
    return () => ipcRenderer.removeListener('game-over', subscription);
  },

  // Reiniciar estado del juego y watchdog
  requestReset: () => {
    ipcRenderer.send('game-reset');
  },

  // Botón de pánico del usuario
  triggerPanic: () => {
    ipcRenderer.send('game-panic');
  },

  // Obtener especificaciones reales del hardware
  getSystemSpecs: () => ipcRenderer.invoke('get-system-specs'),

  // Obtener versión de la app
  getVersion: () => 'v1.7.0'
});
