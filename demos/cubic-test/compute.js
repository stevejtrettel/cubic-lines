/**
 * Takes 6 points in the plane and computes all shader data.
 *
 * Input: array of 6 [x, y] pairs.
 *
 * Returns:
 *   - pts:            Float32Array(12) — 6 points as vec2[6]
 *   - conics:         Float32Array(36) — 6 conics as vec3[12] (2 vec3s each)
 *   - linePoints:     Float32Array(84) — 21 line base points (21 vec4s)
 *   - lineDirections: Float32Array(84) — 21 line directions (21 vec4s)
 */

import { conicThroughFivePoints, conicOtherIntersection } from '../../src/math/conic.js';
import { cubicMap, evaluateMap, evaluateMapDerivative } from '../../src/math/cubic-map.js';
import { formsVanishingAt } from '../../src/math/forms.js';

/**
 * Store a line (point + direction) into the flat arrays at index n.
 * p3a, p3b are two points on the line in P3 (as 4-element arrays).
 */
function storeLine(linePoints, lineDirections, n, p3a, p3b) {
  const off = n * 4;
  for (let k = 0; k < 4; k++) {
    linePoints[off + k] = p3a[k];
    lineDirections[off + k] = p3b[k] - p3a[k];
  }
}

export function compute(sixPoints) {
  // Pack 6 points as flat vec2 array
  const pts = new Float32Array(12);
  for (let i = 0; i < 6; i++) {
    pts[i * 2] = sixPoints[i][0];
    pts[i * 2 + 1] = sixPoints[i][1];
  }

  const homog = sixPoints.map(([x, y]) => [x, y, 1]);

  // Compute 6 conics, each through 5 of the 6 points (leaving one out)
  const conicCoeffs = [];
  const conics = new Float32Array(36);
  for (let skip = 0; skip < 6; skip++) {
    const five = homog.filter((_, i) => i !== skip);
    const c = conicThroughFivePoints(five);
    conicCoeffs.push(c);
    if (c) {
      for (let j = 0; j < 6; j++) conics[skip * 6 + j] = c[j];
    }
  }

  // Cubic parameterization P2 → P3
  const basis = cubicMap(homog);

  const linePoints = new Float32Array(27 * 4);
  const lineDirections = new Float32Array(27 * 4);

  let cubicCoeffs = null;

  if (basis) {
    let n = 0;
    const p3Samples = []; // collect P3 points for implicitization

    // 15 lines from pairs of points.
    // The line through pᵢ, pⱼ in P2 maps to a line in P3.
    // All cubics vanish at pᵢ and pⱼ, so we sample at t=1/3 and t=2/3.
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        const a = homog[i], b = homog[j];
        const m1 = [
          (2 * a[0] + b[0]) / 3,
          (2 * a[1] + b[1]) / 3,
          (2 * a[2] + b[2]) / 3,
        ];
        const m2 = [
          (a[0] + 2 * b[0]) / 3,
          (a[1] + 2 * b[1]) / 3,
          (a[2] + 2 * b[2]) / 3,
        ];
        const p3a = evaluateMap(basis, m1);
        const p3b = evaluateMap(basis, m2);
        p3Samples.push(p3a, p3b);
        storeLine(linePoints, lineDirections, n, p3a, p3b);
        n++;
      }
    }

    // Implicitize: find the degree-3 form in P3 vanishing at all sample points.
    // 30 points × 20 monomials → null space should be 1-dimensional.
    const implicitBasis = formsVanishingAt(p3Samples, 3);
    if (implicitBasis.length > 0) {
      cubicCoeffs = implicitBasis[0];
      console.log('implicit equation (20 coeffs, graded lex x,y,z,w):', Array.from(cubicCoeffs));
      console.log('null space dimension:', implicitBasis.length);
    }

    // 6 lines from conics.
    // Conic i passes through all points except point i.
    // Use the skipped point as direction (it's NOT on the conic, so f(v) ≠ 0).
    // Shoot from two known points on the conic to get two new points.
    for (let skip = 0; skip < 6; skip++) {
      const c = conicCoeffs[skip];
      if (!c) { n++; continue; }

      const known = homog.filter((_, i) => i !== skip);
      const v = homog[skip]; // direction — not on this conic

      const newPt1 = conicOtherIntersection(c, known[0], v);
      const newPt2 = conicOtherIntersection(c, known[1], v);

      if (newPt1 && newPt2) {
        const p3a = evaluateMap(basis, newPt1);
        const p3b = evaluateMap(basis, newPt2);
        storeLine(linePoints, lineDirections, n, p3a, p3b);
      }
      n++;
    }

    // 6 exceptional lines from blow-ups.
    // At base point pᵢ all cubics vanish, so the image is the Jacobian:
    //   φ(pᵢ + εv) ≈ ε · J(pᵢ)·v
    // Two other base points serve as directions (Euler: ∇fₖ(pᵢ)·pᵢ = 0).
    for (let i = 0; i < 6; i++) {
      const j1 = (i + 1) % 6, j2 = (i + 2) % 6;
      const p3a = evaluateMapDerivative(basis, homog[i], homog[j1]);
      const p3b = evaluateMapDerivative(basis, homog[i], homog[j2]);
      storeLine(linePoints, lineDirections, n, p3a, p3b);
      n++;
    }
  }

  return { pts, conics, linePoints, lineDirections, cubicCoeffs };
}
