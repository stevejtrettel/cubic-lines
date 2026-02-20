/**
 * Find homogeneous forms of degree d in P2 that vanish at given points.
 *
 * Builds the evaluation matrix (one row per point, one column per monomial)
 * and returns a basis for its null space. Each basis vector is the
 * coefficients of a degree-d homogeneous polynomial (in graded lex order)
 * that vanishes at all the given points.
 */

import { monomialRow } from './monomials.js';
import { nullSpace } from './linalg.js';

/**
 * @param {Array} points — points in P2, each [x, y, z]
 * @param {number} degree
 * @returns {Float64Array[]} basis vectors for the space of vanishing forms
 */
export function formsVanishingAt(points, degree) {
  const matrix = points.map(p => monomialRow(p, degree));
  return nullSpace(matrix);
}
