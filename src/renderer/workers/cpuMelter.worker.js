// Web Worker dedicado a estrés intensivo de CPU
let isRunning = false;
let operations = 0;

// Generador de carga de enteros, criptografía ligera y coma flotante
function burnCpu() {
  if (!isRunning) return;

  const start = performance.now();
  // Lote de cómputo ininterrumpido durante ~50ms
  while (performance.now() - start < 50) {
    // 1. Prueba de primalidad (ALU intensivo)
    const num = Math.floor(Math.random() * 500000) + 100000;
    let isPrime = true;
    for (let i = 2; i * i <= num; i++) {
      if (num % i === 0) {
        isPrime = false;
        break;
      }
    }

    // 2. Hash matemático bitwise (XOR-shift + murmur mix)
    let h = 0x811c9dc5;
    for (let j = 0; j < 100; j++) {
      h ^= (num + j);
      h = Math.imul(h, 0x01000193);
      h ^= h >>> 13;
    }

    // 3. Coma flotante / trigonometría
    const trig = Math.sin(num) * Math.cos(h) * Math.tan(0.12345);

    operations += (isPrime ? 1 : 0) + (trig > 0 ? 1 : 0);
  }

  // Agendar siguiente ráfaga sin bloquear la cola de eventos del worker completamente
  if (isRunning) {
    setTimeout(burnCpu, 0);
  }
}

self.onmessage = function (e) {
  const { action, id } = e.data;
  if (action === 'start') {
    if (!isRunning) {
      isRunning = true;
      burnCpu();
    }
  } else if (action === 'stop') {
    isRunning = false;
    self.postMessage({ status: 'stopped', id, operations });
  }
};
