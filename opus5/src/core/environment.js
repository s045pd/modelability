import * as THREE from 'three';
import { nebulaTexture, makeCanvas } from '../materials/textures.js';
import { makeRng } from '../lib/geom.js';

const SKY_R = 4200;

function planetTexture(size = 1024) {
  const rng = makeRng(1234);
  const c = makeCanvas(size, size / 2);
  const ctx = c.getContext('2d');
  const w = c.width;
  const h = c.height;
  ctx.fillStyle = '#0b2f63'; ctx.fillRect(0, 0, w, h);
  // 深浅海
  for (let i = 0; i < 260; i++) {
    const x = rng() * w, y = rng() * h, r = 20 + rng() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(20,80,150,${0.12 + rng() * 0.2})`);
    g.addColorStop(1, 'rgba(10,40,90,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // 大陆
  const land = ['#3f6b3a', '#4e7a3f', '#7a7042', '#8b7a52', '#5d6e45'];
  for (let i = 0; i < 26; i++) {
    const cx = rng() * w;
    const cy = h * 0.12 + rng() * h * 0.76;
    ctx.fillStyle = land[Math.floor(rng() * land.length)];
    ctx.beginPath();
    const pts = 14 + Math.floor(rng() * 10);
    const rr = 24 + rng() * 96;
    for (let k = 0; k <= pts; k++) {
      const a = (k / pts) * Math.PI * 2;
      const r = rr * (0.45 + rng() * 0.85);
      const x = cx + Math.cos(a) * r * 1.5;
      const y = cy + Math.sin(a) * r * 0.7;
      k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  }
  // 极冠
  const cap = ctx.createLinearGradient(0, 0, 0, h * 0.14);
  cap.addColorStop(0, 'rgba(240,248,255,0.95)'); cap.addColorStop(1, 'rgba(240,248,255,0)');
  ctx.fillStyle = cap; ctx.fillRect(0, 0, w, h * 0.14);
  const cap2 = ctx.createLinearGradient(0, h, 0, h * 0.86);
  cap2.addColorStop(0, 'rgba(240,248,255,0.95)'); cap2.addColorStop(1, 'rgba(240,248,255,0)');
  ctx.fillStyle = cap2; ctx.fillRect(0, h * 0.86, w, h * 0.14);
  // 云带
  for (let i = 0; i < 520; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = 8 + rng() * 60;
    const lat = Math.abs(y / h - 0.5) * 2;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = (0.1 + rng() * 0.35) * (1 - lat * 0.5);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function makeStars(count = 26000) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const siz = new Float32Array(count);
  const rng = makeRng(88);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = rng() * 2 - 1;
    const a = rng() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = SKY_R * 0.94;
    pos[i * 3] = Math.cos(a) * s * r;
    pos[i * 3 + 1] = u * r;
    pos[i * 3 + 2] = Math.sin(a) * s * r;
    const temp = rng();
    c.setHSL(temp > 0.86 ? 0.06 : temp > 0.6 ? 0.58 : 0.12, temp > 0.86 ? 0.55 : 0.3, 0.55 + rng() * 0.45);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    siz[i] = rng() > 0.995 ? 9 + rng() * 14 : 1.4 + rng() * 4.2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: Math.min(devicePixelRatio, 2) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSize; varying vec3 vColor;
      uniform float uPixelRatio;
      void main(){
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPixelRatio;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, a * a);
      }`,
    vertexColors: true,
  });
  const p = new THREE.Points(g, m);
  p.renderOrder = -998;
  return p;
}

export function createEnvironment(renderer, scene) {
  const sky = new THREE.Group();
  sky.name = 'sky';
  scene.add(sky);

  const neb = nebulaTexture();
  neb.mapping = THREE.EquirectangularReflectionMapping;
  const domeGeo = new THREE.SphereGeometry(SKY_R, 48, 32);
  const dome = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({
    map: neb, side: THREE.BackSide, depthWrite: false, toneMapped: false,
  }));
  dome.renderOrder = -1000;
  sky.add(dome);
  sky.add(makeStars());

  // 行星（恒定视角尺寸，随相机平移）
  const planet = new THREE.Group();
  const pr = 760;
  const surface = new THREE.Mesh(
    new THREE.SphereGeometry(pr, 96, 64),
    new THREE.MeshStandardMaterial({ map: planetTexture(), roughness: 0.92, metalness: 0 }),
  );
  planet.add(surface);
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(pr * 1.045, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(0.35, 0.62, 1.0) } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vN = normalize(normalMatrix*normal);
          vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(max(0.0, 1.0 - abs(dot(normalize(vN), normalize(vV)))), 3.2);
          gl_FragColor = vec4(uColor * f * 1.15, f * 0.62); }`,
    }),
  );
  planet.add(atmo);
  planet.position.set(-2450, -980, -1900);
  planet.renderOrder = -997;
  surface.renderOrder = -997;
  atmo.renderOrder = -996;
  sky.add(planet);

  // 光照：主恒星 + 行星反照 + 星云环境
  const sun = new THREE.DirectionalLight(0xfff4e6, 4.6);
  sun.position.set(-0.55, 0.42, 0.72).normalize().multiplyScalar(6000);
  scene.add(sun);
  const bounce = new THREE.DirectionalLight(0x5b86d8, 0.85);
  bounce.position.set(-0.62, -0.35, -0.7).normalize().multiplyScalar(6000);
  scene.add(bounce);
  const fill = new THREE.HemisphereLight(0x2b4470, 0x0c1018, 0.5);
  scene.add(fill);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  scene.environment = pmrem.fromEquirectangular(neb).texture;

  return {
    sky, sun, planet,
    update(camera, dt) {
      sky.position.copy(camera.position);
      surface.rotation.y += dt * 0.004;
    },
  };
}
