import * as THREE from 'three';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false, // 由 composer 的 MSAA RT 负责
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;
  return renderer;
}

export function createCameras() {
  // 星空由跟随相机的天穹负责（depthTest=false），因此远裁面只需覆盖船体尺度。
  const exterior = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.6, 30000);
  exterior.position.set(520, 210, 640);
  const interior = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.06, 6000);
  return { exterior, interior };
}

export function onResize(renderer, composer, cameras) {
  const apply = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    for (const cam of cameras) {
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
  };
  window.addEventListener('resize', apply);
  return apply;
}
