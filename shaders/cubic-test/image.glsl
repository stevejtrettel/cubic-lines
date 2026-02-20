// Cubic surface raytracer.
//
// Raymarches the zero set of a degree-3 homogeneous polynomial
// in projective coordinates (x, y, z, w), evaluated at w = 1.
//
// The 20 coefficients arrive via a uniform vec4 coefficients[5],
// packed in graded lexicographic order:
//
//   [0] = (x³,  x²y, x²z, x²w)
//   [1] = (xy², xyz, xyw, xz²)
//   [2] = (xzw, xw², y³,  y²z)
//   [3] = (y²w, yz², yzw, yw²)
//   [4] = (z³,  z²w, zw², w³ )
//
// These are set each frame from script.js via engine.setUniformValue().

#define PI 3.14159265359

// --- Parameters ---

#define STEP_SIZE      0.008
#define LINE_RADIUS    0.02
#define BOUNDARY_RADIUS 0.02
#define CAM_DIST       5.0
#define CAM_SPEED      0.2

#define LIGHT_DIR normalize(vec3(cos(-iTime*0.3+PI*0.5), 1.0, sin(-iTime*0.3+PI*0.5)))

// --- Polynomial evaluation at (x, y, z, w=1) ---

float f(vec3 p) {
    float x = p.x, y = p.y, z = p.z;
    float x2 = x*x, y2 = y*y, z2 = z*z;

    return coefficients[0].x * x2*x
         + coefficients[0].y * x2*y
         + coefficients[0].z * x2*z
         + coefficients[0].w * x2
         + coefficients[1].x * x*y2
         + coefficients[1].y * x*y*z
         + coefficients[1].z * x*y
         + coefficients[1].w * x*z2
         + coefficients[2].x * x*z
         + coefficients[2].y * x
         + coefficients[2].z * y2*y
         + coefficients[2].w * y2*z
         + coefficients[3].x * y2
         + coefficients[3].y * y*z2
         + coefficients[3].z * y*z
         + coefficients[3].w * y
         + coefficients[4].x * z2*z
         + coefficients[4].y * z2
         + coefficients[4].z * z
         + coefficients[4].w;
}

// --- Analytic gradient (df/dx, df/dy, df/dz) at w=1 ---

vec3 fGrad(vec3 p) {
    float x = p.x, y = p.y, z = p.z;
    float x2 = x*x, y2 = y*y, z2 = z*z;

    float dx = 3.0*coefficients[0].x * x2
             + 2.0*coefficients[0].y * x*y
             + 2.0*coefficients[0].z * x*z
             + 2.0*coefficients[0].w * x
             +     coefficients[1].x * y2
             +     coefficients[1].y * y*z
             +     coefficients[1].z * y
             +     coefficients[1].w * z2
             +     coefficients[2].x * z
             +     coefficients[2].y;

    float dy =     coefficients[0].y * x2
             + 2.0*coefficients[1].x * x*y
             +     coefficients[1].y * x*z
             +     coefficients[1].z * x
             + 3.0*coefficients[2].z * y2
             + 2.0*coefficients[2].w * y*z
             + 2.0*coefficients[3].x * y
             +     coefficients[3].y * z2
             +     coefficients[3].z * z
             +     coefficients[3].w;

    float dz =     coefficients[0].z * x2
             +     coefficients[1].y * x*y
             + 2.0*coefficients[1].w * x*z
             +     coefficients[2].x * x
             +     coefficients[2].w * y2
             + 2.0*coefficients[3].y * y*z
             +     coefficients[3].z * y
             + 3.0*coefficients[4].x * z2
             + 2.0*coefficients[4].y * z
             +     coefficients[4].z;

    return vec3(dx, dy, dz);
}

// --- World-space wrappers (offset by boxCenter) ---

vec3 boxCenter = vec3(0.0, 1.0, 0.0);

float fWorld(vec3 p) { return f(p - boxCenter); }
vec3  fWorldGrad(vec3 p) { return fGrad(p - boxCenter); }

// --- Box SDF (signed distance to the box surface) ---

float boxSDF(vec3 p) {
    vec3 q = abs(p - boxCenter) - vec3(1.0);
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// --- Boundary tube (where f=0 meets the box) ---
//
// Distance to the intersection curve of two implicit surfaces
// is approximately sqrt(d1² + d2²), where d1, d2 are the
// linearized distances to each surface.

float boundaryDist(vec3 p) {
    float dSurf = abs(fWorld(p)) / length(fWorldGrad(p));
    float dBox = abs(boxSDF(p));
    return sqrt(dSurf*dSurf + dBox*dBox);
}

// --- Infinite cylinder (projective line → affine chart w=1) ---

float cylinderDist(vec3 p, vec4 linePt, vec4 lineDir) {
    vec3 a = linePt.xyz / linePt.w;
    vec3 d = (lineDir.xyz * linePt.w - linePt.xyz * lineDir.w) / (linePt.w * linePt.w);
    vec3 pa = p - a;
    return length(cross(pa, d)) / length(d);
}

vec3 cylinderNormal(vec3 p, vec4 linePt, vec4 lineDir) {
    vec3 a = linePt.xyz / linePt.w;
    vec3 d = (lineDir.xyz * linePt.w - linePt.xyz * lineDir.w) / (linePt.w * linePt.w);
    d = normalize(d);
    vec3 pa = p - a;
    return normalize(pa - dot(pa, d) * d);
}

// --- Materials ---

struct Material {
    vec3  color;
    float specExp;
    float ambient;
};

const Material CUBIC_FRONT = Material(vec3(0.85, 0.78, 0.65), 128.0, 0.5);
const Material CUBIC_BACK  = Material(vec3(0.55, 0.25, 0.18), 64.0, 0.4);
const Material LINE_MAT      = Material(vec3(0.95, 0.3, 0.2), 64.0, 0.3);
const Material BOUNDARY_MAT  = Material(vec3(0.1), 32.0, 0.6);

vec3 shade(Material mat, vec3 nn, vec3 rd) {
    vec3 L = LIGHT_DIR;
    float diff = mat.ambient + (1.0 - mat.ambient) * max(0.0, dot(nn, L));
    float spec = pow(max(0.0, dot(L, reflect(rd, nn))), mat.specExp);
    return mat.color * diff + vec3(spec);
}

// --- Ray-box intersection (returns entry/exit t values) ---

vec2 boxIntersect(vec3 ro, vec3 rd) {
    vec3 roo = ro - boxCenter;
    vec3 m = 1.0/rd;
    vec3 n = m*roo;
    vec3 k = abs(m);
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;
    float tN = max(max(t1.x, t1.y), t1.z);
    float tF = min(min(t2.x, t2.y), t2.z);
    if (tN > tF || tF < 0.0) return vec2(-1.0);
    return vec2(tN, tF);
}

// --- Iso-surface marcher (sign-change detection) ---

float marchIso(vec3 ro, vec3 rd, float tMin, float tMax, float level) {
    float val = fWorld(ro + rd*tMin);
    float inv = val > level ? 1.0 : -1.0;
    for (float t = tMin; t < tMax; t += STEP_SIZE) {
        val = fWorld(ro + rd*t);
        if ((val - level)*inv < 0.0) return t;
    }
    return tMax;
}

// --- Camera ---

mat3 setCamera(vec3 ro, vec3 ta, float cr) {
    vec3 cw = normalize(ta - ro);
    vec3 cp = vec3(sin(cr), cos(cr), 0.0);
    vec3 cu = normalize(cross(cw, cp));
    vec3 cv = normalize(cross(cu, cw));
    return mat3(cu, cv, cw);
}

// --- Render ---

vec3 render(vec3 ro, vec3 rd) {
    vec3 col = mix(vec3(0.92), vec3(0.5, 0.6, 0.9), 0.5 + 0.5*rd.y);

    // Intersect bounding box — everything lives inside this
    vec2 tnf = boxIntersect(ro, rd);
    float t_min = max(0.0, tnf.x);
    float t_max = tnf.y;
    if (t_max <= t_min) return col;

    // Cubic surface (sign-change march)
    float tSurf = marchIso(ro, rd, t_min, t_max, 0.0);

    // Boundary tube (sphere-trace where f=0 meets the box)
    // Step scaled by 0.5 — |f|/|∇f| overestimates for curved polynomials
    float tBound = t_max;
    float tb = t_min;
    for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd*tb;
        float d = boundaryDist(p) - BOUNDARY_RADIUS;
        if (d < 0.001) { tBound = tb; break; }
        tb += d * 0.5;
        if (tb > t_max) break;
    }

    // Cylinder (sphere-trace, clamped to box)
    float tLine = t_max;
    float tl = t_min;
    for (int i = 0; i < 128; i++) {
        vec3 p = ro + rd*tl;
        float d = cylinderDist(p, linePoints[0], lineDirections[0]) - LINE_RADIUS;
        if (d < 0.001) { tLine = tl; break; }
        tl += d;
        if (tl > t_max) break;
    }

    // Shade whichever is closest
    float tHit = min(tSurf, min(tLine, tBound));
    if (tHit < t_max) {
        vec3 p = ro + rd*tHit;
        if (tHit == tBound) {
            // Boundary tube — use finite-difference normal for the combined SDF
            vec2 e = vec2(0.005, 0.0);
            float v = boundaryDist(p);
            vec3 nn = normalize(vec3(
                boundaryDist(p+e.xyy)-v,
                boundaryDist(p+e.yxy)-v,
                boundaryDist(p+e.yyx)-v));
            col = shade(BOUNDARY_MAT, nn, rd);
        } else if (tHit == tLine) {
            vec3 nn = cylinderNormal(p, linePoints[0], lineDirections[0]);
            col = shade(LINE_MAT, nn, rd);
        } else {
            vec3 nn = normalize(fWorldGrad(p));
            bool backFace = dot(nn, rd) > 0.0;
            if (backFace) nn = -nn;
            vec3 surfCol;
            if (backFace)
                surfCol = shade(CUBIC_BACK, nn, rd);
            else
                surfCol = shade(CUBIC_FRONT, nn, rd);
            col = mix(col, surfCol, 0.7);
        }
    }

    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0*fragCoord - iResolution.xy) / iResolution.y;
    vec3 ta = vec3(0.0, 0.5, 0.0);
    vec3 ro;
    if (iMouse.z > 0.5) {
        float phi = (iMouse.x / iResolution.x) * PI * 2.0;
        float psi = -((iMouse.y / iResolution.y) - 0.5) * PI;
        ro = CAM_DIST * vec3(cos(phi)*cos(psi), sin(psi), sin(phi)*cos(psi));
    } else {
        ro = vec3(CAM_DIST*cos(-iTime*CAM_SPEED), 4.0, CAM_DIST*sin(-iTime*CAM_SPEED));
    }
    mat3 cam = setCamera(ro, ta, 0.0);
    vec3 rd = cam * normalize(vec3(uv, 2.0));
    vec3 col = render(ro, rd);
    col = sqrt(col);
    fragColor = vec4(col, 1.0);
}
