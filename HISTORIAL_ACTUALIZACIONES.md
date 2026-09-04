# Historial de Actualizaciones - Windows Crasher

Este documento mantiene un registro cronológico de todas las versiones, modificaciones y mejoras implementadas en el proyecto para facilitar el contexto y seguimiento a usuarios y agentes.

## [v2.5.0] - 2026-09-04
### Integración del Modelo de Donaciones Ko-fi e Implementación de Soporte Nativo para Android (Capacitor)
- **Integración del Modelo "Pay What You Want" / Donaciones con Ko-fi**:
  - **Botón Directo en la Cabecera**: Se agregó un botón temático `☕ Ko-fi` en la barra superior del dashboard (`#btn-kofi`), estilizado con efectos de hover dorados/ámbar y microinteracciones.
  - **Botón de Apoyo en Pantalla BSOD (Game Over)**: Integrado el botón `☕ APOYAR EN KO-FI` en la pantalla de informe de colapso (`#btn-kofi-bsod`) junto al botón de reinicio, permitiendo a los jugadores felicitar o apoyar al creador tras finalizar una partida de benchmark.
  - **Apertura Externa Segura Multiplataforma**:
    - En **Electron**, se utiliza el nuevo canal IPC `'open-external'` en `main.js` y `preload.js` vía `shell.openExternal()`.
    - En **Navegador web / Android móvil**, se utiliza `window.open(url, '_blank')` de forma transparente.
    - URL enlazada configurada: `https://ko-fi.com/danielfbr`.
- **Soporte Nativo y Despliegue para Android (Capacitor)**:
  - **Integración de Capacitor Core, CLI y Android Engine**:
    - Incorporación de dependencias `@capacitor/core`, `@capacitor/cli` y `@capacitor/android`.
    - Configuración en [capacitor.config.json](file:///c:/Users/VALIMANA/Desktop/Proyectos/Window's%20Crasher/capacitor.config.json) con identificador `com.danielfbr.windowscrasher` y directorio web `src/renderer`.
    - Generación completa del proyecto nativo Android con Gradle en el directorio `android/`.
  - **Motor Autónomo de Telemetría y Watchdog para Móviles/Web ([app.js](file:///c:/Users/VALIMANA/Desktop/Proyectos/Window's%20Crasher/src/renderer/js/app.js))**:
    - Debido a que en Android no existen las APIs del sistema operativo de Node.js (`os.freemem`, etc.), se implementó un bucle independiente `startStandaloneTelemetryLoop()` a 250ms.
    - Simula y refleja en tiempo real el consumo de RAM (partiendo de 4GB base y escalando con `ramEater` y `tabsCount`), la CPU (oscilando dinámicamente con `cpuMelter`), y la telemetría real de `gpuBurner` mediante WebGL.
    - Ejecuta el **Watchdog Engine** idéntico al de escritorio: si la RAM supera el 90.0%, la CPU el 95.0% o la GPU el 90.0% durante más de 2.5s continuos, desencadena el BSOD de Game Over con análisis de causa raíz.
  - **Nuevos Scripts npm para Android**:
    - `npm run cap:sync`: Sincroniza automáticamente los archivos web de `src/renderer` dentro del proyecto Android nativo.
    - `npm run cap:open`: Abre el proyecto Android nativo en Android Studio listo para conectar un teléfono físico o emulador y generar el APK (`Build > Build Bundle(s) / APK(s) > Build APK(s)`).
- **Sincronización Global de Versión v2.5.0**:
  - Versión elevada a **`v2.5.0`** en `package.json`, `index.html`, `app.js`, `gpuBurner.js`, `gauges.js`, `main.js`, `preload.js`, `tauri.conf.json`, `src-tauri/Cargo.toml` y `start.bat`.

---

## [v2.4.0] - 2026-09-04
### Configuración de Compilación y Distribución de Ejecutables con Electron-Builder
- **Soporte Completo de Empaquetado en [package.json](file:///c:/Users/VALIMANA/Desktop/Proyectos/Window's%20Crasher/package.json)**:
  - Se configuró el bloque de empaquetado nativo con `electron-builder` (`appId: com.danielfbr.windowscrasher`).
  - **Generación Dual de Salidas Windows en `dist/`**:
    - **Instalador NSIS**: `Windows Crasher Setup.exe` con asistente de instalación guiado, accesos directos personalizables en Escritorio y Menú Inicio.
    - **Ejecutable Portable**: `Windows Crasher-v2.4.0-Portable.exe`, ejecutable autocontenido listo para jugar sin instalación ni permisos de administrador.
  - **Nuevos Scripts npm de Compilación**:
    - `npm run pack`: Empaquetado rápido sin comprimir instalador (modo directorio para pruebas).
    - `npm run dist`: Compila el instalador y la versión portable para Windows en `dist/`.
    - `npm run dist:portable`: Genera exclusivamente el ejecutable portable.
- **Sincronización Global de Versión v2.4.0**:
  - Versión elevada a **`v2.4.0`** en `package.json`, `index.html`, `app.js`, `gpuBurner.js`, `gauges.js`, `main.js`, `tauri.conf.json`, `src-tauri/Cargo.toml` y `start.bat`.

---

## [v2.3.0] - 2026-09-04
### Corrección del Exploit de GPU Burner en Vacío (Bloqueo de Puntos sin Pestañas y Calibración de Carga) y Limpieza de Atajos en Botones
- **Eliminación del Exploit de GPU Burner con 0 Pestañas**:
  - *Problema resuelto*: Al activar GPU Burner sin abrir ninguna pestaña, la GPU se mantenía de forma fija en un 87.5% - 89.5% (justo por debajo del límite de corte del 90.0%), permitiendo generar puntos pasivos de forma infinita y sin riesgo de Game Over.
  - *Calibración de Carga de GPU ([gpuBurner.js](file:///c:/Users/VALIMANA/Desktop/Proyectos/Window's%20Crasher/src/renderer/js/gpuBurner.js))*:
    - Con **0 pestañas abiertas**, GPU Burner opera en vacío consumiendo únicamente entre el **28.0% y 34.0%** de GPU, evitando situarse en el filo de navaja ni amagar con el 90%.
    - La carga gráfica ahora escala agresivamente en función de las **pestañas activas** (`+5.2%` por cada ventana) y suma acumulación térmica gradual (`+0.4%/s` hasta un máximo de +10%). Con 8-10 pestañas abiertas, la GPU alcanza la franja crítica del 88% al 96%, obligando a gestionar la descompresión con `−1` o `−10` pestañas o desactivar el acelerador antes de que pasen los 2.5s sostenidos del Watchdog.
- **Bloqueo Total de Flujo de Puntos con 0 Pestañas ([app.js](file:///c:/Users/VALIMANA/Desktop/Proyectos/Window's%20Crasher/src/renderer/js/app.js))**:
  - Si no hay al menos 1 pestaña abierta (`tabsCount <= 0`), la tasa de generación de puntos automática es estrictamente **0 pts/s** (`this.currentFlowRate = 0`).
  - La sinergia de multiplicadores ahora multiplica exclusivamente las pestañas abiertas activas (`tabMultiplier = this.tabsCount * 0.75`), impidiendo sumar puntos si no hay ventanas vivas que estén siendo estresadas.
- **Limpieza de Indicadores de Atajos de Teclado en Botones ([index.html](file:///c:/Users/VALIMANA/Desktop/Proyectos/Window's%20Crasher/src/renderer/index.html))**:
  - Se eliminaron los textos de hotkeys dentro de los pulsadores de la columna derecha (`[ESPACIO]`, `[RETROCESO]`, `[SHIFT+ESP]`, `[SHIFT+RET]`, `[T]`, `[1]`, `[2]`, `[3]`, `[ESC]`).
  - Los atajos siguen plenamente funcionales y se encuentran organizados de forma limpia en el pie de página del dashboard.
- **Sincronización Global de Versión v2.3.0**:
  - Versión elevada a **`v2.3.0`** en `index.html`, `app.js`, `gpuBurner.js`, `gauges.js`, `main.js`, `package.json`, `tauri.conf.json`, `src-tauri/Cargo.toml` y `start.bat`.

---

## [v2.2.0] - 2026-09-04
### Limpieza Visual de Interfaz y Simplificación Minimalista de Controles
- **Eliminación de Textos Redundantes y Sobrecarga Visual**:
  - **Hitos de Sobrecarga**: Se retiró la etiqueta de subtítulo `Automáticos (Sin Gastar Puntos)`.
  - **Multiplicadores de Carga**: Se retiraron los multiplicadores de texto explícitos (`+7.5x` en Sobrecarga Total, `+3.0x` en CPU Melter, `+2.5x` en RAM Eater y `+2.0x` en GPU Burner), dejando los botones con un aspecto limpio, minimalista y directo (nombre, hotkey y tag de estado `ACTIVO`/`INACTIVO`).
  - **Protocolo de Emergencia**: Se eliminó el título encabezado redundante `Protocolo de Emergencia` sobre el botón de aborto, manteniendo únicamente el pulsador de acción directa `🛑 ABORTO DE EMERGENCIA [ESC]`.
  - **Matriz de Acciones de Pestañas**: Se eliminaron las etiquetas secundarias con texto explicativo de puntos y capacidad (`(+50 PTS / 64MB)`, `(−50 PTS / ALIVIO)`, `(+500 PTS / RÁFAGA)`, `(−500 PTS / PURGA)`). Los botones conservan su título principal nítido (`+1 PESTAÑA`, `−1 PESTAÑA`, `+10 PESTAÑAS`, `−10 PESTAÑAS`) y sus atajos de teclado (`[ESPACIO]`, `[RETROCESO]`, `[SHIFT+ESP]`, `[SHIFT+RET]`).
- **Sincronización Global de Versión v2.2.0**:
  - Versión elevada a **`v2.2.0`** en `index.html`, `app.js`, `gauges.js`, `main.js`, `package.json`, `tauri.conf.json`, `src-tauri/Cargo.toml` y `start.bat`.

---

## [v2.1.0] - 2026-09-04
### Penalización de Puntuación al Restar Pestañas (-50 pts por pestaña) y Etiquetas Informativas en Matriz de Control
- **Penalización Simétrica por Descompresión de Memoria**:
  - Al restar pestañas (`−1 PESTAÑA` o `−10 PESTAÑAS`), ahora se descuentan **50 puntos por cada pestaña restada** (`-50 pts` y `-500 pts` respectivamente).
  - La deducción se aplica de forma inmediata al marcador (`this.score = Math.max(0, this.score - pointsLost)`), impidiendo que el valor caiga por debajo de cero.
  - **Eliminación de Exploits de Farmeo**: Corrige la asimetría por la cual un usuario podía farmear puntos pulsando repetidamente `+10` y `−10` pestañas sin riesgo ni coste de puntuación. Ahora purgar pestañas alivia la presión sobre el umbral crítico de RAM (90%), pero penaliza directamente el resultado del benchmark.
- **Actualización de Etiquetas Visuales en la Matriz de Acciones**:
  - `+1 PESTAÑA`: `(+50 PTS / 64MB)`
  - `−1 PESTAÑA`: `(−50 PTS / ALIVIO)`
  - `+10 PESTAÑAS`: `(+500 PTS / RÁFAGA)`
  - `−10 PESTAÑAS`: `(−500 PTS / PURGA)`
- **Sincronización Global de Versión v2.1.0**:
  - Versión elevada a **`v2.1.0`** en `index.html`, `app.js`, `gauges.js`, `main.js`, `package.json`, `tauri.conf.json`, `src-tauri/Cargo.toml` y `start.bat`.

---

## [v2.0.0] - 2026-09-04
### Reducción de Límites de Watchdog (CPU 95%, RAM 90%, GPU 90%) y Nueva Filosofía de Puntuación Condicionada a Multiplicadores
- **Reducción de Límites de Hardware del Watchdog**:
  - **Límite de CPU**: Reducido de 98.0% a **95.0%** sostenido (`cpuThreshold: 95.0`). Se recalibró [cpuMelter.worker.js](file:///c:/Users/VALIMANA/Desktop/Proyectos/Window's%20Crasher/src/renderer/workers/cpuMelter.worker.js) para que `CPU Melter` alcance entre 94% y 97% de saturación, desafiando activamente el límite en lugar de mantenerse en bucle infinito pasivo.
  - **Límite de RAM**: Reducido de 92.0% a **90.0%** (`ramThreshold: 90.0`).
  - **Límite de GPU**: Incorporado formalmente en **90.0%** en [app.js](file:///c:/Users/VALIMANA/Desktop/Proyectos/Window's%20Crasher/src/renderer/js/app.js) (`WATCHDOG_GPU_THERMAL_OVERHEAT`). En [gpuBurner.js](file:///c:/Users/VALIMANA/Desktop/Proyectos/Window's%20Crasher/src/renderer/js/gpuBurner.js), el estrés de raymarching de `GPU Burner` ahora se amplifica según las pestañas abiertas, pudiendo superar el 90% si se acumulan ventanas.
- **Nueva Filosofía del Sistema de Puntuación**:
  - **Puntos Fijos por Clic al Añadir Pestañas**:
    - Al pulsar `+1 PESTAÑA` o `+10 PESTAÑAS`, se otorgan **+50 puntos fijos por pestaña** creada directamente en el momento del clic.
    - Se elimina el aumento automático pasivo de puntuación generado únicamente por tener pestañas abiertas. Si el usuario no hace clics y no hay multiplicadores activos, la puntuación se congela al 100% (**0 pts/s**).
  - **Flujo Automático Gated por Multiplicadores**:
    - La puntuación continua por segundo **SOLO sube de forma automática cuando hay al menos un multiplicador activo** (`CPU Melter`, `RAM Eater` o `GPU Burner`).
    - **Sinergia Pestañas + Multiplicador (`+abiertas +multiplica`)**: Los multiplicadores activos generan una tasa de puntos proporcional a la cantidad de pestañas abiertas (`tabMultiplier = 1.0 + (tabsCount * 0.65)`). Cuantas más pestañas mantenga vivas el jugador mientras arden los aceleradores, exponencialmente mayor será el ritmo de acumulación.
- **Reajuste de Razor's Edge y Umbrales Críticos**:
  - El multiplicador de filo de navaja (`Razor's Edge`) ahora premia surfear la franja del **86.0% al 89.9% de RAM**, **90.0% al 94.9% de CPU** y **85.0% al 89.9% de GPU**.
  - La línea roja de peligro del osciloscopio en [gauges.js](file:///c:/Users/VALIMANA/Desktop/Proyectos/Window's%20Crasher/src/renderer/js/gauges.js) y la cabecera en [index.html](file:///c:/Users/VALIMANA/Desktop/Proyectos/Window's%20Crasher/src/renderer/index.html) reflejan los nuevos límites del 90% (RAM/GPU) y 95% (CPU).
- **Sincronización de Versión Mayor v2.0.0**:
  - Versión elevada a **`v2.0.0`** en `index.html`, `app.js`, `gauges.js`, `main.js`, `package.json`, `tauri.conf.json`, `src-tauri/Cargo.toml` y `start.bat`.

---

## [v1.9.0] - 2026-09-04
### Botón Maestro de Sobrecarga Total (Activar Todos los Multiplicadores), Calibración de Carga de CPU y Blindaje de Estabilidad
- **Botón Maestro de Sobrecarga Total (`⚡ SOBRECARGA TOTAL [T o 4]`)**:
  - **Nuevo pulsador maestro interactivo** en la columna de control derecha (`#btn-toggle-all-mults`), ubicado directamente sobre la cuadrícula de multiplicadores.
  - Permite activar o desactivar simultáneamente los 3 multiplicadores pesados del juego con un solo clic o atajo de teclado:
    - `🔥 CPU MELTER` (+3.0x)
    - `💾 RAM EATER` (+2.5x)
    - `🌌 GPU BURNER` (+2.0x)
    - **Multiplicador combinado total inmediato: +7.5x**.
  - **Lógica inteligente de alternancia**:
    - Si al menos uno de los tres multiplicadores se encuentra inactivo, enciende de golpe todos los aceleradores restantes y reproduce el efecto de sobretensión sonora (`playPower(true)`).
    - Si los tres multiplicadores ya están activos, los desactiva todos de forma sincronizada (`playPower(false)`).
  - **Diseño Cyberpunk Reactivo**:
    - Estado de reposo: Fondo degradado sutil con borde violeta y badge `INACTIVO`.
    - Estado activo: Iluminación neón magenta/carmesí pulsante, sombra volumétrica violeta, badge `ACTIVO` y subtítulo dinámico `CPU, RAM y GPU al límite (+7.5x)`.
    - Sincronización bidireccional automática: si el usuario activa individualmente los multiplicadores con las teclas `1`, `2` y `3`, el botón maestro detecta cuando los tres están encendidos y pasa a estado activo automáticamente.
  - **Atajos de Teclado Globales**:
    - Tecla `T` (Todas / Todos) y tecla `4`.
    - Añadido al listado de combinaciones en el pie de página (`T / 4 Todos`).
- **Revisión Completa de Estabilidad y Calibración para Lanzamiento Definitivo**:
  - **Modulación del Ciclo de Trabajo en CPU Melter (`cpuMelter.worker.js` & `app.js`)**:
    - *Problema resuelto*: Anteriormente, `CPU Melter` saturaba todos los hilos al 100% ininterrumpidamente, provocando que el Watchdog detuviera la partida a los 3 segundos exactos con `GAME OVER: CPU saturada al 98%+ de forma sostenida (3.0s > 3.0s)`.
    - *Solución*: Se moduló el bucle con ráfagas de 35ms y pausas de 6ms, y se reserva permanentemente 1 hilo libre del procesador para el Watchdog y la cola del kernel (`Math.min(count - 1, 8)`). Se amplió la tolerancia continua a 16 ticks (4.0s) en `monitorWorker.js` y `main.js`. Ahora la CPU se sitúa en una zona de peligro y estrés extrema (~88-94%) permitiendo una jugabilidad tensa y disfrutable sin muertes instantáneas injustas.
  - **Prevención de Bloqueos de Caché en Disco y Single Instance Lock**:
    - *Problema resuelto*: `app.requestSingleInstanceLock()` bloqueaba el arranque manual del usuario si una instancia anterior o en segundo plano estaba activa (`Lock file can not be created! Error code: 32` y `Acceso denegado 0x5`).
    - *Solución*: Se desactivó la colisión del singleton lock y se incorporó el flag nativo `disable-gpu-shader-disk-cache` en `main.js`, garantizando que el usuario pueda ejecutar `npm start` limpiamente sin advertencias de caché ni bloqueos de proceso.
  - **Limpieza y Sincronización Rigurosa en Reinicios (`restartGame`)**:
    - Garantizada la parada y purga de workers de cómputo, intervalos de asignación de RAM y buffers de memoria tanto en Game Over como en la función `restartGame()`, evitando estados zombies o desincronizaciones de botones.
- **Sincronización de Versión Global v1.9.0**:
  - Versión elevada a **`v1.9.0`** en `index.html`, `app.js`, `gauges.js`, `main.js`, `package.json`, `tauri.conf.json`, `src-tauri/Cargo.toml` y `start.bat`.

---

## [v1.8.0] - 2026-09-04
### Telemetría Completa de GPU (3er Dial Analógico y Osciloscopio), Freno de Flujo por Inactividad (Anti-AFK) y Recalibración Rigurosa de Tier S
- **Freno de Flujo por Inactividad (Mecánica Anti-AFK / Idle Decay)**:
  - **Problema resuelto**: Anteriormente, el jugador podía encender multiplicadores y dejar el juego sin interactuar (AFK) acumulando millones de puntos pasivamente a gran velocidad.
  - **Solución implementada**:
    - Se registra en tiempo real la marca de tiempo de interacción del usuario (`lastUserActionTime`) en cualquiera de los botones de pestañas (+1, -1, +10, -10), alternancia de multiplicadores o pulsación de atajos de teclado.
    - Si transcurren más de **2.0 segundos** sin acciones del jugador, se aplica un factor de amortiguación exponencial sobre la tasa de flujo: `activityFactor = Math.max(0.06, Math.exp(-0.35 * (idleSec - 2.0)))`.
    - A los 4.5 segundos sin acción, el flujo de puntos se reduce en un **65%**, y tras 10 segundos cae un **94%** (dejando solo un goteo residual del 6%).
    - Si la inactividad supera los **5.0 segundos**, la racha de sobrecarga acumulada (`stressStreakSeconds`) se congela y comienza a degradarse progresivamente (`-0.15s` por ciclo).
    - **Indicador de Cadencia en Tiempo Real**: Nuevo badge dinámico en la tarjeta de Tasa de Puntos:
      - `⚡ ACTIVO`: Neón cian mientras el jugador presiona botones y micro-gestiona activamente.
      - `⏳ EN ESPERA`: Ámbar tras 2 segundos sin interacción (inicio de freno).
      - `💤 INACTIVO`: Gris atenuado tras 5 segundos (flujo frenado y racha enfriándose).
- **Integración y Telemetría Completa de la GPU**:
  - **Motor de Carga de GPU (`gpuBurner.js`)**:
    - Implementación de `getGpuLoad(tabCount)` que mide la latencia de renderizado del shader WebGL en milisegundos, iteraciones fractales activas y carga en reposo por pestañas virtuales. Proporciona una señal fiable de estrés de GPU (85-98% en modo activo `GPU Burner`, 5-25% en reposo con carga).
  - **Tercer Manómetro Analógico de Hardware (Tríada CPU, RAM y GPU 3D)**:
    - Se añade un dial SVG circular independiente de alta resolución para la GPU en la sección de telemetría superior.
    - Aguja física violeta neón (`#c084fc`), escala de 0 a 100%, arco dinámico de degradado púrpura y lectura numérica precisa.
  - **Trazado de GPU en el Osciloscopio Central**:
    - Buffer circular de 60 muestras de telemetría de GPU en `gauges.js`.
    - Trazado de onda en tiempo real en color violeta luminoso (`#c084fc`) superpuesto a las curvas de CPU (cian) y RAM (ámbar/rojo).
    - Se incorpora la etiqueta interactiva `■ GPU` en la leyenda del osciloscopio.
  - **Impacto de la GPU en la Fórmula de Puntuación**:
    - La GPU se integra en el cálculo de densidad de carga: `loadNorm = (cpu + ram + (gpu * 1.2)) / 220;` elevado al exponente cuadrático `1.95`.
    - El factor de riesgo general ahora evalúa la tríada completa (`CPU`, `RAM` y `GPU`), premiando exprimir los tres componentes a la vez.
  - **Diagnóstico y Forense de Game Over (BSOD)**:
    - Indicador de telemetría `Carga GPU (3D Shader): XX%` en la tarjeta de Diagnóstico.
    - Registro de `Pico GPU: XX%` en las estadísticas rápidas del pantallazo azul y en el informe forense exportable al portapapeles.
- **Recalibración Rigurosa de Rangos y Dificultad para Tier S**:
  - **Problema resuelto**: Llegar al rango S era excesivamente accesible sin requerir pericia ni riesgo constante.
  - **Nueva Matriz de Requisitos Mínimos Simultáneos**:
    - **Tier S ("Overclocking God")**:
      - $\ge 120,000$ puntos totales Y
      - $\ge 2,200$ pts/segundo de velocidad promedio sostenida Y
      - $\ge 40$ segundos acumulados en zona de alto estrés Y
      - $\ge 16$ pestañas activas.
      - (O alternativamente: $\ge 250,000$ puntos brutos con ritmo sostenido $\ge 1,800$ pts/s).
    - **Tier A ("Chaos Master")**: $\ge 65,000$ pts Y ritmo $\ge 1,200$ pts/s.
    - **Tier B ("Stress Veteran")**: $\ge 30,000$ pts Y ritmo $\ge 600$ pts/s.
    - **Tier C ("Stable Engine")**: $\ge 10,000$ pts.
    - **Tier D ("Kernel Novice")**: $< 10,000$ pts.
- **Sincronización de Versión Global v1.8.0**:
  - Versión elevada a **`v1.8.0`** en `index.html`, `app.js`, `package.json`, `tauri.conf.json`, `src-tauri/Cargo.toml` y `start.bat`.

---

## [v1.7.0] - 2026-09-04
### Animaciones de Alta Fidelidad (RAM & GPU Melter), Matriz 2x2 con Botón -10 Pestañas, Especificaciones Forenses en BSOD y Atajos Completos
- **Animaciones Avanzadas de RAM y GPU Melter en el Simulador de Caos (`tabVisualizer.js`)**:
  - **RAM Eater / Sobrecarga de Memoria**:
    - Cascada cibernética continua de volcados hexadecimales (`0xDEAD`, `0xBEEF`, `0x80F4`, `0x7FFF`, `PAGE_FLT`, `STACK_OVR`...) cayendo con glow verde neón y cian.
    - Líneas horizontales de bus de datos (*Memory Bus Transfer*) que cruzan el fondo con pulsos eléctricos.
    - Visualizador físico de bloques de memoria DIMM en la base del canvas (28 celdas de hardware): las celdas se llenan en tiempo real, virando de verde neón a ámbar (>75%) y a rojo carmesí parpadeante (>88%) con efecto de memoria corrupta y temblor.
  - **GPU Melter / Burner (Vórtice de Plasma y Rayos Eléctricos)**:
    - Vórtice central con 3 anillos elípticos de plasma girando en contrarrotación continua (`Date.now() * 0.0025`) en tonos púrpura, magenta y cian (`#c084fc`, `#d946ef`, `#38bdf8`).
    - Rayos y arcos eléctricos aleatorios (*electric arcs*) atravesando la pantalla simulando sobretensión extrema en las unidades de cómputo.
    - Malla de perspectiva 3D alámbrica en la base que se deforma y vibra con calor según la carga de la GPU.
    - Emisión constante de chispas cuánticas de alta energía violeta.
  - **Efecto de Desintegración Explosiva**: Al eliminar pestañas, se produce una dispersión radial de partículas anaranjadas y rojas (hasta 10 ventanas en simultáneo al purgar).
- **Nueva Matriz Ergonómica 2x2 para el Control de Pestañas a la Derecha**:
  - Se reorganizan los controles interactivos en una cuadrícula simétrica de 4 pulsadores con badges visuales de teclas de acceso rápido:
    - **`+1 PESTAÑA` (64MB) [ESPACIO / ENTER]**: Inyección de precisión milimétrica (Azul/Cian).
    - **`−1 PESTAÑA` (ALIVIO) [RETROCESO / -]**: Micro-alivio táctico contra el Watchdog (Ámbar).
    - **`+10 PESTAÑAS` (RÁFAGA) [SHIFT + ESPACIO]**: Sobrecarga masiva en ráfaga (Violeta/Púrpura).
    - **`−10 PESTAÑAS` (PURGA) [SHIFT + RETROCESO]** (¡NUEVO!): Botón carmesí de despresurización de emergencia para salvar el sistema al rozar el 91.9% de RAM.
  - Mejoras de diseño con estados hover/active elásticos, sombras de neón acordes al nivel de riesgo y prevención de selección accidental de texto.
- **Especificaciones Forenses del Dispositivo en la Pantalla de Game Over (BSOD)**:
  - Detección automática en el arranque mediante el proceso principal de Electron (`os.cpus()`, `os.totalmem()`, `os.platform()`, `os.release()`) y WebGL (`WEBGL_debug_renderer_info`):
    - **Procesador (CPU)**: Modelo real (Intel / AMD), núcleos lógicos y frecuencia.
    - **Memoria RAM Total**: Capacidad física instalada (GB) y pico porcentual de la sesión.
    - **Acelerador Gráfico**: Nombre exacto del renderer GPU detectado (NVIDIA, AMD Radeon, Intel Iris/UHD, etc.).
    - **Sistema Operativo**: Plataforma y release (Windows NT x64).
  - Integrado de forma sobria y elegante en la pantalla azul (BSOD) y adjuntado automáticamente al portapapeles mediante el botón "Copiar Resumen".
- **Atajos de Teclado Interactivos Globales**:
  - `Espacio`, `Enter`, `+`: Abrir 1 pestaña (+1).
  - `Shift + Espacio`, `Shift + Enter`, `Shift + +`: Ráfaga de 10 pestañas (+10).
  - `Backspace`, `-`: Restar 1 pestaña (−1).
  - `Shift + Backspace`, `Shift + -`: Purga rápida de 10 pestañas (−10).
  - `1`, `2`, `3`: Alternar multiplicadores (`CPU Melter`, `RAM Eater`, `GPU Burner`).
  - `Escape` o `P`: Detonar parada de emergencia de pánico.
  - `M`: Silenciar o activar efectos de audio.
  - `R`: Reiniciar equipo desde la pantalla de Game Over.
  - `C`: Copiar reporte forense desde la pantalla de Game Over.
- **Actualización y Sincronización Global**:
  - Versión elevada a **`v1.7.0`** en todos los manifiestos, cabeceras, títulos y pie de página.

---

## [v1.6.0] - 2026-09-04
### Mecánica Razor's Edge (Balance Habilidad vs Hardware), Botón Restar Pestañas, Osciloscopio Central y Recalibración S Tier
- **Balance Competitivo entre Dispositivos Potentes y Modestos ("Razor's Edge")**:
  - **Problema resuelto**: En versiones previas, una máquina con 64GB de RAM y 16 núcleos podía abrir 80 pestañas sin inmutarse, mientras que un equipo con 8GB colapsaba rápidamente.
  - **Solución mecánica ("El Filo de la Navaja")**: Se premia la **proximidad porcentual al límite mortal del Watchdog (92% de RAM)** mediante un multiplicador dinámico `Razor's Edge` (hasta **+3.5x adicional**):
    - Al 80% RAM: +1.0x (normal)
    - Al 85% RAM: +1.5x
    - Al 88% RAM: +2.2x
    - Al 90% - 91.9% RAM: **+3.5x (Zona de Máximo Riesgo / Filo)**
  - Un jugador en un PC de 8GB llega con agilidad a la franja del 90.0% - 91.8% de RAM (requiriendo apenas 12-18 pestañas más multiplicadores), obteniendo el multiplicador de flujo máximo (+3.5x Razor's Edge + Racha de Sobrecarga). Un jugador con 64GB que juegue seguro al 40% de RAM solo recibe multiplicador x1.0 y no podrá alcanzar los Tiers superiores a menos que asuma el mismo riesgo letal.
- **Nuevo Botón `-1 PESTAÑA` y Micro-gestión Táctica**:
  - Se añade el botón de acción rápida `−1 PESTAÑA` (teclas de acceso rápido `Backspace` y `-`).
  - Permite liberar buffers de memoria chunk a chunk (`ramEater.releaseChunk()`) y desintegrar ventanas virtuales en el simulador con partículas anaranjadas.
  - Otorga al jugador la capacidad de "surfear la ola" al 91.5% de RAM: si la memoria amenaza con tocar el 92% y activar el BSOD, el jugador puede pulsar rítmicamente `-1 Pestaña` para salvar el sistema en el último segundo sin perder su racha de puntos.
- **Reorganización Espacial Ergonómica del Dashboard**:
  - **Osciloscopio en el Panel Central**: El osciloscopio en tiempo real (`#history-canvas`, 15s a 4 Hz con CPU, RAM y umbral del 92%) se traslada a la **Columna Central**, ubicado justo debajo de los medidores de telemetría analógica y encima del simulador visual del caos (`#chaos-canvas`).
  - **Diagnóstico del Sistema en la Columna Izquierda**: El bloque de diagnóstico (`#telemetry-cores`, `#telemetry-freeram`, `#telemetry-allocram`, etc.) se reubica en la columna izquierda donde antes estaban los botones de pestañas, consolidando toda la información de monitorización de hardware en un solo lateral.
  - **Todos los Botones Accionables en la Columna Derecha**: Se agrupan todos los controles interactivos en la extrema derecha:
    - Rejilla superior compacta (`.tab-actions-split-grid`) con `+1 PESTAÑA`, `−1 PESTAÑA` y `+10 PESTAÑAS`.
    - Bloque de multiplicadores minimalistas (`CPU MELTER`, `RAM EATER`, `GPU BURNER`).
    - Botón de Pánico de Emergencia anclado al pie de la columna derecha.
- **Recalibración Rigurosa del Sistema de Puntuación (S Tier Digno)**:
  - Se corrigen los umbrales de rango para evitar que el S Tier sea trivial:
    - **TIER S (DESTRUCTOR DE SILICIO)**: Requiere $\ge$ 1,800 pts/s de tasa media, $\ge$ 30s de supervivencia bajo estrés crítico y $\ge$ 80,000 puntos (o $\ge$ 160,000 pts totales).
    - **TIER A (OVERCLOCKER MAESTRO)**: Requiere $\ge$ 800 pts/s, $\ge$ 15s en peligro y $\ge$ 35,000 pts.
    - **TIER B (STRESS TESTER)**: Requiere $\ge$ 350 pts/s y $\ge$ 12,000 pts.
    - **TIER C (OPERADOR CAUTELOSO)**: Requiere $\ge$ 100 pts/s y $\ge$ 3,000 pts.
    - **TIER D (INACTIVO / SIN ESTRÉS)**: Menos de 100 pts/s.
- **Actualización de Versión**:
  - Sincronización a `v1.6.0` en todas las pantallas, configuraciones de Tauri/Cargo, atajos y pie de página.

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
