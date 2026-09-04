// Gestor de asignación física activa de memoria RAM
class RamEater {
  constructor() {
    this.buffers = [];
    this.totalAllocatedBytes = 0;
  }

  // Asigna un bloque de tamaño especificado en MB y fuerza la escritura física de páginas
  allocateChunkMB(megabytes = 128) {
    try {
      const bytes = megabytes * 1024 * 1024;
      const buffer = new ArrayBuffer(bytes);
      const view = new Uint8Array(buffer);

      // Escribir en cada página (4KB) para obligar al kernel de Windows a mapear memoria real
      const pageSize = 4096;
      for (let i = 0; i < bytes; i += pageSize) {
        view[i] = (i % 255) + 1;
      }

      this.buffers.push(buffer);
      this.totalAllocatedBytes += bytes;
      return true;
    } catch (err) {
      console.error('[RamEater] Fallo de asignación de memoria:', err);
      return false;
    }
  }

  // Liberar toda la memoria retenida
  releaseAll() {
    const freedMB = this.getAllocatedMB();
    this.buffers = [];
    this.totalAllocatedBytes = 0;
    console.log(`[RamEater] Liberados ${freedMB} MB de memoria asignada`);
    return freedMB;
  }

  getAllocatedMB() {
    return Math.round(this.totalAllocatedBytes / (1024 * 1024));
  }

  getChunkCount() {
    return this.buffers.length;
  }
}

// Exportar para uso en frontend
window.RamEater = RamEater;
