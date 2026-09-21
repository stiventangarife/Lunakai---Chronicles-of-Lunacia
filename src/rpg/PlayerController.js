// PlayerController.js - Input and Movement Controller for Overworld Exploration
import * as THREE from 'three';

export class PlayerController {
  constructor(playerEntity, cameraController, collisionSystem, audioSystem, overworldManager = null) {
    this.player = playerEntity;
    this.camera = cameraController;
    this.collisions = collisionSystem;
    this.audio = audioSystem;
    this.om = overworldManager;

    this.enabled = true;
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
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      this._updateKey(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      this._updateKey(e.code, false);
    });
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

    // Dynamic vertical elevation: smoothly adjust Y on bridge/stairs whether moving or standing
    let targetY = 0.0;
    if (this.om && this.om.stylizedRiver && this.om.stylizedRiver.group.visible && typeof this.om.stylizedRiver.getBridgeHeight === 'function') {
      targetY = this.om.stylizedRiver.getBridgeHeight(this.player.position.x, this.player.position.z);
    }
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

    // Dynamic vertical elevation: smoothly climb stair rocks and bridge deck
    targetY = 0.0;
    if (this.om && this.om.stylizedRiver && this.om.stylizedRiver.group.visible && typeof this.om.stylizedRiver.getBridgeHeight === 'function') {
      targetY = this.om.stylizedRiver.getBridgeHeight(newPos.x, newPos.z);
    }
    this.player.position.y += (targetY - this.player.position.y) * Math.min(1.0, 18.0 * dt);

    // Play run animation
    this.player.setAnimation('run');

    // Footstep audio
    this.stepTimer += dt;
    if (this.stepTimer >= this.stepInterval) {
      this.stepTimer = 0;
      if (this.audio && typeof this.audio.playStep === 'function') {
        this.audio.playStep();
      }
    }
  }
}
