const EventEmitter = require('events');
const { Worker } = require('worker_threads');
const path = require('path');
const os = require('os');

class HardwareMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.intervalMs = options.intervalMs || 250;
    this.ramThreshold = options.ramThreshold || 92.0;
    this.cpuThreshold = options.cpuThreshold || 98.0;
    this.cpuSustainedLimitTicks = options.cpuSustainedLimitTicks || 12; // 12 * 250ms = 3.0s
    this.watchdogLagThresholdMs = options.watchdogLagThresholdMs || 600;

    this.worker = null;
    this.isRunning = false;
    this.isGameOver = false;

    // Métricas pico de la sesión
    this.peakCpu = 0;
    this.peakRam = 0;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isGameOver = false;

    try {
      const workerPath = path.join(__dirname, 'monitorWorker.js');
      this.worker = new Worker(workerPath);

      this.worker.on('message', (msg) => {
        if (!this.isRunning) return;

        if (msg.type === 'metrics') {
          const metrics = msg.data;
          if (metrics.peakCpu > this.peakCpu) this.peakCpu = metrics.peakCpu;
          if (metrics.peakRam > this.peakRam) this.peakRam = metrics.peakRam;
          this.emit('metrics', metrics);
        } else if (msg.type === 'game_over') {
          this.isGameOver = true;
          console.warn(`[WATCHDOG ALERTA MÁXIMA] GAME OVER: ${msg.data.reason}`);
          this.emit('game_over', msg.data);
        }
      });

      this.worker.on('error', (err) => {
        console.error('[HardwareMonitor Worker Error]:', err);
      });

      this.worker.on('exit', (code) => {
        if (code !== 0 && this.isRunning) {
          console.warn(`[HardwareMonitor] Worker finalizó con código ${code}.`);
        }
      });

      console.log(`[HardwareMonitor] Hilo dedicado (Worker Thread) iniciado a ${this.intervalMs}ms`);
    } catch (err) {
      console.error('[HardwareMonitor] Error al instanciar Worker Thread:', err);
    }
  }

  stop() {
    if (this.worker) {
      this.worker.postMessage({ action: 'stop' });
      this.worker.terminate();
      this.worker = null;
    }
    this.isRunning = false;
    console.log('[HardwareMonitor] Hilo de monitorización detenido');
  }

  reset() {
    this.isGameOver = false;
    this.peakCpu = 0;
    this.peakRam = 0;
    if (this.worker) {
      this.worker.postMessage({ action: 'reset' });
    } else {
      this.start();
    }
  }
}

module.exports = HardwareMonitor;
