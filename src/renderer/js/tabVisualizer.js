// Motor de renderizado visual interactivo de procesos, pestañas y multiplicadores - Windows Crasher v1.7.0
class SystemChaosVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.animationId = null;

    // Estado del sistema
    this.windows = [];
    this.particles = [];
    this.dataStreams = [];
    this.lightningBolts = [];
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
      'webgl_shader_proc - #',
      'kernel_alloc_ptr - #',
      'heap_overflow.bin - #'
    ];

    this.hexVocabulary = [
      '0xDEAD', '0xBEEF', '0x80F4', '0x7FFF', '0xCAFE', '0x00FF',
      'PAGE_FLT', '0xA49C', '0x9200', 'STACK_OVR', 'MEM_LEAK', '0x0042',
      'SEG_FAULT', '0xFF00', 'HEAP_PTR', '0x3E1B', 'VIRT_ALLOC'
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
    if (!this.canvas) return;
    const w = this.width;
    const h = this.height;
    const toSpawn = Math.min(count, 12);

    for (let i = 0; i < toSpawn; i++) {
      const winW = 105 + Math.random() * 45;
      const winH = 60 + Math.random() * 25;
      const winX = 10 + Math.random() * Math.max(20, w - winW - 20);
      const winY = -winH - Math.random() * 40;
      const targetY = 15 + Math.random() * Math.max(20, h - winH - 35);

      const titleIdx = Math.floor(Math.random() * this.tabTitles.length);
      const id = Math.floor(Math.random() * 9000) + 1000;

      this.windows.push({
        x: winX,
        y: winY,
        targetY: targetY,
        w: winW,
        h: winH,
        vy: 4.5 + Math.random() * 3.5,
        title: `${this.tabTitles[titleIdx]}${id}`,
        rot: (Math.random() - 0.5) * 0.08,
        glowColor: Math.random() > 0.5 ? '#00f0ff' : '#00ff88',
        settled: false,
        age: 0
      });
    }

    // Mantener un máximo de 30 ventanas para máximo impacto visual y fluidez
    if (this.windows.length > 30) {
      this.windows.splice(0, this.windows.length - 30);
    }
  }

  removeTabs(count = 1) {
    const actual = Math.min(count, this.windows.length);
    for (let i = 0; i < actual; i++) {
      const removed = this.windows.pop();
      const originX = (removed.x || 50) + (removed.w || 100) / 2;
      const originY = (removed.y || 50) + (removed.h || 60) / 2;

      // Disparar ráfaga radial de partículas de desintegración
      const particleCount = count >= 10 ? 10 : 6;
      for (let p = 0; p < particleCount; p++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        this.particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 2.5,
          color: count >= 10 ? (Math.random() > 0.4 ? '#ff0044' : '#ffb700') : '#ffb700',
          life: 1.0,
          decay: 0.045
        });
      }
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

    // Intensidad de temblor dinámico en zona de peligro
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
    this.lightningBolts = [];
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
    const now = Date.now();

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
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.035)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // =========================================================================
    // 1. ANIMACIÓN AVANZADA: GPU MELTER / BURNER (Vórtice, Rayos y Malla Térmica)
    // =========================================================================
    if (this.isGpuActive) {
      const cx = w / 2;
      const cy = (h / 2) - 10;
      const angleRot = now * 0.0025;

      // Resplandor radial de alta energía de fondo
      const radGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.55);
      radGlow.addColorStop(0, 'rgba(192, 132, 252, 0.18)');
      radGlow.addColorStop(0.5, 'rgba(217, 70, 239, 0.08)');
      radGlow.addColorStop(1, 'rgba(192, 132, 252, 0)');
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 0, w, h);

      // Malla 3D de perspectiva alámbrica que vibra con calor en la base del núcleo
      ctx.save();
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.15)';
      ctx.lineWidth = 1;
      const vpY = cy + 15;
      for (let x = 10; x < w; x += 28) {
        const offsetHeat = Math.sin(now * 0.006 + x * 0.05) * 4;
        ctx.beginPath();
        ctx.moveTo(x, h - 22);
        ctx.lineTo(cx + (x - cx) * 0.25, vpY + offsetHeat);
        ctx.stroke();
      }
      ctx.restore();

      // Vórtice de arcos elípticos de plasma giratorios concéntricos
      ctx.save();
      ctx.translate(cx, cy);

      // Anillo exterior púrpura
      ctx.rotate(angleRot);
      ctx.strokeStyle = 'rgba(217, 70, 239, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 80, 36, 0, 0, Math.PI * 1.6);
      ctx.stroke();

      // Anillo medio violeta en contrarrotación
      ctx.rotate(-angleRot * 2.2);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 56, 26, 0.5, 0, Math.PI * 1.7);
      ctx.stroke();

      // Anillo interior cian de sobretensión
      ctx.rotate(angleRot * 1.5);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 32, 16, -0.4, 0, Math.PI * 1.8);
      ctx.stroke();

      // Núcleo brillante
      const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      coreGrad.addColorStop(0.4, 'rgba(192, 132, 252, 0.6)');
      coreGrad.addColorStop(1, 'rgba(192, 132, 252, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Rayos de plasma aleatorios (Electric Arcs)
      if (Math.random() < 0.22) {
        const startX = cx + (Math.random() - 0.5) * 60;
        const startY = cy + (Math.random() - 0.5) * 30;
        const targetX = Math.random() * w;
        const targetY = Math.random() * (h - 30);
        
        ctx.save();
        ctx.strokeStyle = Math.random() > 0.5 ? '#f472b6' : '#38bdf8';
        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        const midX = (startX + targetX) / 2 + (Math.random() - 0.5) * 35;
        const midY = (startY + targetY) / 2 + (Math.random() - 0.5) * 35;
        ctx.lineTo(midX, midY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        ctx.restore();
      }

      // Emisión de chispas cuánticas de la GPU
      if (Math.random() < 0.45) {
        const pAngle = Math.random() * Math.PI * 2;
        const pSpeed = 2 + Math.random() * 4;
        this.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          size: 1.5 + Math.random() * 2,
          color: Math.random() > 0.4 ? '#c084fc' : '#e879f9',
          life: 1.0,
          decay: 0.035
        });
      }
    }

    // =========================================================================
    // 2. ANIMACIÓN AVANZADA: RAM EATER (Streams Hexadecimales y Buffer Bar)
    // =========================================================================
    if (this.isRamActive) {
      // Líneas de bus de transferencia de memoria que cruzan el fondo
      if (Math.random() < 0.18) {
        const busY = 20 + Math.random() * (h - 50);
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, busY);
        ctx.lineTo(w, busY);
        ctx.stroke();
      }

      // Generar nuevos paquetes de datos hexadecimales
      if (Math.random() < 0.48) {
        const wordIdx = Math.floor(Math.random() * this.hexVocabulary.length);
        this.dataStreams.push({
          x: 12 + Math.random() * (w - 75),
          y: -10,
          vy: 2.8 + Math.random() * 3.2,
          text: this.hexVocabulary[wordIdx],
          life: 1.0,
          isGlitch: Math.random() < 0.25,
          color: Math.random() > 0.3 ? '#00ff88' : '#00e5ff'
        });
      }
    }

    // Dibujar y animar streams de memoria RAM
    ctx.font = '700 9px monospace';
    for (let i = this.dataStreams.length - 1; i >= 0; i--) {
      const d = this.dataStreams[i];
      d.y += d.vy;
      d.life -= 0.014;

      ctx.save();
      ctx.fillStyle = d.color;
      ctx.globalAlpha = Math.max(0, d.life * 0.85);

      if (d.isGlitch && d.life > 0.4) {
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 4;
      }

      ctx.fillText(d.text, d.x, d.y);
      ctx.restore();

      if (d.life <= 0 || d.y > h - 18) {
        this.dataStreams.splice(i, 1);
      }
    }

    // Visualizador Físico de Bloques de Memoria (RAM Buffer DIMM) en la base
    const barY = h - 14;
    const barH = 7;
    const blockCount = 28;
    const blockGap = 3;
    const totalGap = (blockCount - 1) * blockGap;
    const blockW = Math.max(4, (w - 24 - totalGap) / blockCount);
    const activeBlocks = Math.round((this.ramPercent / 100) * blockCount);

    ctx.save();
    for (let b = 0; b < blockCount; b++) {
      const bx = 12 + b * (blockW + blockGap);
      const isOccupied = b < activeBlocks;

      if (isOccupied) {
        if (this.ramPercent >= 88) {
          // Zona crítica: parpadeo rojo carmesí
          ctx.fillStyle = Math.sin(now * 0.015 + b) > 0 ? '#ff0044' : '#ff4400';
          ctx.shadowColor = '#ff0044';
          ctx.shadowBlur = 5;
        } else if (this.ramPercent >= 75) {
          // Zona caliente: ámbar
          ctx.fillStyle = '#ffb700';
          ctx.shadowColor = '#ffb700';
          ctx.shadowBlur = 3;
        } else {
          // Zona normal: verde neón
          ctx.fillStyle = '#00ff88';
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
      } else {
        // Bloque libre
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.shadowBlur = 0;
      }

      ctx.fillRect(bx, barY, blockW, barH);
    }
    ctx.restore();

    // =========================================================================
    // 3. ANIMACIÓN CPU MELTER (Chispas térmicas y ondas de calor ascendentes)
    // =========================================================================
    if (this.isCpuActive) {
      if (Math.random() < 0.4) {
        this.particles.push({
          x: Math.random() * w,
          y: h - 18,
          vx: (Math.random() - 0.5) * 1.8,
          vy: -2.5 - Math.random() * 3.5,
          size: 1.5 + Math.random() * 2,
          color: Math.random() > 0.4 ? '#ff5500' : '#00f0ff',
          life: 1.0,
          decay: 0.02
        });
      }
    }

    // =========================================================================
    // 4. DIBUJAR VENTANAS VIRTUALES (Cascada y apilamiento interactivo)
    // =========================================================================
    for (let i = 0; i < this.windows.length; i++) {
      const win = this.windows[i];

      // Física de caída y amortiguación
      if (!win.settled) {
        win.y += win.vy;
        if (win.y >= win.targetY) {
          win.y = win.targetY;
          win.settled = true;
        }
      } else {
        // Micro vibración según carga de hardware
        win.age += 0.05;
        win.y = win.targetY + Math.sin(win.age) * 0.7;
      }

      ctx.save();
      ctx.translate(win.x + win.w / 2, win.y + win.h / 2);
      ctx.rotate(win.rot);

      const halfW = win.w / 2;
      const halfH = win.h / 2;

      // Cuerpo de la ventana virtual
      ctx.fillStyle = 'rgba(10, 15, 24, 0.94)';
      ctx.strokeStyle = win.glowColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-halfW, -halfH, win.w, win.h, 4);
      ctx.fill();
      ctx.stroke();

      // Barra de título de la ventana
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.roundRect(-halfW, -halfH, win.w, 14, [4, 4, 0, 0]);
      ctx.fill();

      // Botones de control de ventana
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

      // Título de proceso
      ctx.fillStyle = '#94a3b8';
      ctx.font = '7.5px sans-serif';
      ctx.fillText(win.title, -halfW + 26, -halfH + 10);

      // Contenido interior: líneas simuladas de datos
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(-halfW + 8, -halfH + 20, win.w - 16, 4);
      ctx.fillRect(-halfW + 8, -halfH + 27, win.w - 30, 4);
      ctx.fillRect(-halfW + 8, -halfH + 34, win.w - 20, 4);

      // Mini oscilograma dentro de la ventana
      ctx.strokeStyle = win.glowColor;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-halfW + 8, halfH - 8);
      ctx.lineTo(-halfW + 22, halfH - 14);
      ctx.lineTo(-halfW + 36, halfH - 9);
      ctx.lineTo(halfW - 8, halfH - 15);
      ctx.stroke();

      ctx.restore();
    }

    // =========================================================================
    // 5. RENDERIZADO DE PARTÍCULAS GLOBALES
    // =========================================================================
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= (p.decay || 0.02);

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

    // Alerta de barrido láser horizontal en zona crítica
    if (this.shakeIntensity > 0) {
      const scanY = (now * 0.25) % (h - 20);
      ctx.strokeStyle = 'rgba(255, 0, 68, 0.65)';
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
