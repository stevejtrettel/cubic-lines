// 3D line viewer: draws projective lines as cylinders in affine chart w=1.
//
// linePoints[i], lineDirections[i] are vec4s in P3.
// A line in the affine chart w=1 passes through
//   a = linePoints.xyz / linePoints.w
// with direction
//   d = (lineDir.xyz * linePt.w - linePt.xyz * lineDir.w) / (linePt.w²)

#define PI 3.14159265359

#define LINE_RADIUS    0.005
#define CAM_DIST       5.0
#define CAM_SPEED      0.2
#define BOX_SIZE       2.0

#define LIGHT_DIR normalize(vec3(0.4, 1.0, 0.3))

// --- Cylinder SDF (infinite line in affine chart) ---

float cylinderDist(vec3 p, vec4 linePt, vec4 lineDir) {
    if (abs(linePt.w) < 1e-8) return 1e6;
    vec3 a = linePt.xyz / linePt.w;
    vec3 d = (lineDir.xyz * linePt.w - linePt.xyz * lineDir.w) / (linePt.w * linePt.w);
    float dlen = length(d);
    if (dlen < 1e-8) return 1e6;
    vec3 pa = p - a;
    return length(cross(pa, d)) / dlen;
}

vec3 cylinderNormal(vec3 p, vec4 linePt, vec4 lineDir) {
    vec3 a = linePt.xyz / linePt.w;
    vec3 d = (lineDir.xyz * linePt.w - linePt.xyz * lineDir.w) / (linePt.w * linePt.w);
    d = normalize(d);
    vec3 pa = p - a;
    return normalize(pa - dot(pa, d) * d);
}

// --- Closest cylinder distance across all lines ---

float allLinesDist(vec3 p) {
    float d = 1e6;
    for (int i = 0; i < 21; i++) {
        d = min(d, cylinderDist(p, linePoints[i], lineDirections[i]));
    }
    return d;
}

int closestLine(vec3 p) {
    float best = 1e6;
    int idx = 0;
    for (int i = 0; i < 21; i++) {
        float d = cylinderDist(p, linePoints[i], lineDirections[i]);
        if (d < best) { best = d; idx = i; }
    }
    return idx;
}

// --- Box ---

float boxSDF(vec3 p) {
    vec3 q = abs(p) - vec3(BOX_SIZE);
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

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

// --- Camera ---

mat3 setCamera(vec3 ro, vec3 ta, float cr) {
    vec3 cw = normalize(ta - ro);
    vec3 cp = vec3(sin(cr), cos(cr), 0.0);
    vec3 cu = normalize(cross(cw, cp));
    vec3 cv = normalize(cross(cu, cw));
    return mat3(cu, cv, cw);
}

// --- Shading ---

vec3 shade(vec3 color, vec3 nn, vec3 rd) {
    float diff = 0.3 + 0.7 * max(0.0, dot(nn, LIGHT_DIR));
    float spec = pow(max(0.0, dot(LIGHT_DIR, reflect(rd, nn))), 64.0);
    return color * diff + vec3(spec * 0.4);
}

// Line colors: 0–14 pair lines (gray), 15–20 conic lines (blue)
vec3 lineColor(int i) {
    if (i < 15) return vec3(0.55);
    return vec3(0.2, 0.45, 0.9);
}

// --- Render ---

vec3 render(vec3 ro, vec3 rd) {
    vec3 col = mix(vec3(0.92), vec3(0.5, 0.6, 0.9), 0.5 + 0.5 * rd.y);

    vec2 tnf = boxIntersect(ro, rd);
    float t_min = max(0.0, tnf.x);
    float t_max = tnf.y;
    if (t_max <= t_min) return col;

    // Sphere-trace cylinders
    float t = t_min + 0.01;
    bool hit = false;
    for (int i = 0; i < 128; i++) {
        vec3 p = ro + rd * t;
        float d = allLinesDist(p) - LINE_RADIUS;
        if (d < 0.001) { hit = true; break; }
        t += d;
        if (t > t_max) break;
    }

    if (hit && t < t_max) {
        vec3 p = ro + rd * t;
        int idx = closestLine(p);
        vec3 nn = cylinderNormal(p, linePoints[idx], lineDirections[idx]);
        col = shade(lineColor(idx), nn, rd);
    }

    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    vec3 ta = vec3(0.0);
    vec3 ro;
    if (iMouse.z > 0.5) {
        float phi = (iMouse.x / iResolution.x) * PI * 2.0;
        float psi = -((iMouse.y / iResolution.y) - 0.5) * PI;
        ro = CAM_DIST * vec3(cos(phi)*cos(psi), sin(psi), sin(phi)*cos(psi));
    } else {
        ro = vec3(CAM_DIST * 0.5, 3.0, CAM_DIST * 0.7);
    }
    mat3 cam = setCamera(ro, ta, 0.0);
    vec3 rd = cam * normalize(vec3(uv, 2.0));
    vec3 col = render(ro, rd);
    col = sqrt(col);
    fragColor = vec4(col, 1.0);
}
