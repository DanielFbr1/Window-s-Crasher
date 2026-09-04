// Módulo de renderizado de agujas SVG y gráfica de telemetría en tiempo real - v2.5.0 (CPU, RAM y GPU)
class HardwareVisualizer {
  constructor(options = {}) {
    this.historyLength = 60; // 60 puntos (15 segundos a 250ms)
    this.cpuHistory = new Array(this.historyLength).fill(0);
    this.ramHistory = new Array(this.historyLength).fill(0);
    this.gpuHistory = new Array(this.historyLength).fill(0);

    this.chartCanvas = document.getElementById('history-canvas');
    this.chartCtx = this.chartCanvas ? this.chartCanvas.getContext('2d') : null;

    // Elementos de agujas SVG (CPU, RAM y GPU)
    this.cpuDial = document.getElementById('cpu-gauge-needle');
    this.ramDial = document.getElementById('ram-gauge-needle');
    this.gpuDial = document.getElementById('gpu-gauge-needle');

    this.cpuValueText = document.getElementById('cpu-value-display');
    this.ramValueText = document.getElementById('ram-value-display');
    this.gpuValueText = document.getElementById('gpu-value-display');

    this.cpuProgressBar = document.getElementById('cpu-progress-fill');
    this.ramProgressBar = document.getElementById('ram-progress-fill');
    this.gpuProgressBar = document.getElementById('gpu-progress-fill');

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.chartCanvas) return;
    const rect = this.chartCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.chartCanvas.width = rect.width * (window.devicePixelRatio || 1);
    this.chartCanvas.height = rect.height * (window.devicePixelRatio || 1);
    if (this.chartCtx) {
      this.chartCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
  }

  getColorForPercent(pct, type = 'cpu') {
    if (type === 'ram') {
      if (pct >= 90) return '#ff0044'; // Zona crítica Watchdog RAM 90%
      if (pct >= 78) return '#ff5500';
      if (pct >= 58) return '#ffb700';
      return '#00ff88';
    } else if (type === 'gpu') {
      if (pct >= 90) return '#ff0044'; // Zona crítica Watchdog GPU 90%
      if (pct >= 75) return '#c084fc';
      if (pct >= 40) return '#a855f7';
      return '#38bdf8';
    } else {
      if (pct >= 95) return '#ff0044'; // Zona crítica Watchdog CPU 95%
      if (pct >= 82) return '#ff5500';
      if (pct >= 58) return '#ffb700';
      return '#00f0ff';
    }
  }

  updateMetrics(metrics) {
    const { cpuPercent = 0, ramPercent = 0, gpuPercent = 0 } = metrics;

    // Actualizar historiales (60 muestras a 250ms = 15 segundos)
    this.cpuHistory.push(cpuPercent);
    this.cpuHistory.shift();

    this.ramHistory.push(ramPercent);
    this.ramHistory.shift();

    this.gpuHistory.push(gpuPercent);
    this.gpuHistory.shift();

    // Actualizar textos de valores
    if (this.cpuValueText) {
      this.cpuValueText.textContent = `${cpuPercent.toFixed(1)}%`;
      this.cpuValueText.style.color = this.getColorForPercent(cpuPercent, 'cpu');
    }
    if (this.ramValueText) {
      this.ramValueText.textContent = `${ramPercent.toFixed(1)}%`;
      this.ramValueText.style.color = this.getColorForPercent(ramPercent, 'ram');
    }
    if (this.gpuValueText) {
      this.gpuValueText.textContent = `${gpuPercent.toFixed(1)}%`;
      this.gpuValueText.style.color = this.getColorForPercent(gpuPercent, 'gpu');
    }

    // Actualizar barras de progreso aceleradas por GPU (scaleX)
    if (this.cpuProgressBar) {
      const scaleCpu = Math.min(1, Math.max(0, cpuPercent / 100));
      this.cpuProgressBar.style.transform = `scaleX(${scaleCpu})`;
      this.cpuProgressBar.style.backgroundColor = this.getColorForPercent(cpuPercent, 'cpu');
    }
    if (this.ramProgressBar) {
      const scaleRam = Math.min(1, Math.max(0, ramPercent / 100));
      this.ramProgressBar.style.transform = `scaleX(${scaleRam})`;
      this.ramProgressBar.style.backgroundColor = this.getColorForPercent(ramPercent, 'ram');
    }
    if (this.gpuProgressBar) {
      const scaleGpu = Math.min(1, Math.max(0, gpuPercent / 100));
      this.gpuProgressBar.style.transform = `scaleX(${scaleGpu})`;
      this.gpuProgressBar.style.backgroundColor = this.getColorForPercent(gpuPercent, 'gpu');
    }

    // Actualizar rotación de agujas analógicas (-90deg a +90deg)
    if (this.cpuDial) {
      const cpuAngle = -90 + (cpuPercent / 100) * 180;
      this.cpuDial.style.transform = `rotate(${cpuAngle}deg)`;
    }
    if (this.ramDial) {
      const ramAngle = -90 + (ramPercent / 100) * 180;
      this.ramDial.style.transform = `rotate(${ramAngle}deg)`;
    }
    if (this.gpuDial) {
      const gpuAngle = -90 + (gpuPercent / 100) * 180;
      this.gpuDial.style.transform = `rotate(${gpuAngle}deg)`;
    }

    // Renderizar gráfico del osciloscopio
    this.drawChart();
  }

  drawChart() {
    if (!this.chartCtx || !this.chartCanvas) return;
    const ctx = this.chartCtx;
    const rect = this.chartCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // Líneas de cuadrícula de fondo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= 100; y += 25) {
      const yPos = h - (y / 100) * h;
      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(w, yPos);
      ctx.stroke();
    }

    // Línea de peligro del Watchdog (RAM / GPU 90% en rojo punteado)
    const yWatchdogRam = h - (90 / 100) * h;
    ctx.strokeStyle = 'rgba(255, 0, 68, 0.55)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, yWatchdogRam);
    ctx.lineTo(w, yWatchdogRam);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dibujar serie de CPU (Cian)
    this.drawLineSeries(ctx, this.cpuHistory, '#00f0ff', w, h);

    // Dibujar serie de RAM (Verde)
    this.drawLineSeries(ctx, this.ramHistory, '#00ff88', w, h);

    // Dibujar serie de GPU (Púrpura Neón)
    this.drawLineSeries(ctx, this.gpuHistory, '#c084fc', w, h);
  }

  drawLineSeries(ctx, data, color, w, h) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = w / (data.length - 1);
    data.forEach((val, i) => {
      const x = i * step;
      const y = h - (val / 100) * h;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }
}

window.HardwareVisualizer = HardwareVisualizer;
