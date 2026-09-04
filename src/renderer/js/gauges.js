// Módulo de renderizado de agujas SVG y gráfica de telemetría en tiempo real
class HardwareVisualizer {
  constructor(options = {}) {
    this.historyLength = 60; // 60 puntos (15 segundos a 250ms)
    this.cpuHistory = new Array(this.historyLength).fill(0);
    this.ramHistory = new Array(this.historyLength).fill(0);

    this.chartCanvas = document.getElementById('history-canvas');
    this.chartCtx = this.chartCanvas ? this.chartCanvas.getContext('2d') : null;

    // Elementos de agujas SVG
    this.cpuDial = document.getElementById('cpu-gauge-needle');
    this.ramDial = document.getElementById('ram-gauge-needle');
    this.cpuValueText = document.getElementById('cpu-value-display');
    this.ramValueText = document.getElementById('ram-value-display');
    this.cpuProgressBar = document.getElementById('cpu-progress-fill');
    this.ramProgressBar = document.getElementById('ram-progress-fill');

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.chartCanvas) return;
    const rect = this.chartCanvas.getBoundingClientRect();
    this.chartCanvas.width = rect.width * window.devicePixelRatio;
    this.chartCanvas.height = rect.height * window.devicePixelRatio;
    if (this.chartCtx) {
      this.chartCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
  }

  getColorForPercent(pct, isRam = false) {
    if (isRam) {
      if (pct >= 92) return '#ff0044'; // Zona crítica Watchdog
      if (pct >= 80) return '#ff5500';
      if (pct >= 60) return '#ffb700';
      return '#00ff88';
    } else {
      if (pct >= 98) return '#ff0044'; // Zona crítica Watchdog
      if (pct >= 85) return '#ff5500';
      if (pct >= 60) return '#ffb700';
      return '#00f0ff';
    }
  }

  updateMetrics(metrics) {
    const { cpuPercent, ramPercent } = metrics;

    // Actualizar historial
    this.cpuHistory.push(cpuPercent);
    this.cpuHistory.shift();
    this.ramHistory.push(ramPercent);
    this.ramHistory.shift();

    // Actualizar textos
    if (this.cpuValueText) {
      this.cpuValueText.textContent = `${cpuPercent.toFixed(1)}%`;
      this.cpuValueText.style.color = this.getColorForPercent(cpuPercent, false);
    }
    if (this.ramValueText) {
      this.ramValueText.textContent = `${ramPercent.toFixed(1)}%`;
      this.ramValueText.style.color = this.getColorForPercent(ramPercent, true);
    }

    // Actualizar barras de progreso aceleradas por GPU (scaleX)
    if (this.cpuProgressBar) {
      const scaleCpu = Math.min(1, Math.max(0, cpuPercent / 100));
      this.cpuProgressBar.style.transform = `scaleX(${scaleCpu})`;
      this.cpuProgressBar.style.backgroundColor = this.getColorForPercent(cpuPercent, false);
    }
    if (this.ramProgressBar) {
      const scaleRam = Math.min(1, Math.max(0, ramPercent / 100));
      this.ramProgressBar.style.transform = `scaleX(${scaleRam})`;
      this.ramProgressBar.style.backgroundColor = this.getColorForPercent(ramPercent, true);
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

    // Renderizar gráfico
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

    // Línea de peligro del Watchdog (RAM 92% en rojo punteado)
    const yWatchdogRam = h - (92 / 100) * h;
    ctx.strokeStyle = 'rgba(255, 0, 68, 0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, yWatchdogRam);
    ctx.lineTo(w, yWatchdogRam);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dibujar serie de CPU
    this.drawLineSeries(ctx, this.cpuHistory, '#00f0ff', w, h);

    // Dibujar serie de RAM
    this.drawLineSeries(ctx, this.ramHistory, '#00ff88', w, h);
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
