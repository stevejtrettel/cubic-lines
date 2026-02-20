/**
 * Cubic parameterization: blow-up of P2 at 6 points → P3.
 *
 * Given 6 points in P2, the space of cubics vanishing at all 6 is
 * generically 4-dimensional (10 monomials - 6 constraints = 4).
 * A basis {f₀, f₁, f₂, f₃} defines a rational map:
 *
 *   φ: P2 → P3,  [x:y:z] ↦ [f₀(x,y,z) : f₁(x,y,z) : f₂(x,y,z) : f₃(x,y,z)]
 *
 * The image is a cubic surface in P3. Each basis vector has 10 coefficients
 * (degree-3 monomials in graded lex order).
 */

import { formsVanishingAt } from './forms.js';
import { evaluateForm } from './monomials.js';

/**
 * Compute the cubic map P2 → P3 from 6 points.
 *
 * @param {Array} pts — 6 points in P2, each [x, y, z]
 * @returns {Float64Array[]} 4 basis vectors, each length 10
 *   (coefficients of a cubic form in graded lex order),
 *   or null if the configuration is degenerate (< 4 independent cubics)
 */
export function cubicMap(pts) {
  const basis = formsVanishingAt(pts, 3);
  if (basis.length < 4) return null;
  return basis.slice(0, 4);
}

/**
 * Evaluate the cubic map at a point in P2.
 *
 * @param {Float64Array[]} basis — 4 cubic forms (from cubicMap)
 * @param {Array} point — [x, y, z] in P2
 * @returns {number[]} [f₀(p), f₁(p), f₂(p), f₃(p)] — point in P3
 */
export function evaluateMap(basis, point) {
  return basis.map(coeffs => evaluateForm(coeffs, point, 3));
}
