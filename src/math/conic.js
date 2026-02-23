/**
 * Conics in P2.
 *
 * A conic is a degree-2 homogeneous form f(p) = pᵀMp.
 * Coefficients are in graded lex order: x², xy, xz, y², yz, z².
 *
 * The symmetric matrix is:
 *   M = | a    b/2  c/2 |
 *       | b/2  d    e/2 |
 *       | c/2  e/2  f   |
 */

import { formsVanishingAt } from './forms.js';
import { evaluateForm } from './monomials.js';

/**
 * Compute the conic through 5 points in P2.
 *
 * @param {Array} pts — 5 points, each [x, y, z] in homogeneous coordinates
 * @returns {Float64Array} coefficients in graded lex order, or null if degenerate
 */
export function conicThroughFivePoints(pts) {
  const basis = formsVanishingAt(pts, 2);
  if (basis.length === 0) return null;
  return basis[0];
}

/**
 * Bilinear form of a conic.
 *
 * B(p, q) = pᵀMq where M is the conic's symmetric matrix.
 * Satisfies f(p) = B(p, p).
 *
 * @param {ArrayLike} coeffs — [a, b, c, d, e, f] in graded lex order
 * @param {Array} p — [x, y, z]
 * @param {Array} q — [x, y, z]
 * @returns {number}
 */
export function conicBilinear(coeffs, p, q) {
  const [a, b, c, d, e, f] = coeffs;
  return a * p[0]*q[0]
       + (b/2) * (p[0]*q[1] + p[1]*q[0])
       + (c/2) * (p[0]*q[2] + p[2]*q[0])
       + d * p[1]*q[1]
       + (e/2) * (p[1]*q[2] + p[2]*q[1])
       + f * p[2]*q[2];
}

/**
 * Given a point q on a conic and a direction v, find the other
 * intersection of the line q + tv with the conic.
 *
 * Since f(q) = 0, the quadratic f(q + tv) = 2t·B(q,v) + t²·f(v) = 0
 * factors as t = 0 (the known root) and t = -2·B(q,v) / f(v).
 *
 * @param {ArrayLike} coeffs — conic coefficients in graded lex order
 * @param {Array} q — point on the conic [x, y, z]
 * @param {Array} v — direction [x, y, z]
 * @returns {Array|null} the other intersection point [x, y, z], or null if tangent
 */
export function conicOtherIntersection(coeffs, q, v) {
  const fv = evaluateForm(coeffs, v, 2);
  if (Math.abs(fv) < 1e-12) return null;
  const t = -2 * conicBilinear(coeffs, q, v) / fv;
  return q.map((qi, i) => qi + t * v[i]);
}
