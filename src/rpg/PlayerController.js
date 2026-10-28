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
    this.stepInterval = 0.32; // (sin uso desde el Hito 87: los pasos suenan con cada zancada)

    // Hito 90: inercia corta. La velocidad se acerca a la deseada en ~0,15 s al arrancar y frena en ~0,1 s
    // (un pequeño deslizamiento), en vez de pasar de 0 a 6,8 m/s de golpe. Cambiar de sentido es más rápido.
    this.velocity = new THREE.Vector3();
    this.accel = 16;      // 1/s al arrancar o cambiar de dirección
    this.decel = 22;      // 1/s al soltar las teclas
    this.reverse = 26;    // 1/s al dar media vuelta

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
    if (this.velocity) this.velocity.set(0, 0, 0);
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
      if (this.velocity) this.velocity.set(0, 0, 0);
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

    // Velocidad deseada (dirección relativa a la cámara)
    const want = this._want || (this._want = new THREE.Vector3());
    want.set(0, 0, 0);
    if (isMoving) {
      want.addScaledVector(this.camera.getCameraForwardXZ(), inputZ);
      want.addScaledVector(this.camera.getCameraRightXZ(), inputX);
      want.normalize();
      this.player.targetYaw = Math.atan2(want.x, want.z);   // gira hacia donde quiere ir
      want.multiplyScalar(this.speed);
    }
    // Hito 90 · inercia: acercarse a la velocidad deseada (exponencial: igual a cualquier FPS)
    const v = this.velocity;
    this._velStamp = performance.now();   // la cámara solo usa una velocidad reciente (no la de antes de recolectar)
    const rate = !isMoving ? this.decel : (v.dot(want) < 0 ? this.reverse : this.accel);
    v.lerp(want, 1 - Math.exp(-rate * dt));
    const speed = Math.hypot(v.x, v.z);
    if (!isMoving && speed < 0.05) {
      v.set(0, 0, 0);
      this.player.setAnimation('idle');
      return;
    }

    // Desplazamiento de este fotograma, con colisiones
    const delta = new THREE.Vector3(v.x * dt, 0, v.z * dt);
    const before = this.player.position.clone();
    const newPos = this.collisions.resolveMovement(this.player.position, delta, this.player.radius);
    this.player.position.x = newPos.x;
    this.player.position.z = newPos.z;
    // Contra una pared la velocidad no se acumula: queda la que de verdad se movió
    if (dt > 0) {
      const realX = (newPos.x - before.x) / dt, realZ = (newPos.z - before.z) / dt;
      if (Math.hypot(realX, realZ) < speed * 0.98) v.set(realX, 0, realZ);
    }

    // Dynamic vertical elevation: smoothly climb stair rocks, hills and bridge deck
    const moveTargetY = (this.om && typeof this.om.getGroundHeight === 'function')
      ? this.om.getGroundHeight(newPos.x, newPos.z)
      : 0.0;
    this.player.position.y += (moveTargetY - this.player.position.y) * Math.min(1.0, 18.0 * dt);

    // Correr mientras lleva velocidad; el último tramo del frenado ya en reposo
    this.player.setAnimation(isMoving || speed > this.speed * 0.35 ? 'run' : 'idle');

    // Pasos (Hito 87): ya no suenan aquí con un temporizador, sino con cada zancada y según el suelo
    // (FootstepEffectsManager → WorldSfx.onStride: hierba, tierra, arena, madera, piedra, nieve, hielo o agua).
  }
}
