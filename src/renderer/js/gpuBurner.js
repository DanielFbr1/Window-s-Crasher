// Módulo WebGL 2.0 para sobrecarga intensiva de GPU mediante Raymarching Shader
class GpuBurner {
  constructor(canvasElement) {
    this.canvas = canvasElement || document.createElement('canvas');
    this.canvas.width = 320;
    this.canvas.height = 240;
    this.gl = null;
    this.program = null;
    this.animationFrameId = null;
    this.isActive = false;
    this.startTime = Date.now();
    this.intensity = 1; // 1 = 64 pasos, 2 = 128 pasos, 3 = 256 pasos

    this.initGL();
  }

  initGL() {
    this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
    if (!this.gl) {
      console.error('[GpuBurner] WebGL no disponible en este dispositivo');
      return;
    }

    const vsSource = `
      attribute vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // Fragment shader con fractal 3D de raymarching altamente intensivo
    const fsSource = `
      precision highp float;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform int uIterations;

      // Estimador de distancia fractal tipo Mandelbulb / Sierpinski
      float map(vec3 p) {
        vec3 w = p;
        float m = dot(w, w);
        float dz = 1.0;

        for (int i = 0; i < 8; i++) {
          dz = 8.0 * pow(m, 3.5) * dz + 1.0;
          float r = length(w);
          float b = 8.0 * acos(clamp(w.y / r, -1.0, 1.0));
          float a = 8.0 * atan(w.x, w.z);
          w = p + pow(r, 8.0) * vec3(sin(b) * sin(a), cos(b), sin(b) * cos(a));
          m = dot(w, w);
          if (m > 4.0) break;
        }
        return 0.25 * log(m) * sqrt(m) / dz;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
        vec3 ro = vec3(1.8 * sin(uTime * 0.3), 1.2 * cos(uTime * 0.2), -2.2);
        vec3 rd = normalize(vec3(uv, 1.2));

        float totalDist = 0.0;
        float glow = 0.0;
        int maxSteps = uIterations;

        // Bucle pesado de marcha de rayos
        for (int i = 0; i < 256; i++) {
          if (i >= maxSteps) break;
          vec3 p = ro + rd * totalDist;
          float d = map(p);
          glow += 0.015 / (0.05 + abs(d));
          if (d < 0.002 || totalDist > 10.0) break;
          totalDist += d * 0.75;
        }

        vec3 col = vec3(0.05, 0.75, 1.0) * glow * 0.35;
        col += vec3(1.0, 0.2, 0.4) * (glow * 0.2);
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const vs = this.compileShader(this.gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(this.gl.FRAGMENT_SHADER, fsSource);

    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vs);
    this.gl.attachShader(this.program, fs);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('[GpuBurner] Error enlazando shader:', this.gl.getProgramInfoLog(this.program));
      return;
    }

    // Quad de pantalla completa
    const vertices = new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1
    ]);
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    const aPos = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(aPos);
    this.gl.vertexAttribPointer(aPos, 2, this.gl.FLOAT, false, 0, 0);

    this.uRes = this.gl.getUniformLocation(this.program, 'uResolution');
    this.uTime = this.gl.getUniformLocation(this.program, 'uTime');
    this.uIterations = this.gl.getUniformLocation(this.program, 'uIterations');
  }

  compileShader(type, source) {
    const s = this.gl.createShader(type);
    this.gl.shaderSource(s, source);
    this.gl.compileShader(s);
    return s;
  }

  start() {
    if (this.isActive || !this.gl || !this.program) return;
    this.isActive = true;
    this.render();
    console.log('[GpuBurner] Shader de estrés GPU activado');
  }

  stop() {
    this.isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    // Limpiar canvas a negro
    if (this.gl) {
      this.gl.clearColor(0.04, 0.05, 0.08, 1.0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
    console.log('[GpuBurner] Shader GPU detenido');
  }

  setIntensity(level) {
    this.intensity = Math.max(1, Math.min(3, level));
  }

  render() {
    if (!this.isActive) return;

    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    gl.viewport(0, 0, w, h);

    gl.useProgram(this.program);
    gl.uniform2f(this.uRes, w, h);
    gl.uniform1f(this.uTime, (Date.now() - this.startTime) * 0.001);

    // Cantidad de iteraciones según intensidad: 64, 140, 256
    const iterations = this.intensity === 1 ? 64 : (this.intensity === 2 ? 140 : 256);
    gl.uniform1i(this.uIterations, iterations);

    const t0 = performance.now();
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.lastFrameDurationMs = performance.now() - t0;

    this.animationFrameId = requestAnimationFrame(() => this.render());
  }

  getGpuLoad(tabCount = 0) {
    if (this.isActive) {
      // GPU Burner activo: sobrecarga masiva de raymarching
      const jitter = Math.sin(Date.now() * 0.006) * 2.5;
      const baseBurn = 88.0 + Math.min(8.0, (this.lastFrameDurationMs || 2.0) * 1.8);
      this.estimatedGpuLoad = Math.min(98.5, Math.max(82.0, baseBurn + jitter));
    } else {
      // Carga base según pestañas y composición de ventanas
      const tabLoad = Math.min(25.0, tabCount * 0.8);
      const idleJitter = Math.sin(Date.now() * 0.003) * 1.5;
      this.estimatedGpuLoad = Math.max(4.0, Math.min(32.0, 6.0 + tabLoad + idleJitter));
    }
    return parseFloat(this.estimatedGpuLoad.toFixed(1));
  }
}

window.GpuBurner = GpuBurner;
