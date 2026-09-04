const { parentPort } = require('worker_threads');
const os = require('os');
const { performance } = require('perf_hooks');

// Parámetros de configuración del Watchdog
const CONFIG = {
  intervalMs: 250,
  ramThreshold: 92.0,
  cpuThreshold: 98.0,
  cpuSustainedLimitTicks: 12, // 12 * 250ms = 3.0s continuos
  watchdogLagThresholdMs: 600
};

let timer = null;
let previousCpuTimes = null;
let lastTickTime = null;
let sustainedCpuTicks = 0;
let consecutiveLagTicks = 0;
let isGameOver = false;

// Métricas pico de la sesión
let peakCpu = 0;
let peakRam = 0;

function getAverageCpuTimes() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }

  return {
    idle: totalIdle / cpus.length,
    total: totalTick / cpus.length,
    cores: cpus.length
  };
}

function tick() {
  const now = performance.now();
  const actualDelta = lastTickTime ? Math.round(now - lastTickTime) : CONFIG.intervalMs;
  lastTickTime = now;

  // 1. Medición de CPU diferencial
  const currentCpuTimes = getAverageCpuTimes();
  let cpuPercent = 0;

  if (previousCpuTimes) {
    const idleDelta = currentCpuTimes.idle - previousCpuTimes.idle;
    const totalDelta = currentCpuTimes.total - previousCpuTimes.total;
    if (totalDelta > 0) {
      cpuPercent = Math.max(0, Math.min(100, 100 - (100 * idleDelta / totalDelta)));
    }
  }
  previousCpuTimes = currentCpuTimes;

  // 2. Medición de Memoria RAM
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const ramPercent = Math.max(0, Math.min(100, (usedMem / totalMem) * 100));

  if (cpuPercent > peakCpu) peakCpu = cpuPercent;
  if (ramPercent > peakRam) peakRam = ramPercent;

  // 3. Verificación de condiciones de seguridad (WATCHDOG)
  let watchdogTriggered = false;
  let gameOverReason = '';
  let alertType = null;

  // A. Retraso / Congelamiento del Sistema (>600ms)
  if (actualDelta > CONFIG.watchdogLagThresholdMs) {
    consecutiveLagTicks++;
    alertType = 'LAG';
    if (consecutiveLagTicks >= 2 || actualDelta >= 1200) {
      watchdogTriggered = true;
      gameOverReason = `Congelamiento del sistema detectado por Watchdog (Delta: ${actualDelta}ms > ${CONFIG.watchdogLagThresholdMs}ms)`;
    }
  } else {
    consecutiveLagTicks = 0;
  }

  // B. Saturación crítica de RAM (>= 92%)
  if (ramPercent >= CONFIG.ramThreshold) {
    watchdogTriggered = true;
    alertType = 'RAM';
    gameOverReason = `Límite crítico de RAM superado (${ramPercent.toFixed(1)}% >= ${CONFIG.ramThreshold}%)`;
  }

  // C. Saturación sostenida de CPU (>= 98% durante >3s)
  if (cpuPercent >= CONFIG.cpuThreshold) {
    sustainedCpuTicks++;
    alertType = 'CPU';
    if (sustainedCpuTicks >= CONFIG.cpuSustainedLimitTicks) {
      watchdogTriggered = true;
      const seconds = (sustainedCpuTicks * CONFIG.intervalMs / 1000).toFixed(1);
      gameOverReason = `CPU saturada al 98%+ de forma sostenida (${seconds}s > 3.0s)`;
    }
  } else {
    sustainedCpuTicks = 0;
  }

  const metrics = {
    cpuPercent: parseFloat(cpuPercent.toFixed(1)),
    ramPercent: parseFloat(ramPercent.toFixed(1)),
    totalMemGB: parseFloat((totalMem / (1024 ** 3)).toFixed(2)),
    usedMemGB: parseFloat((usedMem / (1024 ** 3)).toFixed(2)),
    freeMemGB: parseFloat((freeMem / (1024 ** 3)).toFixed(2)),
    cores: currentCpuTimes.cores,
    tickDeltaMs: actualDelta,
    sustainedCpuSeconds: parseFloat((sustainedCpuTicks * (CONFIG.intervalMs / 1000)).toFixed(1)),
    alertType,
    peakCpu: parseFloat(peakCpu.toFixed(1)),
    peakRam: parseFloat(peakRam.toFixed(1))
  };

  // Enviar métricas al hilo principal
  if (parentPort) {
    parentPort.postMessage({ type: 'metrics', data: metrics });

    if (watchdogTriggered && !isGameOver) {
      isGameOver = true;
      parentPort.postMessage({
        type: 'game_over',
        data: {
          reason: gameOverReason,
          metrics
        }
      });
    }
  }
}

function start() {
  if (timer) return;
  isGameOver = false;
  sustainedCpuTicks = 0;
  consecutiveLagTicks = 0;
  previousCpuTimes = getAverageCpuTimes();
  lastTickTime = performance.now();
  timer = setInterval(tick, CONFIG.intervalMs);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function reset() {
  stop();
  isGameOver = false;
  sustainedCpuTicks = 0;
  consecutiveLagTicks = 0;
  peakCpu = 0;
  peakRam = 0;
  start();
}

// Escuchar comandos del proceso Electron principal
if (parentPort) {
  parentPort.on('message', (msg) => {
    if (msg.action === 'start') {
      start();
    } else if (msg.action === 'stop') {
      stop();
    } else if (msg.action === 'reset') {
      reset();
    }
  });

  // Arrancar automáticamente al inicializar el worker
  start();
}
