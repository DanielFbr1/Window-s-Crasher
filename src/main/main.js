const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const HardwareMonitor = require('./monitor');

let mainWindow = null;
let hardwareMonitor = null;

// Desactivar caché en disco de shaders para evitar errores de colisión y permisos en Windows (0x5 / -2)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1000,
    minHeight: 700,
    title: "Windows Crasher - v2.1.0",
    backgroundColor: '#0a0d14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false // No congelar cuando la ventana pierda foco
    },
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('[Main] Ventana inicializada. Iniciando HardwareMonitor...');
    hardwareMonitor.start();
  });

  mainWindow.on('closed', () => {
    if (hardwareMonitor) {
      hardwareMonitor.stop();
    }
    mainWindow = null;
  });
}

// Inicialización de la aplicación
app.whenReady().then(() => {
  hardwareMonitor = new HardwareMonitor({
    intervalMs: 250,
    ramThreshold: 90.0, // Límite de RAM bajado a 90%
    cpuThreshold: 95.0, // Límite de CPU bajado a 95%
    cpuSustainedLimitTicks: 12, // 3.0s a 250ms
    watchdogLagThresholdMs: 600
  });

  // Reenviar telemetría al renderer
  hardwareMonitor.on('metrics', (metrics) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('hardware-metrics', metrics);
    }
  });

  // Reenviar evento de Game Over
  hardwareMonitor.on('game_over', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('game-over', data);
    }
  });

  // Escuchar reinicio desde frontend
  ipcMain.on('game-reset', () => {
    console.log('[Main] Reinicio solicitado por el usuario');
    if (hardwareMonitor) {
      hardwareMonitor.reset();
    }
  });

  // Escuchar parada de pánico
  ipcMain.on('game-panic', () => {
    console.warn('[Main] Botón de pánico activado por el usuario');
    if (hardwareMonitor) {
      hardwareMonitor.isGameOver = true;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('game-over', {
          reason: 'ABORTO MANUAL DE EMERGENCIA (Botón de Pánico)',
          metrics: {
            cpuPercent: hardwareMonitor.peakCpu,
            ramPercent: hardwareMonitor.peakRam
          }
        });
      }
    }
  });

  // Handler para obtener especificaciones reales del hardware
  ipcMain.handle('get-system-specs', () => {
    try {
      const cpus = os.cpus() || [];
      const model = cpus.length > 0 ? cpus[0].model.trim() : 'Procesador Compatible';
      const speed = cpus.length > 0 ? cpus[0].speed : 0;
      const totalRamGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(1);
      return {
        cpuModel: model,
        cpuCores: cpus.length,
        cpuSpeedMHz: speed,
        totalRamGB: totalRamGB,
        platform: os.platform() === 'win32' ? 'Windows' : os.platform(),
        release: os.release(),
        arch: os.arch()
      };
    } catch (err) {
      console.warn('[Main] Error obteniendo especificaciones:', err);
      return null;
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (hardwareMonitor) {
    hardwareMonitor.stop();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
