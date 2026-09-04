// Controlador principal del juego y lógica de benchmarking - Windows Crasher v1.3.0
class WindowsCrasherApp {
  constructor() {
    this.appVersion = 'v1.3.0';
    this.score = 0;
    this.tabsCount = 0;
    this.baseMultiplier = 1.0;
    this.currentRiskMultiplier = 1.0;
    this.riskZoneName = '';
    this.gameStartTime = Date.now();
    this.isGameOver = false;

    // Persistencia y récords (localStorage)
    this.highScore = parseInt(localStorage.getItem('wc_high_score') || '0', 10);
    this.maxTabs = parseInt(localStorage.getItem('wc_max_tabs') || '0', 10);
    this.longestSurvival = parseInt(localStorage.getItem('wc_longest_time') || '0', 10);
    this.totalCrashes = parseInt(localStorage.getItem('wc_total_crashes') || '0', 10);

    // Sistema de Mejoras (Taller de Overclock)
    this.upgrades = {
      ramOptimization: false,   // Reduce peso por pestaña de 64MB a 48MB
      frequencyBoost: false,    // +50% ganancia de puntuación por tick
      cryogenicCooling: false    // +0.5x multiplicador permanente
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

    // Inicializar visualizador de agujas y gráficas
    this.visualizer = new window.HardwareVisualizer();

    // Inicializar módulo GPU
    const gpuCanvas = document.getElementById('gpu-canvas');
    if (gpuCanvas) {
      this.gpuBurner = new window.GpuBurner(gpuCanvas);
    }

    // Configurar escuchadores de eventos del DOM
    this.setupUIEvents();

    // Configurar atajos de teclado
    this.setupKeyboardShortcuts();

    // Conectar eventos IPC de Electron
    this.setupIPC();

    // Iniciar bucle de actualización de puntuación y tiempo
    this.startScoreLoop();
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
      btnAddTab.addEventListener('click', () => {
        this.soundFx.playClick();
        this.addTabs(1);
      });
    }

    // Botón +10 Pestañas
    const btnAdd10 = document.getElementById('btn-add-10-tabs');
    if (btnAdd10) {
      btnAdd10.addEventListener('click', () => {
        this.soundFx.playClick();
        this.addTabs(10);
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

    // Toggle CPU Melter
    const btnCpu = document.getElementById('btn-toggle-cpu');
    if (btnCpu) {
      btnCpu.addEventListener('click', () => this.toggleCpuMelter());
    }

    // Toggle RAM Eater
    const btnRam = document.getElementById('btn-toggle-ram');
    if (btnRam) {
      btnRam.addEventListener('click', () => this.toggleRamEater());
    }

    // Toggle GPU Burner
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

    // Taller de Overclock: Botones de Compra
    this.setupUpgradeButtons();
  }

  setupUpgradeButtons() {
    // 1. Compresión de RAM
    const btnRamOpt = document.getElementById('btn-upgrade-ram-opt');
    if (btnRamOpt) {
      btnRamOpt.addEventListener('click', () => {
        if (!this.upgrades.ramOptimization && this.score >= 500) {
          this.score -= 500;
          this.upgrades.ramOptimization = true;
          this.mbPerTab = 48;
          const mbText = document.getElementById('mb-per-tab-text');
          if (mbText) mbText.textContent = '48';
          btnRamOpt.textContent = '✓ ACTIVO';
          btnRamOpt.disabled = true;
          this.soundFx.playUpgrade();
        }
      });
    }

    // 2. Multiplicador de Frecuencia
    const btnFreq = document.getElementById('btn-upgrade-freq');
    if (btnFreq) {
      btnFreq.addEventListener('click', () => {
        if (!this.upgrades.frequencyBoost && this.score >= 1500) {
          this.score -= 1500;
          this.upgrades.frequencyBoost = true;
          this.scoreFreqMultiplier = 1.5;
          btnFreq.textContent = '✓ ACTIVO';
          btnFreq.disabled = true;
          this.soundFx.playUpgrade();
        }
      });
    }

    // 3. Refrigeración Criogénica
    const btnCooling = document.getElementById('btn-upgrade-cooling');
    if (btnCooling) {
      btnCooling.addEventListener('click', () => {
        if (!this.upgrades.cryogenicCooling && this.score >= 4000) {
          this.score -= 4000;
          this.upgrades.cryogenicCooling = true;
          btnCooling.textContent = '✓ ACTIVO';
          btnCooling.disabled = true;
          this.recalculateMultiplier();
          this.soundFx.playUpgrade();
        }
      });
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

  addTabs(count = 1) {
    if (this.isGameOver) return;

    this.tabsCount += count;
    document.getElementById('tabs-count-display').textContent = this.tabsCount;

    // Asignar memoria física ligera para cada lote de pestañas (~64MB o 48MB si está comprimido)
    for (let i = 0; i < count; i++) {
      this.ramEater.allocateChunkMB(this.mbPerTab);
    }

    // Puntuación inmediata por click que escala con la dificultad actual (más pestañas = más riesgo = más puntos)
    const difficultyScaling = 1 + Math.pow(this.tabsCount / 8, 1.25);
    const clickMultiplier = this.baseMultiplier * this.currentRiskMultiplier * this.scoreFreqMultiplier;
    const instantClickPoints = Math.round(count * 15 * difficultyScaling * clickMultiplier);
    this.score += instantClickPoints;

    this.updateAllocatedRamUI();
    this.updateProcessMatrix();
  }

  updateProcessMatrix() {
    const grid = document.getElementById('process-matrix-grid');
    const counter = document.getElementById('process-matrix-counter');
    if (!grid || !counter) return;

    counter.textContent = `${this.tabsCount} inst.`;

    const currentTiles = grid.children.length;
    const targetTiles = Math.min(80, this.tabsCount);

    if (currentTiles < targetTiles) {
      const fragment = document.createDocumentFragment();
      for (let i = currentTiles; i < targetTiles; i++) {
        const tile = document.createElement('div');
        tile.className = 'tab-tile';
        fragment.appendChild(tile);
      }
      grid.appendChild(fragment);
    }
  }

  toggleCpuMelter() {
    if (this.isGameOver) return;
    const btn = document.getElementById('btn-toggle-cpu');

    if (this.isCpuMelterActive) {
      this.stopCpuWorkers();
      this.isCpuMelterActive = false;
      if (btn) {
        btn.classList.remove('active');
        btn.querySelector('.status-tag').textContent = 'INACTIVO';
      }
      this.soundFx.playPower(false);
    } else {
      const coreCount = this.currentMetrics.cores || 4;
      this.startCpuWorkers(coreCount);
      this.isCpuMelterActive = true;
      if (btn) {
        btn.classList.add('active');
        btn.querySelector('.status-tag').textContent = `ACTIVO (${coreCount} Hilos)`;
      }
      this.soundFx.playPower(true);
    }
    this.recalculateMultiplier();
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
        btn.querySelector('.status-tag').textContent = 'INACTIVO';
      }
      this.soundFx.playPower(false);
    } else {
      this.isRamEaterActive = true;
      if (btn) {
        btn.classList.add('active');
        btn.querySelector('.status-tag').textContent = 'ACTIVO (+256MB/s)';
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
  }

  toggleGpuBurner() {
    if (this.isGameOver || !this.gpuBurner) return;
    const btn = document.getElementById('btn-toggle-gpu');

    if (this.gpuBurner.isActive) {
      this.gpuBurner.stop();
      if (btn) {
        btn.classList.remove('active');
        btn.querySelector('.status-tag').textContent = 'INACTIVO';
      }
      this.soundFx.playPower(false);
    } else {
      this.gpuBurner.start();
      if (btn) {
        btn.classList.add('active');
        btn.querySelector('.status-tag').textContent = 'ACTIVO (Shader 3D)';
      }
      this.soundFx.playPower(true);
    }
    this.recalculateMultiplier();
  }

  recalculateMultiplier() {
    let mult = 1.0;
    if (this.upgrades.cryogenicCooling) mult += 0.5;
    if (this.isCpuMelterActive) mult += 3.0; // Multiplicador aumentado a +3.0x
    if (this.isRamEaterActive) mult += 2.5; // Multiplicador aumentado a +2.5x
    if (this.gpuBurner && this.gpuBurner.isActive) mult += 2.0; // Multiplicador aumentado a +2.0x

    this.baseMultiplier = mult;
    this.updateMultiplierUI();
  }

  updateMultiplierUI() {
    const multDisplay = document.getElementById('multiplier-display');
    if (!multDisplay) return;

    const totalDisplayMult = (this.baseMultiplier * this.currentRiskMultiplier).toFixed(1);
    if (this.riskZoneName) {
      multDisplay.textContent = `x${totalDisplayMult} [${this.riskZoneName}]`;
      multDisplay.className = 'multiplier-tag-header multiplier-danger';
    } else {
      multDisplay.textContent = `x${totalDisplayMult}`;
      multDisplay.className = 'multiplier-tag-header';
    }
  }

  startScoreLoop() {
    setInterval(() => {
      if (this.isGameOver) return;

      const ram = this.currentMetrics.ramPercent;
      const cpu = this.currentMetrics.cpuPercent;

      // Evaluación dinámica del multiplicador de riesgo (Surfeando el límite de hardware)
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

      this.updateMultiplierUI();

      // Puntuación no lineal según pestañas vivas + factor de saturación de recursos
      const tabPower = this.tabsCount * (1 + (this.tabsCount * 0.04));
      const hardwareFactor = (cpu + ram) / 10;
      const tickBase = (tabPower * this.baseMultiplier) + hardwareFactor;
      const tickScore = (tickBase * 0.1) * this.currentRiskMultiplier * this.scoreFreqMultiplier;

      this.score += tickScore;

      const scoreEl = document.getElementById('score-display');
      if (scoreEl) {
        scoreEl.textContent = Math.floor(this.score).toLocaleString();
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

      // Actualizar estado de botones del Taller de Overclock
      this.updateUpgradeButtonStates();
    }, 100);
  }

  updateUpgradeButtonStates() {
    const btnRamOpt = document.getElementById('btn-upgrade-ram-opt');
    if (btnRamOpt && !this.upgrades.ramOptimization) {
      btnRamOpt.disabled = this.score < 500;
    }

    const btnFreq = document.getElementById('btn-upgrade-freq');
    if (btnFreq && !this.upgrades.frequencyBoost) {
      btnFreq.disabled = this.score < 1500;
    }

    const btnCooling = document.getElementById('btn-upgrade-cooling');
    if (btnCooling && !this.upgrades.cryogenicCooling) {
      btnCooling.disabled = this.score < 4000;
    }
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

  // Evaluación objetiva de Tiers basada en resistencia, pestañas y multiplicadores
  evaluatePlayerRank(finalScore, tabs, survivalSec) {
    // Tier S: Leyenda de la sobrecarga
    if ((survivalSec >= 90 && tabs >= 30) || tabs >= 60 || finalScore >= 50000) {
      return { tier: 'TIER S', title: 'DESTRUCTOR DE SILICIO' };
    }
    // Tier A: Maestro del overclock
    if (survivalSec >= 45 || tabs >= 35 || finalScore >= 20000) {
      return { tier: 'TIER A', title: 'OVERCLOCKER MAESTRO' };
    }
    // Tier B: Tester veterano
    if (survivalSec >= 20 || tabs >= 15 || finalScore >= 8000) {
      return { tier: 'TIER B', title: 'STRESS TESTER' };
    }
    // Tier C: Operador estándar
    if (survivalSec >= 10 || finalScore >= 2000) {
      return { tier: 'TIER C', title: 'OPERADOR ESTÁNDAR' };
    }
    // Tier D: Colapso prematuro
    return { tier: 'TIER D', title: 'COLAPSO TEMPRANO' };
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
    document.querySelectorAll('.multiplier-card').forEach((c) => c.classList.remove('active'));
    document.querySelectorAll('.status-tag').forEach((t) => (t.textContent = 'INACTIVO'));

    // 4. Calcular métricas finales y estadísticas de récord
    const finalScore = Math.floor(this.score);
    const elapsedSec = Math.floor((Date.now() - this.gameStartTime) / 1000);
    const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
    const secs = (elapsedSec % 60).toString().padStart(2, '0');
    const survivalFormatted = `${mins}:${secs}`;

    const peakCpu = metrics ? (metrics.peakCpu || this.currentMetrics.peakCpu) : this.currentMetrics.peakCpu;
    const peakRam = metrics ? (metrics.peakRam || this.currentMetrics.peakRam) : this.currentMetrics.peakRam;

    // Actualizar récords locales
    let isNewRecord = false;
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      localStorage.setItem('wc_high_score', this.highScore.toString());
      isNewRecord = true;
    }
    if (this.tabsCount > this.maxTabs) {
      this.maxTabs = this.tabsCount;
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
    const rankData = this.evaluatePlayerRank(finalScore, this.tabsCount, elapsedSec);

    // Guardar reporte forense conciso para portapapeles
    this.lastCrashReport = {
      version: this.appVersion,
      timestamp: new Date().toISOString(),
      stopCode,
      tier: rankData.tier,
      tierTitle: rankData.title,
      score: finalScore,
      tabs: this.tabsCount,
      survivalTime: survivalFormatted,
      peakCpu: `${peakCpu}%`,
      peakRam: `${peakRam}%`,
      freedMB: `${freedMB} MB`,
      isNewRecord
    };

    // 6. Poblar datos en la BSOD minimalista
    const scoreValEl = document.getElementById('modal-score');
    if (scoreValEl) scoreValEl.textContent = finalScore.toLocaleString();

    const tierBadgeEl = document.getElementById('bsod-tier-badge');
    if (tierBadgeEl) tierBadgeEl.textContent = rankData.tier;

    const tierTitleEl = document.getElementById('bsod-tier-title');
    if (tierTitleEl) tierTitleEl.textContent = rankData.title;

    const tabsEl = document.getElementById('modal-tabs');
    if (tabsEl) tabsEl.textContent = this.tabsCount;

    const survivalEl = document.getElementById('modal-survival-time');
    if (survivalEl) survivalEl.textContent = survivalFormatted;

    const peakRamEl = document.getElementById('modal-peak-ram');
    if (peakRamEl) peakRamEl.textContent = `${peakRam}%`;

    const peakCpuEl = document.getElementById('modal-peak-cpu');
    if (peakCpuEl) peakCpuEl.textContent = `${peakCpu}%`;

    const freedEl = document.getElementById('modal-freed-ram');
    if (freedEl) freedEl.textContent = `${freedMB} MB`;

    const stopcodeEl = document.getElementById('bsod-stopcode');
    if (stopcodeEl) stopcodeEl.textContent = stopCode;

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
      `WINDOWS CRASHER [${r.version}] - INFORME BSOD`,
      `=============================================`,
      `Código de Parada: ${r.stopCode}`,
      `Nivel Alcanzado:  ${r.tier} (${r.tierTitle})`,
      `Puntuación:       ${r.score.toLocaleString()} PTS ${r.isNewRecord ? '[¡RÉCORD!]' : ''}`,
      `Pestañas:         ${r.tabs}`,
      `Supervivencia:    ${r.survivalTime}`,
      `Picos de Carga:   RAM ${r.peakRam} | CPU ${r.peakCpu}`,
      `RAM Liberada:     ${r.freedMB}`,
      `=============================================`
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
    this.baseMultiplier = 1.0;
    this.currentRiskMultiplier = 1.0;
    this.riskZoneName = '';
    this.gameStartTime = Date.now();
    this.isGameOver = false;

    // Resetear mejoras del taller
    this.upgrades = { ramOptimization: false, frequencyBoost: false, cryogenicCooling: false };
    this.scoreFreqMultiplier = 1.0;
    this.mbPerTab = 64;

    const mbText = document.getElementById('mb-per-tab-text');
    if (mbText) mbText.textContent = '64';

    const btnRamOpt = document.getElementById('btn-upgrade-ram-opt');
    if (btnRamOpt) { btnRamOpt.textContent = '500 pts'; btnRamOpt.disabled = true; }

    const btnFreq = document.getElementById('btn-upgrade-freq');
    if (btnFreq) { btnFreq.textContent = '1.5k pts'; btnFreq.disabled = true; }

    const btnCooling = document.getElementById('btn-upgrade-cooling');
    if (btnCooling) { btnCooling.textContent = '4.0k pts'; btnCooling.disabled = true; }

    // Limpiar matriz de procesos
    const grid = document.getElementById('process-matrix-grid');
    if (grid) grid.innerHTML = '';
    const counter = document.getElementById('process-matrix-counter');
    if (counter) counter.textContent = '0 inst.';

    // Resetear textos en la UI
    document.getElementById('score-display').textContent = '0';
    document.getElementById('tabs-count-display').textContent = '0';
    document.getElementById('survival-time').textContent = '00:00';
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
