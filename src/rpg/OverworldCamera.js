// OverworldCamera.js - High Isometric Elevated Camera (Dofus/Diablo Style)
import * as THREE from 'three';
import { access } from '../ui/AccessPrefs.js';

export class OverworldCamera {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(52, aspect, 0.2, 4000);

    // Camera Framing (Support both close third-person and wide cinematic view)
    this.distance = 11.0;
    // Hito 82: zoom limitado (antes hasta 65 m: el personaje se perdía; la vista de la isla es el mapa) y suave
    this.minDistance = 4.0;
    this.maxDistance = 22.0;
    this.zoomTarget = null;   // distancia a la que se desliza la cámara tras usar la rueda (null = sin zoom en curso)

    this.pitchAngle = 0.25; // Closer, immersive third-person starting pitch
    this.currentAngle = Math.PI / 4;
    this.targetAngle = Math.PI / 4;

    this.targetLookAt = new THREE.Vector3(0, 1.75, 0);
    this.currentLookAt = new THREE.Vector3(0, 1.75, 0);

    this.om = null;

    this.followTarget = null;
    this.damping = 6.0;
    // Hito 90: la cámara se adelanta un poco hacia donde camina el jugador (hasta ~1,2 m) y vuelve al parar.
    // Se suaviza aparte (más despacio que el seguimiento) para que no dé tirones; apagado con «Reducir movimiento».
    this.lookAhead = new THREE.Vector3();
    this.lookAheadTime = 0.18;   // segundos de velocidad que se adelanta
    this.lookAheadMax = 1.4;

    // Encuadre de un acompañante (tutorial de acariciar y alimentar): ver setFrameTarget / _updateFrame.
    // _frameF (0–1) es cuánto se ha alejado y subido la cámara para que el Axie quepa en pantalla.
    this._frameGetter = null;
    this._frameAxie = null;
    this._frameF = 0;
    this._frameV = new THREE.Vector3();

    this.isDragging = false;
    this.prevMouseX = 0;
    this.prevMouseY = 0;

    // UI blocking callback to deactivate zoom/orbit when any UI/modal is open
    this.isUIBlocking = null;

    this.mode = 'third_person';

    // Hito 141 · colisión de la cámara (ver update): esfera, distancia mínima y suavizado
    this.collisionRadius = 0.35; // radio de la esfera que se prueba (m): cubre el plano cercano de la cámara con margen
    this.minArm = 1.8;           // la cámara no baja de aquí desde la cabeza: si no cabe, sube por encima del personaje
    this.armHoldS = 0.3;         // al quedar libre, espera antes de volver
    this.armInRate = 16;         // acercarse o subir: ~0,06 s
    this.armOutRate = 5;         // alejarse o bajar: ~0,6 s
    this.armOutMaxSpeed = 6;     // alejarse: tope de velocidad (m/s) para las vueltas largas

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

  /**
   * Mantiene a la vista a un acompañante (el Axie) mientras dura un paso del tutorial. `getter` es una función que
   * devuelve su objeto 3D (así sigue valiendo si el modelo se rehace) o null para volver a la cámara normal.
   * Con el encuadre activo la cámara apunta entre el jugador y el Axie y, si el Axie se sale de la zona segura de la
   * pantalla (detrás de la cámara, bajo el borde inferior…), se aleja y sube un poco hasta que vuelve a verse.
   */
  setFrameTarget(getter) {
    this._frameGetter = typeof getter === 'function' ? getter : null;
  }

  _updateFrame(dt) {
    const c = this._frameGetter ? this._frameGetter() : null;
    this._frameAxie = (c && c.visible !== false) ? c : null;
    if (!this._frameAxie) {
      if (this._frameF > 0) this._frameF = Math.max(0, this._frameF - 0.8 * dt);
      return;
    }
    // Dónde cae el Axie en la pantalla (con la matriz del fotograma anterior)
    const v = this._frameV.copy(c.position);
    v.y += 0.8;
    v.project(this.camera);
    const e = v.z > 1 ? 1 : Math.max(Math.abs(v.x) - 0.62, v.y - 0.62, -0.5 - v.y, 0);
    if (e > 0) this._frameF = Math.min(1, this._frameF + (0.35 + e) * dt);
    else if (Math.abs(v.x) < 0.45 && v.y > -0.35 && v.y < 0.45) this._frameF = Math.max(0, this._frameF - 0.25 * dt); // con holgura: vuelve poco a poco
  }

  snapToTarget() {
    if (this.followTarget) {
      this.targetLookAt.copy(this.followTarget.position).add(new THREE.Vector3(0, 0.6, 0));
    }
    if (this.lookAhead) this.lookAhead.set(0, 0, 0);   // Hito 90: tras un salto de posición, sin adelanto
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
      // Hito 82: la rueda mueve un objetivo y la cámara se desliza hasta él (ratón: ~1,2 m por paso; touchpad: según lo que se deslice)
      const px = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      const delta = THREE.MathUtils.clamp(px * 0.012, -2.5, 2.5);
      const from = this.zoomTarget ?? this.distance;
      this.zoomTarget = THREE.MathUtils.clamp(from + delta, this.minDistance, this.maxDistance);
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
    this.distance = 11.0; this.zoomTarget = null;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'third_person') {
      this.pitchAngle = 0.20;
      this.distance = 9.0; this.zoomTarget = null;
    } else {
      this.pitchAngle = 0.85;
      this.distance = 20.0; this.zoomTarget = null;
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
    // Hito 82 · zoom suave: la distancia se acerca al objetivo de la rueda (≈0,25 s); al llegar, se suelta
    if (this.zoomTarget != null) {
      this.distance += (this.zoomTarget - this.distance) * (1 - Math.exp(-12 * dt));
      if (Math.abs(this.zoomTarget - this.distance) < 0.01) { this.distance = this.zoomTarget; this.zoomTarget = null; }
    }
    // Encuadre del Axie (solo durante los pasos de cuidado del tutorial): distancia y ángulo extra
    this._updateFrame(dt);
    const frameF = this._frameF;
    const dist = this.distance + frameF * 6.0;
    const pitch = frameF > 0 ? Math.min(1.45, this.pitchAngle + frameF * 0.32) : this.pitchAngle;
    // Follow target smoothly
    if (this.followTarget) {
      // Dynamic look target: when pitch is negative (looking up at sky), elevate the lookAt point into the sky
      const skyLookUpOffset = Math.max(0, -this.pitchAngle) * 8.5;
      this.targetLookAt.copy(this.followTarget.position);
      this.targetLookAt.y += 1.75 + skyLookUpOffset;
      // Con un Axie que encuadrar, la cámara apunta al punto medio entre él y el jugador
      if (this._frameAxie) {
        this.targetLookAt.x = (this.targetLookAt.x + this._frameAxie.position.x) * 0.5;
        this.targetLookAt.z = (this.targetLookAt.z + this._frameAxie.position.z) * 0.5;
      }
      // Hito 90: adelanto según la velocidad del jugador (solo cuando la cámara le sigue a él)
      const pc = this.om?.playerController;
      const want = this._laWant || (this._laWant = new THREE.Vector3());
      want.set(0, 0, 0);
      const fresh = pc && performance.now() - (pc._velStamp || 0) < 200;
      if (fresh && pc.velocity && this.followTarget === this.om?.player && !access.reduceMotion) {
        want.set(pc.velocity.x, 0, pc.velocity.z).multiplyScalar(this.lookAheadTime);
        if (want.length() > this.lookAheadMax) want.setLength(this.lookAheadMax);
      }
      this.lookAhead.lerp(want, 1 - Math.exp(-2.2 * dt));
      this.targetLookAt.x += this.lookAhead.x;
      this.targetLookAt.z += this.lookAhead.z;
    } else if (this.lookAhead) {
      this.lookAhead.set(0, 0, 0);
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
    // Brazo de cámara con colisión (Hitos 74, 79, 136; reglas actuales del Hito 141):
    //  · Una esfera de `collisionRadius` (0,35 m) viaja de la cabeza a donde querría estar la cámara (CameraOcclusion.cast).
    //  · La cámara no baja de `minArm` (1,8 m) desde la cabeza. Si a su ángulo cupiera menos, en vez de acercarse más
    //    sube por encima del personaje: se busca (bisección, 4 pruebas) el ángulo más bajo con al menos minArm libres.
    //    Con un obstáculo a media distancia (loma, casa) también sube si así conserva casi toda la distancia (Hito 136).
    //  · Una sola regla de suavizado para acercarse y para subir: rápido (~0,06 s); al quedar libre espera `armHoldS`
    //    (0,3 s) y vuelve despacio (~0,6 s, como mucho a 6 m/s). Así pasar junto a una pared no la hace ir y venir.
    //  · Al final, si la cámara colocada (tras el ajuste al suelo) queda metida en algo, se adelanta hasta salir.
    let armDist = dist;
    let pitchEff = pitch;
    if (this.occlusion && this.followTarget) {
      this.occlusion.tick();
      const R = this.collisionRadius, MIN = this.minArm, PMAX = 1.45, FIT = MIN + 0.25;
      this._wantPos = this._wantPos || new THREE.Vector3();
      const castAt = (p) => {
        const hd = dist * Math.cos(p), hh = dist * Math.sin(p);
        this._wantPos.set(this.currentLookAt.x + Math.sin(this.currentAngle) * hd, this.currentLookAt.y + hh, this.currentLookAt.z + Math.cos(this.currentAngle) * hd);
        return this.occlusion.cast(this.currentLookAt, this._wantPos, R);
      };
      // Retención compartida: mientras algo obligue a acercarse o a subir, no se vuelve atrás hasta pasados armHoldS
      this._camHold = Math.max(0, (this._camHold || 0) - dt);
      if (this._lift === undefined || !Number.isFinite(this._lift)) this._lift = 0;
      // 1) ¿Cabe al ángulo normal? (en metros libres, no en fracción: no depende del zoom)
      const f0 = castAt(pitch);
      const free0 = f0 < 1 ? dist * f0 : dist;
      // Ángulo más bajo (entre pitch y top) con al menos `need` metros libres; null si ni arriba cabe. 4 pruebas.
      const freeAt = (p) => { const f = castAt(p); return f < 1 ? dist * f : dist; };
      const findLift = (need, top) => {
        if (top <= pitch + 0.01 || freeAt(top) < need) return null;
        let lo = pitch, hi = top;
        for (let i = 0; i < 3; i++) { const mid = (lo + hi) * 0.5; if (freeAt(mid) >= need) hi = mid; else lo = mid; }
        return hi - pitch;
      };
      let liftWant = 0;
      if (f0 < 0.6 || free0 < FIT) {
        // 1º (Hito 136, se mantiene): si subiendo hasta +60° queda libre casi todo el brazo, sube y conserva la distancia
        // (una loma, una casa a media distancia)
        let l = findLift(dist * 0.85, Math.min(PMAX, pitch + 1.05));
        // 2º: si no, y ni el mínimo cabe, sube lo que haga falta hasta casi la vertical. Si ni así (bajo un tejado o un
        // arco), se queda abajo a minArm y lo que tapa se transparenta.
        if (l === null && free0 < FIT) l = findLift(FIT, PMAX);
        liftWant = l ?? 0;
      }
      // 2) Subir: rápido; bajar: tras la retención, despacio
      if (liftWant > this._lift + 0.01) {
        this._camHold = this.armHoldS;
        this._lift += (liftWant - this._lift) * (1 - Math.exp(-this.armInRate * dt));
      } else if (liftWant < this._lift - 0.01 && this._camHold <= 0) {
        this._lift += (liftWant - this._lift) * (1 - Math.exp(-this.armOutRate * dt));
      }
      if (this._lift < 0.002) this._lift = 0;
      pitchEff = Math.min(PMAX, pitch + this._lift);
      // 3) Distancia libre al ángulo que se usa
      let f = (pitchEff === pitch) ? f0 : castAt(pitchEff);
      // Hito 79 (acotado en el 141): si el obstáculo solo roza el final del brazo y la esfera de la cámara queda bien
      // fuera de todo, no se acerca: esa esquina se transparenta. Con margen para no cambiar de idea cada fotograma.
      const cornerOk = this._cornerOk ? f >= 0.72 : f >= 0.8;
      this._cornerOk = f < 1 && cornerOk && this.occlusion.inside && !this.occlusion.inside(this._wantPos, R + 0.2);
      if (this._cornerOk) f = 1;
      const target = f < 1 ? Math.max(MIN, dist * f - 0.05) : dist;
      if (this._arm === undefined || !Number.isFinite(this._arm)) { this._arm = target; this._armFree = 9; }
      this._armFree = (f < 1 || this._lift > 0) ? 0 : (this._armFree || 0) + dt;
      if (this._armFree > 1.5) {
        this._arm += (target - this._arm) * (1 - Math.exp(-12.0 * dt));          // sin obstáculos: sigue la rueda del ratón
      } else if (target < this._arm - 0.05) {
        this._camHold = this.armHoldS;
        this._arm += (target - this._arm) * (1 - Math.exp(-this.armInRate * dt)); // acercarse: rápido
        if (this._arm - target > 1.0) this._arm = target + 1.0;                    // nunca muy dentro del obstáculo
      } else if (target > this._arm + 0.05 && this._camHold <= 0) {
        // alejarse: despacio (~0,6 s en un tramo corto) y nunca a más de armOutMaxSpeed: desde muy cerca hasta un zoom
        // lejano iba a casi 1 m por fotograma, chocaba otra vez y volvía (bombeo)
        this._arm += Math.min((target - this._arm) * (1 - Math.exp(-this.armOutRate * dt)), this.armOutMaxSpeed * dt);
      }
      armDist = Math.min(dist, this._arm);
    } else {
      this._arm = dist;
    }
    const horizontalDist = armDist * Math.cos(pitchEff);
    const height = armDist * Math.sin(pitchEff);

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
    // Hito 141 · comprobación final: el ajuste al suelo (o un acercamiento a medias) puede dejar la cámara metida en una
    // caja. Entonces se adelanta por la línea hacia la cabeza hasta que la esfera queda libre (ver dentro de una pared
    // es peor que quedar por debajo de minArm).
    if (this.occlusion && this.followTarget && this.occlusion.inside(this.camera.position, 0.25)) {
      const f2 = this.occlusion.cast(this.currentLookAt, this.camera.position, 0.25);
      if (f2 < 1) this.camera.position.lerpVectors(this.currentLookAt, this.camera.position, Math.max(0.05, f2));
    }
    this.camera.lookAt(this.currentLookAt);
    // Hito 74 · árboles y arbustos que tapan al personaje: se agujerean con un tramado suave
    if (this.occlusion) this.occlusion.updateSeeThrough(this.camera, this.currentLookAt, Boolean(this.followTarget));
  }
}
