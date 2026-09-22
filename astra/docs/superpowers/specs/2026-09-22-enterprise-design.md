# Enterprise-D interactive single-HTML design

Approved by the user: Galaxy-class NCC-1701-D, detailed external model and explorable bridge, corridor, engineering and shuttlebay, exterior orbit, interior walking/collision, room navigation, light/warp effects; single HTML. This is a procedural fan reconstruction, not an official CAD model or every deck replicated.

## Artifact and dependencies
`index.html` is the deliverable, all CSS, application JS, Three.js and procedural assets embedded. It must work from file:// offline with no fetches, fonts, backend, build tool or external model required by the user. Sources/build scripts stay available separately for maintenance.

## Visual direction
Cinematic soft-silver Enterprise-D on an almost-black stellar field. Broad elliptical saucer, flowing secondary hull, swept pylons, paired red Bussard collectors and blue warp grilles. Hull features: concentric deck rings, thousands of window elements, layered aztec plating, registry markings, phaser strips, lifeboat hatches, impulse vents, sensor strips, bridge dome, deflector and shuttlebay. Warm editorial typography with fine orange/cyan technical lines. Chinese-first controls with English ship/system labels. Renderer uses physically shaded materials, finite normals, appropriate tone mapping, shadows and restrained bloom; no overblown emissive hull.

## Coordinates and model
Meters-ish world units: X port/starboard, Y up, forward -Z. Saucer center (0,22,-125), radii X 230/Z 175. Secondary hull extends Z -115 to 265 below saucer. Two nacelles around X +/-142, Y 15, Z 190, each approximately 285 long. Render silhouette and recognisable details, avoiding a claim of exact production CAD dimensions. Exterior independent from authored interior scenes.

## Interiors and controls
Interior scale uses meters. Warm beige/ochre/burgundy TNG bridge: central three-seat command area, front conn/ops, horseshoe tactical rail, LCARS rear stations and forward viewscreen. Door connects physically to a furnished deck corridor. Other decks are reached via labeled turbolift/menu, not falsely represented as adjoining canon rooms. Engineering has a pulsing vertical blue warp core, equipment, monitoring consoles, pipework and gantry. Shuttlebay has deck markings, shuttlecraft, roof trusses, cargo and a protected starfield opening. Each room has navigable floor bounds and solid obstacle collision.
Exterior: drag orbit, wheel zoom, standard camera presets, labels, wireframe/blueprint, auto-orbit and warp. Interiors: WASD/arrows walk, mouse drag look, optional pointer lock, shift faster, Escape releases pointer, E operates nearby door/turbolift, explicit exit returns exterior. Touch movement/look is supported. Room selection accessible without pointer lock. Avoid stuck-key movement on blur and modals. Audio is off by default and starts only from user activation.

## Architecture
ES modules: `geometry.js` pure safe profiles and walk collision; `textures.js` canvas material maps; `exterior.js` ship builder; `interiors.js` interior builder; `main.js` scene/camera/input/UI state; `shell.html` static UI and CSS; `build.mjs` one-file bundler. `createInterior(THREE, kind)` returns `{group, spawn:{position:[x,y,z],yaw,pitch}, bounds:[{minX,maxX,minZ,maxZ}], obstacles:[{minX,maxX,minZ,maxZ}], doors:[], update(t,dt), dispose?}`. Interior kind is bridge/engineering/hangar; bridge includes corridor. Door records may include `{group,position:[x,y,z],open:false,interactionRadius:3,label,activate()}`; geometry material disposal is managed by caching scenes rather than repeated allocation.

## Reliability and acceptance
First tests target profile finiteness, collision including doorway/corner/sliding, and artifact offline invariants. Geometry attributes/instance matrices inspected for NaN/Infinity. Actual browser smoke test exterior and all interiors, movement, transitions, wireframe, quality, resizing, screenshots and JS console. Measure render counts; use batching/instancing to avoid thousands of draws. Do not claim performance on devices not tested. WebGL failure presents an actionable message, context loss is handled. Finish by opening verified preview and linking the standalone HTML.

## Reference
StarTrek official Enterprise-D feature summary: https://www.startrek.com/en-un/news/unveiling-the-official-lego-enterprise-d
Official reconstructed bridge tour: https://www.startrek.com/en-un/videos/star-trek-picard-enterprise-d-tour
Three.js documentation: https://threejs.org/docs/
