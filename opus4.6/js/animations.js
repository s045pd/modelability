/**
 * animations.js — All animation updates for the Enterprise-D
 * Handles Bussard rotation, nacelle pulse, deflector glow, nav lights, warp core, doors
 */
import * as THREE from 'three';

export class AnimationManager {
  constructor() {
    this.clock = new THREE.Clock();
    this.exteriorRefs = null;
    this.interiorRefs = null;
    this.controlsManager = null;

    // Animation parameters
    this.bussardRotationSpeed = 2.0; // rad/s
    this.nacelleGlowPhase = 0;
    this.deflectorPhase = 0;
    this.warpCorePulsePhase = 0;
    this.navBlinkTimer = 0;
    this.navBlinkState = true;
    this.redAlertPhase = 0;
  }

  setExteriorRefs(refs) {
    this.exteriorRefs = refs;
  }

  setInteriorRefs(refs) {
    this.interiorRefs = refs;
  }

  setControlsManager(cm) {
    this.controlsManager = cm;
  }

  // ============================================================
  // Main Update (called every frame)
  // ============================================================

  update(time) {
    const delta = this.clock.getDelta();
    const t = time || performance.now() / 1000;

    this._animateBussardCollectors(t, delta);
    this._animateNacelleGlow(t);
    this._animateDeflectorDish(t);
    this._animateImpulseEngines(t);
    this._animateNavLights(t, delta);
    this._animateWarpCore(t);
    this._animateRedAlert(t);
  }

  // ============================================================
  // Exterior Animations
  // ============================================================

  _animateBussardCollectors(time, delta) {
    if (!this.exteriorRefs) return;

    const { bussardLeft, bussardRight } = this.exteriorRefs;

    // Rotate Bussard collectors
    if (bussardLeft) {
      bussardLeft.rotation.z += this.bussardRotationSpeed * delta;
    }
    if (bussardRight) {
      bussardRight.rotation.z += this.bussardRotationSpeed * delta;
    }
  }

  _animateNacelleGlow(time) {
    if (!this.exteriorRefs) return;

    const { nacelleGlowLeft, nacelleGlowRight } = this.exteriorRefs;

    // Pulsing intensity on the warp grille
    const intensity = 4.0 + Math.sin(time * 1.5) * 1.5;
    const color = new THREE.Color();

    if (nacelleGlowLeft && nacelleGlowLeft.material) {
      nacelleGlowLeft.material.emissiveIntensity = intensity;
      // Subtle color shift
      const hue = 0.58 + Math.sin(time * 0.8) * 0.02; // blue range
      color.setHSL(hue, 0.8, 0.5);
      nacelleGlowLeft.material.emissive.copy(color);
    }
    if (nacelleGlowRight && nacelleGlowRight.material) {
      nacelleGlowRight.material.emissiveIntensity = intensity;
      const hue = 0.58 + Math.sin(time * 0.8 + 0.3) * 0.02;
      color.setHSL(hue, 0.8, 0.5);
      nacelleGlowRight.material.emissive.copy(color);
    }
  }

  _animateDeflectorDish(time) {
    if (!this.exteriorRefs) return;

    const { deflectorDish } = this.exteriorRefs;
    if (!deflectorDish || !deflectorDish.material) return;

    // Slow pulsing glow
    const intensity = 2.5 + Math.sin(time * 0.8) * 1.0;
    deflectorDish.material.emissiveIntensity = intensity;

    // Color cycle between blue and amber
    const t = (Math.sin(time * 0.3) + 1) / 2; // 0 to 1
    const blue = new THREE.Color(0x3388ff);
    const amber = new THREE.Color(0xffaa44);
    deflectorDish.material.emissive.copy(blue).lerp(amber, t * 0.2);
  }

  _animateImpulseEngines(time) {
    if (!this.exteriorRefs) return;

    const { impulseEngines } = this.exteriorRefs;
    if (!impulseEngines || !impulseEngines.material) return;

    // Subtle flicker
    const intensity = 2.5 + Math.sin(time * 3.0) * 0.3 + Math.sin(time * 7.1) * 0.1;
    impulseEngines.material.emissiveIntensity = intensity;
  }

  _animateNavLights(time, delta) {
    if (!this.exteriorRefs) return;

    const { navLights } = this.exteriorRefs;
    if (!navLights || navLights.length === 0) return;

    this.navBlinkTimer += delta;

    // White strobes blink every 1.5 seconds
    if (this.navBlinkTimer > 1.5) {
      this.navBlinkTimer = 0;
      this.navBlinkState = !this.navBlinkState;

      // Strobe lights (index 2 and 3 are white)
      for (let i = 2; i < navLights.length; i++) {
        if (navLights[i] && navLights[i].material) {
          navLights[i].material.emissiveIntensity = this.navBlinkState ? 5.0 : 0.0;
          navLights[i].visible = this.navBlinkState;
        }
      }
    }

    // Red and green steady but with slight pulse
    for (let i = 0; i < Math.min(2, navLights.length); i++) {
      if (navLights[i] && navLights[i].material) {
        navLights[i].material.emissiveIntensity = 3.0 + Math.sin(time * 2.0) * 0.5;
      }
    }
  }

  // ============================================================
  // Interior Animations
  // ============================================================

  _animateWarpCore(time) {
    if (!this.interiorRefs) return;

    const { warpCore, warpCorePulse } = this.interiorRefs;

    if (warpCore && warpCore.material) {
      // Pulsing core intensity
      const intensity = 4.0 + Math.sin(time * 2.0) * 2.0;
      warpCore.material.emissiveIntensity = intensity;

      // Color shift
      const hue = 0.6 + Math.sin(time * 1.5) * 0.03;
      const color = new THREE.Color().setHSL(hue, 0.9, 0.55);
      warpCore.material.emissive.copy(color);

      // Scale pulse
      const scale = 1.0 + Math.sin(time * 2.0) * 0.03;
      warpCore.scale.set(scale, 1, scale);
    }

    if (warpCorePulse) {
      // Energy pulse ring travels up and down the core
      const coreHeight = 5.0; // approximate height of warp core
      const pulseY = Math.sin(time * 1.8) * coreHeight * 0.4;
      warpCorePulse.position.y = pulseY;

      // Pulse ring scale
      const pulseScale = 1.0 + Math.abs(Math.sin(time * 1.8)) * 0.2;
      warpCorePulse.scale.set(pulseScale, 1, pulseScale);

      // Pulse opacity
      if (warpCorePulse.material) {
        warpCorePulse.material.opacity = 0.3 + Math.abs(Math.sin(time * 1.8)) * 0.5;
      }
    }
  }

  _animateRedAlert(time) {
    if (!this.controlsManager || !this.controlsManager.isRedAlert) {
      // Reset red alert lights when inactive
      if (this.interiorRefs && this.interiorRefs.redAlertLights) {
        for (const light of this.interiorRefs.redAlertLights) {
          if (light && light.material) {
            light.material.emissiveIntensity = 0;
          }
        }
      }
      return;
    }

    if (!this.interiorRefs || !this.interiorRefs.redAlertLights) return;

    // Pulsing red light
    const intensity = (Math.sin(time * 4.0) + 1) / 2 * 5.0;

    for (const light of this.interiorRefs.redAlertLights) {
      if (light && light.material) {
        light.material.emissiveIntensity = intensity;
      }
    }
  }
}
