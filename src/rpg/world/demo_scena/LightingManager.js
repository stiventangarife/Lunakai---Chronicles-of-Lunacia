import * as THREE from 'three';
import { applyGenshinGoldenHour } from './genshin/GenshinArtDirection.js';

// Sombras estables (Hito 83).
// · El mapa de sombras se recalcula uno de cada dos fotogramas (Hito 53, EnvironmentSystem.render).
//   El sol solo se mueve en los fotogramas en que se recalcula: así el mapa y la matriz con la que se
//   lee siempre corresponden a la misma posición del sol (antes, en los fotogramas sin recálculo, las
//   sombras se leían corridas y las rocas, el puente y los árboles parpadeaban al caminar).
// · La caja de sombras avanza en pasos fijos también en la dirección del sol (profundidad estable).
// · bias negativo y normalBias de 1,5 celdas del mapa (se recalcula al cambiar la calidad o la caja).
// · Los objetos fijos del mundo meten en el mapa su cara delantera (EnvironmentSystem._prepareShadowCasters):
//   con la cara trasera (lo que three hace por defecto) las caras casi paralelas al sol se rayaban.
const SHADOW_DEFAULTS = {
  bias: -0.0002,          // en unidades de profundidad (0..1 entre near y far ≈ 379 m → ~8 cm)
  normalBiasTexels: 1.5,  // empuje por la normal, en celdas del mapa de sombras
  depthStep: 2.0,         // paso de la caja en la dirección del sol (m)
};
const _instances = new Set();
let _lastCommit = -Infinity;
let _refreshRequested = false;

/**
 * Gestor de Iluminación estilizada Fantasy MMORPG para Demo_Scena en Macro-Zona [2, 2].
 * Soporta sombras suaves, luces hemisféricas y presets dinámicos de hora del día.
 */
export class LightingManager {
  /**
   * Opciones de depuración (lkDebug.shadows):
   *  everyFrame: recalcular las sombras en todos los fotogramas (coste del Hito 53 sin optimizar).
   *  legacy:     comportamiento anterior (sol en todos los fotogramas, árboles moviendo la matriz).
   *  freeze:     el sol deja de seguir al jugador.
   *  frontFaces: los objetos fijos del mundo meten en el mapa su cara delantera (false = la de three).
   *  bias / normalBias (m) / normalBiasTexels / depthStep: null = valor por defecto.
   */
  static debug = { everyFrame: false, legacy: false, freeze: false, frontFaces: true, bias: null, normalBias: null, normalBiasTexels: null, depthStep: null };

  static get defaults() { return { ...SHADOW_DEFAULTS }; }

  /** Lo llama EnvironmentSystem en los fotogramas en que el mapa de sombras se va a recalcular. */
  static commitShadowTargets() {
    _lastCommit = performance.now();
    _refreshRequested = false;
    for (const lm of _instances) lm._commitTarget();
  }

  /** true si algún sol tiene un salto pendiente (cambio de isla, teletransporte): hay que recalcular ya. */
  static wantsShadowRefresh() { return _refreshRequested; }

  /** Vuelve a calcular bias y normalBias en todos los soles (tras cambiar opciones de depuración). */
  static refreshAllBias() { for (const lm of _instances) lm.refreshShadowBias(); }

  static get instances() { return _instances; }

  /**
   * @param {THREE.Scene} scene
   * @param {{ shadowExtent?: number, snapShadows?: boolean }} [opts]
   *   shadowExtent: semilado de la caja de sombras en metros (130 por defecto; el Bosque usa 80).
   *   snapShadows: mover la caja en pasos de un texel para que las sombras no tiemblen.
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this._shadowExtent = opts.shadowExtent || 130;
    this._snapShadows = !!opts.snapShadows;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.dirLight = null;
    this.hemiLight = null;
    this.ambientLight = null;

    this.currentPreset = 'sunset'; // 'sunset', 'daylight', 'morning'
    this._lightOffset = new THREE.Vector3(120, 75, -95).normalize().multiplyScalar(150);

    // Objetivo pendiente: se aplica en el próximo fotograma con recálculo de sombras (Hito 83)
    this._pendingTarget = new THREE.Vector3();
    this._hasPending = false;
    this._placed = false;
    this._biasKey = '';

    this.initLights();
    this.applyPreset(this.currentPreset);
    _instances.add(this);
  }

  /** Retira este sol del registro (al destruir la zona). */
  dispose() {
    _instances.delete(this);
  }

  initLights() {
    // 1. Sol DirectionalLight principal con sombras suaves
    this.dirLight = new THREE.DirectionalLight(0xfff3db, 2.2);
    this.dirLight.castShadow = true;

    // Configuración de resolución de sombras
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 1.0;
    this.dirLight.shadow.camera.far = 380;

    // Área de sombra alrededor del jugador (ver opts.shadowExtent). En el Bosque ±80 m: el mapa de
    // 2048 px cubre menos terreno, las sombras cercanas ganan nitidez y el pase de sombras dibuja
    // menos objetos. Las demás islas conservan ±130 m.
    const shadowD = this._shadowExtent;
    this.dirLight.shadow.camera.left = -shadowD;
    this.dirLight.shadow.camera.right = shadowD;
    this.dirLight.shadow.camera.top = shadowD;
    this.dirLight.shadow.camera.bottom = -shadowD;
    // bias y normalBias se calculan según el tamaño real de la celda (refreshShadowBias, Hito 83).
    // Antes: bias +0.00002 (signo que favorece el acné) y normalBias 0.025 m (un tercio de celda).
    this.refreshShadowBias();

    this.group.add(this.dirLight);
    this.group.add(this.dirLight.target);

    // 2. Luz Hemisférica: cielo azul pastel / suelo verde cálido reflejado
    this.hemiLight = new THREE.HemisphereLight(0xbadbff, 0x5a7a40, 1.1);
    this.group.add(this.hemiLight);

    // 3. Luz ambiental suave de relleno
    this.ambientLight = new THREE.AmbientLight(0xffeed6, 0.45);
    this.group.add(this.ambientLight);
  }

  applyPreset(presetKey) {
    this.currentPreset = presetKey;
    // El preset mueve el sol al origen: el próximo updateLightTarget lo recoloca al momento y pide
    // recalcular las sombras en ese mismo fotograma.
    this._placed = false;

    if (presetKey === 'sunset') {
      // Tarde Dorada / Atardecer Anime Cálido (Genshin style)
      this.dirLight.position.set(120, 75, -95);
      this.dirLight.target.position.set(0, 0, 0);
      this.dirLight.color.setHex(0xffcb8a);
      this.dirLight.intensity = 2.4;
      this._lightOffset.set(120, 75, -95).normalize().multiplyScalar(150);

      this.hemiLight.color.setHex(0xffd1b3); // Cielo dorado/ámbar
      this.hemiLight.groundColor.setHex(0x526b38);
      this.hemiLight.intensity = 1.25;

      this.ambientLight.color.setHex(0xffcca3);
      this.ambientLight.intensity = 0.55;

      return {
        fogColor: 0xe6b993,
        fogNear: 65,
        fogFar: 290,
        skyTop: 0x487ba6,
        skyBottom: 0xffb785
      };
    } else if (presetKey === 'daylight') {
      this.dirLight.position.set(60, 140, 40);
      this.dirLight.target.position.set(0, 0, 0);
      this.dirLight.color.setHex(0xffffff);
      this.dirLight.intensity = 2.6;
      this._lightOffset.set(60, 140, 40).normalize().multiplyScalar(150);

      this.hemiLight.color.setHex(0x9bd7ff);
      this.hemiLight.groundColor.setHex(0x608a40);
      this.hemiLight.intensity = 1.3;

      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.5;

      return {
        fogColor: 0xb5daf0,
        fogNear: 85,
        fogFar: 320,
        skyTop: 0x2475bd,
        skyBottom: 0xa4dcf5
      };
    } else if (presetKey === 'morning') {
      this.dirLight.position.set(-110, 55, -60);
      this.dirLight.target.position.set(0, 0, 0);
      this.dirLight.color.setHex(0xffe5c2);
      this.dirLight.intensity = 1.8;
      this._lightOffset.set(-110, 55, -60).normalize().multiplyScalar(150);

      this.hemiLight.color.setHex(0xa9cce8);
      this.hemiLight.groundColor.setHex(0x43623a);
      this.hemiLight.intensity = 1.0;

      this.ambientLight.color.setHex(0xccdbee);
      this.ambientLight.intensity = 0.6;

      return {
        fogColor: 0xa5c1d6,
        fogNear: 45,
        fogFar: 240,
        skyTop: 0x3d668c,
        skyBottom: 0xcbe2f2
      };
    } else if (presetKey === 'genshin_golden') {
      // Island 1 Genshin art pass: warm golden hour with cool blue shadows
      return applyGenshinGoldenHour(this);
    } else if (presetKey === 'savanna' || presetKey === 'desert_sun') {
      this.dirLight.position.set(130, 95, -70);
      this.dirLight.target.position.set(0, 0, 0);
      this.dirLight.color.setHex(0xffdf99);
      this.dirLight.intensity = 2.7;
      this._lightOffset.set(130, 95, -70).normalize().multiplyScalar(150);

      this.hemiLight.color.setHex(0xffe6a8); // Warm golden sky
      this.hemiLight.groundColor.setHex(0x995a2b); // Terracotta ground bounce
      this.hemiLight.intensity = 1.35;

      this.ambientLight.color.setHex(0xfce2b8);
      this.ambientLight.intensity = 0.55;

      return {
        fogColor: 0xe8be88,
        fogNear: 150,
        fogFar: 1400,
        skyTop: 0x367ea8,
        skyBottom: 0xffce8a
      };
    }
  }

  setShadows(enabled) {
    this.dirLight.castShadow = enabled;
  }

  /**
   * Celda del mapa de sombras en metros y bias/normalBias a partir de ella. Se llama al crear la luz,
   * y _commitTarget lo repite solo si cambia el tamaño del mapa (calidad) o de la caja.
   */
  refreshShadowBias() {
    const sh = this.dirLight && this.dirLight.shadow;
    if (!sh) return;
    const cam = sh.camera;
    const D = LightingManager.debug;
    const texel = (cam.right - cam.left) / Math.max(1, sh.mapSize.x);
    // legacy (lkDebug): los valores de antes del Hito 83, para comparar
    sh.bias = D.bias != null ? D.bias : (D.legacy ? 0.00002 : SHADOW_DEFAULTS.bias);
    sh.normalBias = D.normalBias != null
      ? D.normalBias
      : (D.legacy && D.normalBiasTexels == null)
        ? 0.025
        : texel * (D.normalBiasTexels != null ? D.normalBiasTexels : SHADOW_DEFAULTS.normalBiasTexels);
    this._biasKey = `${sh.mapSize.x}|${cam.right - cam.left}`;
    this._texel = texel;
  }

  updateLightTarget(targetPosition) {
    if (!this.dirLight || !targetPosition) return;
    const D = LightingManager.debug;
    if (D.freeze && this._placed) return;
    this._pendingTarget.copy(targetPosition);
    this._hasPending = true;
    // Se aplica en el fotograma en que se recalcula el mapa de sombras (commitShadowTargets).
    // Al momento si: no hay nadie que lo haga (sin EnvironmentSystem en 0,25 s), aún no se ha
    // colocado nunca, o se pide el comportamiento anterior. Un salto grande (cambio de isla,
    // teletransporte) pide recalcular las sombras ya.
    if (!this._placed) {
      _refreshRequested = true;
      this._commitTarget();
      return;
    }
    if (D.legacy || performance.now() - _lastCommit > 250) {
      this._commitTarget();
      return;
    }
    const t = this.dirLight.target.position;
    const dx = targetPosition.x - t.x, dz = targetPosition.z - t.z;
    if (dx * dx + dz * dz > 400) _refreshRequested = true; // > 20 m
  }

  _commitTarget() {
    if (!this._hasPending || !this.dirLight) return;
    this._hasPending = false;
    const sh = this.dirLight.shadow;
    if (sh && this._biasKey !== `${sh.mapSize.x}|${sh.camera.right - sh.camera.left}`) this.refreshShadowBias();
    // La caja de sombra se mueve en pasos de un texel del mapa (en el plano de la luz) y en pasos fijos
    // en la dirección del sol: así los bordes no "tiemblan" y la profundidad no cambia al caminar.
    const snapped = this._snapShadows ? this._snapToShadowTexels(this._pendingTarget) : this._pendingTarget;
    this.dirLight.position.copy(snapped).add(this._lightOffset);
    this.dirLight.target.position.copy(snapped);
    this.dirLight.target.updateMatrixWorld();
    this._placed = true;
  }

  _snapToShadowTexels(p) {
    const sh = this.dirLight.shadow;
    const cam = sh.camera;
    const texel = (cam.right - cam.left) / Math.max(1, sh.mapSize.width);
    if (!(texel > 0)) return p;
    if (!this._snapTmp) {
      this._snapTmp = { fwd: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(), out: new THREE.Vector3() };
    }
    const t = this._snapTmp;
    // Ejes del plano de la luz (iguales a los de la cámara de sombra, que mira a lo largo de -offset)
    t.fwd.copy(this._lightOffset).normalize().negate();
    t.right.crossVectors(t.fwd, Math.abs(t.fwd.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : THREE.Object3D.DEFAULT_UP).normalize();
    t.up.crossVectors(t.right, t.fwd).normalize();
    const r = p.dot(t.right), u = p.dot(t.up);
    const dr = Math.round(r / texel) * texel - r;
    const du = Math.round(u / texel) * texel - u;
    t.out.copy(p).addScaledVector(t.right, dr).addScaledVector(t.up, du);
    // Profundidad (Hito 83): mover el centro a lo largo del rayo del sol no cambia lo que cubre la
    // caja (solo la distancia al sol, con margen de sobra en near/far), así que se redondea a pasos.
    const D = LightingManager.debug;
    const step = D.depthStep != null ? D.depthStep : SHADOW_DEFAULTS.depthStep;
    if (step > 0 && !D.legacy) {
      const f = p.dot(t.fwd);
      t.out.addScaledVector(t.fwd, Math.round(f / step) * step - f);
    }
    return t.out;
  }

  setVisible(visible) {
    this.group.visible = visible;
    if (this.dirLight) this.dirLight.visible = visible;
    if (this.hemiLight) this.hemiLight.visible = visible;
    if (this.ambientLight) this.ambientLight.visible = visible;
  }
}
