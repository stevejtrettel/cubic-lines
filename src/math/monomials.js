/**
 * Monomial evaluation for homogeneous polynomials.
 *
 * Monomials of degree d in n variables are all products
 * x₁^a₁ · x₂^a₂ · … · xₙ^aₙ  with  a₁ + … + aₙ = d.
 *
 * Count: C(n + d − 1, d).
 * Order: graded lexicographic (a₁ descending, then a₂, …).
 *
 * Examples (n = 3):
 *   degree 2: x², xy, xz, y², yz, z²
 *   degree 3: x³, x²y, x²z, xy², xyz, xz², y³, y²z, yz², z³
 *
 * Example (n = 4, degree 3): 20 monomials
 *   x³, x²y, x²z, x²w, xy², xyz, xyw, xz², xzw, xw²,
 *   y³, y²z, y²w, yz², yzw, yw², z³, z²w, zw², w³
 */

/**
 * Number of degree-d monomials in n variables.
 * @param {number} d — degree
 * @param {number} [n=3] — number of variables
 * @returns {number} C(n + d − 1, d)
 */
export function monomialCount(d, n = 3) {
  // C(n + d - 1, d)
  let result = 1;
  for (let i = 0; i < d; i++) result = result * (n + i) / (i + 1);
  return result;
}

/**
 * Evaluate all degree-d monomials at a point.
 * Point length determines the number of variables.
 * Returns an array of length monomialCount(d, point.length).
 */
export function monomialRow(point, d) {
  const n = point.length;
  const row = [];
  const exps = new Array(n);

  function enumerate(pos, remaining) {
    if (pos === n - 1) {
      exps[pos] = remaining;
      let val = 1;
      for (let i = 0; i < n; i++) {
        if (exps[i] > 0) val *= point[i] ** exps[i];
      }
      row.push(val);
      return;
    }
    for (let a = remaining; a >= 0; a--) {
      exps[pos] = a;
      enumerate(pos + 1, remaining - a);
    }
  }
  enumerate(0, d);
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

/**
 * Gradient of a homogeneous form at a point.
 *
 * Returns [∂f/∂x₁, …, ∂f/∂xₙ] evaluated at point.
 * Point length determines the number of variables.
 * Each partial derivative of a degree-d form is a degree-(d-1) form.
 *
 * @param {ArrayLike} coeffs — coefficients in graded lex order
 * @param {Array} point
 * @param {number} degree
 * @returns {number[]} gradient vector (same length as point)
 */
export function formGradient(coeffs, point, degree) {
  const n = point.length;
  const grad = new Array(n).fill(0);
  const exps = new Array(n);
  let i = 0;

  function enumerate(pos, remaining) {
    if (pos === n - 1) {
      exps[pos] = remaining;
      const ci = coeffs[i];
      for (let k = 0; k < n; k++) {
        if (exps[k] > 0) {
          let val = ci * exps[k];
          for (let j = 0; j < n; j++) {
            const e = j === k ? exps[j] - 1 : exps[j];
            if (e > 0) val *= point[j] ** e;
          }
          grad[k] += val;
        }
      }
      i++;
      return;
    }
    for (let a = remaining; a >= 0; a--) {
      exps[pos] = a;
      enumerate(pos + 1, remaining - a);
    }
  }
  enumerate(0, degree);
  return grad;
}
