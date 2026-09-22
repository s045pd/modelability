/**
 * main.js — Entry point for USS Enterprise NCC-1701-D Interactive Explorer
 * Sets up scene, renderer, lighting, starfield, post-processing, and render loop
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { createExterior } from './exterior.js';
import { createInterior } from './interior.js';
import { ControlsManager } from './controls.js';
import { AnimationManager } from './animations.js';

// ============================================================
// Loading Progress Manager
// ============================================================
class LoadingManager {
  constructor() {
    this.progressEl = document.getElementById('progress-fill');
    this.statusEl = document.getElementById('loading-status');
    this.screenEl = document.getElementById('loading-screen');
    this.hudEl = document.getElementById('hud');
    this.progress = 0;
    this.messages = [
      '初始化子空间传感器阵列...',
      '校准偏导仪频率...',
      '启动曲速核心诊断...',
      '加载碟部结构数据...',
      '组装工程船体...',
      '连接曲速引擎舱...',
      '初始化舰桥系统...',
      '部署内部空间布局...',
      '激活导航偏导仪...',
      '系统就绪 — 准备出发!'
    ];
  }

  setProgress(value) {
    this.progress = Math.min(value, 100);
    if (this.progressEl) {
      this.progressEl.style.width = `${this.progress}%`;
    }
    const msgIdx = Math.min(
      Math.floor((this.progress / 100) * this.messages.length),
      this.messages.length - 1
    );
    if (this.statusEl) {
      this.statusEl.textContent = this.messages[msgIdx];
    }
  }

  complete() {
    this.setProgress(100);
    setTimeout(() => {
      if (this.screenEl) this.screenEl.classList.add('fade-out');
      if (this.hudEl) this.hudEl.classList.remove('hidden');
      setTimeout(() => {
        if (this.screenEl) this.screenEl.style.display = 'none';
      }, 1000);
    }, 500);
  }
}

// ============================================================
// Application
// ============================================================
class EnterpriseApp {
  constructor() {
    this.loading = new LoadingManager();
    this.canvas = document.getElementById('main-canvas');
    this.fpsFrames = 0;
    this.fpsTime = 0;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000004);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(40, 25, 60);
    this.camera.lookAt(0, 4, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.loading.setProgress(5);
  }

  async init() {
    try {
      this._setupLighting();
      this.loading.setProgress(15);

      this._createStarfield();
      this.loading.setProgress(25);

      this._setupPostProcessing();
      this.loading.setProgress(30);

      await this._buildShip();

      this._setupControls();
      this.loading.setProgress(95);

      this._setupResizeHandler();
      this.loading.setProgress(100);
      this.loading.complete();

      // Start render loop
      this._animate();
    } catch (err) {
      console.error('Enterprise initialization failed:', err);
      const statusEl = document.getElementById('loading-status');
      if (statusEl) statusEl.textContent = `错误: ${err.message}`;
    }
  }

  // ============================================================
  // Lighting
  // ============================================================

  _setupLighting() {
    // Subtle ambient — deep space
    const ambient = new THREE.AmbientLight(0x1a1a2e, 0.2);
    this.scene.add(ambient);

    // Primary star (directional)
    const starLight = new THREE.DirectionalLight(0xffffff, 1.5);
    starLight.position.set(60, 40, 50);
    starLight.castShadow = true;
    starLight.shadow.mapSize.set(2048, 2048);
    starLight.shadow.camera.near = 1;
    starLight.shadow.camera.far = 200;
    starLight.shadow.camera.left = -80;
    starLight.shadow.camera.right = 80;
    starLight.shadow.camera.top = 80;
    starLight.shadow.camera.bottom = -80;
    this.scene.add(starLight);

    // Rim/fill light (blue, from behind)
    const rimLight = new THREE.DirectionalLight(0x4466aa, 0.4);
    rimLight.position.set(-40, -15, -60);
    this.scene.add(rimLight);

    // Bottom fill (very subtle)
    const bottomFill = new THREE.DirectionalLight(0x222244, 0.15);
    bottomFill.position.set(0, -30, 0);
    this.scene.add(bottomFill);

    // Hemisphere light for general fill
    const hemi = new THREE.HemisphereLight(0x334466, 0x111122, 0.2);
    this.scene.add(hemi);
  }

  // ============================================================
  // Starfield
  // ============================================================

  _createStarfield() {
    // Particle-based starfield
    const starCount = 8000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Random position on a large sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 500 + Math.random() * 500;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Star colors
      const colorRoll = Math.random();
      if (colorRoll < 0.6) {
        colors[i * 3] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 2] = 1.0;
      } else if (colorRoll < 0.75) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.15;
        colors[i * 3 + 2] = 0.6 + Math.random() * 0.2;
      } else if (colorRoll < 0.9) {
        colors[i * 3] = 0.6 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.7 + Math.random() * 0.2;
        colors[i * 3 + 2] = 1.0;
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.5 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.4 + Math.random() * 0.2;
      }

      sizes[i] = 0.5 + Math.random() * 2.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 1.0,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
    this.starfield = stars;

    // Add some brighter "hero" stars with glow
    this._addHeroStars();
  }

  _addHeroStars() {
    const heroCount = 50;
    for (let i = 0; i < heroCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 400 + Math.random() * 300;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      // Glow sprite
      const spriteMat = new THREE.SpriteMaterial({
        color: Math.random() > 0.7 ? 0xffddaa : 0xaaddff,
        transparent: true,
        opacity: 0.4 + Math.random() * 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(x, y, z);
      sprite.scale.set(4 + Math.random() * 6, 4 + Math.random() * 6, 1);
      this.scene.add(sprite);
    }
  }

  // ============================================================
  // Post-Processing
  // ============================================================

  _setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6,   // strength
      0.4,   // radius
      0.85   // threshold
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  // ============================================================
  // Ship Construction
  // ============================================================

  async _buildShip() {
    // Build exterior
    this.loading.setProgress(35);
    const exterior = createExterior();
    this.exteriorGroup = exterior.group;
    this.exteriorRefs = exterior.refs;
    this.scene.add(this.exteriorGroup);
    this.loading.setProgress(60);

    // Build interior
    const interior = createInterior();
    this.interiorGroup = interior.group;
    this.interiorRefs = interior.refs;
    this.teleportPoints = interior.teleportPoints;
    this.collisionMeshes = interior.collisionMeshes || [];
    this.scene.add(this.interiorGroup);
    this.loading.setProgress(80);

    // Add point lights for key exterior glowing elements
    this._addShipLights();
    this.loading.setProgress(85);

    // Add interior lighting
    this._addInteriorLights();
    this.loading.setProgress(90);
  }

  _addShipLights() {
    const refs = this.exteriorRefs;
    if (!refs) return;

    // Deflector dish point light
    if (refs.deflectorDish) {
      const deflectorLight = new THREE.PointLight(0x3388ff, 3.0, 20, 2);
      deflectorLight.position.copy(refs.deflectorDish.position);
      if (refs.deflectorDish.parent) {
        refs.deflectorDish.parent.add(deflectorLight);
      } else {
        this.exteriorGroup.add(deflectorLight);
      }
    }

    // Bussard lights
    if (refs.bussardLeft) {
      const bLight = new THREE.PointLight(0xff4400, 2.0, 15, 2);
      bLight.position.copy(refs.bussardLeft.position || new THREE.Vector3(-11, 12, 7));
      this.exteriorGroup.add(bLight);
    }
    if (refs.bussardRight) {
      const bLight = new THREE.PointLight(0xff4400, 2.0, 15, 2);
      bLight.position.copy(refs.bussardRight.position || new THREE.Vector3(11, 12, 7));
      this.exteriorGroup.add(bLight);
    }

    // Nacelle glow lights
    const nacelleColor = 0x4488ff;
    if (refs.nacelleGlowLeft) {
      const nLight = new THREE.PointLight(nacelleColor, 2.0, 20, 2);
      nLight.position.set(-11, 12, -12);
      this.exteriorGroup.add(nLight);
    }
    if (refs.nacelleGlowRight) {
      const nLight = new THREE.PointLight(nacelleColor, 2.0, 20, 2);
      nLight.position.set(11, 12, -12);
      this.exteriorGroup.add(nLight);
    }

    // Impulse engine light
    if (refs.impulseEngines) {
      const iLight = new THREE.PointLight(0xff5522, 2.0, 12, 2);
      iLight.position.set(0, 8, -10);
      this.exteriorGroup.add(iLight);
    }
  }

  _addInteriorLights() {
    // Add lights inside each room based on teleport points
    if (!this.teleportPoints) return;

    const interiorLightConfigs = [
      { name: 'bridge', color: 0xaaccff, intensity: 1.5, distance: 12, y: 13 },
      { name: 'observation', color: 0xccddee, intensity: 1.0, distance: 10, y: 13 },
      { name: 'tenforward', color: 0xffddaa, intensity: 1.2, distance: 14, y: 10 },
      { name: 'engineering', color: 0x8899bb, intensity: 1.5, distance: 16, y: 4 },
      { name: 'quarters', color: 0xeeddcc, intensity: 0.8, distance: 8, y: 10 },
      { name: 'corridor1', color: 0xaabbcc, intensity: 1.0, distance: 12, y: 10 },
    ];

    for (const config of interiorLightConfigs) {
      const tp = this.teleportPoints[config.name];
      if (!tp) continue;

      const light = new THREE.PointLight(config.color, config.intensity, config.distance, 2);
      light.position.set(tp.position.x, config.y, tp.position.z);
      this.interiorGroup.add(light);
    }
  }

  // ============================================================
  // Controls
  // ============================================================

  _setupControls() {
    this.controlsManager = new ControlsManager(this.camera, this.renderer, this.scene);

    // Feed interior data to controls
    this.controlsManager.setInterior({
      doors: this.interiorRefs?.doors || [],
      collisionMeshes: this.collisionMeshes,
      teleportPoints: this.teleportPoints || {},
    });

    // Setup animation manager
    this.animationManager = new AnimationManager();
    this.animationManager.setExteriorRefs(this.exteriorRefs);
    this.animationManager.setInteriorRefs(this.interiorRefs);
    this.animationManager.setControlsManager(this.controlsManager);
  }

  // ============================================================
  // Resize
  // ============================================================

  _setupResizeHandler() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
      this.bloomPass.resolution.set(w, h);
    });
  }

  // ============================================================
  // Render Loop
  // ============================================================

  _animate = () => {
    requestAnimationFrame(this._animate);

    const time = performance.now() / 1000;

    // Update controls
    this.controlsManager.update();

    // Update animations
    this.animationManager.update(time);

    // Visibility management based on mode
    this._updateVisibility();

    // Render with post-processing
    this.composer.render();

    // FPS counter
    this._updateFPS();
  }

  _updateVisibility() {
    const mode = this.controlsManager.mode;

    if (mode === 'exterior') {
      // Show exterior, hide interior for performance
      if (this.exteriorGroup) this.exteriorGroup.visible = true;
      if (this.interiorGroup) this.interiorGroup.visible = false;
    } else {
      // Show both (interior is inside exterior)
      if (this.exteriorGroup) this.exteriorGroup.visible = true;
      if (this.interiorGroup) this.interiorGroup.visible = true;
    }
  }

  _updateFPS() {
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsTime >= 1000) {
      const fps = Math.round(this.fpsFrames * 1000 / (now - this.fpsTime));
      const el = document.getElementById('fps-counter');
      if (el) el.textContent = `FPS: ${fps}`;
      this.fpsFrames = 0;
      this.fpsTime = now;
    }
  }
}

// ============================================================
// Bootstrap
// ============================================================
const app = new EnterpriseApp();
app.init();
