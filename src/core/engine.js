/**
 * Minimal WebGL 2 engine for fullscreen fragment shaders.
 *
 * Wraps a user-provided mainImage(out vec4, in vec2) shader with
 * Shadertoy-style built-in uniforms (iResolution, iTime, iMouse)
 * plus custom vec4 array uniforms declared in config.json.
 */

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(gl_VertexID & 1, gl_VertexID >> 1) * 4.0 - 1.0;
  gl_Position = vec4(p, 0, 1);
}`;

function buildPreamble(uniforms) {
  let lines = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2 iResolution;',
    'uniform float iTime;',
    'uniform vec4 iMouse;',
  ];
  for (const [name, u] of Object.entries(uniforms)) {
    const count = u.count || 1;
    lines.push(`uniform vec4 ${name}[${count}];`);
  }
  lines.push(
    'out vec4 _fragColor;',
    'void mainImage(out vec4, in vec2);',
    'void main() { mainImage(_fragColor, gl_FragCoord.xy); }',
  );
  return lines.join('\n') + '\n';
}

function compile(gl, type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(log);
  }
  return s;
}

function link(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(log);
  }
  return p;
}

/**
 * Create the engine.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} shaderSource - user GLSL (must define mainImage)
 * @param {Object} uniforms - from config.json { name: { type, count } }
 * @param {HTMLElement} overlay - overlay div for JS-driven UI
 * @returns engine object
 */
export function createEngine(canvas, shaderSource, uniforms, overlay) {
  const gl = canvas.getContext('webgl2', { antialias: false });
  if (!gl) throw new Error('WebGL 2 not supported');

  const preamble = buildPreamble(uniforms);
  const fragSource = preamble + shaderSource;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragSource);
  const prog = link(gl, vs, fs);
  gl.useProgram(prog);

  // Built-in uniform locations
  const uResolution = gl.getUniformLocation(prog, 'iResolution');
  const uTime = gl.getUniformLocation(prog, 'iTime');
  const uMouse = gl.getUniformLocation(prog, 'iMouse');

  // Custom uniform locations
  const customLocs = {};
  for (const name of Object.keys(uniforms)) {
    customLocs[name] = gl.getUniformLocation(prog, name + '[0]');
  }

  // Uniform value store
  const uniformValues = {};

  // Mouse state (Shadertoy convention: xy = current pos, zw = click pos; y from bottom)
  const mouse = new Float32Array(4);
  let mouseDown = false;

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (canvas.height - (e.clientY - r.top) * (canvas.height / r.height));
    mouse[0] = x;
    mouse[1] = y;
  });
  canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (canvas.height - (e.clientY - r.top) * (canvas.height / r.height));
    mouse[2] = x;
    mouse[3] = y;
  });
  canvas.addEventListener('mouseup', () => { mouseDown = false; });

  // Resize handling
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // VAO (required in WebGL 2 even for vertex-less draws)
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const engine = {
    canvas,
    overlay,
    gl,
    setUniformValue(name, value) {
      uniformValues[name] = value;
    },
  };

  // Render loop
  let startTime = performance.now() / 1000;
  let lastTime = startTime;
  let frame = 0;
  let onFrameCb = null;

  function render(now) {
    now /= 1000;
    const time = now - startTime;
    const deltaTime = now - lastTime;
    lastTime = now;

    resize();

    // Call script hook
    if (onFrameCb) onFrameCb(engine, time, deltaTime, frame);

    // Upload built-ins
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, time);
    // Shadertoy: iMouse.z > 0 when button is held
    gl.uniform4f(uMouse, mouse[0], mouse[1],
      mouseDown ? mouse[2] : -Math.abs(mouse[2]),
      mouseDown ? mouse[3] : -Math.abs(mouse[3]));

    // Upload custom uniforms
    for (const [name, loc] of Object.entries(customLocs)) {
      const val = uniformValues[name];
      if (val) gl.uniform4fv(loc, val);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    frame++;
    requestAnimationFrame(render);
  }

  return {
    engine,
    start(onFrame) {
      onFrameCb = onFrame;
      requestAnimationFrame(render);
    },
  };
}
