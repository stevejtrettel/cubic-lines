/**
 * Conic through 5 points in P2.
 *
 * A conic in P2 is the zero set of a degree-2 homogeneous polynomial:
 *   a·x² + b·y² + c·z² + d·xy + e·yz + f·xz = 0
 *
 * Given 5 points [x,y,z] in P2, we build a 5×6 matrix where each row
 * evaluates the 6 monomials at a point, then take the null space.
 */

import { nullSpace } from './linalg.js';

// Monomial order: x², y², z², xy, yz, xz
function monomialRow([x, y, z]) {
  return [x*x, y*y, z*z, x*y, y*z, x*z];
}

/**
 * Compute the conic through 5 points in P2.
 *
 * @param {Array} pts — 5 points, each [x, y, z] in homogeneous coordinates
 * @returns {Float64Array} [a, b, c, d, e, f] — coefficients of
 *   a·x² + b·y² + c·z² + d·xy + e·yz + f·xz = 0
 *   or null if no unique conic exists (degenerate configuration)
 */
export function conicThroughFivePoints(pts) {
  const matrix = pts.map(monomialRow);
  const basis = nullSpace(matrix);
  if (basis.length === 0) return null;
  return basis[0];
}
