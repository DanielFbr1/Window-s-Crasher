# Historial de Actualizaciones - Windows Crasher

Este documento mantiene un registro cronológico de todas las versiones, modificaciones y mejoras implementadas en el proyecto para facilitar el contexto y seguimiento a usuarios y agentes.

---

## [v1.5.0] - 2026-09-04
### Osciloscopio en Panel Derecho, Motor de Estrés Anti-AFK, Hitos Automáticos y Tiers por Tasa de Flujo
- **Reubicación del Osciloscopio y Eliminación del Viewport GPU**:
  - El canvas visible de shader de la GPU (`#gpu-canvas`) ha sido eliminado de la interfaz gráfica. El motor WebGL de raymarching intensivo ahora corre de forma offscreen/invisible, manteniendo el botón `🌌 GPU BURNER` activo para estresar la gráfica y otorgar el bono de `+2.0x` sin consumir espacio de pantalla.
  - El osciloscopio en tiempo real (`#history-canvas`, 15 segundos a 4 Hz con telemetría de CPU, RAM y umbral crítico del 92%) se traslada a la parte superior de la columna derecha, colocándose sobre los multiplicadores compactos.
- **Rediseño Completo de Puntuación: Motor Anti-AFK y Densidad de Estrés**:
  - **Erradicación del farmeo pasivo/AFK**: Abrir la aplicación y no tocar nada ahora produce exactamente **0 pts/segundo**.
  - **Fórmula de Tasa de Flujo por Densidad de Hardware**: Los puntos por segundo ahora se calculan como una función no lineal de la saturación del equipo:
    $$\text{Tasa (pts/s)} = (\text{Pestañas} \times 22 + \text{MultiplicadoresActivos} \times 42) \times \left(\frac{\text{CPU}\% + \text{RAM}\%}{100}\right)^{1.8} \times \text{MultBase} \times \text{Riesgo} \times \text{Racha} \times \text{Frecuencia}$$
    Sostener el hardware al 85%+ de carga genera más de 15 veces más puntos por segundo que mantenerlo en reposo.
  - **Sistema de Racha de Sobrecarga (Overload Streak)**: Mantener el sistema en la zona de peligro (>80% de RAM o CPU) incrementa un temporizador continuo de racha que multiplica exponencialmente el flujo de puntos:
    - *10s sostenidos*: Multiplicador **x1.5** (`CALIENTE`)
    - *25s sostenidos*: Multiplicador **x2.5** (`SOBRECARGA`)
    - *45s sostenidos*: Multiplicador **x4.0** (`CRÍTICO AL BORDE DEL COLAPSO`)
    - Abrir 25 pestañas con CPU Melter y RAM Eater durante 1 minuto genera decenas de miles de puntos, premiando la habilidad y el riesgo frente a la inactividad.
  - **Nueva Tarjeta de Telemetría de Flujo**: Ubicada en la columna izquierda, muestra en tiempo real la tasa de flujo (`+XXX pts/s`), el multiplicador de racha y el tiempo continuado bajo estrés extremo.
- **Rediseño de "Gastar Puntos": Hitos de Sobrecarga Automáticos**:
  - Se eliminó el gasto de puntuación para no perjudicar el récord del jugador.
  - Ahora las ventajas se desbloquean de forma automática por maestría y estrés:
    - *Compresión de RAM (48MB/tab)*: Auto-desbloqueo al alcanzar 12 pestañas vivas simultáneas.
    - *Inyección de Frecuencia (+50% pts/s)*: Auto-desbloqueo al acumular 15 segundos en alta carga (>75%).
    - *Disipador Criogénico (+0.5x Mult permanente)*: Auto-desbloqueo al encender 2 o más multiplicadores simultáneos.
    - Las tarjetas de hitos cambian su estado visual a verde neón (`DESBLOQUEADO / ACTIVO`) con feedback sonoro al alcanzarse.
- **Evaluación por Intensidad de Estrés en Pantalla de Game Over (BSOD)**:
  - Los rangos en la pantalla azul (BSOD) se evalúan según la **Tasa Media de Estrés (pts/s)** lograda durante la sesión, las pestañas pico y el tiempo de supervivencia bajo estrés:
    - **TIER S (DESTRUCTOR DE SILICIO)**: Tasa media >= 600 pts/s o 30+ pestañas bajo estrés crítico prolongado.
    - **TIER A (OVERCLOCKER MAESTRO)**: Tasa media >= 260 pts/s o 18+ pestañas bajo estrés.
    - **TIER B (STRESS TESTER)**: Tasa media >= 90 pts/s o 10+ pestañas.
    - **TIER C (OPERADOR CAUTELOSO)**: Tasa media >= 20 pts/s.
    - **TIER D (INACTIVO / SIN ESTRÉS)**: Penalización directa a jugadores AFK que no arriesgan hardware.
  - Nuevo indicador en la BSOD: *Tasa Media Estrés: XXX pts/s*.
  - Colores distintivos oficiales por Tier en la insignia BSOD.
- **Sincronización Global de Versión**:
  - Versión actualizada a `v1.5.0` en `package.json`, `tauri.conf.json`, `Cargo.toml`, `start.bat`, `preload.js`, `main.js`, `index.html`, `tabVisualizer.js` y `app.js`.

---

## [v1.4.0] - 2026-09-04
### Reorganización Espacial del Dashboard, Viewport de Animación del Caos y Multiplicadores Minimalistas
- **Reubicación del Osciloscopio a la Columna Izquierda**:
  - El gráfico en tiempo real de carga de CPU, RAM y umbral del 92% (4 Hz / 15 segundos) se traslada a la columna izquierda, ubicándose de forma ergonómica justo debajo de los botones de pestañas y sobre el taller de overclock.
- **Nuevo Viewport Central de Animaciones (`src/renderer/js/tabVisualizer.js`)**:
  - Escenario gráfico interactivo en Canvas 2D a 60fps situado en la columna central, directamente bajo las agujas analógicas:
    - **Cascada de Ventanas Virtuales**: Cada vez que el jugador pulsa `+1` o `+10` pestañas, se generan ventanas interactivas con barra de título, controles de ventana y datos simulados que caen, se apilan y vibran según el uso del hardware.
    - **Efectos Dinámicos de Multiplicadores**:
      - *CPU Melter*: Emisión de chispas y ondas térmicas ascendentes.
      - *RAM Eater*: Cascada continua de bloques de memoria hexadecimal y flujos de datos binarios cayendo al buffer.
      - *GPU Burner*: Vórtice y gradiente de luz púrpura con distorsión cibernética.
    - **Efectos de Tensión Crítica**: Cuando la RAM supera el 88% o la CPU el 95%, el viewport activa sacudida de pantalla (*screen shake*) y barrido láser de advertencia.
- **Multiplicadores Compactos y Minimalistas**:
  - Reubicados en la columna derecha en un formato limpio y elegante sin bloques de texto explicativos:
    - `🔥 CPU MELTER (+3.0x) [1]`
    - `💾 RAM EATER (+2.5x) [2]`
    - `🌌 GPU BURNER (+2.0x) [3]`
  - Diseño táctil compacto con indicadores de estado luminoso (`INACTIVO` / `ACTIVO`) y atajos de teclado.
- **Sincronización Global de Versión**:
  - Actualización a `v1.4.0` en `package.json`, `tauri.conf.json`, `Cargo.toml`, `start.bat`, `preload.js`, `main.js`, `index.html` y `app.js`.
  - Verificación con detector Impeccable: **0 anti-patrones detectados**.
  - Repositorio Git local actualizado y sincronizado con GitHub.

---

## [v1.3.0] - 2026-09-04
### Sistema de Puntuación por Dificultad Dinámica, BSOD Minimalista de Windows y GitHub
- **Sistema de Puntuación Exponencial y Basado en Riesgo de Hardware**:
  - **Puntos Inmediatos por Clic (+1 y +10 pestañas)**: Añadir pestañas cuando ya hay muchas abiertas es mucho más peligroso; la recompensa por clic ahora escala exponencialmente con `(Tabs / 8)^1.25 * MultiplicadorTotal`.
  - **Puntuación Pasiva Continua**: Generación no lineal basada en pestañas activas `Tabs * (1 + Tabs * 0.04)`.
  - **Multiplicadores Pesados Aumentados**:
    - CPU Melter: Incrementado a **+3.0x** por la sobrecarga criptográfica multinúcleo.
    - RAM Eater: Incrementado a **+2.5x** por el mapeo continuo de memoria física en Windows.
    - GPU Burner: Incrementado a **+2.0x** por el raymarching 3D procedural.
  - **Multiplicador Dinámico de Zona de Peligro (Surfing the Limit)**:
    - Cuando la RAM supera el 88% o la CPU supera el 95%: Multiplicador de riesgo de **x2.5** (*ZONA CRÍTICA* con alerta visual animada).
    - Cuando la RAM supera el 80% o la CPU supera el 90%: Multiplicador de riesgo de **x1.5** (*ALTO RIESGO*).
    - Recompensa masiva para los jugadores que arriesguen manteniéndose al filo del 92% sin disparar el Watchdog.
- **Pantalla de Game Over: Auténtica BSOD Minimalista de Windows 10/11**:
  - Fondo azul oficial de la pantalla azul de la muerte (`#0078d7`) a pantalla completa.
  - **Carita triste `:(` arreglada**: Proporción limpia en tipografía `Segoe UI` nativa de Windows (tamaño 6.5rem, peso 300).
  - **Texto reducido y minimalista**: Mensaje conciso y directo de Windows (`Se ha producido un problema en su PC y necesita reiniciarse`).
  - **Puntuación Heroica y Tiers Objetivos**:
    - Cifra principal gigante (`54,320 PTS`).
    - Clasificación en niveles según tiempo y dificultad resistida:
      - **TIER S - DESTRUCTOR DE SILICIO**: Supervivencia &ge; 90s con &ge; 30 pestañas o &ge; 60 pestañas vivas.
      - **TIER A - OVERCLOCKER MAESTRO**: Supervivencia &ge; 45s o &ge; 35 pestañas vivas.
      - **TIER B - STRESS TESTER**: Supervivencia &ge; 20s o &ge; 15 pestañas vivas.
      - **TIER C - OPERADOR ESTÁNDAR**: Supervivencia &ge; 10s.
      - **TIER D - COLAPSO TEMPRANO**: Caída en menos de 10s.
  - Código de detención claro y botones simplificados: `Reiniciar Equipo [R]` y `Copiar Resumen`.
- **Integración con Repositorio GitHub**:
  - Creación de `.gitignore` excluyendo `node_modules`, `dist` y temporales.
  - Inicialización del repositorio Git local en rama `main`.
  - Vinculación del remoto oficial: `https://github.com/DanielFbr1/Window-s-Crasher.git`.
- **Sincronización Global de Versión a v1.3.0**:
  - Actualización visible en cabecera, pie de página, BSOD y configuración de Electron y Tauri.

---

## [v1.2.0] - 2026-09-04
### Rediseño Impeccable, Pantalla BSOD Kernel Panic y Acabado del Juego
- **Erradicación de Anti-Patrones de Diseño (Skill Impeccable)**:
  - Eliminación total de bordes saturados unilaterales (`border-left` grueso en tarjetas y modales) y de resplandores planos sin elevación.
  - Reemplazo de transiciones que provocaban saltos de diseño (`transition: width`) por aceleración por GPU con `transform: scaleX(...)` y `transform-origin: left`.
  - Estilización coherente de superficies nativas del navegador: selección de texto personalizada (`::selection`), barra de desplazamiento temática (`::-webkit-scrollbar`) y anillos de foco accesibles (`:focus-visible`).
  - Jerarquía tipográfica consistente y números tabulares (`font-variant-numeric: tabular-nums`) para evitar oscilaciones en telemetría y contadores.
  - Validación con detector mecánico de Impeccable: **0 anti-patrones detectados** tanto en CSS como en HTML.
- **Nueva Pantalla de Game Over (Kernel Crash Dump / BSOD Forense)**:
  - Transformación radical del modal genérico en una pantalla azul de la muerte (BSOD) retro-industrial inmersiva.
  - Códigos de parada específicos según el disparador: `WATCHDOG_RAM_OVERFLOW`, `CPU_THERMAL_MELTDOWN`, `KERNEL_FREEZE_LATENCY_EXCEEDED` o `USER_EMERGENCY_PANIC_ABORT`.
  - Sistema de calificación y rangos de desempeño (Rango S: *Destructor Cuántico*, Rango A: *Maestro del Overclock*, Rango B: *Tester de Estrés Senior*, etc.).
  - Cuadrícula forense con 6 métricas clave: Puntuación Final, Pestañas Abiertas, Supervivencia, Picos de CPU y RAM, Overclocks Activos y Memoria Purgada.
  - Funcionalidad de "Copiar Informe Forense" al portapapeles en formato técnico para compartir y comparar resultados de benchmark.
  - Reinicio en frío instantáneo (`Cold Boot`) pulsando la tecla `[R]` o el botón principal.
- **Mecánicas Completas de Jugabilidad y Taller de Overclock**:
  - **Persistencia de Récords (High Scores)** en `localStorage`: Mejor puntuación histórica, máximo de pestañas, mayor tiempo de supervivencia y conteo total de caídas del sistema.
  - **Taller de Overclock**: Tres mejoras desbloqueables gastando puntos de sesión:
    1. *Compresión de Memoria* (500 pts): Reduce la huella física de cada pestaña a 48MB (permite abrir más antes del umbral crítico).
    2. *Overclock de Frecuencia* (1.5k pts): Incrementa la generación pasiva de puntuación en +50%.
    3. *Disipador Criogénico* (4.0k pts): Otorga +0.5x permanente al multiplicador base.
  - **Matriz de Procesos en RAM**: Cuadrícula visual dinámica donde se apilan físicamente las baldosas de procesos a medida que se abren pestañas.
- **Controles de Audio y Accesibilidad**:
  - Botón de silencio (Mute / Unmute `🔊 / 🔇`) en el encabezado con atajo rápido en la tecla `[M]`.
  - Efectos sonoros procedurales ampliados: sonido de compra de mejoras, ráfaga de ruido glitch para el crash dump y tono limpio de post-reboot.
- **Atajos de Teclado Globales**:
  - `[ESPACIO]`: +1 Pestaña rápida.
  - `[1]`, `[2]`, `[3]`: Alternar CPU Melter, RAM Eater y GPU Burner.
  - `[M]`: Conmutar audio.
  - `[ESC]`: Aborto de emergencia inmediato.
  - `[R]`: Reinicio tras la pantalla de Game Over.
- **Sincronización Global de Versión**:
  - Actualización a `v1.2.0` en `package.json`, `tauri.conf.json`, `Cargo.toml`, `start.bat`, `preload.js`, `main.js`, `index.html` y `app.js`.

---

## [v1.1.0] - 2026-09-03
### Arquitectura Multihilo Dedicada y Sintetizador de Audio Procedural
- **Hilo Independiente de Monitorización (`src/main/monitorWorker.js`)**:
  - Implementación de un `Worker Thread` (`worker_threads`) aislado de Node.js que ejecuta de manera completamente desacoplada el bucle de telemetría a 250ms y el Watchdog.
  - Asegura que el Watchdog nunca sufra interferencias por pausas de recolección de basura o pintado del proceso visual, detectando con exactitud si el kernel de Windows o el event loop sufre un delta >600ms.
- **Sintetizador de Audio Procedural Retro (`src/renderer/js/soundFx.js`)**:
  - Generación acústica sintética usando la Web Audio API (sin dependencias de archivos externos):
    - Clic táctil de teclado al abrir pestañas normales (+1 y +10).
    - Zumbido armónico ascendente/descendente al activar o pausar multiplicadores pesados (CPU/RAM/GPU).
    - Beep pulsante de aviso cuando la RAM alcanza el 88% o la CPU supera el 95%.
    - Sirena de alarma de fusión (meltdown) al dispararse el Game Over o el botón de pánico.
    - Tono agudo de booteo/reinicio de sistema.
- **Sincronización Global de Versiones**:
  - Actualización sincronizada a `v1.1.0` en `package.json`, `tauri.conf.json`, `Cargo.toml`, `start.bat`, `preload.js`, interfaz gráfica (`index.html`) y núcleo lógico (`app.js`).

---

## [v1.0.0] - 2026-09-03
### Inicialización y Creación del Prototipo Base
- **Stack Base**: Electron + Node.js nativo (v24) optimizado para telemetría sin latencia distorsionadora.
- **Módulo de Monitorización y Watchdog (`src/main/monitor.js`)**:
  - Lectura en tiempo real de RAM (%) y CPU (%) cada 250ms usando APIs nativas de bajo nivel (`os.cpus()`, `os.freemem()`, `os.totalmem()`).
  - Watchdog de seguridad con disparo de Game Over si:
    1. La memoria RAM supera el 92%.
    2. El uso de CPU se mantiene al 98%+ de forma continua durante más de 3 segundos (12 ticks de 250ms).
    3. El intervalo entre lecturas sufre un retraso (delta) superior a 600ms de forma consecutiva (detección de congelamiento de SO).
- **Mecánicas de Juego Incremental (`src/renderer/`)**:
  - **Añadir Pestañas (+1 Pestaña)**: Genera pestañas virtuales y retiene bloques de memoria ligera (~50-100MB).
  - **CPU Melter**: Despliegue de Web Workers dedicados paralelos con bucles criptográficos y de números primos sobre los núcleos físicos detectados.
  - **RAM Eater**: Asignación activa de bloques continuos `ArrayBuffer` rellenados con `Uint8Array` para forzar asignación física en Windows.
  - **GPU Burner**: Canvas con aceleración WebGL 2.0 ejecutando un fragment shader procedural intensivo.
  - **Sistema de Puntuación**: Puntuación continua calculada como `(Pestañas * Multiplicador) + (% Recursos / 10)`.
- **Interfaz de Usuario Retro-Futurista**:
  - Diseño estilo panel de control CRT industrial con indicadores luminosos LED.
  - Agujas analógicas SVG para CPU y RAM con zonas de advertencia y peligro.
  - Gráfica en tiempo real con historial de los últimos 30 segundos.
  - Botón de Pánico de emergencia para detención manual.
  - Pantalla modal de Game Over con resumen de estadísticas y pico de recursos.
  - Visualización visible y destacada de la versión del sistema (`v1.0.0`).
