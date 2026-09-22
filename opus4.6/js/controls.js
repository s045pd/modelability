/**
 * controls.js — Camera controls, mode switching, collision, interaction
 * USS Enterprise NCC-1701-D
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class ControlsManager {
  constructor(camera, renderer, scene) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.mode = 'exterior'; // 'exterior' | 'interior'
    this.clock = new THREE.Clock();

    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.moveSpeed = 6.0;
    this.eyeHeight = 1.7;

    // Interaction
    this.interactRaycaster = new THREE.Raycaster();
    this.interactRaycaster.far = 3.0;
    this.interactables = []; // { mesh, type, action, data }
    this.doors = [];
    this.collisionMeshes = [];
    this.teleportPoints = {};
    this.nearestInteractable = null;

    // Collision raycasters (6 directions)
    this.collisionRaycasters = [];
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(1, 0, 1).normalize(),
      new THREE.Vector3(-1, 0, 1).normalize(),
      new THREE.Vector3(1, 0, -1).normalize(),
      new THREE.Vector3(-1, 0, -1).normalize(),
    ];
    for (const dir of directions) {
      const rc = new THREE.Raycaster();
      rc.far = 0.5;
      rc.ray.direction.copy(dir);
      this.collisionRaycasters.push(rc);
    }

    // Teleport menu state
    this.teleportMenuOpen = false;

    // ===== Orbit Controls (exterior) =====
    this.orbitControls = new OrbitControls(camera, renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.minDistance = 30;
    this.orbitControls.maxDistance = 250;
    this.orbitControls.target.set(0, 4, 0);
    this.orbitControls.maxPolarAngle = Math.PI * 0.85;
    this.orbitControls.autoRotate = false;
    this.orbitControls.autoRotateSpeed = 0.5;

    // ===== Pointer Lock Controls (interior) =====
    this.pointerLockControls = new PointerLockControls(camera, document.body);
    this.pointerLockControls.addEventListener('lock', () => {
      this._onPointerLock();
    });
    this.pointerLockControls.addEventListener('unlock', () => {
      this._onPointerUnlock();
    });

    // ===== Event Listeners =====
    this._setupKeyboard();
    this._setupUI();
  }

  // ============================================================
  // Setup
  // ============================================================

  setInterior(interiorData) {
    if (interiorData.doors) this.doors = interiorData.doors;
    if (interiorData.collisionMeshes) this.collisionMeshes = interiorData.collisionMeshes;
    if (interiorData.teleportPoints) this.teleportPoints = interiorData.teleportPoints;
  }

  _setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (this.mode !== 'interior') return;
      switch (e.code) {
        case 'KeyW': this.moveForward = true; break;
        case 'KeyS': this.moveBackward = true; break;
        case 'KeyA': this.moveLeft = true; break;
        case 'KeyD': this.moveRight = true; break;
        case 'KeyE': this._interact(); break;
        case 'KeyT': this._toggleTeleportMenu(); break;
        case 'Escape':
          if (this.teleportMenuOpen) {
            this._closeTeleportMenu();
          }
          break;
      }
    });

    document.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': this.moveForward = false; break;
        case 'KeyS': this.moveBackward = false; break;
        case 'KeyA': this.moveLeft = false; break;
        case 'KeyD': this.moveRight = false; break;
      }
    });
  }

  _setupUI() {
    // Mode buttons
    const btnExterior = document.getElementById('btn-exterior');
    const btnInterior = document.getElementById('btn-interior');

    if (btnExterior) {
      btnExterior.addEventListener('click', () => this.switchToExterior());
    }
    if (btnInterior) {
      btnInterior.addEventListener('click', () => this.switchToInterior('bridge'));
    }

    // Teleport buttons
    const teleportBtns = document.querySelectorAll('.teleport-btn');
    teleportBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        this.teleportTo(target);
        this._closeTeleportMenu();
      });
    });

    // Red alert button
    const btnRedAlert = document.getElementById('btn-red-alert');
    if (btnRedAlert) {
      btnRedAlert.addEventListener('click', () => {
        this._toggleRedAlert();
      });
    }
  }

  // ============================================================
  // Mode Switching
  // ============================================================

  switchToExterior() {
    this.mode = 'exterior';
    this.pointerLockControls.unlock();
    this.orbitControls.enabled = true;

    // Reset camera to exterior position
    this.camera.position.set(40, 25, 60);
    this.camera.lookAt(0, 4, 0);
    this.orbitControls.target.set(0, 4, 0);
    this.orbitControls.update();

    // Update UI
    this._updateModeUI();
  }

  switchToInterior(locationName = 'bridge') {
    this.mode = 'interior';
    this.orbitControls.enabled = false;

    // Teleport to location
    this.teleportTo(locationName);

    // Lock pointer
    this.pointerLockControls.lock();

    // Update UI
    this._updateModeUI();
  }

  teleportTo(locationName) {
    const point = this.teleportPoints[locationName];
    if (!point) {
      console.warn(`Teleport point "${locationName}" not found`);
      return;
    }

    this.camera.position.copy(point.position);
    if (point.lookAt) {
      this.camera.lookAt(point.lookAt);
    }

    // Reset velocity
    this.velocity.set(0, 0, 0);

    // Update location display
    this._updateLocationDisplay(locationName);
  }

  // ============================================================
  // Update Loop
  // ============================================================

  update() {
    const delta = this.clock.getDelta();

    if (this.mode === 'exterior') {
      this.orbitControls.update();
    } else if (this.mode === 'interior') {
      this._updateMovement(delta);
      this._checkInteractables();
    }
  }

  _updateMovement(delta) {
    if (!this.pointerLockControls.isLocked) return;

    // Friction / damping
    this.velocity.x -= this.velocity.x * 8.0 * delta;
    this.velocity.z -= this.velocity.z * 8.0 * delta;

    // Direction from input
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * this.moveSpeed * delta;
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x -= this.direction.x * this.moveSpeed * delta;
    }

    // Store old position for collision rollback
    const oldPos = this.camera.position.clone();

    // Apply movement
    this.pointerLockControls.moveRight(-this.velocity.x * delta * 10);
    this.pointerLockControls.moveForward(-this.velocity.z * delta * 10);

    // Lock eye height
    this.camera.position.y = this._findFloorHeight() + this.eyeHeight;

    // Collision detection
    if (this.collisionMeshes.length > 0) {
      const collides = this._checkCollision();
      if (collides) {
        this.camera.position.copy(oldPos);
        this.velocity.set(0, 0, 0);
      }
    }
  }

  _findFloorHeight() {
    // Simple: just use the Y position minus eye height (flat floors)
    // In a more complex setup, we'd raycast downward to find the floor
    const downRay = new THREE.Raycaster(
      this.camera.position.clone().add(new THREE.Vector3(0, 1, 0)),
      new THREE.Vector3(0, -1, 0),
      0,
      10
    );
    const hits = downRay.intersectObjects(this.collisionMeshes, false);
    if (hits.length > 0) {
      return hits[0].point.y;
    }
    return this.camera.position.y - this.eyeHeight;
  }

  _checkCollision() {
    const pos = this.camera.position;
    for (const rc of this.collisionRaycasters) {
      rc.ray.origin.copy(pos);
      rc.ray.origin.y -= 0.5; // Check at body height, not eye height
      const hits = rc.intersectObjects(this.collisionMeshes, false);
      if (hits.length > 0 && hits[0].distance < 0.4) {
        return true;
      }
    }
    return false;
  }

  // ============================================================
  // Interaction
  // ============================================================

  _checkInteractables() {
    if (!this.pointerLockControls.isLocked) return;

    // Raycast forward from camera
    this.interactRaycaster.ray.origin.copy(this.camera.position);
    this.camera.getWorldDirection(this.interactRaycaster.ray.direction);

    // Check doors — collect all door-related meshes
    const doorMeshes = [];
    const doorMeshToIndex = new Map();
    for (let i = 0; i < this.doors.length; i++) {
      const d = this.doors[i];
      // Support both single-mesh and dual-panel doors
      if (d.mesh) {
        doorMeshes.push(d.mesh);
        doorMeshToIndex.set(d.mesh, i);
      }
      if (d.leftPanel) {
        doorMeshes.push(d.leftPanel);
        doorMeshToIndex.set(d.leftPanel, i);
      }
      if (d.rightPanel) {
        doorMeshes.push(d.rightPanel);
        doorMeshToIndex.set(d.rightPanel, i);
      }
      if (d.meshGroup) {
        // Also check meshGroup children
        d.meshGroup.traverse(child => {
          if (child.isMesh) {
            doorMeshes.push(child);
            doorMeshToIndex.set(child, i);
          }
        });
      }
    }

    if (doorMeshes.length > 0) {
      const hits = this.interactRaycaster.intersectObjects(doorMeshes, false);
      if (hits.length > 0) {
        const doorIdx = doorMeshToIndex.get(hits[0].object);
        if (doorIdx !== undefined) {
          this.nearestInteractable = { type: 'door', doorIndex: doorIdx };
          this._showInteractPrompt(true);
          return;
        }
      }
    }

    this.nearestInteractable = null;
    this._showInteractPrompt(false);
  }

  _interact() {
    if (!this.nearestInteractable) return;

    if (this.nearestInteractable.type === 'door') {
      const door = this.doors[this.nearestInteractable.doorIndex];
      if (door) {
        this._toggleDoor(door);
      }
    }
  }

  _toggleDoor(door) {
    door.isOpen = !door.isOpen;
    const duration = 500; // ms
    const startTime = performance.now();

    // Support dual-panel doors (leftPanel + rightPanel)
    if (door.leftPanel && door.rightPanel) {
      const startLeft = door.leftPanel.position.clone();
      const startRight = door.rightPanel.position.clone();
      const targetLeft = door.isOpen ? door.openPosLeft : door.closedPosLeft;
      const targetRight = door.isOpen ? door.openPosRight : door.closedPosRight;

      const animateDualDoor = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        door.leftPanel.position.lerpVectors(startLeft, targetLeft, eased);
        door.rightPanel.position.lerpVectors(startRight, targetRight, eased);

        if (t < 1) requestAnimationFrame(animateDualDoor);
      };
      animateDualDoor();
    }
    // Fallback: single mesh door
    else if (door.mesh) {
      const startPos = door.mesh.position.clone();
      const targetPos = door.isOpen ? door.openPos : door.closedPos;

      const animateDoor = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        door.mesh.position.lerpVectors(startPos, targetPos, eased);

        if (t < 1) requestAnimationFrame(animateDoor);
      };
      animateDoor();
    }
  }

  // ============================================================
  // Teleport Menu
  // ============================================================

  _toggleTeleportMenu() {
    if (this.teleportMenuOpen) {
      this._closeTeleportMenu();
    } else {
      this._openTeleportMenu();
    }
  }

  _openTeleportMenu() {
    this.teleportMenuOpen = true;
    const menu = document.getElementById('teleport-menu');
    if (menu) menu.classList.remove('hidden');
    this.pointerLockControls.unlock();
  }

  _closeTeleportMenu() {
    this.teleportMenuOpen = false;
    const menu = document.getElementById('teleport-menu');
    if (menu) menu.classList.add('hidden');
    if (this.mode === 'interior') {
      this.pointerLockControls.lock();
    }
  }

  // ============================================================
  // Red Alert
  // ============================================================

  _redAlertActive = false;

  _toggleRedAlert() {
    this._redAlertActive = !this._redAlertActive;
    const canvas = document.getElementById('main-canvas');
    if (this._redAlertActive) {
      canvas?.classList.add('red-alert-active');
    } else {
      canvas?.classList.remove('red-alert-active');
    }
    // The animation manager will read this state for light pulsing
  }

  get isRedAlert() {
    return this._redAlertActive;
  }

  // ============================================================
  // UI Updates
  // ============================================================

  _updateModeUI() {
    const btnExterior = document.getElementById('btn-exterior');
    const btnInterior = document.getElementById('btn-interior');
    const exteriorHelp = document.getElementById('exterior-help');
    const interiorHelp = document.getElementById('interior-help');
    const crosshair = document.getElementById('crosshair');
    const locationDisplay = document.getElementById('location-display');
    const btnRedAlert = document.getElementById('btn-red-alert');

    if (this.mode === 'exterior') {
      btnExterior?.classList.add('active');
      btnInterior?.classList.remove('active');
      exteriorHelp?.classList.remove('hidden');
      interiorHelp?.classList.add('hidden');
      crosshair?.classList.add('hidden');
      if (locationDisplay) locationDisplay.style.display = 'none';
      btnRedAlert?.classList.add('hidden');
    } else {
      btnExterior?.classList.remove('active');
      btnInterior?.classList.add('active');
      exteriorHelp?.classList.add('hidden');
      interiorHelp?.classList.remove('hidden');
      crosshair?.classList.remove('hidden');
      if (locationDisplay) locationDisplay.style.display = 'block';
      btnRedAlert?.classList.remove('hidden');
    }
  }

  _updateLocationDisplay(locationName) {
    const deckMap = {
      bridge: { deck: '甲板 1', room: '主舰桥' },
      observation: { deck: '甲板 1', room: '观察室' },
      tenforward: { deck: '甲板 10', room: '十前进酒吧' },
      quarters: { deck: '甲板 8', room: '船员宿舍' },
      engineering: { deck: '甲板 36', room: '主工程部' },
      corridor1: { deck: '甲板 8', room: '1号走廊' },
    };

    const info = deckMap[locationName] || { deck: '未知', room: '未知区域' };
    const deckEl = document.getElementById('current-deck');
    const roomEl = document.getElementById('current-room');
    if (deckEl) deckEl.textContent = info.deck;
    if (roomEl) roomEl.textContent = info.room;
  }

  _showInteractPrompt(show) {
    const el = document.getElementById('interact-prompt');
    if (el) {
      if (show) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  }

  _onPointerLock() {
    // Pointer locked - interior mode fully active
  }

  _onPointerUnlock() {
    if (this.mode === 'interior' && !this.teleportMenuOpen) {
      // User pressed ESC — switch back to exterior
      this.switchToExterior();
    }
  }

  // ============================================================
  // Cleanup
  // ============================================================

  dispose() {
    this.orbitControls.dispose();
    this.pointerLockControls.dispose();
  }
}
