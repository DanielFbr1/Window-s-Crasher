// Motor de renderizado visual interactivo de procesos, pestañas y multiplicadores - v1.5.0
class SystemChaosVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.animationId = null;

    // Estado del sistema
    this.windows = [];
    this.particles = [];
    this.dataStreams = [];
    this.isCpuActive = false;
    this.isRamActive = false;
    this.isGpuActive = false;
    this.ramPercent = 0;
    this.cpuPercent = 0;
    this.shakeIntensity = 0;

    this.tabTitles = [
      'chrome.exe - Tab #',
      'electron_core.node - #',
      'mem_buffer_chunk - #',
      'crypto_worker.js - #',
      'webgl_shader_proc - #'
    ];

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.start();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    if (this.ctx) {
      this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
  }

  spawnTabs(count = 1) {
    const w = this.width || 300;
    const h = this.height || 180;
    const toSpawn = Math.min(count, 8); // Límite por ráfaga para elegancia

    for (let i = 0; i < toSpawn; i++) {
      const winW = 110 + Math.random() * 40;
      const winH = 65 + Math.random() * 25;
      const winX = 10 + Math.random() * Math.max(20, w - winW - 20);
      const winY = -winH - Math.random() * 30;
      const targetY = 15 + Math.random() * Math.max(20, h - winH - 25);

      const titleIdx = Math.floor(Math.random() * this.tabTitles.length);
      const id = Math.floor(Math.random() * 9000) + 1000;

      this.windows.push({
        x: winX,
        y: winY,
        targetY: targetY,
        w: winW,
        h: winH,
        vy: 4 + Math.random() * 3,
        title: `${this.tabTitles[titleIdx]}${id}`,
        rot: (Math.random() - 0.5) * 0.08,
        glowColor: Math.random() > 0.5 ? '#00f0ff' : '#00ff88',
        settled: false,
        age: 0
      });
    }

    // Mantener un máximo de 28 ventanas en el canvas para rendimiento limpio
    if (this.windows.length > 28) {
      this.windows.splice(0, this.windows.length - 28);
    }
  }

  setMultiplierStates(cpu, ram, gpu) {
    this.isCpuActive = !!cpu;
    this.isRamActive = !!ram;
    this.isGpuActive = !!gpu;
  }

  setMetrics(metrics) {
    if (!metrics) return;
    this.ramPercent = metrics.ramPercent || 0;
    this.cpuPercent = metrics.cpuPercent || 0;

    // Intensidad de temblor en zona de peligro
    if (this.ramPercent >= 88 || this.cpuPercent >= 95) {
      this.shakeIntensity = Math.min(6, (this.ramPercent - 85) * 0.8);
    } else {
      this.shakeIntensity = 0;
    }
  }

  clear() {
    this.windows = [];
    this.particles = [];
    this.dataStreams = [];
    this.shakeIntensity = 0;
  }

  start() {
    if (this.animationId) return;
    const loop = () => {
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  render() {
    if (!this.ctx || !this.width || !this.height) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();

    // Efecto de temblor de pantalla (Screen Shake) en zona crítica
    if (this.shakeIntensity > 0) {
      const dx = (Math.random() - 0.5) * this.shakeIntensity;
      const dy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(dx, dy);
    }

    // Fondo oscuro con rejilla sutil de procesos
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);

    // Líneas de cuadrícula cibernética de fondo
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 1. EFECTO CPU MELTER: Chispas y ondas de calor
    if (this.isCpuActive) {
      if (Math.random() < 0.4) {
        this.particles.push({
          x: Math.random() * w,
          y: h + 5,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -2 - Math.random() * 3,
          size: 1.5 + Math.random() * 2,
          color: Math.random() > 0.4 ? '#ff5500' : '#00f0ff',
          life: 1.0
        });
      }
    }

    // 2. EFECTO RAM EATER: Cascada de bytes y bloques de memoria
    if (this.isRamActive) {
      if (Math.random() < 0.35) {
        this.dataStreams.push({
          x: Math.random() * (w - 60),
          y: -10,
          vy: 2.5 + Math.random() * 2,
          text: `0x${Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase()}`,
          life: 1.0
        });
      }
    }

    // 3. EFECTO GPU BURNER: Vórtice de luz púrpura
    if (this.isGpuActive) {
      const gradient = ctx.createRadialGradient(w / 2, h / 2, 5, w / 2, h / 2, w * 0.6);
      gradient.addColorStop(0, 'rgba(192, 132, 252, 0.12)');
      gradient.addColorStop(1, 'rgba(192, 132, 252, 0.0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

    // Dibujar data streams de RAM Eater
    ctx.font = '9px monospace';
    for (let i = this.dataStreams.length - 1; i >= 0; i--) {
      const d = this.dataStreams[i];
      d.y += d.vy;
      d.life -= 0.012;
      ctx.fillStyle = `rgba(0, 255, 136, ${Math.max(0, d.life * 0.75)})`;
      ctx.fillText(d.text, d.x, d.y);
      if (d.life <= 0 || d.y > h + 15) {
        this.dataStreams.splice(i, 1);
      }
    }

    // Dibujar y animar Ventanas Virtuales
    for (let i = 0; i < this.windows.length; i++) {
      const win = this.windows[i];

      // Física de caída y asentamiento
      if (!win.settled) {
        win.y += win.vy;
        if (win.y >= win.targetY) {
          win.y = win.targetY;
          win.settled = true;
        }
      } else {
        // Micro vibración según carga
        win.age += 0.05;
        win.y = win.targetY + Math.sin(win.age) * 0.8;
      }

      ctx.save();
      ctx.translate(win.x + win.w / 2, win.y + win.h / 2);
      ctx.rotate(win.rot);

      // Cuerpo de la ventana virtual
      const halfW = win.w / 2;
      const halfH = win.h / 2;

      ctx.fillStyle = 'rgba(11, 16, 26, 0.92)';
      ctx.strokeStyle = win.glowColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-halfW, -halfH, win.w, win.h, 4);
      ctx.fill();
      ctx.stroke();

      // Barra de título de la ventana
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.roundRect(-halfW, -halfH, win.w, 14, [4, 4, 0, 0]);
      ctx.fill();

      // Botones de control de ventana (estilo Mac/Windows)
      ctx.fillStyle = '#ff5555';
      ctx.beginPath();
      ctx.arc(-halfW + 6, -halfH + 7, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffbb00';
      ctx.beginPath();
      ctx.arc(-halfW + 13, -halfH + 7, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(-halfW + 20, -halfH + 7, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Texto de título
      ctx.fillStyle = '#94a3b8';
      ctx.font = '7.5px sans-serif';
      ctx.fillText(win.title, -halfW + 26, -halfH + 10);

      // Contenido interior de la ventana: líneas simuladas de código/datos
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(-halfW + 8, -halfH + 20, win.w - 16, 4);
      ctx.fillRect(-halfW + 8, -halfH + 27, win.w - 30, 4);
      ctx.fillRect(-halfW + 8, -halfH + 34, win.w - 20, 4);

      // Mini gráfico interno
      ctx.strokeStyle = win.glowColor;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-halfW + 8, halfH - 8);
      ctx.lineTo(-halfW + 24, halfH - 14);
      ctx.lineTo(-halfW + 40, halfH - 10);
      ctx.lineTo(halfW - 8, halfH - 16);
      ctx.stroke();

      ctx.restore();
    }

    // Dibujar partículas de CPU Melter
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;

      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Alerta de barrido láser en zona crítica
    if (this.shakeIntensity > 0) {
      const scanY = (Date.now() * 0.25) % h;
      ctx.strokeStyle = 'rgba(255, 0, 68, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(w, scanY);
      ctx.stroke();
    }

    ctx.restore();
  }
}

window.SystemChaosVisualizer = SystemChaosVisualizer;
