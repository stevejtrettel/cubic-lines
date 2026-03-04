/**
 * Format 3D cubic surface data as scene3d.glsl.
 *
 * Expects from compute():
 *   - cubicCoeffs:    Float64Array(20) — 20 cubic coefficients (graded lex)
 *   - linePoints:     Float32Array(108) — 27 line base points as vec4[27]
 *   - lineDirections: Float32Array(108) — 27 line directions as vec4[27]
 *
 * Lines are stored in homogeneous P3 (vec4). We dehomogenize to the w=1
 * affine chart using the same formula as projective-line.glsl:
 *   point:     a = P.xyz / P.w
 *   direction: d = (D.xyz * P.w - P.xyz * D.w) / P.w², then normalize
 *
 * Line indices: 0–14 pair, 15–20 conic, 21–26 exceptional.
 */

export function formatScene3dGLSL({ cubicCoeffs, linePoints, lineDirections }) {
  const fmt = (v) => v.toFixed(8);

  // --- Coefficients ---
  const coeffs = [];
  for (let i = 0; i < 20; i++) coeffs.push(fmt(cubicCoeffs[i]));

  // --- Dehomogenize lines ---
  const lines = [];
  for (let i = 0; i < 27; i++) {
    const o = i * 4;
    const pw = linePoints[o + 3];
    if (Math.abs(pw) < 1e-8) {
      lines.push({ point: [0, 0, 0], dir: [0, 0, 1] });
      continue;
    }
    const px = linePoints[o], py = linePoints[o + 1], pz = linePoints[o + 2];
    const dx = lineDirections[o], dy = lineDirections[o + 1],
          dz = lineDirections[o + 2], dw = lineDirections[o + 3];

    const point = [px / pw, py / pw, pz / pw];

    // Quotient rule: (D.xyz * P.w - P.xyz * D.w) / P.w²
    const pw2 = pw * pw;
    const dir = [
      (dx * pw - px * dw) / pw2,
      (dy * pw - py * dw) / pw2,
      (dz * pw - pz * dw) / pw2,
    ];
    const len = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
    if (len > 1e-8) { dir[0] /= len; dir[1] /= len; dir[2] /= len; }

    lines.push({ point, dir });
  }

  const fmtVec3 = (v) => `vec3(${fmt(v[0])}, ${fmt(v[1])}, ${fmt(v[2])})`;
  const fmtLine = (l) => `  Line(${fmtVec3(l.point)}, ${fmtVec3(l.dir)})`;

  const formatLineArray = (start, count) =>
    lines.slice(start, start + count).map(fmtLine).join(',\n');

  return `// Auto-generated cubic surface data (3D scene).
// Assumes: struct Line { vec3 point; vec3 dir; };

const float C[20] = float[20](
  ${coeffs.join(',\n  ')}
);

const Line PAIR_LINES[15] = Line[15](
${formatLineArray(0, 15)}
);

const Line CONIC_LINES[6] = Line[6](
${formatLineArray(15, 6)}
);

const Line EXCEPTIONAL_LINES[6] = Line[6](
${formatLineArray(21, 6)}
);
`;
}
