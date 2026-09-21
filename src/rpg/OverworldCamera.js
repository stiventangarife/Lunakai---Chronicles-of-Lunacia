// OverworldCamera.js - High Isometric Elevated Camera (Dofus/Diablo Style)
import * as THREE from 'three';

export class OverworldCamera {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 1000);

    // Camera Framing (Dofus/Diablo high isometric pitch)
    this.distance = 20.0;
    this.minDistance = 11.0;
    this.maxDistance = 32.0;

    this.pitchAngle = 0.85; // ~49 degrees down
    this.currentAngle = Math.PI / 4; // 45 deg azimuth (classic isometric angle)
    this.targetAngle = Math.PI / 4;

    this.targetLookAt = new THREE.Vector3(0, 0.6, 0);
    this.currentLookAt = new THREE.Vector3(0, 0.6, 0);

    this.followTarget = null;
    this.damping = 6.0;

    this.isDragging = false;
    this.prevMouseX = 0;
    this.prevMouseY = 0;

    // UI blocking callback to deactivate zoom/orbit when any UI/modal is open
    this.isUIBlocking = null;

    this._initInput();
    this.update(0.016);
  }

  setUIBlockCheck(fn) {
    this.isUIBlocking = fn;
  }

  setFollowTarget(target, snap = false) {
    this.followTarget = target;
    if (target) {
      this.targetLookAt.copy(target.position).add(new THREE.Vector3(0, 0.6, 0));
      if (snap) {
        this.currentLookAt.copy(this.targetLookAt);
      }
    }
  }

  panTo(targetPosition, snap = false) {
    this.followTarget = null;
    const y = (targetPosition.y !== undefined ? targetPosition.y : 0) + 0.6;
    this.targetLookAt.set(targetPosition.x, y, targetPosition.z);
    if (snap) {
      this.currentLookAt.copy(this.targetLookAt);
    }
  }

  _initInput() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });

    window.addEventListener('wheel', (e) => {
      // 1. Prevent zoom if any UI or modal is active in OverworldManager
      if (this.isUIBlocking && this.isUIBlocking()) return;

      // 2. Prevent zoom if event target is inside any modal or HUD overlay element
      if (e.target && e.target.closest) {
        if (e.target.closest(
          '.quest-book-modal, .inventory-modal, .world-map-modal, ' +
          '.dialog-overlay, .dialog-box, #dialog-box-overlay, .overworld-controls-guide, ' +
          '.overworld-quest-tracker, .overworld-tutorial-banner, .hud-action-buttons-group, ' +
          '.hud-zone-badge, .cinematic-flythrough, .hero-intro-card, .modal, .battle-header, .tactical-hud'
        )) {
          return;
        }
      }

      // 3. Fallback: check if any modal is currently visible in DOM
      const activeModal = document.querySelector(
        '.quest-book-modal:not(.hidden), ' +
        '.inventory-modal:not(.hidden), ' +
        '.world-map-modal:not(.hidden), ' +
        '#gameover-modal:not(.hidden), ' +
        '#equipment-screen:not(.hidden), ' +
        '.dialog-overlay:not(.hidden), ' +
        '#dialog-box-overlay:not(.hidden)'
      );
      if (activeModal) return;

      // Zoom in / out
      const delta = Math.sign(e.deltaY) * 1.5;
      this.distance = THREE.MathUtils.clamp(this.distance + delta, this.minDistance, this.maxDistance);
    }, { passive: true });

    // Right-click drag orbit
    this.container.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        if (this.isUIBlocking && this.isUIBlocking()) return;
        this.isDragging = true;
        this.prevMouseX = e.clientX;
        this.prevMouseY = e.clientY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouseX;
      const dy = e.clientY - this.prevMouseY;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      this.targetAngle -= dx * 0.007;
      this.pitchAngle = THREE.MathUtils.clamp(this.pitchAngle + dy * 0.004, 0.45, 1.25);
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isDragging = false;
      }
    });

    this.container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  rotateLeft() {
    this.targetAngle -= Math.PI / 4;
  }

  rotateRight() {
    this.targetAngle += Math.PI / 4;
  }

  resetView() {
    this.targetAngle = Math.PI / 4;
    this.pitchAngle = 0.85;
    this.distance = 20.0;
  }

  /**
   * Returns normalized forward direction in XZ plane from camera perspective.
   */
  getCameraForwardXZ() {
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    return fwd;
  }

  /**
   * Returns normalized right direction in XZ plane from camera perspective.
   */
  getCameraRightXZ() {
    const fwd = this.getCameraForwardXZ();
    return new THREE.Vector3(-fwd.z, 0, fwd.x);
  }

  update(dt) {
    // Follow target smoothly
    if (this.followTarget) {
      this.targetLookAt.copy(this.followTarget.position).add(new THREE.Vector3(0, 0.6, 0));
    }

    const t = Math.min(1.0, this.damping * dt);
    this.currentLookAt.lerp(this.targetLookAt, t);

    // Smooth angle interpolation
    let angleDiff = this.targetAngle - this.currentAngle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    this.currentAngle += angleDiff * Math.min(1.0, 8.0 * dt);

    // Spherical to Cartesian with pitch & distance
    const horizontalDist = this.distance * Math.cos(this.pitchAngle);
    const height = this.distance * Math.sin(this.pitchAngle);

    const camX = this.currentLookAt.x + Math.sin(this.currentAngle) * horizontalDist;
    const camZ = this.currentLookAt.z + Math.cos(this.currentAngle) * horizontalDist;
    const camY = this.currentLookAt.y + height;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(this.currentLookAt);
  }
}
