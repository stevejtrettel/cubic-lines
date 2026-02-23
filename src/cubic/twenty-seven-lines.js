/**
 * The 27 lines on a smooth cubic surface.
 *
 * Given 6 points in general position in P2, the linear system of cubics
 * vanishing at all 6 is 4-dimensional, giving a rational map φ: P2 → P3
 * whose image is a smooth cubic surface. This surface carries exactly
 * 27 lines, which fall into three families:
 *
 *   15 pair lines:       images of lines through pairs of base points
 *    6 conic lines:      images of conics through 5 of 6 base points
 *    6 exceptional lines: blow-ups of the 6 base points
 *
 * Each line is returned as [a, b], a pair of points in P3.
 */

import { conicThroughFivePoints, conicOtherIntersection } from '../math/conic.js';
import { cubicMap, evaluateMap, evaluateMapDerivative } from './cubic-map.js';
import { formsVanishingAt } from '../math/forms.js';

/**
 * Compute the 27 lines on the cubic surface defined by 6 points in P2.
 *
 * @param {Array} pts — 6 points in P2, each [x, y, z] in homogeneous coordinates
 * @returns {object|null} null if degenerate, otherwise:
 *   - basis:         4 cubic forms (the map P2 → P3)
 *   - conics:        array of 6 conic coefficient arrays (each through 5 of 6 points)
 *   - lines:         array of 27 [p3a, p3b] pairs (points in P3)
 *   - implicitCoeffs: coefficients of the implicit cubic in P3, or null
 */
export function twentySevenLines(pts) {
  // 6 conics, each through 5 of the 6 points (leaving one out)
  const conics = [];
  for (let skip = 0; skip < 6; skip++) {
    const five = pts.filter((_, i) => i !== skip);
    conics.push(conicThroughFivePoints(five));
  }

  // Cubic parameterization: 4-dimensional space of cubics vanishing at all 6 points
  const basis = cubicMap(pts);
  if (!basis) return null;

  const lines = [];
  const p3Samples = [];

  // --- 15 pair lines (indices 0–14) ---
  //
  // The line through pᵢ and pⱼ in P2 maps to a line in P3.
  // Since all four basis cubics vanish at pᵢ and pⱼ, we cannot evaluate
  // φ at the endpoints directly. Instead we sample at the interior points
  // t = 1/3 and t = 2/3, which give two well-defined points on the image line.
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      const a = pts[i], b = pts[j];
      const m1 = a.map((v, k) => (2 * v + b[k]) / 3);
      const m2 = a.map((v, k) => (v + 2 * b[k]) / 3);
      const p3a = evaluateMap(basis, m1);
      const p3b = evaluateMap(basis, m2);
      p3Samples.push(p3a, p3b);
      lines.push([p3a, p3b]);
    }
  }

  // Implicitize: find the degree-3 polynomial in P3 vanishing on the surface.
  // The 30 sample points from pair lines (in 20-dimensional monomial space)
  // generically determine a unique cubic form up to scale.
  let implicitCoeffs = null;
  const implicitBasis = formsVanishingAt(p3Samples, 3);
  if (implicitBasis.length > 0) {
    implicitCoeffs = implicitBasis[0];
  }

  // --- 6 conic lines (indices 15–20) ---
  //
  // Conic Cᵢ passes through all base points except pᵢ. Since Cᵢ is a
  // degree-2 curve and φ is degree 3, the restriction φ|Cᵢ has degree 6.
  // But φ vanishes at the 5 base points on Cᵢ, removing 5 from the degree,
  // so the image is a line (degree 1). To find two points on it, we
  // intersect Cᵢ with lines through pᵢ (which is NOT on Cᵢ): for two
  // known points q on Cᵢ, the line q→pᵢ meets Cᵢ again at a new point
  // that is not a base point, giving a well-defined image under φ.
  for (let skip = 0; skip < 6; skip++) {
    const c = conics[skip];
    if (!c) { lines.push(null); continue; }

    const known = pts.filter((_, i) => i !== skip);
    const v = pts[skip];

    const newPt1 = conicOtherIntersection(c, known[0], v);
    const newPt2 = conicOtherIntersection(c, known[1], v);

    if (newPt1 && newPt2) {
      lines.push([evaluateMap(basis, newPt1), evaluateMap(basis, newPt2)]);
    } else {
      lines.push(null);
    }
  }

  // --- 6 exceptional lines (indices 21–26) ---
  //
  // At base point pᵢ all basis cubics vanish, so φ is undefined. The
  // blow-up resolves this: the exceptional divisor over pᵢ maps to a line
  // in P3 determined by the Jacobian, φ(pᵢ + εv) ≈ ε · J(pᵢ)·v.
  //
  // We need two independent directions to get two points on this line.
  // By Euler's identity, ∇fₖ(pᵢ)·pᵢ = 3·fₖ(pᵢ) = 0, so the pᵢ-component
  // of any direction contributes nothing. This means we can use any other
  // base point pⱼ directly as a direction vector.
  for (let i = 0; i < 6; i++) {
    const j1 = (i + 1) % 6, j2 = (i + 2) % 6;
    const p3a = evaluateMapDerivative(basis, pts[i], pts[j1]);
    const p3b = evaluateMapDerivative(basis, pts[i], pts[j2]);
    lines.push([p3a, p3b]);
  }

  return { basis, conics, lines, implicitCoeffs };
}
