// Distance and normal for a projective line rendered in an affine chart.
//
// A line in P3 is given by a base point P and direction D in homogeneous
// coordinates (vec4). To render it in the affine chart w=1 we dehomogenize:
//
//   affine point:     a = P.xyz / P.w
//   affine direction: d = (D.xyz·P.w - P.xyz·D.w) / P.w²
//
// The direction formula is the quotient rule: d/dt [(P + tD).xyz / (P + tD).w]
// evaluated at t = 0. This correctly handles lines that are not parallel to
// the hyperplane w = 0.

// Perpendicular distance from point p to the line (infinite cylinder SDF).
float cylinderDist(vec3 p, vec4 linePt, vec4 lineDir) {
    if (abs(linePt.w) < 1e-8) return 1e6;  // line at infinity
    vec3 a = linePt.xyz / linePt.w;
    // Quotient rule: affine direction = (D.xyz·w - P.xyz·D.w) / w²
    vec3 d = (lineDir.xyz * linePt.w - linePt.xyz * lineDir.w) / (linePt.w * linePt.w);
    float dlen = length(d);
    if (dlen < 1e-8) return 1e6;  // degenerate
    return length(cross(p - a, d)) / dlen;
}

// Outward normal of the cylinder at point p.
vec3 cylinderNormal(vec3 p, vec4 linePt, vec4 lineDir) {
    vec3 a = linePt.xyz / linePt.w;
    vec3 d = (lineDir.xyz * linePt.w - linePt.xyz * lineDir.w) / (linePt.w * linePt.w);
    d = normalize(d);
    vec3 pa = p - a;
    return normalize(pa - dot(pa, d) * d);
}
