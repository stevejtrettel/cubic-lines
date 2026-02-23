/**
 * Minimal WebGL 2 engine and split-view layout.
 */

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(gl_VertexID & 1, gl_VertexID >> 1) * 4.0 - 1.0;
  gl_Position = vec4(p, 0, 1);
}`;

const LAYER = 'position:absolute;top:0;left:0;width:100%;height:100%;';

export function createSplitView(container) {
  container.style.cssText = 'display:flex;width:100%;height:100%;';

  function panel() {
    const el = document.createElement('div');
    el.style.cssText = 'position:relative;flex:1;min-width:0;height:100%;overflow:hidden;';
    container.appendChild(el);
    return {
      addCanvas() {
        const c = document.createElement('canvas');
        c.style.cssText = LAYER + 'display:block;';
        el.appendChild(c);
        return c;
      },
      addOverlay() {
        const d = document.createElement('div');
        d.style.cssText = LAYER + 'pointer-events:none;';
        el.appendChild(d);
        return d;
      },
    };
  }

  return { left: panel(), right: panel() };
}

export function createEngine(canvas, shaderSource, uniforms) {
  const gl = canvas.getContext('webgl2', { antialias: false });

  // Build fragment shader: preamble + user code
  let frag = '#version 300 es\nprecision highp float;\n';
  frag += 'uniform vec2 iResolution;\nuniform float iTime;\nuniform vec4 iMouse;\n';
  for (const [name, spec] of Object.entries(uniforms)) {
    const m = spec.match(/^(\w+)(?:\[(\d+)\])?$/);
    frag += m[2] ? `uniform ${m[1]} ${name}[${m[2]}];\n`
                 : `uniform ${m[1]} ${name};\n`;
  }
  frag += 'out vec4 _fragColor;\n';
  frag += 'void mainImage(out vec4, in vec2);\n';
  frag += 'void main() { mainImage(_fragColor, gl_FragCoord.xy); }\n';
  frag += shaderSource;

  // Compile & link
  function sh(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  // Uniform locations
  const uRes = gl.getUniformLocation(prog, 'iResolution');
  const uMouse = gl.getUniformLocation(prog, 'iMouse');
  const uLocs = {};
  for (const [name, spec] of Object.entries(uniforms)) {
    const arr = spec.includes('[');
    uLocs[name] = gl.getUniformLocation(prog, arr ? name + '[0]' : name);
  }

  // Uniform values + upload dispatch
  const uVals = {};
  const upload = { vec2: 'uniform2fv', vec3: 'uniform3fv', vec4: 'uniform4fv' };

  // Mouse
  const mouse = new Float32Array(4);
  let mouseDown = false;
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse[0] = (e.clientX - r.left) * (canvas.width / r.width);
    mouse[1] = canvas.height - (e.clientY - r.top) * (canvas.height / r.height);
    requestRender();
  });
  canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    const r = canvas.getBoundingClientRect();
    mouse[2] = (e.clientX - r.left) * (canvas.width / r.width);
    mouse[3] = canvas.height - (e.clientY - r.top) * (canvas.height / r.height);
    requestRender();
  });
  canvas.addEventListener('mouseup', () => { mouseDown = false; requestRender(); });

  // Resize
  function resize() {
    const dpr = devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  new ResizeObserver(() => { resize(); requestRender(); }).observe(canvas);
  resize();

  gl.bindVertexArray(gl.createVertexArray());

  // Demand-driven render
  let pending = false, started = false;
  function requestRender() {
    if (started && !pending) {
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        resize();
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform4f(uMouse, mouse[0], mouse[1],
          mouseDown ? mouse[2] : -Math.abs(mouse[2]),
          mouseDown ? mouse[3] : -Math.abs(mouse[3]));
        for (const [name, spec] of Object.entries(uniforms)) {
          if (uVals[name] == null) continue;
          const type = spec.match(/^\w+/)[0];
          gl[upload[type]](uLocs[name], uVals[name]);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      });
    }
  }

  return {
    setUniformValue(name, value) { uVals[name] = value; requestRender(); },
    start() { started = true; requestRender(); },
  };
}
