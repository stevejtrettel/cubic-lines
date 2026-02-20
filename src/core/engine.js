/**
 * Minimal WebGL 2 engine for fullscreen fragment shaders.
 *
 * Wraps a user-provided mainImage(out vec4, in vec2) shader with
 * Shadertoy-style built-in uniforms (iResolution, iTime, iMouse)
 * plus custom uniforms declared inline at engine creation.
 */

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(gl_VertexID & 1, gl_VertexID >> 1) * 4.0 - 1.0;
  gl_Position = vec4(p, 0, 1);
}`;

// Parse uniform spec: 'vec4[5]' → { type: 'vec4', count: 5 }
//                     'vec2'    → { type: 'vec2', count: 1 }
function parseUniform(spec) {
  const m = spec.match(/^(\w+)(?:\[(\d+)\])?$/);
  if (!m) throw new Error(`Bad uniform spec: "${spec}"`);
  return { type: m[1], count: m[2] ? parseInt(m[2]) : 1 };
}

function buildPreamble(uniforms) {
  let lines = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2 iResolution;',
    'uniform float iTime;',
    'uniform vec4 iMouse;',
  ];
  for (const [name, spec] of Object.entries(uniforms)) {
    const { type, count } = parseUniform(spec);
    if (count > 1) {
      lines.push(`uniform ${type} ${name}[${count}];`);
    } else {
      lines.push(`uniform ${type} ${name};`);
    }
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
 * @param {Object} uniforms - { name: spec } e.g. { pts: 'vec2[6]' }
 * @returns engine object with setUniformValue(), start(), canvas, gl
 */
export function createEngine(canvas, shaderSource, uniforms) {
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

  // Custom uniform locations + metadata
  const customUniforms = {};
  for (const [name, spec] of Object.entries(uniforms)) {
    const { type, count } = parseUniform(spec);
    const locName = count > 1 ? name + '[0]' : name;
    customUniforms[name] = {
      loc: gl.getUniformLocation(prog, locName),
      type,
      count,
    };
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
  new ResizeObserver(() => { resize(); requestRender(); }).observe(canvas);
  resize();

  // VAO (required in WebGL 2 even for vertex-less draws)
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // Demand-driven rendering: only draw when something changes
  let startTime = performance.now() / 1000;
  let frame = 0;
  let renderPending = false;
  let started = false;

  function requestRender() {
    if (started && !renderPending) {
      renderPending = true;
      requestAnimationFrame(render);
    }
  }

  const engine = {
    canvas,
    gl,
    setUniformValue(name, value) {
      uniformValues[name] = value;
      requestRender();
    },
    requestRender,
    start() {
      started = true;
      requestRender();
    },
  };

  // Re-render on mouse interaction
  canvas.addEventListener('mousemove', requestRender);
  canvas.addEventListener('mousedown', requestRender);
  canvas.addEventListener('mouseup', requestRender);

  function render(now) {
    renderPending = false;
    now /= 1000;
    const time = now - startTime;

    resize();

    // Upload built-ins
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, time);
    gl.uniform4f(uMouse, mouse[0], mouse[1],
      mouseDown ? mouse[2] : -Math.abs(mouse[2]),
      mouseDown ? mouse[3] : -Math.abs(mouse[3]));

    // Upload custom uniforms
    for (const [name, u] of Object.entries(customUniforms)) {
      const val = uniformValues[name];
      if (val == null) continue;
      switch (u.type) {
        case 'float': gl.uniform1fv(u.loc, val instanceof Float32Array ? val : [val]); break;
        case 'vec2':  gl.uniform2fv(u.loc, val); break;
        case 'vec3':  gl.uniform3fv(u.loc, val); break;
        case 'vec4':  gl.uniform4fv(u.loc, val); break;
        case 'int':   gl.uniform1iv(u.loc, val instanceof Int32Array ? val : [val]); break;
      }
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    frame++;
  }

  return engine;
}
