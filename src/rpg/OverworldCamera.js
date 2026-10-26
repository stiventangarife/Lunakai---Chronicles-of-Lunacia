// OverworldCamera.js - High Isometric Elevated Camera (Dofus/Diablo Style)
import * as THREE from 'three';

export class OverworldCamera {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(52, aspect, 0.2, 4000);

    // Camera Framing (Support both close third-person and wide cinematic view)
    this.distance = 11.0;
    this.minDistance = 3.2;
    this.maxDistance = 65.0;

    this.pitchAngle = 0.25; // Closer, immersive third-person starting pitch
    this.currentAngle = Math.PI / 4;
    this.targetAngle = Math.PI / 4;

    this.targetLookAt = new THREE.Vector3(0, 1.75, 0);
    this.currentLookAt = new THREE.Vector3(0, 1.75, 0);

    this.om = null;

    this.followTarget = null;
    this.damping = 6.0;

    this.isDragging = false;
    this.prevMouseX = 0;
    this.prevMouseY = 0;

    // UI blocking callback to deactivate zoom/orbit when any UI/modal is open
    this.isUIBlocking = null;

    this.mode = 'third_person';

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
        this.snapToTarget();
      }
    }
  }

  snapToTarget() {
    if (this.followTarget) {
      this.targetLookAt.copy(this.followTarget.position).add(new THREE.Vector3(0, 0.6, 0));
    }
    this.currentLookAt.copy(this.targetLookAt);
    this.currentAngle = this.targetAngle;
    this._groundFloorY = undefined; // tras un teletransporte, el suelo se toma de golpe

    const horizontalDist = this.distance * Math.cos(this.pitchAngle);
    const height = this.distance * Math.sin(this.pitchAngle);

    const camX = this.currentLookAt.x + Math.sin(this.currentAngle) * horizontalDist;
    const camZ = this.currentLookAt.z + Math.cos(this.currentAngle) * horizontalDist;
    const camY = this.currentLookAt.y + height;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(this.currentLookAt);
    this.camera.updateMatrixWorld(true);
  }

  panTo(targetPosition, snap = false) {
    this.followTarget = null;
    const y = (targetPosition.y !== undefined ? targetPosition.y : 0) + 0.6;
    this.targetLookAt.set(targetPosition.x, y, targetPosition.z);
    if (snap) {
      this.snapToTarget();
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

    // Drag orbit (Left-click, Right-click or Middle-click on canvas)
    this.container.addEventListener('mousedown', (e) => {
      if (this.isUIBlocking && this.isUIBlocking()) return;
      if (e.target && e.target.closest) {
        if (e.target.closest(
          '.quest-book-modal, .inventory-modal, .world-map-modal, ' +
          '.dialog-overlay, .dialog-box, #dialog-box-overlay, .overworld-controls-guide, ' +
          '.overworld-quest-tracker, .overworld-tutorial-banner, .hud-action-buttons-group, ' +
          '.hud-zone-badge, .cinematic-flythrough, .hero-intro-card, .modal, .battle-header, .tactical-hud, ' +
          '#demo-ui-container, .hud-card, button, input, select, textarea'
        )) {
          return;
        }
      }
      this.isDragging = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouseX;
      const dy = e.clientY - this.prevMouseY;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      this.targetAngle -= dx * 0.007;
      // Ultra-free pitch range: down to -0.65 (~ -37° looking high up into sky / clouds) up to +1.40 (top-down view)
      this.pitchAngle = THREE.MathUtils.clamp(this.pitchAngle + dy * 0.0045, -0.65, 1.40);
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) || ['INPUT', 'TEXTAREA'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
      if (e.code === 'PageUp') {
        this.pitchUp(0.12);
      } else if (e.code === 'PageDown') {
        this.pitchDown(0.12);
      }
    });
  }

  pitchUp(amount = 0.12) {
    this.pitchAngle = THREE.MathUtils.clamp(this.pitchAngle - amount, -0.65, 1.40);
  }

  pitchDown(amount = 0.12) {
    this.pitchAngle = THREE.MathUtils.clamp(this.pitchAngle + amount, -0.65, 1.40);
  }

  rotateLeft() {
    this.targetAngle -= Math.PI / 4;
  }

  rotateRight() {
    this.targetAngle += Math.PI / 4;
  }

  resetView() {
    this.targetAngle = Math.PI / 4;
    this.pitchAngle = 0.25;
    this.distance = 11.0;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'third_person') {
      this.pitchAngle = 0.20;
      this.distance = 9.0;
    } else {
      this.pitchAngle = 0.85;
      this.distance = 20.0;
    }
  }

  toggleMode() {
    this.setMode(this.mode === 'third_person' ? 'isometric' : 'third_person');
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
      // Dynamic look target: when pitch is negative (looking up at sky), elevate the lookAt point into the sky
      const skyLookUpOffset = Math.max(0, -this.pitchAngle) * 8.5;
      this.targetLookAt.copy(this.followTarget.position);
      this.targetLookAt.y += 1.75 + skyLookUpOffset;
    }

    // Suavizado exponencial: igual de suave a 30, 60 o 144 FPS (min(1, k·dt) daba saltos si el dt variaba)
    const t = 1 - Math.exp(-this.damping * dt);
    this.currentLookAt.lerp(this.targetLookAt, t);

    // Smooth angle interpolation
    let angleDiff = this.targetAngle - this.currentAngle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    this.currentAngle += angleDiff * (1 - Math.exp(-8.0 * dt));

    // Spherical to Cartesian with pitch & distance
    // Hito 74 · brazo de cámara con colisión: si entre el personaje y la cámara hay una casa, una roca o una ladera,
    // la cámara se pone delante (al instante) y vuelve despacio a su distancia cuando queda libre.
    let armDist = this.distance;
    if (this.occlusion && this.followTarget) {
      this.occlusion.tick();
      const hd = this.distance * Math.cos(this.pitchAngle), hh = this.distance * Math.sin(this.pitchAngle);
      this._wantPos = this._wantPos || new THREE.Vector3();
      this._wantPos.set(this.currentLookAt.x + Math.sin(this.currentAngle) * hd, this.currentLookAt.y + hh, this.currentLookAt.z + Math.cos(this.currentAngle) * hd);
      const f = this.occlusion.cast(this.currentLookAt, this._wantPos, 0.3);
      const target = f < 1 ? Math.max(1.6, this.distance * f - 0.35) : this.distance;
      if (this._arm === undefined || !Number.isFinite(this._arm)) this._arm = target;
      if (target < this._arm) this._arm = target;                                  // acercarse: al instante
      else this._arm += (target - this._arm) * (1 - Math.exp(-3.0 * dt));           // alejarse: suave
      armDist = Math.min(this.distance, this._arm);
    } else {
      this._arm = this.distance;
    }
    const horizontalDist = armDist * Math.cos(this.pitchAngle);
    const height = armDist * Math.sin(this.pitchAngle);

    const camX = this.currentLookAt.x + Math.sin(this.currentAngle) * horizontalDist;
    const camZ = this.currentLookAt.z + Math.cos(this.currentAngle) * horizontalDist;
    let camY = this.currentLookAt.y + height;

    // Prevent camera from dipping under ground / terrain
    let minGroundY = 0.5;
    if (this.om && typeof this.om.getGroundHeight === 'function') {
      minGroundY = this.om.getGroundHeight(camX, camZ) + 0.6;
    } else if (this.om && this.om.player) {
      minGroundY = (this.om.player.position.y || 0) + 0.5;
    }
    // El suelo bajo la cámara cambia de golpe en laderas y rocas: antes la cámara copiaba cada
    // bache al instante (tirón visual). Ahora el "suelo mínimo" se suaviza: sube rápido (para no
    // atravesar el terreno) y baja despacio.
    if (this._groundFloorY === undefined || !Number.isFinite(this._groundFloorY)) {
      this._groundFloorY = minGroundY;
    } else {
      const k = minGroundY > this._groundFloorY ? 14.0 : 4.0;
      this._groundFloorY += (minGroundY - this._groundFloorY) * (1 - Math.exp(-k * dt));
      // nunca más de 0,45 m por debajo del suelo real
      if (this._groundFloorY < minGroundY - 0.45) this._groundFloorY = minGroundY - 0.45;
    }
    if (camY < this._groundFloorY) {
      camY = this._groundFloorY;
    }

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(this.currentLookAt);
    // Hito 74 · árboles y arbustos que tapan al personaje: se agujerean con un tramado suave
    if (this.occlusion) this.occlusion.updateSeeThrough(this.camera, this.currentLookAt, Boolean(this.followTarget));
  }
}
