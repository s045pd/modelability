# Enterprise-D Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for the independent interior module and review; root integrates tightly coupled exterior, renderer and interface.

**Goal:** Deliver a detailed Enterprise-D exterior and traversable interior experience in an offline single HTML.
**Architecture:** Procedural Three.js ES modules with canvas-generated textures, instanced surface details, bounded interior navigation; esbuild inlines all code into the HTML shell.
**Tech Stack:** Three.js 0.180.0, esbuild, Node native tests; browser CLI for acceptance.

### Task 1: Tests and safe geometry
Files: src/geometry.js, tests/geometry.test.mjs, package.json.
- [x] Write failing tests for finite saucer profile, ellipse position, movement inside floor union, wall collision, door gap and obstruction.
- [x] Run `node --test tests/geometry.test.mjs`; observe assertions fail for unimplemented functions.
- [x] Implement exported `saucerHeight(r, side)`, `insideBounds(x,z,bounds,radius)`, `moveWithCollision(position,delta,bounds,obstacles,radius)` with incremental substeps and axis sliding.
- [x] Run same tests and confirm pass.

### Task 2: Interior module
Files: src/interiors.js, tests/interiors.test.mjs.
- [x] Test builder contract for bridge, engineering, hangar; require valid spawn and finite geometry.
- [x] Build independent named room groups with textures, light rigs, physical corridor, doors, LCARS screens, furniture and collision boxes, conforming to design contract.
- [x] Test geometry and collision at every spawn. Main application caches room scenes, so no duplicate builds on switching.

### Task 3: Exterior textures and model
Files: src/textures.js, src/exterior.js.
- [x] Build procedural hull aztec maps and registry decals, lathed smooth saucer without degenerate normals, layered secondary hull, swept pylons/nacelles.
- [x] Add instanced window strips, panel seams, escape pods, vents, sensor pallets, deflector and aft bay; keep surface details in batches.
- [x] Expose `createExterior()` with group, named anchors, update and hullMaterials for wireframe.
- [x] Validate every position/normal/instance matrix is finite, symmetric nacelle placement and major dimensions.

### Task 4: Interface and scene runtime
Files: src/main.js, src/shell.html.
- [x] Compose scene, controlled cinematic lighting, starfield, rendering/tone mapping, responsive camera framing.
- [x] Implement exterior orbit/presets/labels/blueprint/quality/warp; keep displayed state in sync.
- [x] Implement interior mouse drag plus pointer lock, keyboard/touch movement, obstacle collision, E activation, room navigation and return exterior. Clear keys on blur/room switch/modal.
- [x] Add useful keyboard guide, loading/failure state, quality toggle and optional user-activated ambient audio.

### Task 5: Offline packaging
Files: build.mjs, index.html, tests/artifact.test.mjs, README.md.
- [x] Bundle JS as IIFE with esbuild; replace one application marker in shell, escaping closing script sequences; embed Three MIT license.
- [x] Test index has no external script/style/font/model fetch dependencies and contains required controls.
- [x] `npm run build` and `npm test` must pass.

### Task 6: Visual and functional acceptance
Files: output/playwright/*, docs/verification.md.
- [x] Start loopback preview on unused port. Use actual browser CLI to inspect page and console, screenshot exterior and every room.
- [x] Exercise exterior camera, onboard, corridor movement/door, room switches, wireframe, warp, audio, quality and responsive layout.
- [x] Verify offline file:// behavior with network blocked and geometry diagnostics including render counts.
- [x] Review code and fix actionable problems, rebuild and repeat affected tests.
- [x] Write actual observations and limitations; open preview and link index.html. No simulator needed.

## Acceptance notes
All six tasks completed. Actual file:// navigation was blocked by the browser tool; equivalent original-HTML initialization was tested with network disabled instead, with zero requests/errors. See docs/verification.md for method, evidence and limitations. No Git repository existed; no commit, merge or PR was attempted.
