// Signed distance fields and ray-box intersection.
//
// Requires BOX_SIZE to be #defined before inclusion.

// Exact SDF for an axis-aligned box centered at the origin.
float boxSDF(vec3 p) {
    vec3 q = abs(p) - vec3(BOX_SIZE);
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Ray-box intersection for an axis-aligned box centered at the origin.
// Returns vec2(tNear, tFar), or vec2(-1) if no hit.
vec2 boxIntersect(vec3 ro, vec3 rd) {
    vec3 m = 1.0 / rd;
    vec3 n = m * ro;
    vec3 k = abs(m) * BOX_SIZE;
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;
    float tN = max(max(t1.x, t1.y), t1.z);
    float tF = min(min(t2.x, t2.y), t2.z);
    if (tN > tF || tF < 0.0) return vec2(-1.0);
    return vec2(tN, tF);
}
