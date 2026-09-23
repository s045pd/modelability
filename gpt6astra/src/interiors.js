import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Self-contained, procedurally furnished Enterprise-D deck interiors.
 * All walking surfaces lie at y=0. Repeated architectural details are instanced.
 */
export function createInterior(THREE, kind) {
  if (!['bridge', 'engineering', 'hangar'].includes(kind)) throw new Error(`Unknown interior: ${kind}`);
  const group = new THREE.Group(); group.name = `interior-${kind}`;
  const bounds = [], obstacles = [], doors = [], animated = [];
  const materials = new Map(), batches = new Map();
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();
  let seed = 1701;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  function material(name, color, roughness = .65, metalness = .08, emissive = null, intensity = 1) {
    if (!materials.has(name)) materials.set(name, new THREE.MeshStandardMaterial({ color, roughness, metalness, ...(emissive ? { emissive, emissiveIntensity: intensity } : {}) }));
    return materials.get(name);
  }
  const M = {
    tan: material('sandstone', '#9d8d77'), cream: material('ivory', '#c0b5a1'), darkTan: material('taupe', '#645849'),
    burgundy: material('burgundy', '#63373c', .93), carpet: material('carpet', '#514953', 1),
    charcoal: material('console-case', '#141923', .46, .25), black: material('black-glass', '#050911', .23, .35),
    ochre: material('ochre', '#af8b51', .43, .35), silver: material('brushed-titanium', '#7e909d', .36, .68),
    steel: material('structural-steel', '#353f4f', .46, .7), hull: material('shuttle-ceramic', '#aab5be', .51, .28),
    window: material('shuttle-window', '#091b31', .17, .4, '#173552', .5),
    warm: material('warm-light', '#fff0cc', .5, 0, '#ffdfaa', 1.7),
    blue: material('plasma-light', '#99d8ff', .24, .25, '#349bff', 2.7),
    cyan: material('cyan-light', '#a3dfe9', .24, 0, '#72bfdc', 1.5),
    red: material('bussard-light', '#ff7b53', .35, 0, '#e93825', 2),
    orange: material('caution', '#edb95a', .7, .1),
    ceiling: material('ceiling-satin', '#b1a18a', .76, .04, '#685745', .12),
    piping: material('upholstery-piping', '#9b6b60', .9, .02),
  };
  function mesh(geometry, mat, position = [0, 0, 0], rotation = [0, 0, 0], name, parent = group) {
    const m = new THREE.Mesh(geometry, mat); m.position.set(...position); m.rotation.set(...rotation);
    m.castShadow = !mat.emissive?.getHex(); m.receiveShadow = true;
    if (name) m.name = name; parent.add(m); return m;
  }
  // One draw call per material rather than one per panel, rib or fixture.
  function box(mat, size, position, rotation = [0, 0, 0], parent = group, name) {
    if (parent !== group || name) {
      const m = mesh(boxGeometry, mat, position, rotation, name, parent); m.scale.set(...size); return m;
    }
    if (!batches.has(mat)) batches.set(mat, []);
    dummy.position.set(...position); dummy.rotation.set(...rotation); dummy.scale.set(...size); dummy.updateMatrix();
    batches.get(mat).push(dummy.matrix.clone()); return null;
  }
  const roundedGeometries = new Map();
  function rounded(mat, size, position, rotation = [0, 0, 0], parent = group, name, radius = .085) {
    const key = [...size, radius].join('/');
    if (!roundedGeometries.has(key)) roundedGeometries.set(key, new RoundedBoxGeometry(...size, 3, radius));
    return mesh(roundedGeometries.get(key), mat, position, rotation, name, parent);
  }
  function upholsterySeam(points, parent, name) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(curve, 16, .008, 5, false), M.piping, [0, 0, 0], [0, 0, 0], `upholstery-seam-${name}`, parent);
  }
  function cylinder(mat, radius, height, position, rotation = [0, 0, 0], radial = 24, parent = group, name) {
    return mesh(new THREE.CylinderGeometry(radius, radius, height, radial), mat, position, rotation, name, parent);
  }
  function beam(a, b, thickness, mat = M.steel) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), mid = start.clone().add(end).multiplyScalar(.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    box(mat, [thickness, new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b)), thickness], mid.toArray(), [e.x, e.y, e.z]);
  }
  function solid(x, z, w, d) { const o = { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }; obstacles.push(o); return o; }
  function raster(width, height, draw) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8; return texture;
  }
  function mapped(texture, bright = true) {
    return bright ? new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: texture, roughness: .8 });
  }
  function panel(w, h, position, rotation, mat, name, parent = group) {
    return mesh(new THREE.PlaneGeometry(w, h), mat, position, rotation || [0, 0, 0], name, parent);
  }
  function label(text, w, h, position, rotation = [0, 0, 0], color = '#eadbc1', bg = '#11151d', parent = group) {
    const texture = raster(1024, 128, (c, W, H) => {
      c.fillStyle = bg; c.fillRect(0, 0, W, H); c.fillStyle = color; c.font = '500 49px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, W / 2, H / 2);
    });
    return panel(w, h, position, rotation, mapped(texture), undefined, parent);
  }
  function lcars(title, mode = 'standard') {
    const texture = raster(1024, 640, (c, W, H) => {
      c.fillStyle = '#05080e'; c.fillRect(0, 0, W, H);
      const colors = ['#dda569', '#bb98d1', '#869fdb', '#ecc29b', '#c37372', '#88b9c7'];
      c.fillStyle = '#e4b47c'; c.beginPath(); c.roundRect(25, 30, 188, 560, 65); c.fill();
      c.fillStyle = '#05080e'; c.fillRect(89, 110, 130, 420);
      c.fillStyle = '#bd97d0'; c.fillRect(209, 30, 610, 52);
      c.fillStyle = '#ecc29b'; c.fillRect(830, 30, 165, 52);
      c.font = 'bold 25px Arial'; c.fillStyle = '#f3d1a0'; c.fillText(title, 237, 123);
      c.font = '17px monospace'; c.fillStyle = '#8ba9d0'; c.fillText('USS ENTERPRISE  /  NCC-1701-D', 237, 153);
      for (let r = 0; r < 7; r++) {
        c.fillStyle = colors[r % colors.length]; c.fillRect(24, 110 + r * 65, 59, 53);
        c.fillStyle = '#080b12'; c.font = 'bold 14px monospace'; c.fillText(`${r + 12}47`, 29, 142 + r * 65);
      }
      if (mode === 'core') {
        c.strokeStyle = '#8dd8ff'; c.lineWidth = 5;
        c.strokeRect(532, 215, 80, 255);
        for (let n = 0; n < 8; n++) { c.fillStyle = n % 2 ? '#88c7ee' : '#bc9dcf'; c.fillRect(543, 228 + n * 29, 58, 14); }
        c.beginPath(); c.moveTo(572, 205); c.lineTo(572, 180); c.moveTo(572, 479); c.lineTo(572, 520); c.stroke();
        c.strokeStyle = '#cc986e'; c.lineWidth = 2;
        for (const s of [-1, 1]) { c.beginPath(); c.moveTo(570 + s * 45, 345); c.lineTo(570 + s * 125, 345); c.lineTo(570 + s * 125, 244); c.lineTo(570 + s * 220, 244); c.stroke(); }
      } else {
        for (let r = 0; r < 8; r++) {
          c.fillStyle = colors[r % colors.length]; c.fillRect(236, 190 + r * 39, 96, 24);
          c.fillStyle = '#6b879b'; c.fillRect(345, 194 + r * 39, 400 + rand() * 130, 3);
          c.fillStyle = colors[(r + 2) % colors.length]; c.font = '17px monospace'; c.fillText(`${Math.floor(rand() * 80000 + 12000)}   ${Math.floor(rand() * 90 + 10)}.${r}  NOMINAL`, 350, 210 + r * 39);
        }
      }
      c.fillStyle = '#d9a67a'; c.fillRect(211, 535, 784, 54);
      c.fillStyle = '#0b0e16'; c.font = 'bold 20px Arial'; c.fillText('01—1701      SYSTEMS OPERATING WITHIN NORMAL PARAMETERS', 230, 570);
      for (let n = 0; n < 9; n++) { c.fillStyle = colors[n % 6]; c.fillRect(230 + n * 85, 606, 75, 10); }
    });
    return mapped(texture);
  }
  function starfield(nebula = true) {
    const tex = raster(2048, 1024, (c, W, H) => {
      c.fillStyle = '#020610'; c.fillRect(0, 0, W, H);
      if (nebula) {
        for (let i = 0; i < 20; i++) {
          const x = W * (.34 + rand() * .5), y = H * (.17 + rand() * .63), radius = 90 + rand() * 280;
          const g = c.createRadialGradient(x, y, 0, x, y, radius); g.addColorStop(0, i % 2 ? 'rgba(93,44,113,0.10)' : 'rgba(31,87,118,0.15)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
      }
      for (let i = 0; i < 1400; i++) {
        const x = rand() * W, y = rand() * H, r = rand() > .99 ? 2.2 : rand() * 1.1 + .35;
        c.fillStyle = `rgba(${i % 4 ? '208,226,255' : '255,220,175'},${.3 + rand() * .7})`; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
      if (nebula) {
        const glow = c.createRadialGradient(1300, 460, 0, 1300, 460, 65); glow.addColorStop(0, '#d6efff'); glow.addColorStop(.04, '#a6cdff'); glow.addColorStop(.12, 'rgba(75,130,239,0.25)'); glow.addColorStop(1, 'rgba(20,80,220,0)'); c.fillStyle = glow; c.fillRect(1235, 395, 130, 130);
      }
    }); return mapped(tex);
  }
  function lights(ambient, color, position, power, secondPosition, secondPower, thirdPosition, thirdColor) {
    group.add(new THREE.HemisphereLight('#dce3ef', '#3f3330', ambient));
    const key = new THREE.SpotLight(color, power * 1.7, 55, 1.29, .85, 1.4);
    key.position.set(...position); key.target.position.set(0, 0, position[2] - 1);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -.0003; key.shadow.normalBias = .035; key.shadow.camera.near = .15; key.shadow.camera.far = 55;
    group.add(key, key.target);
    for (const [p, hue, intensity] of [[secondPosition, color, secondPower], [thirdPosition, thirdColor || color, secondPower * .75]]) {
      const light = new THREE.PointLight(hue, intensity, 55, 1.4); light.position.set(...p); group.add(light);
    }
  }
  const displays = { ops: lcars('OPERATIONS  •  FLIGHT SYSTEMS'), tactical: lcars('TACTICAL  •  SENSOR ANALYSIS'), engineering: lcars('MATTER / ANTIMATTER REACTION', 'core'), auxiliary: lcars('ENVIRONMENTAL SYSTEMS'), flight: lcars('SHUTTLEBAY FLIGHT CONTROL') };
  function chair(x, z, index, scale = 1) {
    const g = new THREE.Group(); g.name = `command-chair-${index}`; g.position.set(x, 0, z); group.add(g);
    rounded(M.charcoal, [.83, .15, .85], [0, .16, 0], [0, 0, 0], g, 'pedestal-foot', .065);
    cylinder(M.silver, .2, .37, [0, .36, 0], [0, 0, 0], 24, g);
    rounded(M.tan, [.96, .23, .91], [0, .55, -.025], [0, 0, 0], g, 'sculpted-seat-shell', .11);
    rounded(M.burgundy, [.79, .22, .76], [0, .67, -.11], [0, 0, 0], g, 'seat-cushion', .10);
    rounded(M.tan, [.96, 1.10, .30], [0, 1.07, .31], [-.14, 0, 0], g, 'curved-back-shell', .14);
    rounded(M.burgundy, [.79, .95, .22], [0, 1.12, .12], [-.14, 0, 0], g, 'back-cushion', .10);
    rounded(M.burgundy, [.73, .21, .25], [0, 1.55, .215], [-.14, 0, 0], g, 'head-rest', .09);
    rounded(M.darkTan, [.82, .065, .12], [0, 1.62, .39], [-.14, 0, 0], g, 'back-cap', .03);
    for (const yy of [.84, 1.15, 1.39]) {
      const zz = .005 + (yy - 1.12) * .14;
      upholsterySeam([[-.325, yy + .012, zz + .02], [-.2, yy, zz], [.2, yy, zz], [.325, yy + .012, zz + .02]], g, `back-${yy}`);
    }
    upholsterySeam([[-.32, .767, -.41], [-.33, .78, -.12], [-.27, .78, .2], [.27, .78, .2], [.33, .78, -.12], [.32, .767, -.41]], g, 'seat-perimeter');
    for (const sign of [-1, 1]) {
      rounded(M.tan, [.25, .47, .87], [sign * .55, .74, -.025], [.06, 0, 0], g, 'sculpted-arm-shell', .11);
      rounded(M.charcoal, [.265, .09, .78], [sign * .55, 1.001, -.125], [.035, 0, 0], g, 'arm-control-bezel', .04);
      rounded(M.burgundy, [.24, .075, .30], [sign * .55, 1.057, .145], [0, 0, 0], g, 'arm-rest-pad', .035);
      panel(.207, .36, [sign * .55, 1.051, -.275], [-Math.PI / 2, 0, 0], displays.ops, undefined, g);
      rounded(M.ochre, [.027, .24, .35], [sign * .69, .69, -.03], [.06, 0, 0], g, 'arm-side-inlay', .012);
    }
    g.scale.setScalar(scale); solid(x, z, 1.42 * scale, 1.05 * scale);
    return g;
  }
  function consoleStation(name, x, z, width = 2.4, angle = 0, display = displays.ops) {
    const g = new THREE.Group(); g.name = name; g.position.set(x, 0, z); g.rotation.y = angle; group.add(g);
    rounded(M.darkTan, [width * .80, .66, .78], [0, .36, .025], [.08, 0, 0], g, 'rounded-console-pedestal', .13);
    rounded(M.tan, [width * .86, .21, .87], [0, .76, .01], [0, 0, 0], g, 'console-collar', .085);
    rounded(M.charcoal, [width, .18, 1.05], [0, 1.01, -.05], [.27, 0, 0], g, 'rounded-console-bezel', .075);
    panel(width * .9, .87, [0, 1.106, -.025], [-Math.PI / 2 + .27, 0, 0], display, undefined, g);
    for (const s of [-1, 1]) box(M.ochre, [.08, .2, 1.09], [s * width * .5, .99, -.055], [.27, 0, 0], g);
    solid(x, z, Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)), Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)) * width);
    return g;
  }
  function slidingDoor(x, z, width, height, name) {
    const root = new THREE.Group(); root.name = 'door-' + name; root.position.set(x, 0, z); group.add(root);
    const left = box(M.burgundy, [width / 2 - .015, height, .14], [-width / 4, height / 2, 0], [0, 0, 0], root);
    const right = box(M.burgundy, [width / 2 - .015, height, .14], [width / 4, height / 2, 0], [0, 0, 0], root);
    for (const [leaf, s] of [[left, -1], [right, 1]]) {
      // These are child meshes in leaf-local coordinates, with dimensions compensated for leaf scale.
      const inset = new THREE.Mesh(boxGeometry, M.darkTan); inset.scale.set(.76, .82, .4); inset.position.set(s * .02, 0, .62); leaf.add(inset);
      const trim = new THREE.Mesh(boxGeometry, M.ochre); trim.scale.set(.025, .86, .2); trim.position.set(-s * .47, 0, .75); leaf.add(trim);
    }
    box(M.cream, [.26, height + .3, .5], [x - width / 2 - .13, (height + .3) / 2, z]);
    box(M.cream, [.26, height + .3, .5], [x + width / 2 + .13, (height + .3) / 2, z]);
    box(M.darkTan, [width + .5, .35, .5], [x, height + .16, z]);
    label(name.toUpperCase(), width, .24, [x, height + .16, z - .26], [0, Math.PI, 0]);
    const obstacle = solid(x, z, width, .28);
    let opened = false, progress = 0;
    const door = { position: [x, 1.3, z], label: name, activationRadius: 2.7, interactionRadius: 2.7, get isOpen() { return opened; }, activate() { opened = !opened; } };
    doors.push(door);
    animated.push((t, dt) => {
      progress = Math.max(0, Math.min(1, progress + (opened ? 1 : -1) * Math.min(dt, .1) * 1.8));
      const s = progress * progress * (3 - 2 * progress);
      left.position.x = -width / 4 - s * width * .5; right.position.x = width / 4 + s * width * .5;
      obstacle.disabled = progress > .8;
      // Also mutate extents so collision consumers without a disabled flag remain correct.
      obstacle.minX = progress > .8 ? x + 200 : x - width / 2; obstacle.maxX = progress > .8 ? x + 200.1 : x + width / 2;
    });
    return door;
  }
  function bridge() {
    bounds.push({ minX: -9.8, maxX: 9.8, minZ: -8.8, maxZ: 9 }, { minX: 5.4, maxX: 8.2, minZ: 8.7, maxZ: 35 });
    box(M.carpet, [20, .16, 18], [0, -.09, .1]);
    box(M.tan, [20, .08, 18], [0, -.16, .1]);
    // A soft, circular command-carpet island is flush with the surrounding deck.
    mesh(new THREE.CircleGeometry(5.05, 72), M.burgundy, [0, .002, .75], [-Math.PI / 2, 0, 0]);
    const rugLine = mesh(new THREE.RingGeometry(4.95, 5.04, 72), M.darkTan, [0, .007, .75], [-Math.PI / 2, 0, 0]); rugLine.name = 'command-carpet-border';
    box(M.tan, [.35, 4.5, 18], [-10, 2.25, .1]); box(M.tan, [.35, 4.5, 18], [10, 2.25, .1]);
    box(M.tan, [20, 4.5, .4], [0, 2.25, -9]);
    box(M.tan, [15.25, 4.5, .35], [-2.35, 2.25, 9.15]);
    box(M.tan, [1.75, 4.5, .35], [9.25, 2.25, 9.15]);
    box(M.tan, [2.8, 1.25, .35], [6.8, 3.875, 9.15]);
    box(M.ceiling, [20.3, .2, 18.6], [0, 4.55, .1]);
    // Recessed oval ceiling cassette and lit reveal echo the curved command island.
    const ceilingCassette = mesh(new THREE.CircleGeometry(1, 80), M.ceiling, [0, 4.425, .3], [Math.PI / 2, 0, 0], 'oval-ceiling-cassette');
    ceilingCassette.scale.set(6.75, 4.5, 1);
    for (const [r, tube, mat, y] of [[6.8, .16, M.cream, 4.31], [6.51, .043, M.warm, 4.30], [6.35, .05, M.darkTan, 4.31]]) {
      const ring = mesh(new THREE.TorusGeometry(r, tube, 8, 88), mat, [0, y, .3], [Math.PI / 2, 0, 0]); ring.scale.y = .665;
    }
    // Layered ceiling coffers and warm continuous lighting, not a bare box.
    for (const side of [-1, 1]) {
      box(M.cream, [.72, .55, 18], [side * 8.85, 4.13, .1]);
      box(M.warm, [.13, .04, 16], [side * 8.43, 3.84, .1]);
      box(M.darkTan, [.11, .5, 18], [side * 9.65, .25, .1]);
      box(M.burgundy, [.085, .45, 15.8], [side * 9.76, .83, -.1]);
      box(M.ochre, [.065, .055, 16], [side * 9.69, 1.09, -.1]);
      box(M.charcoal, [.05, .22, 16], [side * 9.70, 3.69, -.1]);
      box(M.ochre, [.07, .035, 16], [side * 9.64, 3.84, -.1]);
      box(M.warm, [.035, .045, 17.6], [side * 9.6, .49, .1]);
      for (let z = -7.4; z < 8.7; z += 3.2) {
        box(M.cream, [.45, 3.9, .3], [side * 9.7, 2, z]);
        beam([side * 9.6, 3.55, z], [side * 7.5, 4.38, z], .25, M.cream);
        box(M.darkTan, [.12, 2.3, .13], [side * 9.43, 1.65, z]);
      }
      // Dark bronze side display architecture.
      for (let j = 0; j < 4; j++) {
        const z = -4.5 + j * 3.1;
        box(M.charcoal, [.13, 2.45, 2.45], [side * 9.6, 2.3, z]);
        panel(2.24, 1.7, [side * 9.5, 2.55, z], [0, -side * Math.PI / 2, 0], j % 2 ? displays.tactical : displays.auxiliary);
        box(M.ochre, [.32, .3, 2.46], [side * 9.4, 1.12, z]);
      }
    }
    box(M.cream, [16.9, .55, .6], [0, 4.12, -7.95]);
    box(M.warm, [15.9, .055, .13], [0, 3.82, -7.57]);
    box(M.cream, [16.9, .55, .6], [0, 4.12, 7.8]);
    box(M.warm, [15.8, .055, .13], [0, 3.82, 7.45]);
    // Broad forward viewscreen occupies the front wall like the original bridge.
    box(M.darkTan, [11.45, 3.13, .25], [0, 2.22, -8.68]);
    box(M.charcoal, [10.75, 2.65, .16], [0, 2.25, -8.51]);
    panel(10.32, 2.39, [0, 2.25, -8.415], [0, 0, 0], starfield(true), 'main-viewscreen');
    // The screen projects in front of the outer room boundary; its backing is solid.
    solid(0, -8.65, 11.45, .5);
    label('NCC-1701-D     /     UNITED FEDERATION OF PLANETS', 7.3, .21, [0, .71, -8.4]);
    // Layered forward bulkheads: gently radiused panels, bronze reveals and side diagnostics.
    for (const side of [-1, 1]) {
      rounded(M.darkTan, [2.66, 2.86, .19], [side * 7.5, 2.18, -8.63], [0, 0, 0], group, undefined, .17);
      rounded(M.cream, [2.44, 2.65, .13], [side * 7.5, 2.19, -8.50], [0, 0, 0], group, undefined, .15);
      rounded(M.charcoal, [1.87, 1.62, .07], [side * 7.5, 2.32, -8.39], [0, 0, 0], group, undefined, .09);
      panel(1.69, 1.36, [side * 7.5, 2.33, -8.347], [0, 0, 0], displays.auxiliary);
      rounded(M.burgundy, [2.40, .36, .065], [side * 7.5, .98, -8.397], [0, 0, 0], group, undefined, .06);
      box(M.ochre, [2.18, .047, .035], [side * 7.5, 1.215, -8.348]);
      rounded(M.cream, [.32, 3.26, .32], [side * 5.9, 2.22, -8.40], [0, 0, 0], group, undefined, .15);
      box(M.warm, [.03, 2.15, .025], [side * 5.9, 2.39, -8.222]);
      solid(side * 7.5, -8.65, 3.8, .84);
    }
    // Two low helm consoles and their ergonomic operator seats.
    consoleStation('helm-port', -1.7, -3.5, 2.85, -.1);
    consoleStation('helm-starboard', 1.7, -3.5, 2.85, .1);
    for (const x of [-1.7, 1.7]) {
      cylinder(M.charcoal, .36, .58, [x, .3, -2.3]);
      box(M.burgundy, [.69, .21, .7], [x, .65, -2.3]);
      box(M.burgundy, [.7, .77, .17], [x, 1, -1.99], [-.13, 0, 0]);
      solid(x, -2.3, .8, .85);
    }
    chair(0, 1.05, 0, 1.03); chair(-1.62, .73, 1, .92); chair(1.62, .73, 2, .92);
    // Sculpted tactical horseshoe surrounds the command chairs; the front stays open.
    const tactical = new THREE.Group(); tactical.name = 'tactical-horseshoe'; group.add(tactical);
    for (let i = 0; i < 18; i++) {
      const a = Math.PI * i / 17, x = Math.cos(a) * 5.45, z = Math.sin(a) * 3.05 + 1.1;
      const angle = -a + Math.PI / 2;
      box(M.darkTan, [.92, .84, .43], [x, .42, z], [0, angle, 0]);
      box(M.ochre, [1.02, .17, .72], [x, 1.02, z], [0, angle, 0]);
      box(M.charcoal, [.98, .055, .56], [x, 1.135, z], [0, angle, 0]);
      if (i % 2 === 0) panel(.88, .43, [x, 1.166, z], [-Math.PI / 2, 0, -angle], displays.tactical);
      solid(x, z, Math.abs(Math.cos(angle)) * .85 + .35, Math.abs(Math.sin(angle)) * .8 + .35);
    }
    // Tall rear LCARS panels and practical shelves with stools.
    for (let i = 0; i < 6; i++) {
      const x = -7.5 + i * 2.25;
      box(M.charcoal, [2.03, 2.55, .4], [x, 2.3, 8.82]);
      panel(1.84, 1.61, [x, 2.65, 8.59], [0, Math.PI, 0], i % 2 ? displays.ops : displays.tactical);
      box(M.ochre, [2.1, .16, 1], [x, 1.22, 8.32]);
      panel(1.87, .7, [x, 1.308, 8.22], [-Math.PI / 2, 0, Math.PI], displays.auxiliary);
      solid(x, 8.36, 2.1, 1.05);
    }
    label('SCIENCE I     •     MISSION OPERATIONS     •     SCIENCE II', 8.8, .22, [-2, 4.02, 8.73], [0, Math.PI, 0]);
    slidingDoor(6.8, 9, 2.4, 3.15, 'Deck 01 • Corridor');
    // A real 26-metre aft passage, lit by integrated coves. Ribs never block its centre.
    box(M.carpet, [2.8, .14, 26.15], [6.8, -.08, 21.925]);
    box(M.tan, [.2, 3.4, 26], [5.3, 1.7, 22]); box(M.tan, [.2, 3.4, 26], [8.3, 1.7, 22]);
    box(M.darkTan, [3.1, .15, 26], [6.8, 3.45, 22]);
    box(M.burgundy, [.2, .1, 25.8], [5.65, .003, 22]); box(M.burgundy, [.2, .1, 25.8], [7.95, .003, 22]);
    for (const x of [5.5, 8.1]) {
      box(M.warm, [.045, .06, 25.8], [x, 2.8, 22]);
      box(M.warm, [.035, .06, 25.8], [x, .25, 22]);
    }
    for (let z = 10.5; z < 34.6; z += 3.6) {
      for (const s of [-1, 1]) {
        box(M.cream, [.14, 2.6, .19], [6.8 + s * 1.32, 1.3, z]);
        beam([6.8 + s * 1.32, 2.6, z], [6.8 + s * .88, 3.25, z], .18, M.cream);
      }
      box(M.cream, [1.77, .18, .18], [6.8, 3.25, z]);
    }
    for (let n = 0; n < 4; n++) {
      const z = 13.3 + n * 5.8;
      // Recessed, numbered cross-corridor doors remain architectural closed entries.
      for (const s of [-1, 1]) {
        box(M.darkTan, [.075, 2.5, 1.68], [6.8 + s * 1.39, 1.25, z]);
        box(M.burgundy, [.05, 2.24, 1.35], [6.8 + s * 1.34, 1.13, z]);
        box(M.ochre, [.03, 2.2, .023], [6.8 + s * 1.302, 1.1, z]);
        label(`01-${107 + n * 2 + (s > 0 ? 1 : 0)}   CREW ACCESS`, 1.39, .19, [6.8 + s * 1.29, 2.57, z], [0, -s * Math.PI / 2, 0]);
        panel(.36, .61, [6.8 + s * 1.29, 1.6, z + 1.03], [0, -s * Math.PI / 2, 0], displays.auxiliary);
      }
    }
    box(M.tan, [3, 3.5, .3], [6.8, 1.75, 35.15]);
    box(M.burgundy, [2.05, 2.8, .09], [6.8, 1.4, 34.97]);
    box(M.ochre, [.025, 2.8, .02], [6.8, 1.4, 34.91]);
    label('TURBOLIFT  /  DECK DIRECTORY', 2.4, .22, [6.8, 3.01, 34.94], [0, Math.PI, 0]);
    lights(.95, '#ffe4b9', [0, 3.8, -.5], 43, [-6, 3.6, 5], 31, [6.8, 2.8, 22], '#ffe3b8');
    return { spawn: { position: [5.65, 1.68, 4.9], yaw: .59, pitch: -.025 }, corridorSpawn: { position: [6.8, 1.68, 14.5], yaw: Math.PI, pitch: 0 } };
  }
  function engineering() {
    bounds.push({ minX: -12.8, maxX: 12.8, minZ: -14.8, maxZ: 12.8 });
    box(M.steel, [26, .2, 28], [0, -.11, -1]);
    box(M.charcoal, [9, .025, 23], [0, .008, -.5]);
    // Deck-plating seams and calibrated hazard strips establish industrial scale.
    for (let x = -12; x <= 12; x += 2) box(M.charcoal, [.025, .02, 27.4], [x, .013, -1]);
    for (let z = -14; z <= 12; z += 2) box(M.charcoal, [25.6, .02, .025], [0, .013, z]);
    for (const x of [-4.7, 4.7]) {
      box(M.orange, [.07, .024, 24], [x, .016, -1]);
      for (let z = -13; z < 12; z += 1.6) box(M.orange, [.21, .024, .45], [x, .019, z], [0, -.5, 0]);
    }
    box(M.steel, [.4, 12, 28], [-13, 6, -1]); box(M.steel, [.4, 12, 28], [13, 6, -1]);
    box(M.steel, [26, 12, .4], [0, 6, -15]); box(M.steel, [26, 12, .4], [0, 6, 13]);
    box(M.charcoal, [26.5, .3, 28.5], [0, 12.1, -1]);
    for (const s of [-1, 1]) {
      for (let z = -12; z <= 11; z += 4) {
        box(M.charcoal, [.8, 11.9, .58], [s * 12.45, 6, z]);
        box(M.ochre, [.2, 7, .23], [s * 11.98, 4.05, z]);
        beam([s * 12.2, 8, z], [s * 8.4, 11.8, z], .45);
        box(M.warm, [.18, .07, 2.4], [s * 10.45, 5.35, z]);
        box(M.darkTan, [.12, 3.3, 3.2], [s * 12.7, 2.25, z + 1.8]);
      }
      // Low pipe runs and service access cabinets.
      for (let z = -11; z < 11; z += 4.4) {
        box(M.charcoal, [1.9, 2.4, 2.9], [s * 11.5, 1.2, z]);
        box(M.ochre, [.15, 2.1, 2.48], [s * 10.51, 1.2, z]);
        panel(1.73, 1.32, [s * 10.4, 1.55, z], [0, -s * Math.PI / 2, 0], displays.engineering);
        for (let n = 0; n < 6; n++) box(M.steel, [.13, .055, 2.3], [s * 10.45, .26 + n * .1, z]);
        solid(s * 11.5, z, 2.1, 2.9);
      }
      // Upper galleries are carefully furnished, but not included in the ground walking map.
      box(M.ochre, [3.2, .28, 24], [s * 10.3, 5.1, -1]);
      box(M.charcoal, [3.0, .035, 23.8], [s * 10.3, 5.26, -1]);
      for (let z = -12.4; z <= 11; z += 2) {
        box(M.silver, [.09, 1.15, .09], [s * 8.76, 5.88, z]);
        box(M.silver, [.1, .1, 1.9], [s * 8.76, 6.47, z + .9]);
        box(M.silver, [.07, .07, 1.9], [s * 8.76, 5.92, z + .9]);
      }
    }
    box(M.ochre, [20.8, .28, 3], [0, 5.1, -12]);
    for (let x = -8; x <= 8; x += 2) {
      box(M.silver, [.09, 1.15, .09], [x, 5.88, -10.5]);
      box(M.silver, [1.9, .1, .1], [x + .9, 6.47, -10.5]);
      box(M.silver, [1.9, .07, .07], [x + .9, 5.92, -10.5]);
    }
    // Iconic segmented matter/antimatter reaction assembly.
    const core = new THREE.Group(); core.name = 'warp-core'; core.position.set(0, 0, -4.1); group.add(core);
    cylinder(M.charcoal, 2.08, .36, [0, .18, 0], [0, 0, 0], 56, core);
    cylinder(M.ochre, 1.85, .12, [0, .43, 0], [0, 0, 0], 56, core);
    // Structural support stays inside the luminous segments, never occluding them.
    cylinder(M.steel, 1.04, 10.3, [0, 5.65, 0], [0, 0, 0], 40, core);
    const plasmaMat = M.blue.clone(); plasmaMat.emissiveIntensity = 2.5;
    for (let n = 0; n < 19; n++) {
      const y = .8 + n * .5;
      cylinder(plasmaMat, 1.2, .35, [0, y, 0], [0, 0, 0], 40, core);
      cylinder(M.silver, 1.32, .13, [0, y + .24, 0], [0, 0, 0], 40, core);
    }
    cylinder(M.charcoal, 1.65, .75, [0, 5, 0], [0, 0, 0], 40, core);
    cylinder(M.ochre, 1.75, .14, [0, 4.57, 0], [0, 0, 0], 40, core);
    cylinder(M.ochre, 1.75, .14, [0, 5.43, 0], [0, 0, 0], 40, core);
    cylinder(M.silver, 1.55, .4, [0, 10.5, 0], [0, 0, 0], 40, core);
    cylinder(M.charcoal, 2.1, .7, [0, 11.07, 0], [0, 0, 0], 48, core);
    cylinder(M.blue, 1.77, .13, [0, 11.5, 0], [0, 0, 0], 48, core);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      box(M.silver, [.12, 9.85, .15], [Math.cos(a) * 1.46, 5.6, -4.1 + Math.sin(a) * 1.46]);
      box(M.ochre, [.28, .67, .3], [Math.cos(a) * 1.46, 5, -4.1 + Math.sin(a) * 1.46]);
    }
    // Broad, curved plasma conduits feed outwards from the reaction chamber.
    for (const s of [-1, 1]) {
      cylinder(M.silver, .57, 6.7, [s * 4.95, 5, -4.1], [0, 0, Math.PI / 2], 28);
      cylinder(M.ochre, .65, .25, [s * 2.12, 5, -4.1], [0, 0, Math.PI / 2], 28);
      cylinder(M.charcoal, .7, .42, [s * 7.6, 5, -4.1], [0, 0, Math.PI / 2], 28);
      for (let i = 0; i < 5; i++) cylinder(M.steel, .61, .12, [s * (2.8 + i * .82), 5, -4.1], [0, 0, Math.PI / 2], 24);
      cylinder(M.steel, .52, 8.2, [s * 8.2, 7.1, -4.1]);
      cylinder(M.silver, .75, 9.7, [s * 6.8, 5.3, -12]);
      cylinder(M.ochre, .86, .32, [s * 6.8, .52, -12]);
      for (let y = 1; y <= 10; y += 1.2) cylinder(M.charcoal, .81, .13, [s * 6.8, y, -12]);
      solid(s * 6.8, -12, 1.8, 1.8);
    }
    solid(0, -4.1, 5.4, 5.4);
    // Low safety rail around the working core leaves front and side routes legible.
    for (let i = 0; i < 13; i++) {
      const a = Math.PI * .12 + i * Math.PI * 1.76 / 12;
      const x = Math.sin(a) * 2.55, z = -4.1 - Math.cos(a) * 2.55;
      box(M.silver, [.075, 1, .075], [x, .5, z]);
      const b = a + Math.PI * 1.76 / 12;
      if (i < 12) beam([x, 1.04, z], [Math.sin(b) * 2.55, 1.04, -4.1 - Math.cos(b) * 2.55], .09, M.ochre);
    }
    consoleStation('engineering-master-control', -4.6, 2.8, 3.8, -.45, displays.engineering);
    consoleStation('engineering-diagnostic-control', 4.6, 2.8, 3.8, .45, displays.engineering);
    consoleStation('engineering-reactor-control', -5.2, -7.5, 2.8, -.8, displays.tactical);
    label('MAIN ENGINEERING', 8.9, .56, [0, 9.2, -14.76], [0, 0, 0], '#d5e1eb');
    label('MATTER / ANTIMATTER REACTION ASSEMBLY  •  DECK 36', 9.2, .25, [0, 8.48, -14.75]);
    panel(6.5, 2.3, [0, 6.8, -14.72], [0, 0, 0], displays.engineering);
    for (let z = -12; z < 12; z += 4) {
      box(M.steel, [24.7, .36, .42], [0, 11.7, z]);
      box(M.warm, [3.8, .05, .4], [-5.3, 11.47, z]);
      box(M.warm, [3.8, .05, .4], [5.3, 11.47, z]);
    }
    lights(.69, '#e1e4e8', [0, 8.8, 5.2], 63, [-8, 7, -6], 47, [0, 4, -3.8], '#61b3ff');
    animated.push(t => { plasmaMat.emissiveIntensity = 2.3 + Math.sin(t * 2.6) * .23; });
    return { spawn: { position: [0, 1.68, 10.2], yaw: 0, pitch: .1 } };
  }
  function taperedHull(mat, frontWidth, rearWidth, bottomY, frontTop, rearTop, frontZ, rearZ, parent) {
    const p = [
      [-frontWidth / 2, bottomY, frontZ], [frontWidth / 2, bottomY, frontZ], [rearWidth / 2, bottomY, rearZ], [-rearWidth / 2, bottomY, rearZ],
      [-frontWidth / 2, frontTop, frontZ], [frontWidth / 2, frontTop, frontZ], [rearWidth / 2, rearTop, rearZ], [-rearWidth / 2, rearTop, rearZ],
    ];
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p.flat(), 3));
    geo.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 5, 1, 0, 4, 5, 1, 6, 2, 1, 5, 6, 2, 7, 3, 2, 6, 7, 3, 4, 0, 3, 7, 4]);
    const flat = geo.toNonIndexed(); geo.dispose(); flat.computeVertexNormals(); return mesh(flat, mat, [0, 0, 0], [0, 0, 0], undefined, parent);
  }
  function shuttle(x, z, index, angle) {
    const craft = new THREE.Group(); craft.name = `shuttle-0${index}`; craft.position.set(x, 0, z); craft.rotation.y = angle; group.add(craft);
    taperedHull(M.hull, 2.55, 3.7, .67, 1.52, 1.72, -3.6, 3.6, craft);
    taperedHull(M.hull, 1.9, 3.25, 1.5, 1.65, 2.92, -3.44, -.9, craft);
    box(M.hull, [3.25, 1.2, 4.4], [0, 2.13, 1.28], [0, 0, 0], craft);
    // Sloped panoramic windshield is a physically sloped panel, not an emblem.
    const slope = Math.atan2(2.92 - 1.65, 2.54);
    box(M.window, [1.74, .045, 2.28], [0, 2.29, -2.22], [-slope, 0, 0], craft);
    box(M.charcoal, [.085, .07, 2.35], [0, 2.31, -2.22], [-slope, 0, 0], craft);
    box(M.silver, [1.99, .085, .08], [0, 1.8, -3.17], [0, 0, 0], craft);
    box(M.silver, [2.7, .085, .08], [0, 2.81, -1.12], [0, 0, 0], craft);
    for (const s of [-1, 1]) {
      box(M.window, [.022, .62, 1.18], [s * 1.635, 2.36, -.05], [0, 0, 0], craft);
      box(M.window, [.022, .62, 1.18], [s * 1.635, 2.36, 1.37], [0, 0, 0], craft);
      box(M.charcoal, [.025, .09, 6.55], [s * 1.83, 1.04, .16], [0, 0, 0], craft);
      box(M.burgundy, [.026, .13, 4.35], [s * 1.637, 1.66, 1.28], [0, 0, 0], craft);
      box(M.steel, [1.25, .18, 2.1], [s * 2.05, .95, .7], [0, 0, s * -.18], craft);
      box(M.hull, [.8, .58, 6.1], [s * 2.62, .98, .15], [0, 0, 0], craft);
      box(M.charcoal, [.83, .13, 6.2], [s * 2.62, .67, .15], [0, 0, 0], craft);
      box(M.blue, [.07, .18, 4.42], [s * 3.025, 1.03, .49], [0, 0, 0], craft);
      box(M.red, [.66, .31, .2], [s * 2.62, 1.01, -2.96], [0, 0, 0], craft);
      box(M.charcoal, [.66, .36, .05], [s * 2.62, 1.03, 3.235], [0, 0, 0], craft);
      box(M.blue, [.49, .2, .015], [s * 2.62, 1.03, 3.269], [0, 0, 0], craft);
      for (let n = 0; n < 10; n++) box(M.steel, [.05, .11, .26], [s * 3.07, 1.05, -1.75 + n * .4], [0, 0, 0], craft);
      for (const zz of [-1.9, 2.3]) {
        box(M.silver, [.13, .62, .19], [s * 1.22, .4, zz], [0, 0, s * .19], craft);
        box(M.charcoal, [.55, .08, .69], [s * 1.3, .08, zz], [0, 0, 0], craft);
      }
      label(index === 1 ? 'NCC-1701-D / 01   GALILEO' : 'NCC-1701-D / 02   FARADAY', 3.52, .21, [s * 1.652, 1.95, 1.3], [0, s * Math.PI / 2, 0], '#192836', '#aab5be', craft);
    }
    box(M.darkTan, [1.73, 1.67, .06], [0, 1.72, 3.513], [0, 0, 0], craft);
    box(M.hull, [1.53, 1.43, .03], [0, 1.73, 3.55], [0, 0, 0], craft);
    box(M.charcoal, [.025, 1.43, .023], [0, 1.73, 3.576], [0, 0, 0], craft);
    label(`NCC-1701-D / 0${index}`, 1.4, .2, [0, 2.72, 3.499], [0, 0, 0], '#18222c', '#aab5be', craft);
    box(M.charcoal, [.72, .22, .16], [0, 1.07, -3.62], [0, 0, 0], craft);
    for (const s of [-1, 1]) box(M.warm, [.22, .12, .035], [s * 1.05, 1.15, -3.63], [0, 0, 0], craft);
    // Conservative hull/nacelle collision stays tight for the unobstructed central aisle.
    solid(x, z, 6.7, 8.2);
  }
  function hangar() {
    bounds.push({ minX: -20.8, maxX: 20.8, minZ: -25.3, maxZ: 17.8 });
    const deckTexture = raster(1024, 1024, (c, W, H) => {
      c.fillStyle = '#46505b'; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#343e49'; c.lineWidth = 3;
      for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 128, 0); c.lineTo(i * 128, H); c.stroke(); c.beginPath(); c.moveTo(0, i * 128); c.lineTo(W, i * 128); c.stroke(); }
      for (let i = 0; i < 7000; i++) { c.fillStyle = rand() > .5 ? '#4b5560' : '#424c57'; c.fillRect(rand() * W, rand() * H, 2, 2); }
    });
    deckTexture.wrapS = deckTexture.wrapT = THREE.RepeatWrapping; deckTexture.repeat.set(3, 3);
    box(mapped(deckTexture, false), [42, .2, 44], [0, -.11, -4]);
    box(M.steel, [.45, 13, 44], [-21.1, 6.5, -4]); box(M.steel, [.45, 13, 44], [21.1, 6.5, -4]);
    box(M.steel, [42, 13, .45], [0, 6.5, 18.1]);
    box(M.charcoal, [42, .3, 44.5], [0, 13.1, -4]);
    // The bay mouth is framed by shutter segments and an active containment field.
    box(M.steel, [5.5, 13, .75], [-18.3, 6.5, -25.8]); box(M.steel, [5.5, 13, .75], [18.3, 6.5, -25.8]);
    box(M.steel, [31, 3, .75], [0, 11.5, -25.8]);
    panel(30.5, 9.85, [0, 5, -26.21], [0, 0, 0], starfield(false));
    const fieldMat = new THREE.MeshBasicMaterial({ color: '#398dca', transparent: true, opacity: .09, side: THREE.DoubleSide, depthWrite: false });
    panel(30.5, 9.85, [0, 5, -25.6], [0, 0, 0], fieldMat, 'shuttlebay-forcefield');
    for (const s of [-1, 1]) {
      box(M.cyan, [.12, 10, .15], [s * 15.4, 5, -25.38]);
      box(M.charcoal, [1.15, 10.4, .8], [s * 15.99, 5.2, -25.51]);
      for (let y = .5; y < 10; y += .72) box(M.silver, [.97, .14, .16], [s * 15.99, y, -25.03]);
    }
    box(M.cyan, [30.9, .1, .15], [0, 10.03, -25.39]);
    for (let y = .28; y < 9.9; y += .55) box(M.cyan, [30.7, .013, .013], [0, y, -25.59]);
    // Tall ribs and fully triangulated overhead roof trusses.
    for (let z = -22; z <= 15; z += 6.1) {
      for (const s of [-1, 1]) {
        box(M.darkTan, [.62, 12.7, .68], [s * 20.55, 6.4, z]);
        beam([s * 20.2, 8.6, z], [s * 15.2, 12.6, z], .4, M.silver);
        box(M.warm, [.12, 3.5, .13], [s * 20.13, 6.3, z]);
      }
      box(M.silver, [39.8, .25, .23], [0, 11.2, z]);
      box(M.silver, [39.8, .25, .23], [0, 12.65, z]);
      for (let x = -19.6; x < 19; x += 3.3) beam([x, 11.2, z], [x + 3.3, 12.65, z], .15, M.silver);
      box(M.warm, [5.5, .075, .64], [-9.7, 10.99, z]); box(M.warm, [5.5, .075, .64], [9.7, 10.99, z]);
    }
    // Painted landing bays and central approach lane. Paint is flush, never a collider.
    for (const x of [-7.4, 7.4]) {
      for (const dx of [-4.8, 4.8]) box(M.orange, [.08, .025, 14], [x + dx, .013, -2.8]);
      for (const z of [-9.8, 4.2]) box(M.orange, [9.65, .025, .08], [x, .013, z]);
      label(x < 0 ? '01' : '02', 2.2, 1.0, [x, .036, 6.05], [-Math.PI / 2, 0, 0], '#d6b062', '#46505b');
      for (let i = 0; i < 7; i++) box(M.orange, [.75, .025, .18], [x - 2.7 + i * .9, .02, 4.72], [0, -.45, 0]);
    }
    for (let z = -23; z < 15; z += 2.9) box(M.cream, [.09, .025, 1.5], [0, .023, z]);
    for (const x of [-17.7, 17.7]) box(M.orange, [.08, .025, 40], [x, .022, -4]);
    label('SHUTTLEBAY 01', 10.5, .84, [0, 9.62, 17.82], [0, Math.PI, 0], '#e7dbb8');
    label('CAUTION  •  VARIABLE GRAVITY AREA  •  KEEP CLEAR', 12, .35, [0, 8.69, 17.81], [0, Math.PI, 0], '#dfb967');
    label('NCC-1701-D / MAIN SHUTTLEBAY', 12.2, .44, [0, 11.81, -25.32]);
    shuttle(-7.4, -3.1, 1, -.025); shuttle(7.4, -2.1, 2, .055);
    // Repeated stackable cargo containers with latches and hazard labels.
    for (let i = 0; i < 12; i++) {
      const s = i < 6 ? -1 : 1, n = i % 6, x = s * (18.9 - (n % 2) * 1.75), z = 8.5 + Math.floor(n / 2) * 2.35, h = n % 3 === 0 ? 2.3 : 1.25;
      box(M.darkTan, [1.52, h, 1.83], [x, h / 2, z]);
      for (const dx of [-.66, .66]) box(M.charcoal, [.12, h + .06, 1.89], [x + dx, h / 2, z]);
      for (const yy of [.13, h - .13]) box(M.ochre, [1.55, .1, 1.87], [x, yy, z]);
      box(M.orange, [.62, .16, .022], [x, h * .68, z + .927]);
      solid(x, z, 1.65, 1.95);
    }
    // Service doors, maintenance equipment and a glazed flight-control balcony.
    for (const s of [-1, 1]) {
      for (let z = -17; z < 8; z += 8) {
        box(M.charcoal, [.16, 4.1, 4.2], [s * 20.72, 2.05, z]);
        box(M.darkTan, [.11, 3.8, 3.7], [s * 20.6, 1.9, z]);
        box(M.ochre, [.03, 3.8, .04], [s * 20.53, 1.9, z]);
        label('SERVICE ACCESS / 04', 3.35, .27, [s * 20.48, 4.32, z], [0, -s * Math.PI / 2, 0]);
        panel(.7, .95, [s * 20.47, 1.65, z + 2.5], [0, -s * Math.PI / 2, 0], displays.flight);
      }
      box(M.darkTan, [6, .35, 7], [s * 17.9, 6.1, 13.5]);
      box(M.charcoal, [5.8, 2.2, .2], [s * 17.9, 7.32, 10]);
      box(M.window, [5.55, 1.55, .055], [s * 17.9, 7.6, 9.875]);
      for (let x = s * 17.9 - 2.5; x <= s * 17.9 + 2.5; x += 1.65) box(M.silver, [.07, 2.05, .08], [x, 7.3, 9.84]);
      label('FLIGHT CONTROL', 4.8, .3, [s * 17.9, 6.42, 9.77]);
      box(M.silver, [.07, 1.2, 6.4], [s * 14.86, 6.82, 13.3]);
      box(M.silver, [.1, .09, 6.4], [s * 14.86, 7.48, 13.3]);
    }
    consoleStation('hangar-deck-control', -13.6, 6.2, 2.7, -.7, displays.flight);
    lights(.81, '#dce8f4', [0, 10.5, 6.1], 115, [-11, 8, -13], 78, [12, 8, -8], '#e5edff');
    animated.push(t => { fieldMat.opacity = .08 + Math.sin(t * .65) * .008; });
    return { spawn: { position: [0, 1.68, 14.2], yaw: 0, pitch: .035 } };
  }
  const metadata = kind === 'bridge' ? bridge() : kind === 'engineering' ? engineering() : hangar();
  for (const [mat, matrices] of batches) {
    const instanced = new THREE.InstancedMesh(boxGeometry, mat, matrices.length); instanced.name = `instanced-${[...materials.entries()].find(([, v]) => v === mat)?.[0] || 'architecture'}`;
    matrices.forEach((matrix, index) => instanced.setMatrixAt(index, matrix));
    instanced.instanceMatrix.needsUpdate = true; instanced.castShadow = !mat.emissive?.getHex(); instanced.receiveShadow = true;
    instanced.computeBoundingBox(); instanced.computeBoundingSphere(); group.add(instanced);
  }
  group.userData.kind = kind;
  return { group, ...metadata, bounds, obstacles, doors, update(t, dt = 1 / 60) { for (const animate of animated) animate(t, dt); } };
}
