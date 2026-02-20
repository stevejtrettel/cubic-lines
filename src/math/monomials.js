/**
 * Monomial evaluation for homogeneous polynomials in P2.
 *
 * Monomials of degree d in three variables (x, y, z) are all
 * x^a · y^b · z^c with a + b + c = d.
 *
 * Count: (d+1)(d+2)/2.
 * Order: graded lexicographic (a descending, then b descending).
 *   degree 2: x², xy, xz, y², yz, z²
 *   degree 3: x³, x²y, x²z, xy², xyz, xz², y³, y²z, yz², z³
 */

/**
 * Number of degree-d monomials in 3 variables.
 */
export function monomialCount(d) {
  return ((d + 1) * (d + 2)) / 2;
}

/**
 * Evaluate all degree-d monomials at a point [x, y, z].
 * Returns an array of length monomialCount(d).
 */
export function monomialRow([x, y, z], d) {
  const row = [];
  for (let a = d; a >= 0; a--) {
    for (let b = d - a; b >= 0; b--) {
      const c = d - a - b;
      row.push(x ** a * y ** b * z ** c);
    }
  }
  return row;
}

/**
 * Evaluate a homogeneous form at a point.
 * @param {ArrayLike} coeffs — coefficients in graded lex order
 * @param {Array} point — [x, y, z]
 * @param {number} degree
 * @returns {number}
 */
export function evaluateForm(coeffs, point, degree) {
  const monoms = monomialRow(point, degree);
  let sum = 0;
  for (let i = 0; i < monoms.length; i++) sum += coeffs[i] * monoms[i];
  return sum;
}
