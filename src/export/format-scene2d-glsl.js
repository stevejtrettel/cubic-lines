/**
 * Format 2D blowup diagram data as scene2d.glsl.
 *
 * Expects from compute():
 *   - pts:    Float32Array(12) — 6 base points as vec2[6]
 *   - conics: Float32Array(36) — 6 conics × 6 coefficients (x², xy, x, y², y, 1)
 *
 * Generates:
 *   - POINTS[6]:       the 6 exceptional points in R2
 *   - PLANE_LINES[15]: lines through each pair (i,j), as Line2D(point, unit_dir)
 *   - PLANE_CONICS[6]: conic i passes through all points except point i
 */

export function formatScene2dGLSL({ pts, conics }) {
  const fmt = (v) => v.toFixed(8);
  const fmtVec2 = (v) => `vec2(${fmt(v[0])}, ${fmt(v[1])})`;

  // Extract points
  const points = [];
  for (let i = 0; i < 6; i++) {
    points.push([pts[i * 2], pts[i * 2 + 1]]);
  }

  // 15 pair lines: one for each pair (i, j), i < j
  const pairLines = [];
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      const dx = points[j][0] - points[i][0];
      const dy = points[j][1] - points[i][1];
      const len = Math.sqrt(dx * dx + dy * dy);
      const dir = len > 1e-8 ? [dx / len, dy / len] : [1, 0];
      pairLines.push({ point: points[i], dir });
    }
  }

  const fmtLine2d = (l) =>
    `  Line2D(${fmtVec2(l.point)}, ${fmtVec2(l.dir)})`;

  // 6 conics: conic i omits point i, 6 coefficients each
  const fmtConic = (i) => {
    const o = i * 6;
    const c = [];
    for (let j = 0; j < 6; j++) c.push(fmt(conics[o + j]));
    return `  Conic2D(${c.join(', ')})`;
  };

  return `// Auto-generated blowup diagram data (2D scene).
// Assumes: struct Line2D { vec2 point; vec2 dir; };
// Assumes: struct Conic2D { float a, b, c, d, e, f; };
//   represents a*x^2 + b*xy + c*x + d*y^2 + e*y + f = 0

const vec2 POINTS[6] = vec2[6](
${points.map(p => `  ${fmtVec2(p)}`).join(',\n')}
);

const Line2D PLANE_LINES[15] = Line2D[15](
${pairLines.map(fmtLine2d).join(',\n')}
);

const Conic2D PLANE_CONICS[6] = Conic2D[6](
${[0,1,2,3,4,5].map(i => fmtConic(i)).join(',\n')}
);
`;
}
