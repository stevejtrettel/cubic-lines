// Cubic surface evaluation, gradient, and raymarching utilities.
//
// Provides f(), fGrad(), boundaryDist(), marchIso() for the implicit
// cubic surface, plus allLinesDist(), closestLine(), lineColor() for
// the 27 lines.
//
// Requires before inclusion:
//   - uniform vec4 coefficients[5]  (20 cubic coeffs, graded lex x,y,z,w)
//   - uniform vec4 linePoints[27], lineDirections[27]
//   - #define STEP_SIZE, LINE_RADIUS, BOUNDARY_RADIUS
//   - boxSDF() from sdf.glsl
//   - cylinderDist(), cylinderNormal() from projective-line.glsl
//
// Coefficient packing (graded lexicographic order):
//
//   [0] = (x³,  x²y, x²z, x²w)     indices 0–3
//   [1] = (xy², xyz, xyw, xz²)      indices 4–7
//   [2] = (xzw, xw², y³,  y²z)      indices 8–11
//   [3] = (y²w, yz², yzw, yw²)      indices 12–15
//   [4] = (z³,  z²w, zw², w³ )      indices 16–19

// --- Polynomial evaluation: f(x, y, z) = F(x, y, z, 1) ---
//
// Each line is annotated with the monomial (after setting w = 1).

float f(vec3 p) {
    float x = p.x, y = p.y, z = p.z;
    float x2 = x*x, y2 = y*y, z2 = z*z;

    return coefficients[0].x * x2*x   // x³
         + coefficients[0].y * x2*y   // x²y
         + coefficients[0].z * x2*z   // x²z
         + coefficients[0].w * x2     // x²w → x²
         + coefficients[1].x * x*y2   // xy²
         + coefficients[1].y * x*y*z  // xyz
         + coefficients[1].z * x*y    // xyw → xy
         + coefficients[1].w * x*z2   // xz²
         + coefficients[2].x * x*z    // xzw → xz
         + coefficients[2].y * x      // xw² → x
         + coefficients[2].z * y2*y   // y³
         + coefficients[2].w * y2*z   // y²z
         + coefficients[3].x * y2     // y²w → y²
         + coefficients[3].y * y*z2   // yz²
         + coefficients[3].z * y*z    // yzw → yz
         + coefficients[3].w * y      // yw² → y
         + coefficients[4].x * z2*z   // z³
         + coefficients[4].y * z2     // z²w → z²
         + coefficients[4].z * z      // zw² → z
         + coefficients[4].w;         // w³  → 1
}

// --- Analytic gradient: (∂f/∂x, ∂f/∂y, ∂f/∂z) at w = 1 ---
//
// Each term is ∂/∂xₖ of the corresponding monomial in f.
// For example, ∂(x²y)/∂x = 2xy appears in dx with coefficient [0].y.

vec3 fGrad(vec3 p) {
    float x = p.x, y = p.y, z = p.z;
    float x2 = x*x, y2 = y*y, z2 = z*z;

    float dx = 3.0*coefficients[0].x * x2     // ∂(x³)/∂x
             + 2.0*coefficients[0].y * x*y     // ∂(x²y)/∂x
             + 2.0*coefficients[0].z * x*z     // ∂(x²z)/∂x
             + 2.0*coefficients[0].w * x       // ∂(x²)/∂x
             +     coefficients[1].x * y2      // ∂(xy²)/∂x
             +     coefficients[1].y * y*z     // ∂(xyz)/∂x
             +     coefficients[1].z * y       // ∂(xy)/∂x
             +     coefficients[1].w * z2      // ∂(xz²)/∂x
             +     coefficients[2].x * z       // ∂(xz)/∂x
             +     coefficients[2].y;          // ∂(x)/∂x

    float dy =     coefficients[0].y * x2      // ∂(x²y)/∂y
             + 2.0*coefficients[1].x * x*y     // ∂(xy²)/∂y
             +     coefficients[1].y * x*z     // ∂(xyz)/∂y
             +     coefficients[1].z * x       // ∂(xy)/∂y
             + 3.0*coefficients[2].z * y2      // ∂(y³)/∂y
             + 2.0*coefficients[2].w * y*z     // ∂(y²z)/∂y
             + 2.0*coefficients[3].x * y       // ∂(y²)/∂y
             +     coefficients[3].y * z2      // ∂(yz²)/∂y
             +     coefficients[3].z * z       // ∂(yz)/∂y
             +     coefficients[3].w;          // ∂(y)/∂y

    float dz =     coefficients[0].z * x2      // ∂(x²z)/∂z
             +     coefficients[1].y * x*y     // ∂(xyz)/∂z
             + 2.0*coefficients[1].w * x*z     // ∂(xz²)/∂z
             +     coefficients[2].x * x       // ∂(xz)/∂z
             +     coefficients[2].w * y2      // ∂(y²z)/∂z
             + 2.0*coefficients[3].y * y*z     // ∂(yz²)/∂z
             +     coefficients[3].z * y       // ∂(yz)/∂z
             + 3.0*coefficients[4].x * z2      // ∂(z³)/∂z
             + 2.0*coefficients[4].y * z       // ∂(z²)/∂z
             +     coefficients[4].z;          // ∂(z)/∂z

    return vec3(dx, dy, dz);
}

// --- Boundary tube (where f=0 meets the clipping box) ---

float boundaryDist(vec3 p) {
    float dSurf = abs(f(p)) / max(length(fGrad(p)), 1e-6);
    float dBox = abs(boxSDF(p));
    return sqrt(dSurf*dSurf + dBox*dBox);
}

// --- Iso-surface marcher (sign-change detection) ---

float marchIso(vec3 ro, vec3 rd, float tMin, float tMax) {
    float val = f(ro + rd * tMin);
    float inv = val > 0.0 ? 1.0 : -1.0;
    for (float t = tMin; t < tMax; t += STEP_SIZE) {
        val = f(ro + rd * t);
        if (val * inv < 0.0) return t;
    }
    return tMax;
}

// --- 27 lines: distance queries and coloring ---

float allLinesDist(vec3 p) {
    float d = 1e6;
    for (int i = 0; i < 27; i++) {
        d = min(d, cylinderDist(p, linePoints[i], lineDirections[i]));
    }
    return d;
}

int closestLine(vec3 p) {
    float best = 1e6;
    int idx = 0;
    for (int i = 0; i < 27; i++) {
        float d = cylinderDist(p, linePoints[i], lineDirections[i]);
        if (d < best) { best = d; idx = i; }
    }
    return idx;
}

// 0–14: pair lines (gray), 15–20: conic lines (blue), 21–26: exceptional lines (red)
vec3 lineColor(int i) {
    if (i < 15) return vec3(0.55);
    if (i < 21) return vec3(0.2, 0.45, 0.9);
    return vec3(0.9, 0.25, 0.2);
}
