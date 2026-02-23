/**
 * Shader data packing for any demo showing the cubic surface.
 *
 * Takes 6 affine points and returns Float32Arrays laid out for
 * the standard cubic-surface shader uniforms.
 *
 * Input: array of 6 [x, y] pairs.
 *
 * Returns:
 *   - pts:            Float32Array(12)  — 6 points as vec2[6]
 *   - conics:         Float32Array(36)  — 6 conics as vec3[12] (2 vec3s each)
 *   - linePoints:     Float32Array(108) — 27 line base points as vec4[27]
 *   - lineDirections: Float32Array(108) — 27 line directions as vec4[27]
 *   - cubicCoeffs:    Float64Array(20) | null — implicit cubic in P3
 */

import { twentySevenLines } from './twenty-seven-lines.js';

export function compute(sixPoints) {
  // Pack 6 points as flat vec2 array for the P2 shader
  const pts = new Float32Array(12);
  for (let i = 0; i < 6; i++) {
    pts[i * 2] = sixPoints[i][0];
    pts[i * 2 + 1] = sixPoints[i][1];
  }

  const homog = sixPoints.map(([x, y]) => [x, y, 1]);
  const result = twentySevenLines(homog);

  // Pack 6 conics: each has 6 coefficients, stored as 2 vec3s
  const conics = new Float32Array(36);
  if (result) {
    for (let i = 0; i < 6; i++) {
      const c = result.conics[i];
      if (c) {
        for (let j = 0; j < 6; j++) conics[i * 6 + j] = c[j];
      }
    }
  }

  // Pack 27 lines: each line is a (point, direction) pair of vec4s
  const linePoints = new Float32Array(27 * 4);
  const lineDirections = new Float32Array(27 * 4);
  let cubicCoeffs = null;

  if (result) {
    for (let n = 0; n < result.lines.length; n++) {
      const line = result.lines[n];
      if (!line) continue;
      const [p3a, p3b] = line;
      const off = n * 4;
      for (let k = 0; k < 4; k++) {
        linePoints[off + k] = p3a[k];
        lineDirections[off + k] = p3b[k] - p3a[k];
      }
    }
    cubicCoeffs = result.implicitCoeffs;
  }

  return { pts, conics, linePoints, lineDirections, cubicCoeffs };
}
