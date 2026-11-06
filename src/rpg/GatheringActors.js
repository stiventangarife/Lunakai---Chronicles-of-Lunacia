// GatheringActors.js — Quién recolecta y cómo se ve: el Axie (pesca y tala) o el Sapidae (minería y plantas).
//
// AxieSession (pesca / tala):
//   1. El Axie deja de seguir al Sapidae (player.companionHold), la cámara pasa a él y el Sapidae se aparta.
//   2. Corre a la orilla o al árbol, se equipa la caña («Whip») o el hacha («Axe») del Mixer y trabaja ~3 s:
//      pesca = Whip.Skill estirada a la duración (lanza, espera con el corcho, picada y recoge);
//      tala  = Axe.Attack en bucle, cada golpe sacude el árbol y suelta hojas y astillas.
//   3. Guarda el arma, vuelve con el botín sobre la cabeza (Action.WalkCarryItem) y se lo da al Sapidae.
// SapidaeSession (minería / plantas): sin cambio de cámara. El Sapidae va al punto y se anima por huesos:
//   minería = pico de primitivas en la mano derecha y golpes con chispas; plantas = se agacha y arranca la flor.
// Mientras dura, el Sapidae no se mueve con el teclado (en la pesca y la tala se aparta solo para dejar ver al Axie).
// Esc antes de recoger el botín cancela. Si el botín ya se recogió, el Axie lo trae igual.

import * as THREE from 'three';
import { GATHER_KINDS, GATHER_RULES } from '../tactics/data/GatheringCatalog.js';
import { equipAxieWeapon, weaponObjects } from './WeaponVisuals.js';
import { warmupObjects } from '../render/RenderWarmup.js';
import { perfMark } from '../debug/PerfProbe.js';
import { formatWait } from './GatheringService.js';
import * as i18n from '../i18n/i18n.js';

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qw = new THREE.Quaternion();
const ease = (t) => t * t * (3 - 2 * t);
const rnd = (a, b) => a + Math.random() * (b - a);

/**
 * Reto de pesca (Hito 87). Tiempos en segundos reales; posiciones de la barra en 0–1.
 *   wait   espera hasta que pica (con 0–2 mordisquitos de engaño: pulsar antes de la picada asusta al pez)
 *   bite   ventana para clavar el anzuelo
 *   reel   un marcador va y viene por la barra: pulsar dentro de la zona (en el centro = «¡Perfecto!»)
 */
export const FISH_CHALLENGE = {
  waitMin: 1.8, waitMax: 4.2,     // hasta que pica
  nibblesMax: 2,                  // mordisquitos de engaño
  biteWindow: 1.2,                // para clavar el anzuelo
  period: 1.6,                    // ida y vuelta del marcador
  zoneHalf: 0.14,                 // media anchura de la zona buena
  perfectHalf: 0.04,              // media anchura del centro «perfecto»
  tries: 2,                       // fallos permitidos en la barra
  speedUp: 0.85,                  // tras un fallo, el marcador va más rápido (periodo × 0,85)
  reelTimeout: 7,                 // sin pulsar en la barra: el pez se va
  perfectBonus: { extra: 1, rareMul: 2 },
};
const lerpAngle = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

/** Objeto que lleva el Axie de vuelta: pez, tronco, etc. (primitivas pequeñas). */
function buildCarryItem(kind) {
  const g = new THREE.Group();
  const m = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, flatShading: true, ...o });
  if (kind === 'fish') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), m(0x8FB8D8, { metalness: 0.3 }));
    body.scale.set(1.6, 0.8, 0.55); g.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.24, 4), m(0x6E98BC));
    tail.rotation.z = Math.PI / 2; tail.position.x = -0.42; g.add(tail);
  } else {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.8, 8), m(0x7A5230));
    log.rotation.z = Math.PI / 2; g.add(log);
    [-0.4, 0.4].forEach((x) => { const e = new THREE.Mesh(new THREE.CircleGeometry(0.15, 8), m(0xC8A26E)); e.position.x = x + Math.sign(x) * 0.005; e.rotation.y = Math.sign(x) * Math.PI / 2; g.add(e); });
  }
  g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return g;
}

/** Pico de primitivas para el Sapidae (mango + cabeza de dos puntas). Va en el hueso de la mano derecha. */
export function buildPickaxe() {
  const g = new THREE.Group();
  g.name = 'GatherPickaxe';
  const wood = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.8, flatShading: true });
  const iron = new THREE.MeshStandardMaterial({ color: 0x6E7682, roughness: 0.4, metalness: 0.6, flatShading: true });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.78, 6), wood);
  handle.position.y = 0.24; g.add(handle);
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.14, 6), new THREE.MeshStandardMaterial({ color: 0x3E2A1A, roughness: 0.9 }));
  wrap.position.y = 0.0; g.add(wrap);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.34), iron);
  head.position.y = 0.6; g.add(head);
  [1, -1].forEach((s) => {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.24, 5), iron);
    tip.rotation.x = s * Math.PI / 2; tip.position.set(0, 0.6 - 0.03, s * 0.28); tip.rotation.z = s * 0.15; g.add(tip);
  });
  g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return g;
}

/**
 * Poses por huesos encima de la animación: rotaciones en el espacio del personaje (eje x = su izquierda,
 * y = arriba, z = delante), así sirve para cualquier esqueleto con los brazos y piernas en su sitio.
 * Si el mezclador no toca un hueso en un fotograma, se parte de su pose anterior y no se acumula.
 */
class BonePoser {
  constructor(root) {
    this.root = root;
    this.bones = {};
    this.state = new Map();
    // por orden de preferencia: el primer patrón que encuentre un hueso gana
    const find = (res) => {
      for (const re of res) { let hit = null; root.traverse((o) => { if (!hit && o.isBone && re.test(o.name)) hit = o; }); if (hit) return hit; }
      return null;
    };
    this.bones = {
      spine: find([/^Spine1_M$/, /^spine$/i, /spine/i]),
      shoulderR: find([/^Shoulder_R$/, /^upper_?arm[._]?R$/i]),
      shoulderL: find([/^Shoulder_L$/, /^upper_?arm[._]?L$/i]),
      elbowR: find([/^Elbow_R$/, /^lower_?arm[._]?R$/i]),
      hipL: find([/^Hip_L$/, /^upper_?leg[._]?L$/i]),
      hipR: find([/^Hip_R$/, /^upper_?leg[._]?R$/i]),
      kneeL: find([/^Knee_L$/, /^lower_?leg[._]?L$/i]),
      kneeR: find([/^Knee_R$/, /^lower_?leg[._]?R$/i]),
      ankleL: find([/^Ankle_L$/]),
      ankleR: find([/^Ankle_R$/]),
      handR: find([/^Weapon_R$/, /^Wrist_R$/, /^hand[._]?R$/i, /^lower_?arm[._]?R$/i]),
    };
  }

  /** pose = { boneKey: angle } (rotación alrededor del eje izquierdo del personaje: + inclina hacia delante el tronco). */
  apply(pose, meshWorldQuat) {
    const axis = _v.set(1, 0, 0).applyQuaternion(meshWorldQuat).normalize();
    for (const [key, ang] of Object.entries(pose)) {
      const b = this.bones[key];
      if (!b || !ang) continue;
      let st = this.state.get(b);
      if (!st) { st = { base: b.quaternion.clone(), last: new THREE.Quaternion() }; this.state.set(b, st); }
      if (!b.quaternion.equals(st.last)) st.base.copy(b.quaternion);
      b.quaternion.copy(st.base);
      b.getWorldQuaternion(_qw);
      _q.setFromAxisAngle(axis, ang);
      const local = _qw.clone().invert().multiply(_q).multiply(_qw);
      b.quaternion.multiply(local);
      st.last.copy(b.quaternion);
    }
  }

  /** Deja los huesos como los dejó la animación (para los que el mezclador no vuelve a tocar). */
  reset() {
    this.state.forEach((st, b) => { if (b.quaternion.equals(st.last)) b.quaternion.copy(st.base); });
    this.state.clear();
  }
}

/** Base común: duración del trabajo, progreso y fin. */
class Session {
  constructor(ctx, item) {
    this.ctx = ctx;               // { ow, player, service, nodes, hud, onEnd }
    this.item = item;             // GatheringNodes item { def, group, … }
    this.def = item.def;
    this.kind = GATHER_KINDS[this.def.kind];
    this.phase = 'start';
    this.t = 0;
    this.workT = 0;
    this.work = GATHER_RULES.durationSec;
    this.loot = null;
    this.done = false;
  }
  get progress() { return this.phase === 'work' ? Math.min(1, this.workT / this.work) : (this.loot ? 1 : 0); }
  get cancellable() { return !this.loot; }
  /** Recoge el botín (una vez). Devuelve false si el punto ya no estaba disponible. */
  _collect() {
    if (this.loot) return true;
    const r = this.ctx.service.gather(this.def.id, Math.random, this.bonus || null);
    if (!r.ok) { this.ctx.hud.toast(!r.why ? i18n.t('notices.gather.failed') : r.node ? i18n.t('notices.gather.backInShort', { t: formatWait(this.ctx.service.remainingMs(this.def.id)) }) : i18n.t('notices.gather.noNode'), true); return false; }
    this.loot = r.loot;
    return true;
  }
  _finish(cancelled = false) {
    if (this.done) return;
    this.done = true;
    this._cleanup?.(cancelled);
    this.ctx.onEnd?.(this, cancelled);
  }
}

/** Pesca y tala: lo hace el Axie compañero con un arma del Mixer. */
export class AxieSession extends Session {
  constructor(ctx, item) {
    super(ctx, item);
    const p = ctx.player;
    this.ax = p.companionAxie;
    this.cg = p.companionGroup;
    this.weapon = this.kind.weapon;
    // dónde se pone y hacia dónde mira
    const d = this.def;
    if (d.kind === 'fish') {
      this.stand = new THREE.Vector3(d.x, 0, d.z);
      this.look = new THREE.Vector3(d.water.x, 0, d.water.z);
    } else {
      // al lado del árbol que da hacia el Sapidae
      const dir = new THREE.Vector3(p.position.x - d.x, 0, p.position.z - d.z);
      if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
      dir.normalize();
      this.stand = new THREE.Vector3(d.x, 0, d.z).addScaledVector(dir, 1.45);
      this.look = new THREE.Vector3(d.x, 0, d.z);
    }
    this.yaw = Math.atan2(this.look.x - this.stand.x, this.look.z - this.stand.z);
    this.cues = [];
    this.bobber = null;
    this.carry = null;
  }

  /** Mientras dura, el Sapidae no se mueve con el teclado: se aparta solo y mira al Axie. */
  get ownsPlayer() { return !this.done; }

  drive(dt) {
    const p = this.ctx.player;
    if (!this.aside || this._asideDone || this.phase === 'return' || this.phase === 'give') {
      p.setAnimation?.('idle');
      if (this.phase !== 'return' && this.phase !== 'give') p.targetYaw = Math.atan2(this.cg.position.x - p.position.x, this.cg.position.z - p.position.z);
      return;
    }
    const dx = this.aside.x - p.position.x, dz = this.aside.z - p.position.z;
    const dist = Math.hypot(dx, dz);
    this._asideT = (this._asideT || 0) + dt;
    if (dist < 0.15 || this._asideT > 3) { this._asideDone = true; p.setAnimation?.('idle'); return; }
    const step = Math.min(dist, 4.5 * dt);
    const col = this.ctx.ow.collisions;
    const delta = new THREE.Vector3((dx / dist) * step, 0, (dz / dist) * step);
    const np = col?.resolveMovement ? col.resolveMovement(p.position, delta, p.radius) : p.position.clone().add(delta);
    p.position.x = np.x; p.position.z = np.z;
    const y = this.ctx.ow.getGroundHeight?.(np.x, np.z);
    if (Number.isFinite(y)) p.position.y += (y - p.position.y) * Math.min(1, 18 * dt);
    p.targetYaw = Math.atan2(dx, dz);
    p.setAnimation?.('run');
  }

  static canRun(player) { return Boolean(player?.companionAxie?.equipWeapon && player.companionGroup && player.companionMesh); }

  start() {
    const { player: p, ow } = this.ctx;
    p.companionHold = true;
    p.companionVel?.set?.(0, 0, 0);
    this.ax.setLocomotion?.('Run', 0.15);
    this._play('Default.Run', { loop: true, transition: 0.15 });
    // Cámara: al Axie, de tres cuartos por detrás y algo más cerca
    const cc = ow.cameraController;
    this.cam = { target: cc.followTarget, distance: cc.distance, pitch: cc.pitchAngle, angle: cc.targetAngle };
    cc.setFollowTarget(this.cg);
    cc.distance = 7.5; cc.zoomTarget = null; cc.pitchAngle = 0.42;
    cc.targetAngle = this.yaw + Math.PI - 0.75;
    // El Sapidae se aparta: a un lado del Axie, en el lado contrario a la cámara y un poco por detrás,
    // para no tapar la vista ni quedar encima del Axie.
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const perp = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const camDir = new THREE.Vector3(Math.sin(cc.targetAngle), 0, Math.cos(cc.targetAngle));
    const pref = perp.dot(camDir) > 0 ? -1 : 1;
    const asideAt = (sd) => this.stand.clone().addScaledVector(perp, sd * 2.8).addScaledVector(fwd, this.def.kind === 'fish' ? -1.2 : -0.4);
    // Hito 79: en un puente o en el muelle, el lado elegido tiene que ser tablero (misma altura y sin barandilla ni tope)
    const gh = (v) => ow.getGroundHeight?.(v.x, v.z);
    const ok = (v) => { const y0 = gh(this.stand), y1 = gh(v); return !(Number.isFinite(y0) && Number.isFinite(y1) && Math.abs(y1 - y0) > 0.5) && !ow.collisions?.isPointBlocked?.(v.x, v.z, 0.4); };
    const a1 = asideAt(pref), a2 = asideAt(-pref);
    this.aside = ok(a1) || !ok(a2) ? a1 : a2;
    if (this.aside === a2) cc.targetAngle = this.yaw + Math.PI + 0.75;               // el Sapidae no queda entre la cámara y el Axie
    this.phase = 'approach';
    // el arma se va cargando mientras corre
    this.equipReady = false;
    Promise.resolve(equipAxieWeapon(this.ax, this.ctx.player.companionMesh, this.weapon))
      .then(async (ok) => { await this._warmWeapon(); this.equipReady = true; this.equipOk = ok !== false; })
      .catch(() => { this.equipReady = true; this.equipOk = false; });
  }

  _play(name, opts = {}) { try { return this.ax.playAnimation(name, opts); } catch { return false; } }

  /**
   * Hito 113 — Precompila el arma del mixer (hacha, caña) que el Axie acaba de equipar, mientras corre hacia el árbol o la
   * orilla. Antes se dibujaba por primera vez al llegar y su shader (`M_Rock` en el hacha) bloqueaba el fotograma de 0,1 a
   * 2,5 s. El arma se oculta durante el precompilado (una vez resuelta la promesa de equiparla y antes del siguiente
   * fotograma). `window.lkNoToolWarm = true` lo desactiva para comparar.
   */
  async _warmWeapon() {
    const ow = this.ctx.ow, root = this.ctx.player && this.ctx.player.companionMesh;
    if (!ow || !ow.renderer || !ow.scene || !ow.camera || !root || (typeof window !== 'undefined' && window.lkNoToolWarm)) return;
    const objs = weaponObjects(root);
    if (!objs.length) return;
    const env = ow.environmentSystem;
    const composer = env && env.isPostProcessingActive !== false && env.composer;
    const target = composer ? (composer.readBuffer || null) : null;
    const t0 = performance.now();
    perfMark('tala/pesca: precompilando herramienta');
    const was = objs.map((o) => o.visible);
    objs.forEach((o) => { o.visible = false; });
    try {
      const r = await warmupObjects(ow.renderer, ow.scene, ow.camera, objs, { target, deadline: t0 + 2500 });
      perfMark(`tala/pesca: herramienta lista (${r.programs} programas nuevos, ${r.textures} texturas, ${Math.round(performance.now() - t0)} ms)`);
    } catch (e) {
      console.warn('[GatheringActors] Precalentado de la herramienta omitido:', e);
    } finally {
      objs.forEach((o, i) => { o.visible = was[i]; });
    }
  }

  /** Mueve el Axie hacia un punto; true al llegar. */
  _walkTo(target, speed, dt, arrive = 0.25) {
    const cg = this.cg, p = this.ctx.player;
    const dx = target.x - cg.position.x, dz = target.z - cg.position.z;
    const dist = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    p.companionYaw = lerpAngle(p.companionYaw || 0, yaw, Math.min(1, 10 * (this._dt || 0.016)));
    if (dist <= arrive) return true;
    const step = Math.min(dist, speed * dt);
    cg.position.x += (dx / dist) * step;
    cg.position.z += (dz / dist) * step;
    return false;
  }

  _ground() {
    const cg = this.cg;
    const y = this.ctx.ow.getGroundHeight?.(cg.position.x, cg.position.z);
    if (Number.isFinite(y)) cg.position.y += (y - cg.position.y) * Math.min(1, 16 * (this._dt || 0.016));
  }

  _pose() {
    const p = this.ctx.player, m = p.companionMesh;
    if (!m) return;
    const base = (p.companionBaseScale || 0.95 * (p.scale || 1)) * (p.companionSpawnScale ?? 1);
    m.position.y = 0; m.scale.setScalar(base);
    m.rotation.set(0, p.companionYaw || 0, 0, 'YXZ');
  }

  update(dt) {
    this._dt = dt;
    this.t += dt;
    const p = this.ctx.player;
    if (p.companionAxie !== this.ax || !p.companionGroup) { this._finish(true); return; } // cambió de compañero
    if (this.phase === 'approach') {
      if (this._walkTo(this.stand, 6.2, dt)) {
        this.phase = 'ready';
        this._play('Default.Idle', { loop: true, transition: 0.2 });
      }
    } else if (this.phase === 'ready') {
      p.companionYaw = lerpAngle(p.companionYaw || 0, this.yaw, Math.min(1, 10 * dt));
      if (this.equipReady && Math.abs(lerpAngle(p.companionYaw, this.yaw, 1) - p.companionYaw) < 0.05) {
        if (!this.equipOk) { this.ctx.hud.toast(i18n.t('notices.gather.cantUseTool'), true); this._finish(true); return; }
        this.phase = 'work'; this.workT = 0; this._step = -1;
        this.ctx.hud.begin(this);
      } else if (this.t > 8) { this._finish(true); return; } // el arma no carga
    } else if (this.phase === 'work') {
      p.companionYaw = lerpAngle(p.companionYaw || 0, this.yaw, Math.min(1, 10 * dt));
      this.workT += dt;
      if (this.def.kind === 'fish') this._fish(); else this._chop(dt);
      if (this.def.kind !== 'fish' && this.workT >= this.work) this._reward();   // la pesca termina con el reto
    } else if (this.phase === 'return') {
      // vuelve junto al Sapidae (a su derecha) con el botín encima de la cabeza
      const fwd = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
      const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
      const target = p.position.clone().addScaledVector(right, 1.6).addScaledVector(fwd, 0.6);
      const far = Math.hypot(target.x - this.cg.position.x, target.z - this.cg.position.z) > 5;
      if (far !== this._far) { this._far = far; this._play(far ? 'Action.RunCarryItem' : 'Action.WalkCarryItem', { loop: true, transition: 0.2 }); }
      if (this._walkTo(target, far ? 6.5 : 3.0, dt, 0.4) || this.t - this._returnT > 7) {
        this.phase = 'give'; this._giveT = 0;
        this._play('Action.IdleCarryItem', { loop: true, transition: 0.2 });
        this.ctx.hud.reward(this.loot, this.def);
      }
    } else if (this.phase === 'give') {
      this._giveT += dt;
      const tp = p.position.clone().add(new THREE.Vector3(0, 1.4, 0));
      if (this.carry && this._giveT > 0.35) {
        this.carry.position.lerp(tp, Math.min(1, 9 * dt));
        this.carry.scale.multiplyScalar(Math.max(0, 1 - 5 * dt));
      }
      if (this._giveT > 0.9) { this._finish(false); return; }
    }
    if (this.carry && this.phase === 'return') this.carry.position.copy(this.cg.position).add(new THREE.Vector3(0, 1.55 * (p.companionBaseScale || 0.95), 0));
    this._ground();
    this._pose();
  }

  /**
   * Pesca con reto (Hito 87). Whip.Skill (4,3 s) a velocidad normal hasta que el sedal está en el agua (0,4 s del
   * clip: el corcho cae) y se «congela» casi del todo (timeScale 0,06) mientras se espera, pica y se recoge con la
   * barra. Al terminar el reto el clip sigue (más rápido) y recoge el sedal: con el pez si salió bien o vacío si se
   * escapó. Cambiar el timeScale de la acción en curso no la reinicia (playAnimation con restart: false).
   */
  _fish() {
    const it = this.item, dt = this._dt || 0.016, C = FISH_CHALLENGE;
    let F = this.fish;
    if (!F) {
      const clip = this.ax.getFullAnimationClip?.(`${this.weapon}.Skill`) || this.ax.getLiteAnimationClip?.(`${this.weapon}.Skill`);
      const waitT = rnd(C.waitMin, C.waitMax);
      const nib = [];
      const nn = Math.floor(Math.random() * (C.nibblesMax + 1));
      for (let i = 0; i < nn; i++) nib.push(rnd(0.6, Math.max(0.7, waitT - 0.5)));
      nib.sort((a, b) => a - b);
      F = this.fish = { state: 'cast', clipT: 0, clipDur: clip?.duration || 4.29, ts: 1, t: 0, waitT, nib, dip: 0, period: C.period, tries: C.tries, c: 0.5, m: 0, reelTick: 0 };
      this._play(`${this.weapon}.Skill`, { restart: true, transition: 0.15, loop: false, timeScale: 1 });
      this._tip = null;
      this.cg.traverse((o) => { if (!this._tip && /Whip_13/i.test(o.name)) this._tip = o; });
      this.ctx.hud.sfx?.('cast');
    }
    F.clipT += dt * F.ts;
    F.t += dt;
    const y0 = it.waterY ? it.waterY() : 0.5;
    const tipPos = this._tip ? this._tip.getWorldPosition(this._tipV || (this._tipV = new THREE.Vector3())) : new THREE.Vector3(it.def.water.x, y0, it.def.water.z);
    // Hito 79: el corcho cae donde están las ondas (no justo bajo la punta: desde un puente quedaría pegado a él)
    const wx = it.def.water.x, wz = it.def.water.z;
    const hud = this.ctx.hud;
    switch (F.state) {
      case 'cast':
        if (!F.bobbed && F.clipT >= 0.4) { F.bobbed = true; this._bobber(true); it.splash?.(false, tipPos); hud.sfx?.('bobber'); }
        if (F.clipT >= 1.0) { this._fishSpeed(0.06); F.state = 'wait'; F.t = 0; hud.fish?.('wait'); }
        break;
      case 'wait':
        if (F.nib.length && F.t >= F.nib[0]) { F.nib.shift(); F.dip = 1; hud.sfx?.('nibble'); }
        if (F.t >= F.waitT) {
          F.state = 'bite'; F.t = 0;
          it.splash?.(true, this.bobber ? this.bobber.position : tipPos);
          hud.sfx?.('bite'); hud.fish?.('bite');
        }
        break;
      case 'bite':
        if (F.t > C.biteWindow) this._fishLost('late');
        break;
      case 'reel': {
        const ph = (F.t / F.period) % 1;
        F.m = ph < 0.5 ? ph * 2 : 2 - ph * 2;                     // va y viene
        hud.fish?.('reel', F);
        if ((F.reelTick -= dt) <= 0) { F.reelTick = 0.55; hud.sfx?.('reel', { dur: 0.3 }); }
        if (F.t > C.reelTimeout) this._fishLost('late');
        break;
      }
      case 'land':
      case 'lost':
        if (F.clipT >= F.clipDur - 0.05 || F.t > 4) {
          if (F.state === 'land') this._reward(); else this._finish(true);
          return;
        }
        break;
      default:
    }
    if (this.bobber) {
      const out = F.state === 'land' || F.state === 'lost';
      if (out) this.bobber.position.lerp(tipPos, Math.min(1, 14 * dt));   // se recoge hacia la punta
      else if (F.state !== 'cast' || F.bobbed) {
        F.dip = Math.max(0, F.dip - dt * 4);
        const sink = F.state === 'bite' ? -0.18 * Math.abs(Math.sin(this.t * 22))
          : F.state === 'reel' ? -0.09 * Math.abs(Math.sin(this.t * 14))
            : -0.07 * Math.sin(F.dip * Math.PI);
        const drift = Math.sin(this.t * 0.9) * 0.12;                                          // la corriente lo mece
        this.bobber.position.set(wx + drift, y0 + 0.06 + Math.sin(this.t * 4) * 0.03 + sink, wz + drift * 0.6);
      }
      this._line(tipPos, out ? 3 : (F.state === 'bite' || F.state === 'reel') ? 2 : 1);
    }
  }

  /** Cambia la velocidad del clip de pesca sin reiniciarlo. */
  _fishSpeed(ts) {
    if (!this.fish) return;
    this.fish.ts = ts;
    this._play(`${this.weapon}.Skill`, { restart: false, loop: false, timeScale: ts });
  }

  /** E, Espacio o un toque en el panel del reto. Devuelve true si la pulsación era para la pesca. */
  onAction() {
    const F = this.fish;
    if (!F || this.done) return false;
    const C = FISH_CHALLENGE, hud = this.ctx.hud;
    if (F.state === 'wait' || F.state === 'cast') { this._fishLost('early'); return true; }
    if (F.state === 'bite') {
      F.state = 'reel'; F.t = 0; F.c = rnd(0.28, 0.72); F.reelTick = 0;
      hud.sfx?.('reel', { dur: 0.4 }); hud.fish?.('reel', F);
      return true;
    }
    if (F.state === 'reel') {
      const d = Math.abs(F.m - F.c);
      if (d <= C.perfectHalf) this._fishCaught(true);
      else if (d <= C.zoneHalf) this._fishCaught(false);
      else {
        F.tries--;
        hud.sfx?.('miss');
        if (F.tries <= 0) this._fishLost('miss');
        else { F.period *= C.speedUp; F.c = rnd(0.28, 0.72); hud.fish?.('miss', F); }
      }
      return true;
    }
    return false;
  }

  _fishCaught(perfect) {
    const F = this.fish;
    this.bonus = perfect ? FISH_CHALLENGE.perfectBonus : null;
    F.state = 'land'; F.t = 0;
    this._fishSpeed(1.3);
    this.ctx.hud.sfx?.('reel', { dur: 0.9 });
    if (perfect) this.ctx.hud.sfx?.('perfect');
    this.ctx.hud.fish?.(perfect ? 'perfect' : 'caught');
  }

  /** El pez se escapa: el punto no se gasta y se puede volver a intentar. why: early · late · miss */
  _fishLost(why) {
    const F = this.fish;
    F.state = 'lost'; F.t = 0;
    this._fishSpeed(1.6);
    this.ctx.hud.sfx?.('escape');
    this.ctx.hud.fish?.('lost', { why });
  }

  /** Hilo de pesca: de la punta del látigo al corcho, con comba (se tensa cuando pica). */
  _line(tipPos, step) {
    const N = 16;
    if (!this.lineObj) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      this.lineObj = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xF4F1E8, transparent: true, opacity: 0.9, depthWrite: false }));
      this.lineObj.name = 'GatherFishingLine';
      this.lineObj.frustumCulled = false;
      this.lineObj.renderOrder = 2;
      (this.ctx.ow.questInteractables?.scene || this.ctx.ow.scene).add(this.lineObj);
    }
    const a = tipPos, b = this.bobber.position;
    const pos = this.lineObj.geometry.attributes.position;
    const span = a.distanceTo(b);
    const sag = step === 2 ? span * 0.02 : step === 3 ? 0 : span * 0.09;                   // tenso al picar, recto al recoger
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      pos.setXYZ(i, a.x + (b.x - a.x) * t, a.y + (b.y + 0.12 - a.y) * t - sag * 4 * t * (1 - t), a.z + (b.z - a.z) * t);
    }
    pos.needsUpdate = true;
    this.lineObj.visible = span > 0.15;
  }

  _removeLine() {
    if (!this.lineObj) return;
    this.lineObj.parent?.remove(this.lineObj);
    this.lineObj.geometry.dispose(); this.lineObj.material.dispose();
    this.lineObj = null;
  }

  _bobber(on) {
    const scene = this.ctx.ow.questInteractables?.scene || this.ctx.ow.scene;
    if (on && !this.bobber) {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xE84A3C, roughness: 0.5 }));
      const bot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xF6F1E6, roughness: 0.5 }));
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 4), new THREE.MeshStandardMaterial({ color: 0x333333 }));
      stick.position.y = 0.12;
      g.add(top, bot, stick);
      g.name = 'GatherBobber';
      scene.add(g); this.bobber = g;
    } else if (!on && this.bobber) {
      this._removeLine();
      scene.remove(this.bobber);
      this.bobber.traverse((c) => { c.geometry?.dispose?.(); c.material?.dispose?.(); });
      this.bobber = null;
    }
  }

  _chop() {
    const clip = 0.97; // Axe.Attack
    const n = Math.floor(this.workT / clip);
    if (n !== this._step) { this._step = n; this._play(`${this.weapon}.Attack`, { restart: true, transition: n ? 0.05 : 0.15, loop: false }); this._hitDone = false; }
    if (!this._hitDone && (this.workT - n * clip) > clip * 0.48) {
      this._hitDone = true;
      this.item.shake?.(this.cg.position);
      this.ctx.hud.hit?.('chop');
    }
  }

  _reward() {
    if (!this._collect()) { this._finish(true); return; }
    this.ctx.hud.sfx?.(this.def.kind === 'fish' ? 'catch' : 'treeFall');
    this.ctx.hud.fish?.('end');
    this._bobber(false);
    this.phase = 'return'; this._returnT = this.t; this._far = null;
    Promise.resolve(equipAxieWeapon(this.ax, this.ctx.player.companionMesh, null)).catch(() => {});
    if (this.def.kind === 'chop') this.item.shake?.(null);
    this.carry = buildCarryItem(this.def.kind);
    (this.ctx.ow.questInteractables?.scene || this.ctx.ow.scene).add(this.carry);
    this.ctx.hud.end(this, false);
  }

  cancel() {
    if (!this.cancellable) return false;
    this.ctx.hud.toast(i18n.t('notices.gather.cancelled', { label: this.kind.label }), true);
    this._finish(true);
    return true;
  }

  _cleanup() {
    const { player: p, ow } = this.ctx;
    this._bobber(false);
    if (this.carry) { this.carry.parent?.remove(this.carry); this.carry.traverse((c) => { c.geometry?.dispose?.(); c.material?.dispose?.(); }); this.carry = null; }
    p.companionHold = false;
    if (p.companionAxie === this.ax) {
      // Vuelve el arma que tenía equipada (o ninguna) y su animación de reposo (Hito 52)
      const restore = typeof p._applyCompanionWeapon === 'function' ? p._applyCompanionWeapon() : equipAxieWeapon(this.ax, p.companionMesh, null);
      Promise.resolve(restore).then(() => { if (!p.companionHold) { this._play(p.companionClip ? p.companionClip('Idle') : 'Default.Idle', { loop: true, transition: 0.2 }); p.companionAnim = 'idle'; } }).catch(() => {});
      this._play('Default.Idle', { loop: true, transition: 0.2 });
    }
    p.companionAnim = null;      // el seguidor vuelve a elegir animación
    p.companionState = 'idle';
    p.companionVel?.set?.(0, 0, 0);
    const cc = ow.cameraController;
    if (this.cam) {
      cc.setFollowTarget(this.cam.target || p);
      cc.distance = this.cam.distance; cc.zoomTarget = null; cc.pitchAngle = this.cam.pitch; cc.targetAngle = this.cam.angle;
    }
    this.ctx.hud.end(this, true);
  }
}

/** Minería y plantas: lo hace el Sapidae (sin cambiar la cámara). */
export class SapidaeSession extends Session {
  constructor(ctx, item) {
    super(ctx, item);
    const d = this.def, p = ctx.player;
    let out;
    if (d.kind === 'mine' && d.face) out = new THREE.Vector3(d.x - d.face.x, 0, d.z - d.face.z);
    else out = new THREE.Vector3(p.position.x - d.x, 0, p.position.z - d.z);
    if (out.lengthSq() < 0.01) out.set(0, 0, 1);
    out.normalize();
    this.stand = new THREE.Vector3(d.x, 0, d.z).addScaledVector(out, d.kind === 'mine' ? 1.45 : 0.85);
    this.yaw = Math.atan2(d.x - this.stand.x, d.z - this.stand.z);
    this.poser = new BonePoser(p.mesh);
    this.pick = null;
  }

  /** El Sapidae se maneja solo durante la recolección (PlayerController no lo mueve). */
  get ownsPlayer() { return !this.done; }

  start() {
    this.phase = 'approach';
    if (this.def.kind === 'mine' && this.poser.bones.handR) {
      this.pick = buildPickaxe();
      this.pick.visible = false;
      this.poser.bones.handR.add(this.pick);
    }
  }

  /** Lo llama el controlador en lugar de PlayerController.update. */
  drive(dt) {
    const p = this.ctx.player;
    if (this.phase !== 'approach') { p.setAnimation?.('idle'); return; }
    const dx = this.stand.x - p.position.x, dz = this.stand.z - p.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.12) {
      p.setAnimation?.('idle');
      p.targetYaw = this.yaw;
      this._turnT = (this._turnT || 0) + dt;
      if (Math.abs(lerpAngle(p.yaw, this.yaw, 1) - p.yaw) < 0.08 || this._turnT > 0.6) {
        this.phase = 'work'; this.workT = 0;
        if (this.pick) this.pick.visible = true;
        this.ctx.hud.begin(this);
      }
      return;
    }
    if (this.t > 6) { this._finish(true); return; } // no llega (algo en medio)
    const step = Math.min(dist, 4.2 * dt);
    const col = this.ctx.ow.collisions;
    const delta = new THREE.Vector3((dx / dist) * step, 0, (dz / dist) * step);
    const np = col?.resolveMovement ? col.resolveMovement(p.position, delta, p.radius) : p.position.clone().add(delta);
    p.position.x = np.x; p.position.z = np.z;
    const y = this.ctx.ow.getGroundHeight?.(np.x, np.z);
    if (Number.isFinite(y)) p.position.y += (y - p.position.y) * Math.min(1, 18 * dt);
    p.targetYaw = Math.atan2(dx, dz);
    p.setAnimation?.('run');
  }

  update(dt) {
    this.t += dt;
    const p = this.ctx.player;
    if (this.phase === 'work') {
      this.workT += dt;
      p.targetYaw = this.yaw;
      if (this.def.kind === 'mine') this._mine(); else this._herb();
      if (this.workT >= this.work) {
        if (this.def.kind === 'herb') this.item.pluck?.();
        if (!this._collect()) { this._finish(true); return; }
        this.ctx.hud.sfx?.(this.def.kind === 'herb' ? 'pluck' : 'rockBreak');
        this.ctx.hud.end(this, false);
        this.ctx.hud.reward(this.loot, this.def);
        this.phase = 'after'; this._afterT = 0;
      }
    } else if (this.phase === 'after') {
      // se incorpora poco a poco
      this._afterT += dt;
      const k = 1 - Math.min(1, this._afterT / 0.45);
      this._applyPose(this._lastPose, k);
      if (this._afterT > 0.5) { this._finish(false); return; }
    }
  }

  _applyPose(pose, k = 1) {
    if (!pose) return;
    const p = this.ctx.player;
    const scaled = {};
    for (const [key, v] of Object.entries(pose)) if (key !== 'drop') scaled[key] = v * k;
    this.poser.apply(scaled, p.mesh.getWorldQuaternion(_qw.clone()));
    if (pose.drop) p.mesh.position.y = (p.baseMeshY || 0) - pose.drop * k;
  }

  _mine() {
    const cycle = 1.0;
    const n = Math.floor(this.workT / cycle);
    const c = (this.workT % cycle) / cycle;
    let arm, bow;
    if (c < 0.55) { const k = ease(c / 0.55); arm = -0.7 + (-2.7 + 0.7) * k; bow = -0.12 * k; }        // levanta el pico
    else if (c < 0.7) { const k = (c - 0.55) / 0.15; arm = -2.7 + (2.7 - 0.45) * k * k; bow = -0.12 + 0.5 * k; } // golpe
    else { const k = ease((c - 0.7) / 0.3); arm = -0.45 + (-0.7 + 0.45) * k; bow = 0.38 - 0.38 * k; }       // recupera
    if (c >= 0.68 && this._hit !== n) { this._hit = n; this.item.sparks?.(); this.ctx.hud.hit?.('mine'); }
    this._lastPose = { shoulderR: arm, shoulderL: -0.5, spine: bow };
    this._applyPose(this._lastPose);
  }

  _herb() {
    const k = ease(Math.min(1, this.workT / 0.5));
    const tug = this.workT > 0.6 ? Math.sin(this.workT * 7) * 0.12 : 0;
    this._lastPose = {
      hipL: -1.0 * k, hipR: -1.0 * k, kneeL: 1.6 * k, kneeR: 1.6 * k, ankleL: -0.6 * k, ankleR: -0.6 * k,
      spine: (0.45 + tug * 0.5) * k, shoulderR: (-1.0 + tug) * k, shoulderL: -0.5 * k, drop: 0.3 * k,
    };
    this._applyPose(this._lastPose);
    if (this.workT > 0.6 && Math.floor(this.workT * 3) !== this._sp) {
      this._sp = Math.floor(this.workT * 3);
      const pos = this.item.group.position.clone().add(new THREE.Vector3(0, 0.7, 0));
      this.ctx.nodes?.burst?.emit(pos, 2, { speed: 0.5, up: 1.2, life: 0.8, gravity: 0.6, color: 0xD9C8FF });
    }
  }

  cancel() {
    if (!this.cancellable) return false;
    this.ctx.hud.toast(i18n.t('notices.gather.cancelled', { label: this.kind.label }), true);
    this._finish(true);
    return true;
  }

  _cleanup() {
    const p = this.ctx.player;
    if (this.pick) { this.pick.parent?.remove(this.pick); this.pick.traverse((c) => { c.geometry?.dispose?.(); c.material?.dispose?.(); }); this.pick = null; }
    this.poser.reset();
    p.setAnimation?.('idle');
    this.ctx.hud.end(this, true);
  }
}
