// Camera utilities for 3D raymarching scenes.
//
// setCamera() builds a look-at matrix; orbitCamera() adds mouse-driven
// orbit on top. Both follow Shadertoy conventions (iMouse, iResolution).

#define PI 3.14159265359

// Look-at camera matrix.
// ro = eye position, ta = target, cr = roll angle.
// Returns mat3 whose columns are (right, up, forward).
mat3 setCamera(vec3 ro, vec3 ta, float cr) {
    vec3 cw = normalize(ta - ro);
    vec3 cp = vec3(sin(cr), cos(cr), 0.0);
    vec3 cu = normalize(cross(cw, cp));
    vec3 cv = normalize(cross(cu, cw));
    return mat3(cu, cv, cw);
}

// Mouse-driven orbit camera.
// Click-drag rotates; when no click has occurred, uses defaultRo.
// Returns the eye position (target is assumed to be the origin).
vec3 orbitCamera(float dist, vec3 defaultRo) {
    if (iMouse.z > 0.5) {
        float phi = (iMouse.x / iResolution.x) * PI * 2.0;
        float psi = -((iMouse.y / iResolution.y) - 0.5) * PI;
        return dist * vec3(cos(phi)*cos(psi), sin(psi), sin(phi)*cos(psi));
    }
    return defaultRo;
}
