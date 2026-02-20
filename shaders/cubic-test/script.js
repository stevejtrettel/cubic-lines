// Projective coefficient layout (5 vec4s = 20 floats):
//   [0] = (x³,  x²y, x²z, x²w)
//   [1] = (xy², xyz, xyw, xz²)
//   [2] = (xzw, xw², y³,  y²z)
//   [3] = (y²w, yz², yzw, yw²)
//   [4] = (z³,  z²w, zw², w³ )

const NUM_LINES = 27;

// Clebsch diagonal cubic (homogeneous form):
// 81(x³+y³+z³+w³) - 189(x²y+x²z+...all cross terms...)
// + 54(xyz+xyw+xzw+yzw) + 126(... degree-2 w terms ...)
// - 9(... degree-1 w² terms ...) etc.
//
// Derived by homogenizing the affine form:
//   81(x³+y³+z³) - 189(x²y+x²z+xy²+y²z+xz²+yz²)
//   + 54xyz + 126(xy+xz+yz) - 9(x²+y²+z²) - 9(x+y+z) + 1
const CLEBSCH = new Float32Array([
  //  x³,  x²y,  x²z,  x²w
      81, -189, -189,   -9,
  //  xy², xyz,  xyw,  xz²
    -189,   54,  126, -189,
  //  xzw, xw²,  y³,  y²z
     126,   -9,   81, -189,
  //  y²w, yz², yzw,  yw²
      -9, -189,  126,   -9,
  //  z³,  z²w, zw²,  w³
      81,   -9,   -9,    1,
]);

export function setup(engine) {
  engine.setUniformValue('coefficients', CLEBSCH);
}

export function onFrame(engine, time, deltaTime, frame) {
  // Set coefficients every frame (setup may fire before UBOs are ready)
  engine.setUniformValue('coefficients', CLEBSCH);

  // Placeholder line data (replace with real 27 lines)
  // Using w=1 (affine chart) for now
  const points = new Float32Array(NUM_LINES * 4);
  const dirs = new Float32Array(NUM_LINES * 4);
  for (let i = 0; i < NUM_LINES; i++) {
    const angle = (i / NUM_LINES) * Math.PI * 2.0;
    points[i * 4 + 0] = Math.cos(angle) * 0.5;
    points[i * 4 + 1] = Math.sin(angle) * 0.5;
    points[i * 4 + 2] = 0.0;
    points[i * 4 + 3] = 1.0;

    dirs[i * 4 + 0] = Math.cos(angle + time * 0.2);
    dirs[i * 4 + 1] = Math.sin(angle + time * 0.2);
    dirs[i * 4 + 2] = 0.3;
    dirs[i * 4 + 3] = 0.0;
  }
  engine.setUniformValue('linePoints', points);
  engine.setUniformValue('lineDirections', dirs);
}
