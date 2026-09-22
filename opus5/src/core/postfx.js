import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/** 轻量胶片颗粒 + 暗角 + 轻微色差，压住"CG 塑料感"。 */
const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.045 },
    uVignette: { value: 0.72 },
    uAberration: { value: 0.0016 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVignette, uAberration;
    varying vec2 vUv;
    float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 d = vUv - 0.5;
      float r2 = dot(d, d);
      vec2 off = d * uAberration * (0.4 + r2 * 2.0);
      vec4 col;
      col.r = texture2D(tDiffuse, vUv + off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - off).b;
      col.a = 1.0;
      float vig = smoothstep(1.05, uVignette * 0.35, r2 * 2.2);
      col.rgb *= mix(0.72, 1.0, vig);
      float g = rand(vUv * 1024.0 + fract(uTime) * 91.7) - 0.5;
      col.rgb += g * uGrain;
      gl_FragColor = col;
    }
  `,
};

/**
 * HDR 卫生：把 NaN/Inf 像素清零并限幅。
 * 否则一个坏像素会被 bloom 的可分离高斯模糊放大成整块矩形黑斑。
 */
const SanitizeShader = {
  uniforms: { tDiffuse: { value: null }, uMax: { value: 48.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uMax; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      // NaN 与任何比较都为 false，因此 step 会把它替换为 0
      vec3 ok = vec3(greaterThanEqual(c.rgb, vec3(0.0)));
      vec3 col = min(c.rgb * ok, vec3(uMax));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createComposer(renderer, scene, camera) {
  const size = new THREE.Vector2();
  renderer.getSize(size);
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: 4,
    colorSpace: THREE.LinearSRGBColorSpace,
  });
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const sanitize = new ShaderPass(SanitizeShader);
  composer.addPass(sanitize);

  const bloom = new UnrealBloomPass(size.clone(), 0.48, 0.7, 0.86);
  composer.addPass(bloom);

  const film = new ShaderPass(FilmShader);
  composer.addPass(film);

  composer.addPass(new OutputPass());

  return {
    composer,
    renderPass,
    bloom,
    film,
    setCamera(cam) { renderPass.camera = cam; },
    update(elapsed) { film.uniforms.uTime.value = elapsed; },
  };
}
