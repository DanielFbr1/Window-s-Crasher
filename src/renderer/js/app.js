// Controlador principal del juego y lógica de benchmarking - Windows Crasher v2.3.0
class WindowsCrasherApp {
  constructor() {
    this.appVersion = 'v2.3.0';
    this.score = 0;
    this.tabsCount = 0;
    this.peakTabs = 0;
    this.baseMultiplier = 1.0;
    this.currentRiskMultiplier = 1.0;
    this.streakMultiplier = 1.0;
    this.razorEdgeMultiplier = 1.0;  // Multiplicador de habilidad al surfear el límite del 90% (RAM/GPU) y 95% (CPU)
    this.riskZoneName = '';
    this.gameStartTime = Date.now();
    this.isGameOver = false;

    // Control de inactividad del usuario (Anti-AFK / Activity Momentum)
    this.lastUserActionTime = Date.now();
    this.activityFactor = 1.0;

    // Especificaciones del hardware detectadas para diagnóstico y Game Over
    this.systemSpecs = {
      cpuModel: 'Detectando procesador...',
      cpuCores: navigator.hardwareConcurrency || 4,
      cpuSpeedMHz: 0,
      totalRamGB: '16.0',
      gpuRenderer: 'Detectando acelerador gráfico...',
      platform: 'Windows NT',
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

    // Métricas del hardware actuales (incluyendo GPU 3D)
    this.currentMetrics = {
      cpuPercent: 0,
      ramPercent: 0,
      gpuPercent: 0,
      totalMemGB: 0,
      usedMemGB: 0,
      freeMemGB: 0,
      cores: navigator.hardwareConcurrency || 4,
      tickDeltaMs: 250,
      peakCpu: 0,
      peakRam: 0,
      peakGpu: 0
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

  async detectHardwareSpecs() {
    // 1. Obtener specs del SO desde main/Electron IPC
    if (window.electronAPI && typeof window.electronAPI.getSystemSpecs === 'function') {
      try {
        const specs = await window.electronAPI.getSystemSpecs();
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

  recordUserActivity() {
    this.lastUserActionTime = Date.now();
  }

  setupUIEvents() {
    // Botón +1 Pestaña
    const btnAddTab = document.getElementById('btn-add-tab');
    if (btnAddTab) {
      btnAddTab.addEventListener('click', () => {
        this.recordUserActivity();
        this.soundFx.playClick();
        this.addTabs(1);
      });
    }

    // Botón −1 Pestaña (Alivio táctico de emergencia)
    const btnRemoveTab = document.getElementById('btn-remove-tab');
    if (btnRemoveTab) {
      btnRemoveTab.addEventListener('click', () => {
        this.recordUserActivity();
        this.soundFx.playClick();
        this.removeTabs(1);
      });
    }

    // Botón +10 Pestañas (Ráfaga)
    const btnAdd10 = document.getElementById('btn-add-10-tabs');
    if (btnAdd10) {
      btnAdd10.addEventListener('click', () => {
        this.recordUserActivity();
        this.soundFx.playClick();
        this.addTabs(10);
      });
    }

    // Botón −10 Pestañas (Purga de emergencia)
    const btnRemove10 = document.getElementById('btn-remove-10-tabs');
    if (btnRemove10) {
      btnRemove10.addEventListener('click', () => {
        this.recordUserActivity();
        this.soundFx.playClick();
        this.removeTabs(10);
      });
    }

    // Toggle Audio Mute
    const btnAudio = document.getElementById('btn-audio-toggle');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        this.recordUserActivity();
        const isMuted = this.soundFx.toggleMute();
        btnAudio.textContent = isMuted ? '🔇' : '🔊';
        btnAudio.title = isMuted ? 'Sonido silenciado (M para activar)' : 'Silenciar sonido (Atajo: M)';
      });
    }

    // Toggle All Multipliers (Botón Maestro)
    const btnAllMults = document.getElementById('btn-toggle-all-mults');
    if (btnAllMults) {
      btnAllMults.addEventListener('click', () => {
        this.recordUserActivity();
        this.toggleAllMultipliers();
      });
    }

    // Toggle CPU Melter (Compacto)
    const btnCpu = document.getElementById('btn-toggle-cpu');
    if (btnCpu) {
      btnCpu.addEventListener('click', () => {
        this.recordUserActivity();
        this.toggleCpuMelter();
      });
    }

    // Toggle RAM Eater (Compacto)
    const btnRam = document.getElementById('btn-toggle-ram');
    if (btnRam) {
      btnRam.addEventListener('click', () => {
        this.recordUserActivity();
        this.toggleRamEater();
      });
    }

    // Toggle GPU Burner (Compacto)
    const btnGpu = document.getElementById('btn-toggle-gpu');
    if (btnGpu) {
      btnGpu.addEventListener('click', () => {
        this.recordUserActivity();
        this.toggleGpuBurner();
      });
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

      if (e.code === 'Space' || e.code === 'Enter' || e.key === '+') {
        e.preventDefault();
        this.recordUserActivity();
        if (this.isGameOver) {
          this.soundFx.playReset();
          this.restartGame();
        } else {
          this.soundFx.playClick();
          if (e.shiftKey) {
            this.addTabs(10);
          } else {
            this.addTabs(1);
          }
        }
      } else if (e.code === 'Backspace' || e.key === '-') {
        e.preventDefault();
        this.recordUserActivity();
        if (!this.isGameOver) {
          this.soundFx.playClick();
          if (e.shiftKey) {
            this.removeTabs(10);
          } else {
            this.removeTabs(1);
          }
        }
      } else if (e.key === '1') {
        this.recordUserActivity();
        this.toggleCpuMelter();
      } else if (e.key === '2') {
        this.recordUserActivity();
        this.toggleRamEater();
      } else if (e.key === '3') {
        this.recordUserActivity();
        this.toggleGpuBurner();
      } else if (e.key === '4' || e.key.toLowerCase() === 't') {
        this.recordUserActivity();
        this.toggleAllMultipliers();
      } else if (e.key.toLowerCase() === 'm') {
        this.recordUserActivity();
        const btnAudio = document.getElementById('btn-audio-toggle');
        const isMuted = this.soundFx.toggleMute();
        if (btnAudio) {
          btnAudio.textContent = isMuted ? '🔇' : '🔊';
          btnAudio.title = isMuted ? 'Sonido silenciado (M para activar)' : 'Silenciar sonido (Atajo: M)';
        }
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        this.triggerPanic();
      } else if (e.key.toLowerCase() === 'r') {
        if (this.isGameOver) {
          this.soundFx.playReset();
          this.restartGame();
        }
      } else if (e.key.toLowerCase() === 'c') {
        if (this.isGameOver) {
          this.copyCrashReport();
        }
      }
    });
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
      this.currentMetrics = { ...this.currentMetrics, ...metrics };

      // Consultar carga estimada de la GPU en tiempo real
      const gpu = this.gpuBurner ? this.gpuBurner.getGpuLoad(this.tabsCount) : 0;
      this.currentMetrics.gpuPercent = gpu;
      if (gpu > (this.currentMetrics.peakGpu || 0)) {
        this.currentMetrics.peakGpu = gpu;
      }

      const combinedMetrics = { ...this.currentMetrics, gpuPercent: gpu };

      if (this.visualizer) {
        this.visualizer.updateMetrics(combinedMetrics);
      }
      if (this.tabVisualizer) {
        this.tabVisualizer.setMetrics(combinedMetrics);
      }
      this.updateTelemetryUI(combinedMetrics);

      // Vigilancia activa del límite de GPU (90.0% sostenido durante 2.5s)
      if (!this.isGameOver && gpu >= 90.0) {
        this.sustainedGpuTicks = (this.sustainedGpuTicks || 0) + 1;
        if (this.sustainedGpuTicks >= 10) { // 10 * 250ms = 2.5s continuos
          this.triggerGameOver(`Límite crítico de GPU 3D superado (${gpu.toFixed(1)}% >= 90.0%)`, {
            peakCpu: this.currentMetrics.peakCpu,
            peakRam: this.currentMetrics.peakRam,
            peakGpu: Math.max(gpu, this.currentMetrics.peakGpu || 0)
          });
          return;
        }
      } else {
        this.sustainedGpuTicks = 0;
      }

      // Reproducir sonido de advertencia si nos acercamos a la zona roja (RAM 86%, CPU 91%, GPU 86%)
      if (!this.isGameOver) {
        const now = Date.now();
        if ((metrics.ramPercent >= 86 || metrics.cpuPercent >= 91 || gpu >= 86) && now - this.lastWarningTime > 2000) {
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

  addTabs(count = 1) {
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

    // Puntuación fija por click al abrir pestañas (+50 pts fijos por pestaña abierta)
    const fixedPointsPerTab = 50;
    this.score += (count * fixedPointsPerTab);

    // Disparar animación de ventanas virtuales en el viewport central
    if (this.tabVisualizer) {
      this.tabVisualizer.spawnTabs(count);
    }

    this.updateAllocatedRamUI();
    this.checkMilestones();
  }

  removeTabs(count = 1) {
    if (this.isGameOver || this.tabsCount <= 0) return;

    const actualRemove = Math.min(this.tabsCount, count);
    this.tabsCount -= actualRemove;

    const tabCountEl = document.getElementById('tabs-count-display');
    if (tabCountEl) tabCountEl.textContent = this.tabsCount;

    // Al restar pestañas, se pierden puntos (-50 pts por cada pestaña restada)
    const pointsLost = actualRemove * 50;
    this.score = Math.max(0, this.score - pointsLost);

    const scoreEl = document.getElementById('score-display');
    if (scoreEl) {
      scoreEl.textContent = Math.floor(this.score).toLocaleString();
    }

    // Liberar memoria física asignada (descompresión de emergencia)
    this.ramEater.releaseChunk(actualRemove);

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
    }
    this.recalculateMultiplier();
    this.syncVisualizerMultipliers();
    this.updateMasterMultiplierButtonState();
  }

  startCpuWorkers(count) {
    this.stopCpuWorkers();
    // Desplegar workers intensivos calibrados para alcanzar el límite del 95% de CPU
    const workerCount = Math.max(2, Math.min(count, 12));
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker('workers/cpuMelter.worker.js');
      worker.postMessage({ action: 'start', id: i });
      this.cpuWorkers.push(worker);
    }
    console.log(`[CPU Melter] Desplegados ${this.cpuWorkers.length} workers intensivos (capacidad de desafiar el 95% de CPU)`);
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
    this.updateMasterMultiplierButtonState();
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
    }
    this.recalculateMultiplier();
    this.syncVisualizerMultipliers();
    this.updateMasterMultiplierButtonState();
  }

  // Activar o desactivar todos los multiplicadores simultáneamente (Botón Maestro)
  toggleAllMultipliers() {
    if (this.isGameOver) return;

    const isGpuOn = Boolean(this.gpuBurner && this.gpuBurner.isActive);
    const areAllActive = this.isCpuMelterActive && this.isRamEaterActive && isGpuOn;

    if (areAllActive) {
      // Si todos están activos, apagarlos todos
      if (this.isCpuMelterActive) this.toggleCpuMelter();
      if (this.isRamEaterActive) this.toggleRamEater();
      if (isGpuOn) this.toggleGpuBurner();
    } else {
      // Si alguno está apagado, encender todos los que falten
      if (!this.isCpuMelterActive) this.toggleCpuMelter();
      if (!this.isRamEaterActive) this.toggleRamEater();
      if (!isGpuOn && this.gpuBurner) this.toggleGpuBurner();
    }
  }

  updateMasterMultiplierButtonState() {
    const btnMaster = document.getElementById('btn-toggle-all-mults');
    if (!btnMaster) return;

    const isGpuOn = Boolean(this.gpuBurner && this.gpuBurner.isActive);
    const areAllActive = this.isCpuMelterActive && this.isRamEaterActive && isGpuOn;

    const tag = document.getElementById('master-mult-tag');
    const sub = document.getElementById('master-mult-sub');

    if (areAllActive) {
      btnMaster.classList.add('active');
      if (tag) tag.textContent = 'ACTIVO';
      if (sub) sub.textContent = 'CPU, RAM y GPU al límite';
    } else {
      btnMaster.classList.remove('active');
      if (tag) tag.textContent = 'INACTIVO';
      if (sub) sub.textContent = 'Activar CPU, RAM y GPU juntos';
    }
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
    this.scoreInterval = setInterval(() => {
      if (this.isGameOver) return;

      const ram = this.currentMetrics.ramPercent;
      const cpu = this.currentMetrics.cpuPercent;
      const gpu = this.gpuBurner ? this.gpuBurner.getGpuLoad(this.tabsCount) : 0;
      this.currentMetrics.gpuPercent = gpu;
      if (gpu > (this.currentMetrics.peakGpu || 0)) {
        this.currentMetrics.peakGpu = gpu;
      }
      const gpuEl = document.getElementById('telemetry-gpu');
      if (gpuEl) {
        gpuEl.textContent = `${gpu.toFixed(1)}%`;
      }

      // Evaluación dinámica del multiplicador de riesgo base (Límites: RAM 90%, CPU 95%, GPU 90%)
      if (ram >= 86 || cpu >= 92 || gpu >= 86) {
        this.currentRiskMultiplier = 2.5;
        this.riskZoneName = 'ZONA CRÍTICA';
      } else if (ram >= 78 || cpu >= 85 || gpu >= 78) {
        this.currentRiskMultiplier = 1.5;
        this.riskZoneName = 'ALTO RIESGO';
      } else {
        this.currentRiskMultiplier = 1.0;
        this.riskZoneName = '';
      }

      // MECÁNICA RAZOR'S EDGE: Al filo del colapso (RAM 90%, CPU 95% o GPU 90%)
      if (ram >= 86.0 && ram < 90.0) {
        const proximity = (ram - 86.0) / 4.0;
        this.razorEdgeMultiplier = 1.0 + (proximity * 2.5);
      } else if (cpu >= 90.0 && cpu < 95.0) {
        const proximity = (cpu - 90.0) / 5.0;
        this.razorEdgeMultiplier = 1.0 + (proximity * 2.0);
      } else if (gpu >= 85.0 && gpu < 90.0) {
        const proximity = (gpu - 85.0) / 5.0;
        this.razorEdgeMultiplier = 1.0 + (proximity * 2.0);
      } else {
        this.razorEdgeMultiplier = 1.0;
      }

      this.updateMultiplierUI();

      // Multiplicadores activos
      const activeMultCount = (this.isCpuMelterActive ? 1 : 0) +
                              (this.isRamEaterActive ? 1 : 0) +
                              (this.gpuBurner && this.gpuBurner.isActive ? 1 : 0);

      // CADENCIA DE ACTIVIDAD DEL USUARIO (Anti-Idle / No subida rápida sin tocar nada)
      const idleSec = (Date.now() - this.lastUserActionTime) / 1000;
      let cadenceBadgeText = '⚡ ACTIVO';
      let cadenceClass = 'cadence-badge cadence-active';

      if (idleSec <= 2.0) {
        this.activityFactor = 1.0;
        cadenceBadgeText = '⚡ ACTIVO';
        cadenceClass = 'cadence-badge cadence-active';
      } else if (idleSec <= 5.0) {
        // Desaceleración progresiva al dejar de interactuar
        this.activityFactor = Math.max(0.35, 1.0 - (idleSec - 2.0) * 0.22);
        cadenceBadgeText = '⏳ EN ESPERA';
        cadenceClass = 'cadence-badge cadence-stagnant';
      } else {
        // Estancamiento: los puntos casi no suben (decae hasta un 94% menos)
        this.activityFactor = Math.max(0.06, 0.35 * Math.pow(0.65, idleSec - 5.0));
        cadenceBadgeText = '💤 INACTIVO';
        cadenceClass = 'cadence-badge cadence-idle';
      }

      const cadenceBadgeEl = document.getElementById('activity-cadence-badge');
      if (cadenceBadgeEl) {
        cadenceBadgeEl.textContent = cadenceBadgeText;
        cadenceBadgeEl.className = cadenceClass;
      }

      // GESTIÓN DE RACHA Y TIEMPO BAJO ESTRÉS (Solo avanza con actividad o peligro real)
      if ((ram >= 76 || cpu >= 85 || gpu >= 80) && idleSec <= 5.0) {
        this.stressStreakSeconds += 0.1;
        this.highStressSeconds += 0.1;
        this.totalStressSeconds += 0.1;
      } else if (idleSec > 5.0 || (ram < 65 && cpu < 70 && gpu < 55)) {
        this.stressStreakSeconds = Math.max(0, this.stressStreakSeconds - 0.25);
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

      // REGLA DE PUNTUACIÓN AUTOMÁTICA:
      // Si NO hay multiplicadores activos o NO hay pestañas abiertas (tabsCount <= 0),
      // el flujo es 0 absoluto (no se pueden generar puntos pasivos sin pestañas que estresar).
      // Solo sube la puntuación automáticamente cuando hay algún multiplicador activado Y al menos 1 pestaña viva.
      // El multiplicador genera más puntos según las pestañas que haya abiertas (+abiertas +multiplica).
      if (activeMultCount === 0 || this.tabsCount <= 0) {
        this.currentFlowRate = 0;
      } else {
        // Potencia combinada de multiplicadores activos (CPU 3.0x, RAM 2.5x, GPU 2.0x)
        const multPower = (this.isCpuMelterActive ? 3.0 : 0) +
                          (this.isRamEaterActive ? 2.5 : 0) +
                          (this.gpuBurner && this.gpuBurner.isActive ? 2.0 : 0);

        // Las pestañas abiertas multiplican directamente la generación de puntos:
        const tabMultiplier = this.tabsCount * 0.75;

        // Densidad de hardware incluyendo GPU (CPU + RAM + GPU 3D)
        const loadNorm = (cpu + ram + (gpu * 1.2)) / 215;
        const stressDensityFactor = Math.pow(Math.max(0.15, loadNorm), 1.95);

        const baseActiveIntensity = 32 * multPower * tabMultiplier;
        const totalFlowRate = baseActiveIntensity * 
                              stressDensityFactor * 
                              this.baseMultiplier * 
                              this.currentRiskMultiplier * 
                              this.streakMultiplier * 
                              this.razorEdgeMultiplier * 
                              this.scoreFreqMultiplier *
                              this.activityFactor;

        this.currentFlowRate = Math.round(totalFlowRate);
        if (this.currentFlowRate > this.peakFlowRate) {
          this.peakFlowRate = this.currentFlowRate;
        }

        // Incrementar puntuación cada 100ms
        this.score += (totalFlowRate * 0.1);
      }

      // Actualizar UI de Puntuación
      const scoreEl = document.getElementById('score-display');
      if (scoreEl) {
        scoreEl.textContent = Math.floor(this.score).toLocaleString();
      }

      // Actualizar UI de Tasa de Flujo en vivo
      const flowEl = document.getElementById('flow-rate-display');
      if (flowEl) {
        flowEl.textContent = `+${this.currentFlowRate.toLocaleString()}`;
        if (this.currentFlowRate >= 800) {
          flowEl.className = 'flow-val critical-stress';
        } else if (this.currentFlowRate >= 300) {
          flowEl.className = 'flow-val high-stress';
        } else {
          flowEl.className = 'flow-val';
        }
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

    // Advertencia de CPU sostenida (Límite 95%)
    const sustainedEl = document.getElementById('sustained-cpu-warning');
    if (sustainedEl) {
      if (metrics.sustainedCpuSeconds > 0) {
        sustainedEl.style.display = 'block';
        sustainedEl.textContent = `¡ALERTA! CPU al 95%+ sostenida: ${metrics.sustainedCpuSeconds}s / 3.0s`;
      } else {
        sustainedEl.style.display = 'none';
      }
    }

    // Badge de estado en el viewport central de caos (RAM 90%, CPU 95%, GPU 90%)
    const chaosBadge = document.getElementById('chaos-status-text');
    if (chaosBadge) {
      const gpuLoad = this.currentMetrics.gpuPercent || 0;
      if (metrics.ramPercent >= 86 || metrics.cpuPercent >= 92 || gpuLoad >= 86) {
        chaosBadge.textContent = 'CRÍTICO';
        chaosBadge.style.color = '#ff0044';
      } else if (metrics.ramPercent >= 78 || metrics.cpuPercent >= 85 || gpuLoad >= 78) {
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
    if (r.includes('gpu')) return 'WATCHDOG_GPU_THERMAL_OVERHEAT';
    if (r.includes('ram')) return 'WATCHDOG_RAM_OVERFLOW';
    if (r.includes('cpu')) return 'CPU_THERMAL_MELTDOWN';
    if (r.includes('delta') || r.includes('congelamiento') || r.includes('jitter')) return 'KERNEL_FREEZE_LATENCY_EXCEEDED';
    if (r.includes('pánico') || r.includes('aborto')) return 'USER_EMERGENCY_PANIC_ABORT';
    return 'CRITICAL_HARDWARE_LIMIT_EXCEEDED';
  }

  // Evaluación rigurosa de Tiers (S Tier estrictamente calibrado para evitar facilidades)
  evaluatePlayerRank(finalScore, peakTabs, survivalSec, totalStressSec, avgRate) {
    // Si el jugador estuvo AFK o inactivo sin abrir apenas pestañas ni generar estrés
    if (peakTabs <= 1 && avgRate < 70) {
      return { tier: 'TIER D', title: 'INACTIVO / SIN ESTRÉS', tierClass: 'tier-d' };
    }

    // TIER S: Destructor de Silicio (Auténtica proeza de riesgo extremo, habilidad y reflejos)
    // Criterios muy estrictos para evitar que sea fácil de alcanzar:
    // Requiere >= 120,000 pts, tasa media >= 2,200 pts/s, >= 40s de estrés crítico sostenido y >= 16 pestañas vivas
    // O bien >= 250,000 pts con >= 1,800 pts/s
    if ((finalScore >= 120000 && avgRate >= 2200 && totalStressSec >= 40 && peakTabs >= 16) || 
        (finalScore >= 250000 && avgRate >= 1800 && totalStressSec >= 30)) {
      return { tier: 'TIER S', title: 'DESTRUCTOR DE SILICIO', tierClass: 'tier-s' };
    }

    // TIER A: Overclocker Maestro (Manejo experto de hardware con alto riesgo sostenido)
    if ((avgRate >= 1200 && totalStressSec >= 20 && finalScore >= 55000) || 
        (finalScore >= 100000 && avgRate >= 1000)) {
      return { tier: 'TIER A', title: 'OVERCLOCKER MAESTRO', tierClass: 'tier-a' };
    }

    // TIER B: Stress Tester (Uso activo de multiplicadores y pestañas)
    if (avgRate >= 500 || (peakTabs >= 10 && finalScore >= 25000) || finalScore >= 40000) {
      return { tier: 'TIER B', title: 'STRESS TESTER', tierClass: 'tier-b' };
    }

    // TIER C: Operador Cauteloso (Poco riesgo o colapso rápido sin exprimir el sistema)
    if (avgRate >= 150 || peakTabs >= 3 || finalScore >= 6000) {
      return { tier: 'TIER C', title: 'OPERADOR CAUTELOSO', tierClass: 'tier-c' };
    }

    return { tier: 'TIER D', title: 'INACTIVO / SIN ESTRÉS', tierClass: 'tier-d' };
  }

  triggerGameOver(reason, metrics) {
    if (this.isGameOver) return;
    this.isGameOver = true;

    console.warn('[App] GAME OVER disparado por Watchdog. Presentando pantalla BSOD...');
    this.soundFx.playGameOver();

    // 1. Apagar trabajadores de estrés inmediatamente
    this.stopCpuWorkers();
    this.isCpuMelterActive = false;
    if (this.gpuBurner) this.gpuBurner.stop();
    if (this.ramEaterInterval) {
      clearInterval(this.ramEaterInterval);
      this.ramEaterInterval = null;
    }
    this.isRamEaterActive = false;

    // 2. Liberar toda la memoria retenida
    const freedMB = this.ramEater.releaseAll();
    this.updateAllocatedRamUI();

    // 3. Resetear botones de estado
    document.querySelectorAll('.multiplier-compact-btn').forEach((c) => c.classList.remove('active'));
    document.querySelectorAll('.mult-tag').forEach((t) => (t.textContent = 'INACTIVO'));
    this.updateMasterMultiplierButtonState();

    // 4. Calcular métricas finales y estadísticas de récord
    const finalScore = Math.floor(this.score);
    const elapsedSec = Math.floor((Date.now() - this.gameStartTime) / 1000);
    const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
    const secs = (elapsedSec % 60).toString().padStart(2, '0');
    const survivalFormatted = `${mins}:${secs}`;
    const avgRate = finalScore / Math.max(1, elapsedSec);

    const peakCpu = metrics ? (metrics.peakCpu || this.currentMetrics.peakCpu) : this.currentMetrics.peakCpu;
    const peakRam = metrics ? (metrics.peakRam || this.currentMetrics.peakRam) : this.currentMetrics.peakRam;
    const peakGpu = metrics ? (metrics.peakGpu || this.currentMetrics.peakGpu) : this.currentMetrics.peakGpu;

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
    const rankData = this.evaluatePlayerRank(finalScore, this.peakTabs, elapsedSec, this.totalStressSeconds, avgRate);

    // Guardar reporte forense conciso para portapapeles
    this.lastCrashReport = {
      version: this.appVersion,
      timestamp: new Date().toISOString(),
      stopCode,
      tier: rankData.tier,
      tierTitle: rankData.title,
      score: finalScore,
      tabs: this.peakTabs,
      stressRate: `${Math.round(avgRate)} pts/s`,
      survivalTime: survivalFormatted,
      peakCpu: `${peakCpu}%`,
      peakRam: `${peakRam}%`,
      peakGpu: `${Math.round(peakGpu)}%`,
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

    const stressRateEl = document.getElementById('modal-stress-rate');
    if (stressRateEl) stressRateEl.textContent = `${Math.round(avgRate)} pts/s`;

    const tabsEl = document.getElementById('modal-tabs');
    if (tabsEl) tabsEl.textContent = this.peakTabs;

    const survivalEl = document.getElementById('modal-survival-time');
    if (survivalEl) survivalEl.textContent = survivalFormatted;

    const peakRamEl = document.getElementById('modal-peak-ram');
    if (peakRamEl) peakRamEl.textContent = `${peakRam}%`;

    const peakCpuEl = document.getElementById('modal-peak-cpu');
    if (peakCpuEl) peakCpuEl.textContent = `${peakCpu}%`;

    const peakGpuEl = document.getElementById('modal-peak-gpu');
    if (peakGpuEl) peakGpuEl.textContent = `${Math.round(peakGpu)}%`;

    const freedEl = document.getElementById('modal-freed-ram');
    if (freedEl) freedEl.textContent = `${freedMB} MB`;

    const stopcodeEl = document.getElementById('bsod-stopcode');
    if (stopcodeEl) stopcodeEl.textContent = stopCode;

    // Componentes del dispositivo detectados en BSOD
    const hwCpuEl = document.getElementById('bsod-hw-cpu');
    if (hwCpuEl) hwCpuEl.textContent = `${this.systemSpecs.cpuModel} (${this.systemSpecs.cpuCores} núcleos)`;

    const hwRamEl = document.getElementById('bsod-hw-ram');
    if (hwRamEl) hwRamEl.textContent = `${this.systemSpecs.totalRamGB} GB Total (Pico: ${peakRam}%)`;

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
      `Puntuación:       ${r.score.toLocaleString()} PTS ${r.isNewRecord ? '[¡RÉCORD!]' : ''}`,
      `Tasa de Estrés:   ${r.stressRate}`,
      `Pestañas Pico:    ${r.tabs}`,
      `Supervivencia:    ${r.survivalTime}`,
      `Picos de Carga:   RAM ${r.peakRam} | CPU ${r.peakCpu} | GPU ${r.peakGpu}`,
      `RAM Liberada:     ${r.freedMB}`,
      `----------------------------------------------------`,
      `ESPECIFICACIONES DEL EQUIPO:`,
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

    // Detener cualquier worker o asignación activa previa
    this.stopCpuWorkers();
    this.isCpuMelterActive = false;
    if (this.gpuBurner) this.gpuBurner.stop();
    if (this.ramEaterInterval) {
      clearInterval(this.ramEaterInterval);
      this.ramEaterInterval = null;
    }
    this.isRamEaterActive = false;
    if (this.ramEater) {
      this.ramEater.releaseAll();
    }
    document.querySelectorAll('.multiplier-compact-btn').forEach((c) => c.classList.remove('active'));
    document.querySelectorAll('.mult-tag').forEach((t) => (t.textContent = 'INACTIVO'));
    this.updateMasterMultiplierButtonState();

    // Resetear variables internas de la sesión
    this.score = 0;
    this.tabsCount = 0;
    this.peakTabs = 0;
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

    const flowEl = document.getElementById('flow-rate-display');
    if (flowEl) {
      flowEl.textContent = '+0';
      flowEl.className = 'flow-val';
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
