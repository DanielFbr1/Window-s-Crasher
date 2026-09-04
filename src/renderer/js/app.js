// Controlador principal del juego y lógica de benchmarking - Windows Crasher v1.7.0
class WindowsCrasherApp {
  constructor() {
    this.appVersion = 'v1.7.0';
    this.score = 0;
    this.tabsCount = 0;
    this.peakTabs = 0;
    this.baseMultiplier = 1.0;
    this.currentRiskMultiplier = 1.0;
    this.streakMultiplier = 1.0;
    this.razorEdgeMultiplier = 1.0;  // Multiplicador de habilidad al surfear el límite del 92%
    this.riskZoneName = '';
    this.gameStartTime = Date.now();
    this.isGameOver = false;

    // Sistema de puntuación EXCLUSIVA POR CLICS (v1.7.0)
    // Los puntos NUNCA suben automáticamente en un bucle temporal; requieren clics activos
    this.currentClickValue = 10;
    this.totalClicks = 0;
    this.peakClickValue = 10;
    this.recentClicksTimestamps = [];
    this.peakCps = 0;
    this.currentCps = 0;

    // Componentes del dispositivo detectados para pantalla de Game Over y diagnóstico
    this.systemSpecs = {
      cpuModel: 'Detectando procesador...',
      cpuCores: navigator.hardwareConcurrency || 4,
      cpuSpeedMHz: 0,
      totalRamGB: '16.0',
      gpuRenderer: 'Detectando acelerador gráfico...',
      platform: 'Windows_NT x64',
      release: '10.0'
    };

    // Métricas de estrés continuo y racha (Anti-AFK)
    this.currentFlowRate = 0;
    this.peakFlowRate = 0;
    this.highStressSeconds = 0;      // Tiempo total en estrés elevado (>75%)
    this.stressStreakSeconds = 0;     // Racha continua en zona de peligro (>80%)
    this.totalStressSeconds = 0;      // Supervivencia efectiva bajo estrés activo

    // Persistencia y récords (localStorage)
    this.highScore = parseInt(localStorage.getItem('wc_high_score') || '0', 10);
    this.maxTabs = parseInt(localStorage.getItem('wc_max_tabs') || '0', 10);
    this.longestSurvival = parseInt(localStorage.getItem('wc_longest_time') || '0', 10);
    this.totalCrashes = parseInt(localStorage.getItem('wc_total_crashes') || '0', 10);

    // Sistema de Hitos de Sobrecarga (Desbloqueo automático por estrés, sin gastar puntos)
    this.milestones = {
      ramOpt: false,       // 12 pestañas vivas -> pestañas a 48MB
      freqBoost: false,    // >75% carga por 15s -> +50% pts/s
      cryoCooling: false   // 2+ multiplicadores activos simultáneos -> +0.5x multiplicador
    };
    this.scoreFreqMultiplier = 1.0;
    this.mbPerTab = 64;

    // Métricas del hardware actuales
    this.currentMetrics = {
      cpuPercent: 0,
      ramPercent: 0,
      totalMemGB: 0,
      usedMemGB: 0,
      freeMemGB: 0,
      cores: navigator.hardwareConcurrency || 4,
      tickDeltaMs: 250,
      peakCpu: 0,
      peakRam: 0
    };

    // Módulos
    this.visualizer = null;
    this.tabVisualizer = null;
    this.ramEater = new window.RamEater();
    this.gpuBurner = null;
    this.soundFx = new window.SoundFxManager();

    // Gestión de CPU Workers
    this.cpuWorkers = [];
    this.isCpuMelterActive = false;
    this.isRamEaterActive = false;
    this.ramEaterInterval = null;

    // Control de advertencias acústicas
    this.lastWarningTime = 0;

    // Datos del último crash para reporte forense
    this.lastCrashReport = null;

    this.init();
  }

  init() {
    console.log(`[WindowsCrasher] Iniciando versión ${this.appVersion}`);

    // Mostrar récord guardado
    this.updateHighScoreDisplay();

    // Inicializar visualizador de agujas y osciloscopio (ahora en columna derecha)
    this.visualizer = new window.HardwareVisualizer();

    // Inicializar visualizador de animación de ventanas y caos en tiempo real
    const chaosCanvas = document.getElementById('chaos-canvas');
    if (chaosCanvas && window.SystemChaosVisualizer) {
      this.tabVisualizer = new window.SystemChaosVisualizer(chaosCanvas);
    }

    // Inicializar módulo GPU (ejecución offscreen que estresa la GPU sin requerir canvas en DOM)
    if (window.GpuBurner) {
      this.gpuBurner = new window.GpuBurner();
    }

    // Configurar escuchadores de eventos del DOM
    this.setupUIEvents();

    // Configurar atajos de teclado
    this.setupKeyboardShortcuts();

    // Detectar especificaciones del dispositivo
    this.detectHardwareSpecs();

    // Conectar eventos IPC de Electron
    this.setupIPC();

    // Iniciar bucle de actualización de puntuación y tiempo
    this.startScoreLoop();
  }

  detectHardwareSpecs() {
    // 1. Obtener specs del SO desde preload/Electron
    if (window.electronAPI && typeof window.electronAPI.getSystemSpecs === 'function') {
      try {
        const specs = window.electronAPI.getSystemSpecs();
        if (specs) {
          this.systemSpecs.cpuModel = specs.cpuModel || this.systemSpecs.cpuModel;
          this.systemSpecs.cpuCores = specs.cpuCores || this.systemSpecs.cpuCores;
          this.systemSpecs.cpuSpeedMHz = specs.cpuSpeedMHz || 0;
          this.systemSpecs.totalRamGB = specs.totalRamGB || this.systemSpecs.totalRamGB;
          this.systemSpecs.platform = specs.platform || this.systemSpecs.platform;
          this.systemSpecs.release = specs.release || this.systemSpecs.release;
        }
      } catch (err) {
        console.warn('[HardwareSpecs] Error al obtener specs del sistema:', err);
      }
    }

    // 2. Obtener acelerador gráfico / GPU mediante WebGL unmasked renderer
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const unmasked = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          if (unmasked) {
            this.systemSpecs.gpuRenderer = unmasked;
          }
        }
        if (!this.systemSpecs.gpuRenderer || this.systemSpecs.gpuRenderer.startsWith('Detectando')) {
          this.systemSpecs.gpuRenderer = gl.getParameter(gl.RENDERER) || 'Acelerador Gráfico WebGL';
        }
      }
    } catch (e) {
      this.systemSpecs.gpuRenderer = 'GPU Estándar Compatible';
    }
  }

  updateHighScoreDisplay() {
    const el = document.getElementById('record-score-val');
    if (el) {
      el.textContent = this.highScore.toLocaleString();
    }
  }

  setupUIEvents() {
    // Botón +1 Pestaña
    const btnAddTab = document.getElementById('btn-add-tab');
    if (btnAddTab) {
      btnAddTab.addEventListener('click', (e) => {
        this.soundFx.playClick();
        this.addTabs(1, e);
      });
    }

    // Botón −1 Pestaña (Alivio táctico de emergencia)
    const btnRemoveTab = document.getElementById('btn-remove-tab');
    if (btnRemoveTab) {
      btnRemoveTab.addEventListener('click', (e) => {
        this.soundFx.playClick();
        this.removeTabs(1, e);
      });
    }

    // Botón +10 Pestañas
    const btnAdd10 = document.getElementById('btn-add-10-tabs');
    if (btnAdd10) {
      btnAdd10.addEventListener('click', (e) => {
        this.soundFx.playClick();
        this.addTabs(10, e);
      });
    }

    // Botón de Pulso de Overclock (+PTS directo sin alterar memoria)
    const btnPulse = document.getElementById('btn-overclock-pulse');
    if (btnPulse) {
      btnPulse.addEventListener('click', (e) => {
        this.performPulseClick(e);
      });
    }

    // Clic directo en el canvas de caos para cosechar puntos
    const chaosContainer = document.getElementById('chaos-canvas-container');
    if (chaosContainer) {
      chaosContainer.addEventListener('click', (e) => {
        this.performPulseClick(e);
      });
    }

    // Toggle Audio Mute
    const btnAudio = document.getElementById('btn-audio-toggle');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        const isMuted = this.soundFx.toggleMute();
        btnAudio.textContent = isMuted ? '🔇' : '🔊';
        btnAudio.title = isMuted ? 'Sonido silenciado (M para activar)' : 'Silenciar sonido (Atajo: M)';
      });
    }

    // Toggle CPU Melter (Compacto)
    const btnCpu = document.getElementById('btn-toggle-cpu');
    if (btnCpu) {
      btnCpu.addEventListener('click', () => this.toggleCpuMelter());
    }

    // Toggle RAM Eater (Compacto)
    const btnRam = document.getElementById('btn-toggle-ram');
    if (btnRam) {
      btnRam.addEventListener('click', () => this.toggleRamEater());
    }

    // Toggle GPU Burner (Compacto)
    const btnGpu = document.getElementById('btn-toggle-gpu');
    if (btnGpu) {
      btnGpu.addEventListener('click', () => this.toggleGpuBurner());
    }

    // Botón de Pánico
    const btnPanic = document.getElementById('btn-panic');
    if (btnPanic) {
      btnPanic.addEventListener('click', () => this.triggerPanic());
    }

    // Botón de Reinicio en Pantalla BSOD
    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        this.soundFx.playReset();
        this.restartGame();
      });
    }

    // Botón de Copiar Reporte en Pantalla BSOD
    const btnCopyReport = document.getElementById('btn-copy-report');
    if (btnCopyReport) {
      btnCopyReport.addEventListener('click', () => this.copyCrashReport());
    }

    // Hitos automáticos inicializados
    this.checkMilestones();
  }

  checkMilestones() {
    if (this.isGameOver) return;

    // Hito 1: Compresión de RAM (12 pestañas vivas simultáneas)
    if (!this.milestones.ramOpt && this.tabsCount >= 12) {
      this.milestones.ramOpt = true;
      this.mbPerTab = 48;
      const mbText = document.getElementById('mb-per-tab-text');
      if (mbText) mbText.textContent = '48';
      const elStatus = document.getElementById('status-ram-opt');
      const elCard = document.getElementById('milestone-ram-opt');
      if (elStatus) elStatus.textContent = 'DESBLOQUEADO (48MB)';
      if (elCard) elCard.classList.add('unlocked');
      this.soundFx.playUpgrade();
    }

    // Hito 2: Inyección de Frecuencia (>75% de carga por 15 segundos)
    if (!this.milestones.freqBoost && this.highStressSeconds >= 15) {
      this.milestones.freqBoost = true;
      this.scoreFreqMultiplier = 1.5;
      const elStatus = document.getElementById('status-freq-boost');
      const elCard = document.getElementById('milestone-freq-boost');
      if (elStatus) elStatus.textContent = 'DESBLOQUEADO (+50%)';
      if (elCard) elCard.classList.add('unlocked');
      this.soundFx.playUpgrade();
    }

    // Hito 3: Disipador Criogénico (2 o más multiplicadores activos)
    const activeMultCount = (this.isCpuMelterActive ? 1 : 0) +
                            (this.isRamEaterActive ? 1 : 0) +
                            (this.gpuBurner && this.gpuBurner.isActive ? 1 : 0);
    if (!this.milestones.cryoCooling && activeMultCount >= 2) {
      this.milestones.cryoCooling = true;
      const elStatus = document.getElementById('status-cryo-cooling');
      const elCard = document.getElementById('milestone-cryo-cooling');
      if (elStatus) elStatus.textContent = 'DESBLOQUEADO (+0.5x)';
      if (elCard) elCard.classList.add('unlocked');
      this.recalculateMultiplier();
      this.soundFx.playUpgrade();
    }
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.isGameOver) {
          this.soundFx.playReset();
          this.restartGame();
        } else {
          this.soundFx.playClick();
          this.addTabs(1);
        }
      } else if (e.code === 'Backspace' || e.key === '-') {
        e.preventDefault();
        if (!this.isGameOver) {
          this.soundFx.playClick();
          this.removeTabs(1);
        }
      } else if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
        if (!this.isGameOver) {
          this.performPulseClick(null);
        }
      } else if (e.key === '1') {
        this.toggleCpuMelter();
      } else if (e.key === '2') {
        this.toggleRamEater();
      } else if (e.key === '3') {
        this.toggleGpuBurner();
      } else if (e.key.toLowerCase() === 'm') {
        const btnAudio = document.getElementById('btn-audio-toggle');
        const isMuted = this.soundFx.toggleMute();
        if (btnAudio) {
          btnAudio.textContent = isMuted ? '🔇' : '🔊';
          btnAudio.title = isMuted ? 'Sonido silenciado (M para activar)' : 'Silenciar sonido (Atajo: M)';
        }
      } else if (e.key === 'Escape') {
        this.triggerPanic();
      } else if (e.key.toLowerCase() === 'r') {
        if (this.isGameOver) {
          this.soundFx.playReset();
          this.restartGame();
        }
      }
    });
  }

  performPulseClick(e) {
    if (this.isGameOver) return;
    this.soundFx.playClick();
    this.performClick(e, 'pulse', 1);

    // Disparar chispas de energía en el simulador
    if (this.tabVisualizer && typeof this.tabVisualizer.triggerPulse === 'function') {
      this.tabVisualizer.triggerPulse(e);
    }
  }

  performClick(e, source = 'general', count = 1) {
    if (this.isGameOver) return;

    const now = Date.now();
    for (let i = 0; i < count; i++) {
      this.recentClicksTimestamps.push(now);
    }
    this.totalClicks += count;

    // Multiplicador táctico por tipo de acción
    let multiplierSource = 1.0;
    if (source === 'add_tab') {
      multiplierSource = 1.25; // Bono por arriesgar memoria
    } else if (source === 'remove_tab') {
      multiplierSource = 1.0;  // Alivio táctico
    } else if (source === 'pulse') {
      multiplierSource = 1.15; // Pulso de overclock
    } else if (source === 'mult') {
      multiplierSource = 2.0;  // Sobrecarga extrema
    }

    const earnedPoints = Math.max(1, Math.round(this.currentClickValue * count * multiplierSource));
    this.score += earnedPoints;

    // Actualizar High Score si se supera en tiempo real
    if (Math.floor(this.score) > this.highScore) {
      this.highScore = Math.floor(this.score);
      localStorage.setItem('wc_high_score', this.highScore.toString());
      this.updateHighScoreDisplay();
    }

    // Efecto visual de números flotantes (+XXX)
    this.spawnFloatingClickNumber(e, earnedPoints, this.currentRiskMultiplier >= 2.5 || this.razorEdgeMultiplier >= 2.5);

    // Actualizar UI inmediata
    const scoreEl = document.getElementById('score-display');
    if (scoreEl) {
      scoreEl.textContent = Math.floor(this.score).toLocaleString();
    }

    const totalClicksEl = document.getElementById('total-clicks-display');
    if (totalClicksEl) {
      totalClicksEl.textContent = this.totalClicks.toLocaleString();
    }
  }

  spawnFloatingClickNumber(e, points, isCritical) {
    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;

    if (e && typeof e.clientX === 'number' && e.clientX > 0) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      const btn = document.getElementById('btn-overclock-pulse') || document.getElementById('btn-add-tab');
      if (btn) {
        const rect = btn.getBoundingClientRect();
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
      }
    }

    const offsetX = (Math.random() - 0.5) * 28;
    const offsetY = (Math.random() - 0.5) * 16;

    const floatEl = document.createElement('div');
    floatEl.className = `click-floating-number ${isCritical ? 'critical' : points >= 300 ? 'high' : ''}`;
    floatEl.textContent = `+${points.toLocaleString()}`;
    floatEl.style.left = `${clientX + offsetX}px`;
    floatEl.style.top = `${clientY + offsetY}px`;

    document.body.appendChild(floatEl);

    setTimeout(() => {
      if (floatEl && floatEl.parentNode) {
        floatEl.parentNode.removeChild(floatEl);
      }
    }, 650);
  }

  triggerPanic() {
    if (window.electronAPI && !this.isGameOver) {
      this.soundFx.playGameOver();
      window.electronAPI.triggerPanic();
    }
  }

  setupIPC() {
    if (!window.electronAPI) {
      console.warn('[App] electronAPI no detectado, funcionando en modo navegador de prueba');
      return;
    }

    // Escuchar telemetría cada 250ms desde el hilo backend
    window.electronAPI.onHardwareMetrics((metrics) => {
      this.currentMetrics = metrics;
      if (this.visualizer) {
        this.visualizer.updateMetrics(metrics);
      }
      if (this.tabVisualizer) {
        this.tabVisualizer.setMetrics(metrics);
      }
      this.updateTelemetryUI(metrics);

      // Reproducir sonido de advertencia si nos acercamos a la zona roja
      if (!this.isGameOver) {
        const now = Date.now();
        if ((metrics.ramPercent >= 88 || metrics.cpuPercent >= 95) && now - this.lastWarningTime > 2000) {
          this.lastWarningTime = now;
          this.soundFx.playWarning();
        }
      }
    });

    // Escuchar Game Over del Watchdog
    window.electronAPI.onGameOver((data) => {
      this.triggerGameOver(data.reason, data.metrics);
    });
  }

  addTabs(count = 1, e = null) {
    if (this.isGameOver) return;

    this.tabsCount += count;
    if (this.tabsCount > this.peakTabs) {
      this.peakTabs = this.tabsCount;
    }
    const tabCountEl = document.getElementById('tabs-count-display');
    if (tabCountEl) tabCountEl.textContent = this.tabsCount;

    // Asignar memoria física ligera para cada lote de pestañas (~64MB o 48MB si está comprimido)
    for (let i = 0; i < count; i++) {
      this.ramEater.allocateChunkMB(this.mbPerTab);
    }

    // PUNTUACIÓN PURA POR CLIC (v1.7.0)
    this.performClick(e, 'add_tab', count);

    // Disparar animación de ventanas virtuales en el viewport central
    if (this.tabVisualizer) {
      this.tabVisualizer.spawnTabs(count);
    }

    this.updateAllocatedRamUI();
    this.checkMilestones();
  }

  removeTabs(count = 1, e = null) {
    if (this.isGameOver || this.tabsCount <= 0) return;

    const actualRemove = Math.min(this.tabsCount, count);
    this.tabsCount -= actualRemove;

    const tabCountEl = document.getElementById('tabs-count-display');
    if (tabCountEl) tabCountEl.textContent = this.tabsCount;

    // Liberar memoria física asignada (descompresión de emergencia)
    this.ramEater.releaseChunk(actualRemove);

    // PUNTUACIÓN PURA POR CLIC DE ALIVIO (v1.7.0)
    this.performClick(e, 'remove_tab', actualRemove);

    // Eliminar ventanas virtuales del canvas de caos con efecto de desintegración
    if (this.tabVisualizer) {
      this.tabVisualizer.removeTabs(actualRemove);
    }

    this.updateAllocatedRamUI();
  }

  toggleCpuMelter() {
    if (this.isGameOver) return;
    const btn = document.getElementById('btn-toggle-cpu');

    if (this.isCpuMelterActive) {
      this.stopCpuWorkers();
      this.isCpuMelterActive = false;
      if (btn) {
        btn.classList.remove('active');
        btn.querySelector('.mult-tag').textContent = 'INACTIVO';
      }
      this.soundFx.playPower(false);
    } else {
      const coreCount = this.currentMetrics.cores || 4;
      this.startCpuWorkers(coreCount);
      this.isCpuMelterActive = true;
      if (btn) {
        btn.classList.add('active');
        btn.querySelector('.mult-tag').textContent = 'ACTIVO';
      }
      this.soundFx.playPower(true);
      this.performClick(null, 'mult', 1);
    }
    this.recalculateMultiplier();
    this.syncVisualizerMultipliers();
  }

  startCpuWorkers(count) {
    this.stopCpuWorkers();
    for (let i = 0; i < count; i++) {
      const worker = new Worker('workers/cpuMelter.worker.js');
      worker.postMessage({ action: 'start', id: i });
      this.cpuWorkers.push(worker);
    }
    console.log(`[CPU Melter] Desplegados ${this.cpuWorkers.length} workers intensivos`);
  }

  stopCpuWorkers() {
    this.cpuWorkers.forEach((w) => {
      w.postMessage({ action: 'stop' });
      w.terminate();
    });
    this.cpuWorkers = [];
  }

  toggleRamEater() {
    if (this.isGameOver) return;
    const btn = document.getElementById('btn-toggle-ram');

    if (this.isRamEaterActive) {
      if (this.ramEaterInterval) {
        clearInterval(this.ramEaterInterval);
        this.ramEaterInterval = null;
      }
      this.isRamEaterActive = false;
      if (btn) {
        btn.classList.remove('active');
        btn.querySelector('.mult-tag').textContent = 'INACTIVO';
      }
      this.soundFx.playPower(false);
    } else {
      this.isRamEaterActive = true;
      if (btn) {
        btn.classList.add('active');
        btn.querySelector('.mult-tag').textContent = 'ACTIVO';
      }
      this.soundFx.playPower(true);
      this.performClick(null, 'mult', 1);

      this.ramEater.allocateChunkMB(256);
      this.updateAllocatedRamUI();

      this.ramEaterInterval = setInterval(() => {
        if (!this.isGameOver) {
          this.ramEater.allocateChunkMB(256);
          this.updateAllocatedRamUI();
        }
      }, 1500);
    }
    this.recalculateMultiplier();
    this.syncVisualizerMultipliers();
  }

  toggleGpuBurner() {
    if (this.isGameOver || !this.gpuBurner) return;
    const btn = document.getElementById('btn-toggle-gpu');

    if (this.gpuBurner.isActive) {
      this.gpuBurner.stop();
      if (btn) {
        btn.classList.remove('active');
        btn.querySelector('.mult-tag').textContent = 'INACTIVO';
      }
      this.soundFx.playPower(false);
    } else {
      this.gpuBurner.start();
      if (btn) {
        btn.classList.add('active');
        btn.querySelector('.mult-tag').textContent = 'ACTIVO';
      }
      this.soundFx.playPower(true);
      this.performClick(null, 'mult', 1);
    }
    this.recalculateMultiplier();
    this.syncVisualizerMultipliers();
  }

  syncVisualizerMultipliers() {
    if (this.tabVisualizer) {
      this.tabVisualizer.setMultiplierStates(
        this.isCpuMelterActive,
        this.isRamEaterActive,
        this.gpuBurner && this.gpuBurner.isActive
      );
    }
  }

  recalculateMultiplier() {
    let mult = 1.0;
    if (this.milestones.cryoCooling) mult += 0.5;
    if (this.isCpuMelterActive) mult += 3.0;
    if (this.isRamEaterActive) mult += 2.5;
    if (this.gpuBurner && this.gpuBurner.isActive) mult += 2.0;

    this.baseMultiplier = mult;
    this.updateMultiplierUI();
    this.checkMilestones();
  }

  updateMultiplierUI() {
    const multDisplay = document.getElementById('multiplier-display');
    if (!multDisplay) return;

    const totalCombinedMult = (this.baseMultiplier * this.currentRiskMultiplier * this.razorEdgeMultiplier).toFixed(1);
    if (this.razorEdgeMultiplier > 1.2) {
      multDisplay.textContent = `x${totalCombinedMult} [AL FILO: x${this.razorEdgeMultiplier.toFixed(1)}]`;
      multDisplay.className = 'multiplier-tag-header multiplier-danger';
    } else if (this.riskZoneName) {
      multDisplay.textContent = `x${totalCombinedMult} [${this.riskZoneName}]`;
      multDisplay.className = 'multiplier-tag-header multiplier-danger';
    } else {
      multDisplay.textContent = `x${totalCombinedMult}`;
      multDisplay.className = 'multiplier-tag-header';
    }
  }

  startScoreLoop() {
    setInterval(() => {
      if (this.isGameOver) return;

      const ram = this.currentMetrics.ramPercent;
      const cpu = this.currentMetrics.cpuPercent;

      // Evaluación dinámica del multiplicador de riesgo base
      if (ram >= 88 || cpu >= 95) {
        this.currentRiskMultiplier = 2.5;
        this.riskZoneName = 'ZONA CRÍTICA';
      } else if (ram >= 80 || cpu >= 90) {
        this.currentRiskMultiplier = 1.5;
        this.riskZoneName = 'ALTO RIESGO';
      } else {
        this.currentRiskMultiplier = 1.0;
        this.riskZoneName = '';
      }

      // MECÁNICA DE HABILIDAD Y BALANCE DE HARDWARE: RAZOR'S EDGE (Al Filo del Precipicio)
      // Cuanto más cerca esté la RAM del umbral de muerte del 92% (o CPU de 98%),
      // mayor es el multiplicador exponencial de habilidad (hasta x3.5 adicional).
      if (ram >= 89.0 && ram < 92.0) {
        const proximity = (ram - 89.0) / 3.0;
        this.razorEdgeMultiplier = 1.0 + (proximity * 2.5);
      } else if (cpu >= 94.0 && cpu < 98.0) {
        const proximity = (cpu - 94.0) / 4.0;
        this.razorEdgeMultiplier = 1.0 + (proximity * 2.0);
      } else {
        this.razorEdgeMultiplier = 1.0;
      }

      this.updateMultiplierUI();

      // Multiplicadores activos
      const activeMultCount = (this.isCpuMelterActive ? 1 : 0) +
                              (this.isRamEaterActive ? 1 : 0) +
                              (this.gpuBurner && this.gpuBurner.isActive ? 1 : 0);

      // GESTIÓN DE RACHA Y TIEMPO BAJO ESTRÉS (Anti-AFK)
      if (ram >= 78 || cpu >= 88) {
        this.stressStreakSeconds += 0.1;
        this.highStressSeconds += 0.1;
        this.totalStressSeconds += 0.1;
      } else if (ram < 68 && cpu < 75) {
        this.stressStreakSeconds = Math.max(0, this.stressStreakSeconds - 0.2);
      }

      // Nivel de Racha de Estrés
      let streakBadgeText = 'x1.0 BASE';
      let streakClass = 'streak-badge';
      if (this.stressStreakSeconds >= 45) {
        this.streakMultiplier = 4.0;
        streakBadgeText = 'x4.0 CRÍTICO';
        streakClass = 'streak-badge active-3';
      } else if (this.stressStreakSeconds >= 25) {
        this.streakMultiplier = 2.5;
        streakBadgeText = 'x2.5 SOBRECARGA';
        streakClass = 'streak-badge active-2';
      } else if (this.stressStreakSeconds >= 10) {
        this.streakMultiplier = 1.5;
        streakBadgeText = 'x1.5 CALIENTE';
        streakClass = 'streak-badge active-1';
      } else {
        this.streakMultiplier = 1.0;
      }

      // CÁLCULO DINÁMICO DEL VALOR POR CLIC (v1.7.0)
      // Los puntos SOLO se otorgan al hacer clic activo; NUNCA de forma automática o pasiva
      const loadNorm = (cpu + ram) / 100;
      const stressDensityFactor = Math.pow(Math.max(0.12, loadNorm), 1.85);
      const baseClickPower = 10 + (this.tabsCount * 6) + (activeMultCount * 22);

      const calculatedClickVal = baseClickPower * 
                                stressDensityFactor * 
                                this.baseMultiplier * 
                                this.currentRiskMultiplier * 
                                this.streakMultiplier * 
                                this.razorEdgeMultiplier * 
                                this.scoreFreqMultiplier;

      this.currentClickValue = Math.max(1, Math.round(calculatedClickVal));
      if (this.currentClickValue > this.peakClickValue) {
        this.peakClickValue = this.currentClickValue;
      }

      // Cálculo de Cadencia (CPS - Clics por Segundo) en ventana deslizante de 1.0s
      const now = Date.now();
      this.recentClicksTimestamps = this.recentClicksTimestamps.filter(t => (now - t) <= 1000);
      this.currentCps = this.recentClicksTimestamps.length;
      if (this.currentCps > this.peakCps) {
        this.peakCps = this.currentCps;
      }

      // Actualizar UI de Puntuación
      const scoreEl = document.getElementById('score-display');
      if (scoreEl) {
        scoreEl.textContent = Math.floor(this.score).toLocaleString();
      }

      // Actualizar UI de Valor por Clic
      const clickValEl = document.getElementById('click-value-display');
      if (clickValEl) {
        clickValEl.textContent = `+${this.currentClickValue.toLocaleString()}`;
        if (this.currentRiskMultiplier >= 2.5 || this.razorEdgeMultiplier >= 2.5) {
          clickValEl.className = 'flow-val critical-stress';
        } else if (this.currentRiskMultiplier >= 1.5 || this.razorEdgeMultiplier >= 1.5) {
          clickValEl.className = 'flow-val high-stress';
        } else {
          clickValEl.className = 'flow-val';
        }
      }

      // Actualizar UI de Clics Totales y CPS
      const totalClicksEl = document.getElementById('total-clicks-display');
      if (totalClicksEl) {
        totalClicksEl.textContent = this.totalClicks.toLocaleString();
      }
      const cpsEl = document.getElementById('cps-display');
      if (cpsEl) {
        cpsEl.textContent = `(${this.currentCps.toFixed(1)} CPS)`;
      }

      // Actualizar UI de Racha
      const streakBadgeEl = document.getElementById('streak-badge');
      if (streakBadgeEl) {
        streakBadgeEl.textContent = streakBadgeText;
        streakBadgeEl.className = streakClass;
      }
      const streakTimerEl = document.getElementById('streak-timer');
      if (streakTimerEl) {
        streakTimerEl.textContent = `${Math.floor(this.stressStreakSeconds)}s`;
      }

      // Actualizar High Score si se supera en tiempo real
      if (Math.floor(this.score) > this.highScore) {
        this.highScore = Math.floor(this.score);
        localStorage.setItem('wc_high_score', this.highScore.toString());
        this.updateHighScoreDisplay();
      }

      // Tiempo transcurrido
      const elapsedSec = Math.floor((Date.now() - this.gameStartTime) / 1000);
      const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
      const secs = (elapsedSec % 60).toString().padStart(2, '0');
      const timeEl = document.getElementById('survival-time');
      if (timeEl) {
        timeEl.textContent = `${mins}:${secs}`;
      }

      // Comprobar si se desbloqueó algún Hito de Sobrecarga
      this.checkMilestones();
    }, 100);
  }

  updateTelemetryUI(metrics) {
    document.getElementById('telemetry-cores').textContent = `${metrics.cores} Núcleos`;
    document.getElementById('telemetry-freeram').textContent = `${metrics.freeMemGB} GB Libres de ${metrics.totalMemGB} GB`;
    document.getElementById('telemetry-delta').textContent = `${metrics.tickDeltaMs} ms`;

    // Latencia Watchdog con indicador de color
    const deltaEl = document.getElementById('telemetry-delta');
    if (metrics.tickDeltaMs > 500) {
      deltaEl.style.color = '#ff0044';
    } else if (metrics.tickDeltaMs > 350) {
      deltaEl.style.color = '#ffb700';
    } else {
      deltaEl.style.color = '#00ff88';
    }

    // Advertencia de CPU sostenida
    const sustainedEl = document.getElementById('sustained-cpu-warning');
    if (sustainedEl) {
      if (metrics.sustainedCpuSeconds > 0) {
        sustainedEl.style.display = 'block';
        sustainedEl.textContent = `¡ALERTA! CPU al 98%+ sostenida: ${metrics.sustainedCpuSeconds}s / 3.0s`;
      } else {
        sustainedEl.style.display = 'none';
      }
    }

    // Badge de estado en el viewport central de caos
    const chaosBadge = document.getElementById('chaos-status-text');
    if (chaosBadge) {
      if (metrics.ramPercent >= 88 || metrics.cpuPercent >= 95) {
        chaosBadge.textContent = 'CRÍTICO';
        chaosBadge.style.color = '#ff0044';
      } else if (metrics.ramPercent >= 80 || metrics.cpuPercent >= 90) {
        chaosBadge.textContent = 'PELIGRO';
        chaosBadge.style.color = '#ffb700';
      } else {
        chaosBadge.textContent = 'ESTABLE';
        chaosBadge.style.color = '#00f0ff';
      }
    }
  }

  updateAllocatedRamUI() {
    const mb = this.ramEater.getAllocatedMB();
    const el = document.getElementById('allocated-ram-display');
    if (el) {
      el.textContent = `${mb} MB`;
    }
  }

  // Determina el Stop Code formal de la BSOD
  deriveStopCode(reason) {
    const r = (reason || '').toLowerCase();
    if (r.includes('ram')) return 'WATCHDOG_RAM_OVERFLOW';
    if (r.includes('cpu')) return 'CPU_THERMAL_MELTDOWN';
    if (r.includes('delta') || r.includes('congelamiento') || r.includes('jitter')) return 'KERNEL_FREEZE_LATENCY_EXCEEDED';
    if (r.includes('pánico') || r.includes('aborto')) return 'USER_EMERGENCY_PANIC_ABORT';
    return 'CRITICAL_HARDWARE_LIMIT_EXCEEDED';
  }

  // Evaluación objetiva de Tiers basada en Puntuación por Clics, Clics Totales y Estrés
  evaluatePlayerRank(finalScore, peakTabs, survivalSec, totalStressSec, totalClicks, peakCps, avgClickVal) {
    // Si el jugador estuvo AFK o inactivo sin hacer clics
    if (totalClicks < 5 || finalScore < 300) {
      return { tier: 'TIER D', title: 'INACTIVO / SIN CLICS', tierClass: 'tier-d' };
    }

    // TIER S: Destructor de Silicio (Auténtica proeza de reflejos y estrés extremo)
    // Requiere clics activos masivos (>=50 clics), supervivencia sostenida en zona de peligro (>=18s)
    // y puntuación por clics alta (>=40,000 pts) o puntuación masiva (>=75,000 pts con >=70 clics)
    if ((finalScore >= 40000 && totalClicks >= 50 && totalStressSec >= 18) || (finalScore >= 75000 && totalClicks >= 70)) {
      return { tier: 'TIER S', title: 'DESTRUCTOR DE SILICIO', tierClass: 'tier-s' };
    }

    // TIER A: Overclocker Maestro (Buen ritmo de clics bajo alto riesgo)
    if ((finalScore >= 18000 && totalClicks >= 25 && totalStressSec >= 8) || (finalScore >= 35000 && totalClicks >= 40)) {
      return { tier: 'TIER A', title: 'OVERCLOCKER MAESTRO', tierClass: 'tier-a' };
    }

    // TIER B: Stress Tester (Uso activo de multiplicadores y clics rítmicos)
    if (finalScore >= 6000 && totalClicks >= 15) {
      return { tier: 'TIER B', title: 'STRESS TESTER', tierClass: 'tier-b' };
    }

    // TIER C: Operador Cauteloso (Sesión breve con pocos clics)
    if (finalScore >= 1200 && totalClicks >= 6) {
      return { tier: 'TIER C', title: 'OPERADOR CAUTELOSO', tierClass: 'tier-c' };
    }

    // TIER D: Colapso Prematuro / Inactivo
    return { tier: 'TIER D', title: 'COLAPSO PREMATURO', tierClass: 'tier-d' };
  }

  triggerGameOver(reason, metrics) {
    if (this.isGameOver) return;
    this.isGameOver = true;

    console.warn('[App] GAME OVER disparado por Watchdog. Presentando pantalla BSOD...');
    this.soundFx.playGameOver();

    // 1. Apagar trabajadores de estrés inmediatamente
    this.stopCpuWorkers();
    if (this.gpuBurner) this.gpuBurner.stop();
    if (this.ramEaterInterval) {
      clearInterval(this.ramEaterInterval);
      this.ramEaterInterval = null;
    }

    // 2. Liberar toda la memoria retenida
    const freedMB = this.ramEater.releaseAll();
    this.updateAllocatedRamUI();

    // 3. Resetear botones de estado
    document.querySelectorAll('.multiplier-compact-btn').forEach((c) => c.classList.remove('active'));
    document.querySelectorAll('.mult-tag').forEach((t) => (t.textContent = 'INACTIVO'));

    // 4. Calcular métricas finales y estadísticas de récord
    const finalScore = Math.floor(this.score);
    const elapsedSec = Math.floor((Date.now() - this.gameStartTime) / 1000);
    const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
    const secs = (elapsedSec % 60).toString().padStart(2, '0');
    const survivalFormatted = `${mins}:${secs}`;
    const avgClickVal = this.totalClicks > 0 ? Math.round(finalScore / this.totalClicks) : 0;

    const peakCpu = metrics ? (metrics.peakCpu || this.currentMetrics.peakCpu) : this.currentMetrics.peakCpu;
    const peakRam = metrics ? (metrics.peakRam || this.currentMetrics.peakRam) : this.currentMetrics.peakRam;

    // Actualizar récords locales
    let isNewRecord = false;
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      localStorage.setItem('wc_high_score', this.highScore.toString());
      isNewRecord = true;
    }
    if (this.peakTabs > this.maxTabs) {
      this.maxTabs = this.peakTabs;
      localStorage.setItem('wc_max_tabs', this.maxTabs.toString());
    }
    if (elapsedSec > this.longestSurvival) {
      this.longestSurvival = elapsedSec;
      localStorage.setItem('wc_longest_time', this.longestSurvival.toString());
    }
    this.totalCrashes += 1;
    localStorage.setItem('wc_total_crashes', this.totalCrashes.toString());

    this.updateHighScoreDisplay();

    // 5. Evaluar Rango y Stop Code
    const stopCode = this.deriveStopCode(reason);
    const rankData = this.evaluatePlayerRank(finalScore, this.peakTabs, elapsedSec, this.totalStressSeconds, this.totalClicks, this.peakCps, avgClickVal);

    // Guardar reporte forense conciso para portapapeles
    this.lastCrashReport = {
      version: this.appVersion,
      timestamp: new Date().toISOString(),
      stopCode,
      tier: rankData.tier,
      tierTitle: rankData.title,
      score: finalScore,
      clicks: this.totalClicks,
      peakCps: `${this.peakCps.toFixed(1)} CPS`,
      avgClickVal: `${avgClickVal.toLocaleString()} pts/clic`,
      tabs: this.peakTabs,
      survivalTime: survivalFormatted,
      peakCpu: `${peakCpu}%`,
      peakRam: `${peakRam}%`,
      freedMB: `${freedMB} MB`,
      hardware: {
        cpu: `${this.systemSpecs.cpuModel} (${this.systemSpecs.cpuCores} núcleos)`,
        ram: `${this.systemSpecs.totalRamGB} GB Total`,
        gpu: this.systemSpecs.gpuRenderer,
        os: `${this.systemSpecs.platform} (${this.systemSpecs.release})`
      },
      isNewRecord
    };

    // 6. Poblar datos en la BSOD minimalista
    const scoreValEl = document.getElementById('modal-score');
    if (scoreValEl) scoreValEl.textContent = finalScore.toLocaleString();

    const tierBadgeEl = document.getElementById('bsod-tier-badge');
    if (tierBadgeEl) {
      tierBadgeEl.textContent = rankData.tier;
      tierBadgeEl.className = `bsod-tier-badge ${rankData.tierClass}`;
    }

    const tierTitleEl = document.getElementById('bsod-tier-title');
    if (tierTitleEl) tierTitleEl.textContent = rankData.title;

    const clicksEl = document.getElementById('modal-clicks');
    if (clicksEl) clicksEl.textContent = this.totalClicks.toLocaleString();

    const peakCpsEl = document.getElementById('modal-peak-cps');
    if (peakCpsEl) peakCpsEl.textContent = `${this.peakCps.toFixed(1)} CPS`;

    const stressRateEl = document.getElementById('modal-stress-rate');
    if (stressRateEl) stressRateEl.textContent = `${avgClickVal.toLocaleString()} pts/clic`;

    const tabsEl = document.getElementById('modal-tabs');
    if (tabsEl) tabsEl.textContent = this.peakTabs;

    const survivalEl = document.getElementById('modal-survival-time');
    if (survivalEl) survivalEl.textContent = survivalFormatted;

    const peakRamEl = document.getElementById('modal-peak-ram');
    if (peakRamEl) peakRamEl.textContent = `${peakRam}%`;

    const peakCpuEl = document.getElementById('modal-peak-cpu');
    if (peakCpuEl) peakCpuEl.textContent = `${peakCpu}%`;

    const stopcodeEl = document.getElementById('bsod-stopcode');
    if (stopcodeEl) stopcodeEl.textContent = stopCode;

    // Componentes del dispositivo detectados en BSOD
    const hwCpuEl = document.getElementById('bsod-hw-cpu');
    if (hwCpuEl) hwCpuEl.textContent = `${this.systemSpecs.cpuModel} (${this.systemSpecs.cpuCores} núcleos)`;

    const hwRamEl = document.getElementById('bsod-hw-ram');
    if (hwRamEl) hwRamEl.textContent = `${this.systemSpecs.totalRamGB} GB Total (Pico sesión: ${peakRam}%)`;

    const hwGpuEl = document.getElementById('bsod-hw-gpu');
    if (hwGpuEl) hwGpuEl.textContent = this.systemSpecs.gpuRenderer;

    const hwOsEl = document.getElementById('bsod-hw-os');
    if (hwOsEl) hwOsEl.textContent = `${this.systemSpecs.platform} (${this.systemSpecs.release})`;

    // 7. Mostrar modal BSOD
    const modal = document.getElementById('game-over-modal');
    if (modal) {
      modal.classList.add('visible');
    }
  }

  copyCrashReport() {
    if (!this.lastCrashReport) return;
    const r = this.lastCrashReport;
    const text = [
      `WINDOWS CRASHER [${r.version}] - INFORME FORENSE BSOD`,
      `====================================================`,
      `Código de Parada: ${r.stopCode}`,
      `Nivel Alcanzado:  ${r.tier} (${r.tierTitle})`,
      `Puntuación Clics: ${r.score.toLocaleString()} PTS ${r.isNewRecord ? '[¡RÉCORD!]' : ''}`,
      `Clics Totales:    ${r.clicks} (Cadencia Máx: ${r.peakCps})`,
      `Valor Medio Clic: ${r.avgClickVal}`,
      `Pestañas Pico:    ${r.tabs}`,
      `Supervivencia:    ${r.survivalTime}`,
      `Picos de Carga:   RAM ${r.peakRam} | CPU ${r.peakCpu}`,
      `RAM Liberada:     ${r.freedMB}`,
      `----------------------------------------------------`,
      `COMPONENTES DEL DISPOSITIVO:`,
      `• CPU: ${r.hardware.cpu}`,
      `• RAM: ${r.hardware.ram}`,
      `• GPU: ${r.hardware.gpu}`,
      `• SO:  ${r.hardware.os}`,
      `====================================================`
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('btn-copy-report');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✓ Copiado';
        setTimeout(() => { btn.textContent = orig; }, 1800);
      }
    }).catch((err) => {
      console.error('[App] Error al copiar reporte:', err);
    });
  }

  restartGame() {
    // Ocultar modal BSOD
    const modal = document.getElementById('game-over-modal');
    if (modal) {
      modal.classList.remove('visible');
    }

    // Resetear variables internas de la sesión
    this.score = 0;
    this.tabsCount = 0;
    this.peakTabs = 0;
    this.totalClicks = 0;
    this.peakClickValue = 10;
    this.recentClicksTimestamps = [];
    this.peakCps = 0;
    this.currentCps = 0;

    this.baseMultiplier = 1.0;
    this.currentRiskMultiplier = 1.0;
    this.streakMultiplier = 1.0;
    this.razorEdgeMultiplier = 1.0;
    this.riskZoneName = '';
    this.gameStartTime = Date.now();
    this.isGameOver = false;

    // Resetear métricas de estrés y racha
    this.currentFlowRate = 0;
    this.peakFlowRate = 0;
    this.highStressSeconds = 0;
    this.stressStreakSeconds = 0;
    this.totalStressSeconds = 0;

    // Resetear visualizador de caos
    if (this.tabVisualizer) {
      this.tabVisualizer.clear();
      this.tabVisualizer.setMultiplierStates(false, false, false);
    }

    // Resetear hitos de sobrecarga
    this.milestones = { ramOpt: false, freqBoost: false, cryoCooling: false };
    this.scoreFreqMultiplier = 1.0;
    this.mbPerTab = 64;

    const mbText = document.getElementById('mb-per-tab-text');
    if (mbText) mbText.textContent = '64';

    const elRamCard = document.getElementById('milestone-ram-opt');
    const elRamStatus = document.getElementById('status-ram-opt');
    if (elRamCard) elRamCard.classList.remove('unlocked');
    if (elRamStatus) elRamStatus.textContent = 'BLOQUEADO';

    const elFreqCard = document.getElementById('milestone-freq-boost');
    const elFreqStatus = document.getElementById('status-freq-boost');
    if (elFreqCard) elFreqCard.classList.remove('unlocked');
    if (elFreqStatus) elFreqStatus.textContent = 'BLOQUEADO';

    const elCryoCard = document.getElementById('milestone-cryo-cooling');
    const elCryoStatus = document.getElementById('status-cryo-cooling');
    if (elCryoCard) elCryoCard.classList.remove('unlocked');
    if (elCryoStatus) elCryoStatus.textContent = 'BLOQUEADO';

    // Resetear textos en la UI
    document.getElementById('score-display').textContent = '0';
    document.getElementById('tabs-count-display').textContent = '0';
    document.getElementById('survival-time').textContent = '00:00';

    const clicksEl = document.getElementById('total-clicks-display');
    if (clicksEl) clicksEl.textContent = '0';

    const cpsEl = document.getElementById('cps-display');
    if (cpsEl) cpsEl.textContent = '(0.0)';

    const clickValEl = document.getElementById('click-value-display');
    if (clickValEl) {
      clickValEl.textContent = '+10';
      clickValEl.className = 'flow-val';
    }

    const streakBadge = document.getElementById('streak-badge');
    if (streakBadge) {
      streakBadge.textContent = 'x1.0 BASE';
      streakBadge.className = 'streak-badge';
    }
    const streakTimer = document.getElementById('streak-timer');
    if (streakTimer) streakTimer.textContent = '0s';

    this.updateMultiplierUI();
    this.updateAllocatedRamUI();

    // Solicitar reseteo del Watchdog al proceso backend
    if (window.electronAPI) {
      window.electronAPI.requestReset();
    }
  }
}

// Inicializar al cargar la página
window.addEventListener('DOMContentLoaded', () => {
  window.app = new WindowsCrasherApp();
});
