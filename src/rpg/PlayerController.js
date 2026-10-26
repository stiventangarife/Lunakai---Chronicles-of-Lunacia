// PlayerController.js - Input and Movement Controller for Overworld Exploration
import * as THREE from 'three';

export class PlayerController {
  constructor(playerEntity, cameraController, collisionSystem, audioSystem, overworldManager = null) {
    this.player = playerEntity;
    this.camera = cameraController;
    this.collisions = collisionSystem;
    this.audio = audioSystem;
    this.om = overworldManager;

    this.enabled = false;
    this.speed = 6.8; // units per second

    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    this.stepTimer = 0;
    this.stepInterval = 0.32; // seconds between footstep sounds

    this._initInput();
  }

  _initInput() {
    this._onKeyDown = (e) => {
      if (!this.enabled) return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) || ['INPUT', 'TEXTAREA'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
      this._updateKey(e.code, true);
    };
    this._onKeyUp = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) || ['INPUT', 'TEXTAREA'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
      this._updateKey(e.code, false);
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  /** Al cargar otra partida: quita sus escuchadores de teclado. Sin esto, la ventana mantenía vivo este
   *  controlador y, con él, al jugador anterior entero (modelo, Axie, animaciones). */
  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.enabled = false;
    this.player = null;
    this.camera = null;
    this.collisions = null;
    this.om = null;
  }

  _updateKey(code, isPressed) {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.up = isPressed;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.down = isPressed;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = isPressed;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = isPressed;
        break;
    }
  }

  resetInputs() {
    this.keys.up = false;
    this.keys.down = false;
    this.keys.left = false;
    this.keys.right = false;
    if (this.player) {
      this.player.setAnimation('idle');
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.resetInputs();
    }
  }

  update(dt, time) {
    if (!this.player || !this.enabled) {
      if (this.player) this.player.setAnimation('idle');
      return;
    }

    // Dynamic vertical elevation: smoothly adjust Y on bridge/stairs or 3D terrain whether moving or standing
    const targetY = (this.om && typeof this.om.getGroundHeight === 'function')
      ? this.om.getGroundHeight(this.player.position.x, this.player.position.z)
      : 0.0;
    this.player.position.y += (targetY - this.player.position.y) * Math.min(1.0, 18.0 * dt);

    // Determine raw input
    let inputZ = 0;
    let inputX = 0;
    if (this.keys.up) inputZ += 1;
    if (this.keys.down) inputZ -= 1;
    if (this.keys.left) inputX -= 1;
    if (this.keys.right) inputX += 1;

    const isMoving = inputX !== 0 || inputZ !== 0;

    if (!isMoving) {
      this.player.setAnimation('idle');
      return;
    }

    // Calculate move direction relative to current camera perspective
    const camFwd = this.camera.getCameraForwardXZ();
    const camRight = this.camera.getCameraRightXZ();

    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(camFwd, inputZ);
    moveDir.addScaledVector(camRight, inputX);
    moveDir.normalize();

    // Orient player smoothly to movement direction
    this.player.targetYaw = Math.atan2(moveDir.x, moveDir.z);

    // Compute desired displacement
    const moveDist = this.speed * dt;
    const delta = new THREE.Vector3(moveDir.x * moveDist, 0, moveDir.z * moveDist);

    // Resolve collisions
    const newPos = this.collisions.resolveMovement(this.player.position, delta, this.player.radius);
    this.player.position.x = newPos.x;
    this.player.position.z = newPos.z;

    // Dynamic vertical elevation: smoothly climb stair rocks, hills and bridge deck
    const moveTargetY = (this.om && typeof this.om.getGroundHeight === 'function')
      ? this.om.getGroundHeight(newPos.x, newPos.z)
      : 0.0;
    this.player.position.y += (moveTargetY - this.player.position.y) * Math.min(1.0, 18.0 * dt);

    // Play run animation
    this.player.setAnimation('run');

    // Footstep audio
    this.stepTimer += dt;
    if (this.stepTimer >= this.stepInterval) {
      this.stepTimer = 0;
      // En agua poco profunda suena un chapoteo (Hito 66)
      const wd = this.collisions && typeof this.collisions.waterDepthAt === 'function'
        ? this.collisions.waterDepthAt(this.player.position.x, this.player.position.z) : null;
      if (wd !== null && wd > 0.03 && this.audio && typeof this.audio.playWaterStep === 'function') {
        this.audio.playWaterStep(Math.min(1, wd / 0.5));
      } else if (this.audio && typeof this.audio.playStep === 'function') {
        this.audio.playStep();
      }
    }
  }
}
