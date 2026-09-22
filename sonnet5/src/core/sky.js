import * as THREE from 'three';
import { TIME } from './materials.js';

export const SUN_DIR = new THREE.Vector3(0.62, 0.42, -0.66).normalize();
export const PLANET_POS = new THREE.Vector3(-3400, -2600, -7600);
export const PLANET_R = 2600;

const NOISE = /* glsl */ `
float h13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec3 h33(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1,0,0)), f.x), mix(h13(i + vec3(0,1,0)), h13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h13(i + vec3(0,0,1)), h13(i + vec3(1,0,1)), f.x), mix(h13(i + vec3(0,1,1)), h13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = .5, s = 0.; for(int i = 0; i < 6; i++){ s += a * vnoise(p); p = p * 2.03 + 11.7; a *= .5; } return s; }
`;

const SKY_FRAG = /* glsl */ `
varying vec3 vDir;
uniform vec3 uSun;
${NOISE}
vec3 starLayer(vec3 d, float N, float prob, float size, float gain){
  vec3 p = d * N; vec3 id = floor(p);
  vec3 r = h33(id) * 0.6 + 0.2;
  float ex = step(1.0 - prob, h13(id + 7.31));
  float dist = length(fract(p) - r);
  float b = exp(-dist * dist / (size * size)) * ex * gain;
  float t = h13(id + 3.7);
  vec3 col = mix(vec3(1.0, .74, .55), vec3(.6, .75, 1.0), t);
  col = mix(col, vec3(1.0), 0.5);
  return col * b * (0.25 + 1.6 * pow(h13(id + 1.9), 4.0));
}
void main(){
  vec3 d = normalize(vDir);
  vec3 bandN = normalize(vec3(0.25, 0.85, 0.45));
  float lat = dot(d, bandN);
  float band = exp(-lat * lat / 0.045);
  vec3 col = vec3(0.004, 0.006, 0.012);
  float n1 = fbm(d * 3.2 + 4.0), n2 = fbm(d * 7.0 + n1 * 2.0);
  float dust = smoothstep(0.35, 0.75, n2);
  vec3 neb = mix(vec3(.10, .07, .20), vec3(.05, .13, .26), n1) * 1.2 + vec3(.22, .09, .05) * smoothstep(.55, .9, fbm(d * 2.1 + 9.0));
  col += neb * band * (0.45 + n2) * (1.0 - 0.55 * dust) * 0.9;
  col += neb * 0.10 * n1;
  float dens = 1.0 + band * 3.0;
  float dn = 1.0 + band * 2.0;
  vec3 st = starLayer(d, 55.0, 0.030 * dn, 0.10, 1.6)
          + starLayer(d, 130.0, 0.020 * dn, 0.11, 1.2)
          + starLayer(d, 290.0, 0.012 * dn, 0.13, 1.0)
          + starLayer(d, 600.0, 0.008 * dn, 0.16, 0.8);
  col += st * (1.0 - 0.6 * dust * band);
  float s = max(dot(d, uSun), 0.0);
  col += vec3(1.0, .93, .78) * (pow(s, 6000.0) * 60.0 + pow(s, 400.0) * 1.8 + pow(s, 40.0) * 0.16);
  gl_FragColor = vec4(col, 1.0);
}`;

export function buildSkyCube(renderer, size = 2048) {
  const rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const scene = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uSun: { value: SUN_DIR.clone() } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: SKY_FRAG,
  });
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat));
  const cam = new THREE.CubeCamera(0.1, 10, rt);
  cam.update(renderer, scene);
  mat.dispose();
  return rt.texture;
}

// 行星：程序化大陆、云层、大气
export function buildPlanet() {
  const geo = new THREE.SphereGeometry(PLANET_R, 128, 96);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: SUN_DIR.clone() }, uTime: TIME, uCenter: { value: PLANET_POS.clone() } },
    vertexShader: `varying vec3 vN; varying vec3 vP; varying vec3 vW;
      void main(){ vN = normalize(mat3(modelMatrix) * normal); vP = position / ${PLANET_R.toFixed(1)}; vW = (modelMatrix * vec4(position,1.)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec3 vN; varying vec3 vP; varying vec3 vW; uniform vec3 uSun; uniform float uTime;
      ${NOISE}
      void main(){
        vec3 p = normalize(vP);
        float h = fbm(p * 3.0 + 2.0);
        float ocean = smoothstep(0.50, 0.53, h);
        vec3 deep = vec3(.02, .09, .22), shallow = vec3(.05, .26, .38);
        vec3 land = mix(vec3(.20, .34, .12), vec3(.46, .38, .24), smoothstep(.53, .72, h));
        land = mix(land, vec3(.92), smoothstep(.72, .8, h) + smoothstep(.78, .95, abs(p.y)));
        vec3 base = mix(mix(deep, shallow, smoothstep(.42, .5, h)), land, ocean);
        float cl = fbm(p * 5.0 + vec3(uTime * 0.004, 0., 0.) + 30.0 * fbm(p * 1.5));
        float cloud = smoothstep(.5, .78, cl);
        base = mix(base, vec3(1.), cloud * .85);
        vec3 n = normalize(vN);
        float ndl = dot(n, normalize(uSun));
        float dayL = smoothstep(-0.08, 0.35, ndl);
        vec3 v = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(n, v), 0.), 3.0);
        vec3 atm = vec3(.25, .5, 1.0) * fres * (0.25 + 1.6 * smoothstep(-.3, .6, ndl));
        vec3 spec = vec3(1.0, .95, .85) * pow(max(dot(reflect(-normalize(uSun), n), v), 0.), 60.) * (1.0 - ocean) * (1.0 - cloud) * .6;
        vec3 night = vec3(1., .8, .45) * step(.8, vnoise(p * 150.)) * ocean * (1. - cloud) * .5 * (1. - dayL);
        gl_FragColor = vec4(base * dayL * 1.6 + atm + spec + night + base * 0.012, 1.);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(PLANET_POS);
  mesh.frustumCulled = false;
  return mesh;
}

// 环境反射：深空 + 太阳软光箱 + 行星反照
export function buildEnvironment(renderer, skyTex) {
  const pm = new THREE.PMREMGenerator(renderer);
  const scene = new THREE.Scene();
  scene.background = skyTex;
  const mk = (r, g, b) => { const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }); m.color.setRGB(r, g, b); return m; };
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mk(9, 8.4, 7.2));
  sun.position.copy(SUN_DIR).multiplyScalar(60); sun.lookAt(0, 0, 0); scene.add(sun);
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), mk(0.35, 0.55, 1.1));
  fill.position.set(-20, -70, -40); fill.lookAt(0, 0, 0); scene.add(fill);
  const rim = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), mk(0.5, 0.42, 0.34));
  rim.position.set(30, 20, 70); rim.lookAt(0, 0, 0); scene.add(rim);
  const rt = pm.fromScene(scene, 0.02, 0.1, 200);
  pm.dispose();
  return rt.texture;
}

// 舷窗：用同一张天空立方体，按世界视线方向采样
export function makeSpaceWindowMaterial(skyTex) {
  return new THREE.ShaderMaterial({
    uniforms: { uSky: { value: skyTex }, uTint: { value: new THREE.Color(0.9, 0.95, 1.0) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform samplerCube uSky; uniform vec3 uTint; varying vec3 vW; void main(){ vec3 d = normalize(vW - cameraPosition); gl_FragColor = vec4(textureCube(uSky, d).rgb * uTint, 1.); }',
    toneMapped: true,
  });
}
