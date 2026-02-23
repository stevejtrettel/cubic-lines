/**
 * Linear algebra and projective geometry primitives.
 *
 * RREF, null space, monomial evaluation, homogeneous forms, and conics.
 */

// ==================== Linear algebra ====================

function rref(matrix) {
  const m = matrix.length;
  const n = matrix[0].length;
  const A = matrix.map(row => Float64Array.from(row));

  const pivotCols = [];
  let row = 0;

  for (let col = 0; col < n && row < m; col++) {
    let best = row;
    for (let i = row + 1; i < m; i++) {
      if (Math.abs(A[i][col]) > Math.abs(A[best][col])) best = i;
    }
    if (Math.abs(A[best][col]) < 1e-12) continue;

    [A[row], A[best]] = [A[best], A[row]];

    const scale = 1 / A[row][col];
    for (let j = col; j < n; j++) A[row][j] *= scale;

    for (let i = 0; i < m; i++) {
      if (i === row) continue;
      const factor = A[i][col];
      if (factor === 0) continue;
      for (let j = col; j < n; j++) A[i][j] -= factor * A[row][j];
    }

    pivotCols.push(col);
    row++;
  }

  return { rref: A, pivotCols };
}

function nullSpace(matrix) {
  const n = matrix[0].length;
  const { rref: R, pivotCols } = rref(matrix);

  const pivotSet = new Set(pivotCols);
  const freeCols = [];
  for (let j = 0; j < n; j++) {
    if (!pivotSet.has(j)) freeCols.push(j);
  }

  return freeCols.map(fc => {
    const v = new Float64Array(n);
    v[fc] = 1;
    for (let i = 0; i < pivotCols.length; i++) {
      v[pivotCols[i]] = -R[i][fc];
    }
    return v;
  });
}

// ==================== Monomials ====================

// Evaluate all degree-d monomials at a point (graded lex order).
function monomialRow(point, d) {
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

// Evaluate a homogeneous form (given as coefficients in graded lex order) at a point.
export function evaluateForm(coeffs, point, degree) {
  const monoms = monomialRow(point, degree);
  let sum = 0;
  for (let i = 0; i < monoms.length; i++) sum += coeffs[i] * monoms[i];
  return sum;
}

// Gradient of a homogeneous form at a point.
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

// ==================== Forms & conics ====================

// Basis for homogeneous forms of given degree vanishing at the given points.
export function formsVanishingAt(points, degree) {
  const matrix = points.map(p => monomialRow(p, degree));
  return nullSpace(matrix);
}

// Bilinear form of a conic: B(p,q) = p^T M q.
function conicBilinear(coeffs, p, q) {
  const [a, b, c, d, e, f] = coeffs;
  return a * p[0]*q[0]
       + (b/2) * (p[0]*q[1] + p[1]*q[0])
       + (c/2) * (p[0]*q[2] + p[2]*q[0])
       + d * p[1]*q[1]
       + (e/2) * (p[1]*q[2] + p[2]*q[1])
       + f * p[2]*q[2];
}

// The unique conic through 5 points in P2.
export function conicThroughFivePoints(pts) {
  const basis = formsVanishingAt(pts, 2);
  if (basis.length === 0) return null;
  return basis[0];
}

// Given point q on a conic and direction v, find the other intersection of line q+tv.
export function conicOtherIntersection(coeffs, q, v) {
  const fv = evaluateForm(coeffs, v, 2);
  if (Math.abs(fv) < 1e-12) return null;
  const t = -2 * conicBilinear(coeffs, q, v) / fv;
  return q.map((qi, i) => qi + t * v[i]);
}
