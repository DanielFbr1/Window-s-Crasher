const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

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

  // Obtener versión de la app
  getVersion: () => 'v1.7.0',

  // Obtener componentes de hardware del dispositivo para la pantalla de Game Over
  getSystemSpecs: () => {
    try {
      const cpus = os.cpus() || [];
      return {
        cpuModel: cpus[0]?.model || 'Procesador Desconocido',
        cpuCores: cpus.length,
        cpuSpeedMHz: cpus[0]?.speed || 0,
        totalRamGB: (os.totalmem() / (1024 ** 3)).toFixed(1),
        platform: `${os.type()} ${os.arch()}`,
        release: os.release()
      };
    } catch (err) {
      return {
        cpuModel: 'CPU Genérica x64',
        cpuCores: 4,
        cpuSpeedMHz: 2400,
        totalRamGB: '16.0',
        platform: 'Windows_NT x64',
        release: '10.0'
      };
    }
  }
});

