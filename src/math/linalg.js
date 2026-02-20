/**
 * Small dense linear algebra: RREF and null space.
 *
 * Matrices are arrays of rows, each row a Float64Array (or plain array).
 * All operations return new arrays (no mutation of inputs).
 */

/**
 * Row-reduce a matrix to reduced row echelon form (RREF).
 * Returns { rref, pivotCols } where pivotCols[i] is the column of the i-th pivot.
 */
export function rref(matrix) {
  const m = matrix.length;
  const n = matrix[0].length;
  // Copy
  const A = matrix.map(row => Float64Array.from(row));

  const pivotCols = [];
  let row = 0;

  for (let col = 0; col < n && row < m; col++) {
    // Find pivot: row with largest absolute value in this column
    let best = row;
    for (let i = row + 1; i < m; i++) {
      if (Math.abs(A[i][col]) > Math.abs(A[best][col])) best = i;
    }
    if (Math.abs(A[best][col]) < 1e-12) continue; // skip zero column

    // Swap
    [A[row], A[best]] = [A[best], A[row]];

    // Scale pivot row
    const scale = 1 / A[row][col];
    for (let j = col; j < n; j++) A[row][j] *= scale;

    // Eliminate all other rows
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

/**
 * Compute the null space of a matrix.
 * Returns an array of basis vectors (each a Float64Array of length n).
 * For a rank-deficient m×n matrix, returns (n - rank) vectors.
 */
export function nullSpace(matrix) {
  const n = matrix[0].length;
  const { rref: R, pivotCols } = rref(matrix);

  const pivotSet = new Set(pivotCols);
  const freeCols = [];
  for (let j = 0; j < n; j++) {
    if (!pivotSet.has(j)) freeCols.push(j);
  }

  // For each free variable, construct a null space vector
  return freeCols.map(fc => {
    const v = new Float64Array(n);
    v[fc] = 1;
    // Back-substitute: for each pivot row i with pivot in column pivotCols[i],
    // v[pivotCols[i]] = -R[i][fc]
    for (let i = 0; i < pivotCols.length; i++) {
      v[pivotCols[i]] = -R[i][fc];
    }
    return v;
  });
}
