# cubic-lines

Joint work of Gabriel Dorfsman-Hopkins, Claudio Gomez-Gonzales and Steve Trettel.

Interactive visualization of the 27 lines on a cubic surface. Drag six points in the projective plane and watch the cubic surface and
its 27 lines update in real time.


## Quick start

```bash
npm install
npm run dev
```

Opens a Vite dev server at `localhost:3000`. No runtime dependencies.

---

## The mathematics

Every smooth cubic surface is isomorphic to the blow-up of P2 at 6
points in general position. This project exploits this: given 6 points
in P2, it constructs the parameterization of the cubic in P3, uses this
to compute all 27 lines, and then finally uses these lines to produce
the implicit equation of the cubic for rendering.

### Step 1: The cubic map phi: P2 --> P3

We work in P2 with homogeneous coordinates [x : y : z]. Fix six points
p1, ..., p6 in **general position** (no three collinear, not all six on
a conic).

A degree-3 homogeneous polynomial in x, y, z has 10 monomials:

    x^3, x^2y, x^2z, xy^2, xyz, xz^2, y^3, y^2z, yz^2, z^3

so a cubic form is determined by 10 coefficients. To find cubics
vanishing at all 6 base points, we build a 6 x 10 matrix M: the i-th
row evaluates all 10 monomials at pi. The cubics we want are the null
space of M. With 6 independent constraints on 10 coefficients, the null
space is generically 4-dimensional, spanned by forms f0, f1, f2, f3.

These four cubics define a rational map

    phi: P2 --> P3,    [x:y:z] |-> [f0(x,y,z) : f1(x,y,z) : f2(x,y,z) : f3(x,y,z)]

This map is well-defined away from the 6 base points (where all four
cubics vanish simultaneously). The closure of the image S is a smooth cubic surface in
P3.

**What the code does.** `formsVanishingAt` (in `src/math/forms.js`)
builds the evaluation matrix and `nullSpace` (in `src/math/linalg.js`)
computes the 4-dimensional kernel via RREF.
The basis is stored as four Float64Arrays of length 10, one per cubic. Evaluating phi at a point means evaluating each
of the four cubics — that's `evaluateMap` in `src/cubic/cubic-map.js`.

### Step 2: The 27 lines

The 27 lines come from three collections of objects in P2. In each
case the key question is the same: **how do we find two points on the
image line?** Two points determine a line in P3, so that's all we need.

#### 15 pair lines: lines through pairs of base points

For each pair (pi, pj), the line l_{ij} through them in P2 maps to a
line on S. There are 15 such pairs.


**The problem:** phi is undefined at pi and pj themselves — all four
cubics vanish, so [0:0:0:0] is not a projective point. **The fix:**
sample at interior points where the map is well-defined. We evaluate
phi at q = (2pi + pj)/3 and q' = (pi + 2pj)/3, getting two points
phi(q) and phi(q') that span the image line.

#### 6 conic lines: conics through 5 of the 6 base points

For each i, there is a unique conic Ci through the five points
{p1,...,p6} \ {pi}. The image phi(Ci) is a line on S.


**The problem:** we just need two points on Ci. Once we have these we can just push them through our parameterization to get two points in P3 that lie on our line on the cubic.  However these can't be the points we know (the basepoints) as all parameterizations vanish there!

 **The fix:** the omitted point pi is NOT
on Ci, so we can connect it to one of the other points we chose (which lies on the conic) by a line.  This line should intersect the conic twice: once at this chosen point, and a *second time* - which generically is a new point not in our list!  If we do this for two points we know are on the conic, we get two points not in our original six, and pushing them through the parameterization gives two points on the image line in P3.


**Finding the second intersection.** A conic f(p) = p^T M p has an
associated bilinear form B(p,q) = p^T M q, satisfying f(p) = B(p,p).
To intersect the line q + tv with Ci, expand:

    f(q + tv) = f(q) + 2t B(q,v) + t^2 f(v)

Since q is on Ci, f(q) = 0, and this factors as t(2 B(q,v) + t f(v)) = 0.
The root t = 0 is the known intersection at q; the other root is

    t = -2 B(q,v) / f(v)

giving r = q + tv. Do this twice with two different base points on Ci,
get two non-base points r1, r2, and evaluate phi(r1), phi(r2) to span
the image line.

#### 6 exceptional lines: the blown-up base points

At each base point pi, phi is undefined — all four cubics vanish, so
[f0 : f1 : f2 : f3] = [0:0:0:0]. The blow-up replaces pi with a P1
of tangent directions, and each direction maps to a well-defined point
in P3. The set of all such image points is a line on S — the
exceptional line over pi.

**How to compute it.** Approach pi along a direction v and Taylor-expand
each component of phi:

    f_k(pi + eps v) = f_k(pi) + eps * grad f_k(pi) . v + O(eps^2)
                    = 0       + eps * grad f_k(pi) . v + O(eps^2)

So in projective coordinates (canceling the common factor eps):

    phi(pi + eps v) = [grad f0(pi).v : grad f1(pi).v : grad f2(pi).v : grad f3(pi).v]

This is a well-defined point in P3 (generically), and it depends only
on the direction v, not on eps. Stack the four gradients into a 4 x 3
matrix — the Jacobian:

    J(pi) = | grad f0(pi) |
            | grad f1(pi) |
            | grad f2(pi) |
            | grad f3(pi) |

The map "tangent direction v --> point in P3" is v |--> J(pi) v. The
image of this linear map is the column space of J(pi), which is
generically a 2-dimensional subspace of the 4-dimensional ambient
space — i.e., a line in P3. To get two concrete points on this line,
pick two independent directions v1, v2 and compute J(pi) v1 and
J(pi) v2.

**Choice of directions.** J(pi) is 4 x 3 with a 1-dimensional kernel,
so any two vectors outside the kernel give independent image points.
The kernel is spanned by pi itself — this is a direct calculation for
homogeneous polynomials: (grad f(p)) p = deg(f) * f(p), which vanishes
at a base point where f(pi) = 0. (Geometrically: moving in the
direction pi just rescales homogeneous coordinates, so it's not a real
tangent direction on P2.)

So we just need two vectors that aren't multiples of pi. The code uses
two other base points p_{i+1} and p_{i+2} — they're already available
and general position guarantees they work.

**What the code does.** All three families are computed in
`src/cubic/twenty-seven-lines.js`. The conic computations use
`conicThroughFivePoints` and `conicOtherIntersection` from
`src/math/conic.js`. The Jacobian evaluation uses `formGradient` from
`src/math/monomials.js` (generalized to n variables), wrapped as
`evaluateMapDerivative` in `src/cubic/cubic-map.js`.

### Step 3: Implicitization

The map phi gives a parametric description of S, but the shader needs
an implicit equation F(X,Y,Z,W) = 0 to raymarch. We need to find the
unique (up to scaling) degree-3 homogeneous polynomial in 4 variables that vanishes on
S.

A degree-3 form in 4 variables has C(6,3) = 20 monomials, so F has 20
unknown coefficients. The 15 pair lines gave us 30 sample points on S
(2 per line). Requiring F to vanish at each gives a 30 x 20 linear
system. Since S is an irreducible cubic, there is a unique such F up
to scale, so the null space is 1-dimensional. We find it the same way
we found the cubic map: build the evaluation matrix, take its null
space. The 20 implicit coefficients are packed into 5 vec4 uniforms
and sent to the GPU, where the shader evaluates F and its gradient to
render the surface.

### The underlying linear algebra pattern

The same two-step pattern — **build an evaluation matrix, take its null
space** — appears three times in the project:

1. **The cubic map** (Step 1): 6 points in P2, degree 3 → 6 x 10
   matrix → 4-dim null space → the four basis cubics f0, f1, f2, f3.
2. **The conics** (Step 2): 5 points in P2, degree 2 → 5 x 6 matrix
   → 1-dim null space → the unique conic through 5 points.
3. **Implicitization** (Step 3): 30 points in P3, degree 3 → 30 x 20
   matrix → 1-dim null space → the implicit cubic F.

In each case, "evaluation matrix" means: one row per point, one column
per monomial of the given degree. Entry (i,j) is the j-th monomial
evaluated at the i-th point. A vector in the null space gives
coefficients of a polynomial that vanishes at all the points.

**What the code does.** This pattern is captured by two primitives:

- `monomialRow(point, degree)` in `src/math/monomials.js` — evaluates
  all degree-d monomials at a point. The number of variables is
  determined by the point's length (3 for P2, 4 for P3, etc.), and
  the monomials are enumerated in graded lex order.
- `nullSpace(matrix)` in `src/math/linalg.js` — row-reduces via RREF
  with partial pivoting, identifies free columns, and back-substitutes
  to produce a basis for the kernel.

The convenience function `formsVanishingAt(points, degree)` in
`src/math/forms.js` is just the composition: build the matrix with
`monomialRow`, pass it to `nullSpace`. It's two lines of code, but it's
the workhorse of the entire project — every geometric construction
ultimately reduces to "find polynomials vanishing at these points."

---

## Architecture

### Layer diagram

```
demos/               per-demo entry points, shaders, config
  first-test/          main.js, cubic.glsl, p2.glsl

src/cubic/           cubic surface domain logic
  cubic-map.js         rational map P2 -> P3 (basis, evaluate, derivative)
  twenty-seven-lines.js  the 27 lines algorithm
  compute.js           packs math results into Float32Arrays for GPU
  six-point-editor.js  6-point interactive editor with defaults

src/math/            general-purpose projective/polynomial algebra
  linalg.js            RREF with partial pivoting, null space
  forms.js             homogeneous forms vanishing at given points
  monomials.js         monomial evaluation, polynomial gradient
  conic.js             conics in P2 (5-point conic, bilinear form, intersections)

src/shaders/         reusable GLSL library
  camera.glsl          look-at matrix, orbit camera
  sdf.glsl             box SDF, ray-box intersection
  projective-line.glsl projective line dehomogenization, cylinder distance
  shading.glsl         Blinn-Phong materials
  cubic-surface.glsl   implicit cubic evaluation, isosurface march, 27-line queries

src/core/            WebGL engine, viewports, split-view
  engine.js            minimal WebGL 2 fragment-shader engine
  viewport.js          stacked canvas + overlay layers
  split-view.js        side-by-side layout

src/points/          reactive point model + SVG drag editor
  point.js             2D point with onChange listeners
  editor.js            generic draggable SVG point editor
```

### Data flow

```
6 draggable points (six-point-editor)
  |
  v
[x,y] pairs  -->  compute()  -->  homogenize to P2
                                    |
                                    v
                              twentySevenLines()
                                    |
                                    v
                    { basis, conics, lines, implicitCoeffs }
                                    |
                                    v
                          pack into Float32Arrays
                          /                     \
                         v                       v
                  P2 engine                  P3 engine
              (pts, conics)          (coefficients, linePoints,
                                      lineDirections)
```

### Shader assembly

There is no `#include` system. Each GLSL file is imported as a raw
string via Vite's `?raw` suffix and concatenated in `main.js`:

```
shaderConfig           #define BOX_SIZE, LIGHT_DIR, STEP_SIZE, ...
  + camera.glsl        setCamera, orbitCamera
  + sdf.glsl           boxSDF, boxIntersect
  + projective-line.glsl  cylinderDist, cylinderNormal
  + shading.glsl       Material, shade, shadeLine
  + cubic-surface.glsl f, fGrad, marchIso, line queries
  + cubic.glsl         render(), mainImage()  (demo-specific)
```

Config defines are prepended first so all subsequent files can reference
them. The demo shader provides `render()` and `mainImage()` — the entry
points called by the engine wrapper.

### Rendering techniques

**Isosurface marching.** The cubic surface f=0 is found by marching
along each ray in fixed steps, detecting sign changes in f. When a sign
change is found, the intersection is refined by bisection.

**Sphere tracing.** The boundary tube (where f=0 meets the clipping
box) and the 27 line cylinders are rendered via sphere tracing against
their signed distance fields.

**Projective dehomogenization.** Lines in P3 are stored as homogeneous
4-vectors (base point, direction). The shader converts to affine
coordinates using the quotient rule:

    affine base      = linePt.xyz / linePt.w
    affine direction = (lineDir.xyz * w - linePt.xyz * lineDir.w) / w^2

**Demand-driven rendering.** Each engine only redraws when a uniform
value changes or the mouse moves.

### The math library

`src/math/` is intentionally general-purpose. The polynomial machinery
handles arbitrary-degree homogeneous forms in any number of variables,
and the linear algebra works on dense matrices of any size. These
modules could be reused for other projective geometry projects without
modification.

---

## The two demos

There are two copies of the same demo under `demos/`. They produce
identical output but are organized differently.

**`demos/first-test/`** is completely self-contained. Every file lives
in the directory — the WebGL engine, the linear algebra, the 27-lines
computation, the point editor, and both shaders. It imports nothing
from `src/`. This is the version that `index.html` points to, and it's
the easiest way to read the entire codebase top to bottom: seven files,
no indirection.

**`demos/new-build/`** does the same thing but imports shared modules
from `src/`. The math lives in `src/math/`, the cubic-specific logic in
`src/cubic/`, the GLSL library in `src/shaders/`, and the engine in
`src/core/`. The demo's `main.js` assembles a shader string from the
shared GLSL files and wires everything together. This is the version
to start from if you want to build new demos that reuse the same
infrastructure.

---
