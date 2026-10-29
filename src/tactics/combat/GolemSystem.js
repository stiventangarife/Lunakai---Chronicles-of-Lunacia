// GolemSystem.js — Gólems de arcilla espiritual del Sapidae (Hito 95).
//
// Lore: los artesanos Sapidae moldean la arcilla espiritual para resistir, no para conquistar. Cada clase de Sapidae
// invoca su propio gólem con una función distinta:
//   · Alfarero de Gólems (crafter)      → Centinela de Vasija: provoca a los enemigos que tiene al lado y los aliados
//                                          a su lado reciben −25 % de daño. Al romperse: +30 de escudo a esos aliados.
//   · Comandante de Sombrero (shepard)  → Gólem Sombrero: repetidor. Las órdenes del Comandante (`spell.relay`) llegan a
//                                          cualquier aliado a 2 casillas del gólem. Pulso: +1 PM a los aliados de al lado.
//                                          Al romperse: +1 PA en su próximo turno a los aliados de al lado.
//   · Guardián de Campanas (lunalogist) → Gólem Campanario: pulso de la Wind Bell (radio 2): aliados +20 PV y −1 estado
//                                          negativo; enemigos Frágiles 1 turno. Al romperse: último tañido, cura 40.
//   · Rastreador Gogo (stargazer)       → Gólem Caparazón: su casilla y las de alrededor son «tierra estable» (aliados que
//                                          empiezan el turno allí: +1 PM, Arraigado y sin quemadura ni veneno).
//                                          Al romperse: los caracoles dejan tierra estable en 3×3 durante 2 rondas.
//
// Reglas comunes:
//   · Es una unidad del bando del Sapidae (`isGolem`) con vida, en `game.units`, pero SIN turno propio: no entra en la
//     cola de iniciativa (GDD §4: la iniciativa no cambia en combate) ni cuenta para ganar o perder.
//   · Actúa con un pulso al final de cada turno de su dueño; ahí también caducan sus estados y su escudo.
//   · Un gólem por Sapidae: invocar otro devuelve el anterior a la tierra (sin su efecto final).
//   · Inmune a estados negativos, no se le puede empujar ni atraer. Bloquea el paso a los enemigos (los aliados lo
//     cruzan como a cualquier aliado) y no tapa la línea de visión.
//   · Modelo: `assets/models/golem-<tipo>.glb` (GOLEM_MODEL_URL, por la caché compartida de GLB). Se ajusta a
//     GOLEM_HEIGHT de alto sin salirse de la casilla. Si el archivo falta o falla, se usa el modelo de primitivas.

import * as THREE from 'three';
import { Unit } from '../Unit.js';
import { TILE_SIZE } from '../GridManager.js';
import { cloneGLTF, loadGLTFCached } from '../../render/ModelCache.js';
import * as i18n from '../../i18n/i18n.js';

/** Clase de Sapidae → tipo de gólem. */
export const GOLEM_KIND_BY_CLASS = { crafter: 'sentinel', shepard: 'hat', lunalogist: 'bell', stargazer: 'shell' };

/** Reglas de cada gólem (todas las cifras de equilibrio están aquí). */
export const GOLEM_DEFS = {
  sentinel: { hpPct: 0.7, tauntAdjacent: true, guardPct: 25, breakShield: 30 },
  hat: { hpPct: 0.45, relayRadius: 2, pulseHaste: 1, breakEnergize: 1 },
  bell: { hpPct: 0.45, pulseRadius: 2, pulseHeal: 20, pulseCleanse: 1, pulseFragile: 25, breakHeal: 40, breakRadius: 2 },
  shell: { hpPct: 0.5, groundRadius: 1, groundPM: 1, groundCleanse: ['burn', 'poison'], breakZoneRounds: 2 },
};

/** Modelos GLB (estáticos, de pie sobre el origen y mirando a +Z). Si el archivo no está, se usan las primitivas. */
export const GOLEM_MODEL_URL = (kind) => `./assets/models/golem-${kind}.glb`;

/** Alto del gólem GLB en el tablero (el Sapidae mide ~1,9 m). */
const GOLEM_HEIGHT = 1.5;
/** Radio horizontal máximo del GLB respecto a media casilla (como los extremos de los enemigos, Hito 94). */
const GOLEM_SPILL = 1.1;
/** Escala del modelo de primitivas (la vasija mide ~1,1 m a escala 1). */
const GOLEM_SCALE = 1.25;

// Medidas de cada GLB (se calculan una vez por modelo; los clones comparten geometría)
const _fit = new Map();
function glbFit(url, scene) {
  if (_fit.has(url)) return _fit.get(url);
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  let r = 0;
  const v = new THREE.Vector3();
  scene.traverse((o) => {
    const pos = o.isMesh && o.geometry?.attributes?.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i += 3) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      r = Math.max(r, Math.hypot(v.x, v.z));
    }
  });
  const h = Math.max(0.01, box.max.y - box.min.y);
  const f = { scale: Math.min(GOLEM_HEIGHT / h, r > 0 ? (TILE_SIZE / 2) * GOLEM_SPILL / r : Infinity), minY: box.min.y };
  _fit.set(url, f);
  return f;
}

/** Modelo GLB del gólem: copia de la caché con materiales propios (el destello de daño toca su emissive). */
async function buildGolemFromGLB(kind) {
  const url = GOLEM_MODEL_URL(kind);
  const { scene } = await cloneGLTF(url);
  const fit = glbFit(url, scene);
  const materials = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const one = (m) => {
      const c = m.clone();
      c.userData = { baseEmissive: c.emissive ? c.emissive.clone() : new THREE.Color(0), baseEmissiveIntensity: c.emissiveIntensity ?? 0 };
      materials.push(c);
      return c;
    };
    o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material);
  });
  const body = new THREE.Group();
  body.add(scene);
  scene.scale.setScalar(fit.scale);
  scene.position.y = -fit.minY * fit.scale;
  const root = new THREE.Group();
  root.name = `golem_${kind}`;
  root.add(body);
  const ring = new THREE.Mesh(sharedGeometries().pulse, templateMaterials().pulse.clone());
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  ring.visible = false;
  root.add(ring);
  materials.push(ring.material);
  return { root, ring, swing: body, materials, glb: true };
}

/** Descarga por adelantado el GLB del gólem (el primer «invocar» no espera a la red). */
export function preloadGolemModel(kind) {
  if (GOLEM_DEFS[kind]) loadGLTFCached(GOLEM_MODEL_URL(kind)).catch(() => {});
}

const manhattan = (a, b) => Math.abs(a.gridX - b.gridX) + Math.abs(a.gridZ - b.gridZ);

// ------------------------------------------------------------------ modelo con primitivas

// Geometrías compartidas por todos los gólems (no se liberan con la unidad: userData.lkShared).
let _geo = null;
function sharedGeometries() {
  if (_geo) return _geo;
  const shared = (g) => { g.userData.lkShared = true; return g; };
  // Perfil de vasija: base ancha, panza, cuello y labio
  const potPts = [[0, 0], [0.36, 0], [0.47, 0.12], [0.55, 0.38], [0.53, 0.62], [0.42, 0.84], [0.3, 0.95], [0.33, 1.02], [0.29, 1.06], [0, 1.06]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const bellPts = [[0, 0.32], [0.08, 0.31], [0.12, 0.26], [0.15, 0.12], [0.2, 0.02], [0.22, 0], [0.19, 0], [0.13, 0.1], [0, 0.1]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  _geo = {
    pot: shared(new THREE.LatheGeometry(potPts, 20)),
    band: shared(new THREE.TorusGeometry(0.535, 0.045, 6, 24)),
    eye: shared(new THREE.SphereGeometry(0.055, 8, 6)),
    mouth: shared(new THREE.BoxGeometry(0.16, 0.025, 0.02)),
    arm: shared(new THREE.CapsuleGeometry(0.1, 0.28, 3, 8)),
    fist: shared(new THREE.DodecahedronGeometry(0.13, 0)),
    foot: shared(new THREE.CylinderGeometry(0.15, 0.18, 0.12, 8)),
    vein: shared(new THREE.BoxGeometry(0.03, 0.34, 0.02)),
    // Centinela: escudo de losa y hombreras
    slab: shared(new THREE.BoxGeometry(0.58, 0.72, 0.1)),
    pauldron: shared(new THREE.SphereGeometry(0.17, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
    // Sombrero: ala ancha, copa y cinta
    brim: shared(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 24)),
    crown: shared(new THREE.CylinderGeometry(0.26, 0.33, 0.42, 18)),
    hatBand: shared(new THREE.CylinderGeometry(0.335, 0.335, 0.08, 18, 1, true)),
    // Campanario: yugo de madera y campana de bronce
    post: shared(new THREE.BoxGeometry(0.07, 0.62, 0.07)),
    beam: shared(new THREE.BoxGeometry(0.62, 0.07, 0.09)),
    bell: shared(new THREE.LatheGeometry(bellPts, 16)),
    clapper: shared(new THREE.SphereGeometry(0.04, 6, 5)),
    // Caparazón: concha en espiral y caracoles Gogo
    shell: shared(new THREE.TorusGeometry(0.3, 0.17, 10, 22)),
    shell2: shared(new THREE.TorusGeometry(0.16, 0.1, 8, 18)),
    shellCore: shared(new THREE.SphereGeometry(0.1, 10, 8)),
    snail: shared(new THREE.SphereGeometry(0.07, 8, 6)),
    // Pulso (anillo en el suelo)
    pulse: shared(new THREE.RingGeometry(0.4, 0.55, 32)),
  };
  return _geo;
}

// Materiales plantilla: cada gólem usa clones propios (el destello de daño y la muerte tocan el emissive de sus
// materiales y no deben verse en otro gólem). Mismo tipo y mismas opciones → el programa del shader se reutiliza.
let _mats = null;
function templateMaterials() {
  if (_mats) return _mats;
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.0, ...extra });
  _mats = {
    clay: std(0xb9774c),
    clayDark: std(0x7c4a2e),
    stone: std(0x8d8a83, { roughness: 0.95 }),
    face: std(0x2a1a12, { roughness: 0.6 }),
    vein: std(0x5ad1c8, { emissive: new THREE.Color(0x3fd6c9), emissiveIntensity: 0.9, roughness: 0.5 }),
    wood: std(0x6b4a2b),
    bronze: std(0xc9963b, { metalness: 0.55, roughness: 0.42 }),
    hat: std(0x3c3350),
    hatBand: std(0xe0b04a, { emissive: new THREE.Color(0xb98a2a), emissiveIntensity: 0.35, roughness: 0.6 }),
    shell: std(0xd9b27c),
    shellDark: std(0x9a6b43),
    snail: std(0x9fe6a0, { emissive: new THREE.Color(0x58c46a), emissiveIntensity: 0.55 }),
    pulse: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  };
  return _mats;
}

/** Vasija de arcilla con cara serena («sin furia, solo propósito») y el accesorio de su clase. */
function buildGolemModel(kind) {
  const G = sharedGeometries();
  const T = templateMaterials();
  const own = new Map(); // un clon de cada material por gólem
  const M = (k) => { if (!own.has(k)) own.set(k, T[k].clone()); return own.get(k); };
  const root = new THREE.Group();
  root.name = `golem_${kind}`;
  const add = (geo, mat, x, y, z, parent = root) => {
    const m = new THREE.Mesh(geo, M(mat));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // Pies, cuerpo, bandas de piedra y vetas minerales
  add(G.foot, 'stone', -0.2, 0.06, 0);
  add(G.foot, 'stone', 0.2, 0.06, 0);
  const body = add(G.pot, 'clay', 0, 0.1, 0);
  body.scale.set(1, 1.05, 0.92);
  const band1 = add(G.band, 'stone', 0, 0.42, 0); band1.rotation.x = Math.PI / 2; band1.scale.set(1.02, 0.92, 1);
  const band2 = add(G.band, 'stone', 0, 0.82, 0); band2.rotation.x = Math.PI / 2; band2.scale.set(0.84, 0.78, 1);
  for (const [x, z, r] of [[0.3, 0.38, 0.3], [-0.42, 0.22, -0.5], [0.12, -0.48, 2.9]]) {
    const v = add(G.vein, 'vein', x, 0.62, z);
    v.rotation.set(0.15, r, 0.35);
  }
  // Cara (mira hacia +Z del modelo)
  add(G.eye, 'face', -0.13, 0.9, 0.42);
  add(G.eye, 'face', 0.13, 0.9, 0.42);
  add(G.mouth, 'face', 0, 0.78, 0.44);
  // Brazos con puños de piedra
  for (const s of [-1, 1]) {
    const arm = add(G.arm, 'clayDark', s * 0.6, 0.62, 0.02);
    arm.rotation.z = s * 0.35;
    add(G.fist, 'stone', s * 0.68, 0.34, 0.06);
  }

  const parts = { root };
  if (kind === 'sentinel') {
    const slab = add(G.slab, 'stone', 0.42, 0.55, 0.38);
    slab.rotation.y = -0.35;
    add(G.pauldron, 'stone', -0.5, 0.92, 0);
    add(G.pauldron, 'stone', 0.5, 0.92, 0);
  } else if (kind === 'hat') {
    const hat = new THREE.Group();
    hat.position.set(0, 1.2, 0);
    hat.rotation.z = 0.08;
    root.add(hat);
    add(G.brim, 'hat', 0, 0, 0, hat);
    add(G.crown, 'hat', 0, 0.23, 0, hat);
    add(G.hatBand, 'hatBand', 0, 0.08, 0, hat);
    parts.swing = hat;
  } else if (kind === 'bell') {
    add(G.post, 'wood', -0.27, 1.38, 0);
    add(G.post, 'wood', 0.27, 1.38, 0);
    add(G.beam, 'wood', 0, 1.68, 0);
    const pivot = new THREE.Group();
    pivot.position.set(0, 1.64, 0);
    root.add(pivot);
    const bell = add(G.bell, 'bronze', 0, -0.36, 0, pivot);
    bell.scale.set(1.25, 1.1, 1.25);
    add(G.clapper, 'bronze', 0, -0.38, 0, pivot);
    parts.swing = pivot;
  } else if (kind === 'shell') {
    const shell = new THREE.Group();
    shell.position.set(0, 0.72, -0.4);
    shell.rotation.y = Math.PI / 2;
    root.add(shell);
    add(G.shell, 'shell', 0, 0, 0, shell);
    add(G.shell2, 'shellDark', 0.08, 0.05, 0.1, shell);
    add(G.shellCore, 'shell', 0.1, 0.08, 0.16, shell);
    for (const [x, y, z] of [[0.36, 0.32, 0.2], [-0.4, 0.5, 0.15], [0.05, 1.08, 0.12]]) add(G.snail, 'snail', x, y, z);
    parts.swing = shell;
  }

  // Anillo de pulso en el suelo (invisible hasta que el gólem actúa)
  const ring = new THREE.Mesh(G.pulse, M('pulse'));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  ring.visible = false;
  root.add(ring);
  parts.ring = ring;
  parts.materials = [...own.values()];
  return parts;
}

const PULSE_COLOR = { sentinel: 0xd8a35c, hat: 0xffd166, bell: 0x7ef0c9, shell: 0xa6f08a };

// ------------------------------------------------------------------ unidad gólem

export class GolemUnit extends Unit {
  constructor(config, gridManager, sceneManager, audio) {
    super({ ...config, isGolem: true, maxPA: 0, maxPM: 0, initiative: 0 }, gridManager, sceneManager, audio);
    this.isGolem = true;
    this.golemKind = config.golemKind;
    this.owner = config.owner || null;
    this.maxPA = 0;
    this.maxPM = 0;
    this.currentPA = 0;
    this.currentPM = 0;
    this._rise = 0;
    this._pulseT = 0;
    this.updateHUD();
  }

  async loadModel() {
    const kind = this.golemKind || this.config.golemKind;
    let parts = null;
    try {
      parts = await buildGolemFromGLB(kind);
    } catch (e) {
      console.warn(`[Golem] sin GLB para «${kind}», se usan primitivas`, e?.message || e);
    }
    if (!parts) parts = buildGolemModel(kind);
    this._parts = parts;
    this.mesh = parts.root;
    this.baseScale = parts.glb ? 1 : GOLEM_SCALE;
    this.mesh.scale.set(this.baseScale, 0.01, this.baseScale);
    // Mira hacia el lado enemigo, como el resto de su bando
    this.mesh.rotation.y = this.team === 'player' ? Math.PI / 4 : -3 * Math.PI / 4;
    this.group.add(this.mesh);
    return true;
  }

  dispose() {
    super.dispose();
    for (const m of this._parts?.materials || []) m.dispose();
  }

  /** Destello en el suelo cuando el gólem actúa (pulso, efecto al romperse). */
  flashPulse(radius = 1) {
    const ring = this._parts?.ring;
    if (!ring) return;
    ring.material.color.setHex(PULSE_COLOR[this.golemKind] || 0xffffff);
    ring.userData.r = Math.max(1, radius);
    this._pulseT = 1;
    ring.visible = true;
  }

  update(dt, time) {
    super.update(dt, time);
    if (!this.mesh) return;
    // Sale de la tierra al invocarse
    if (this._rise < 1) {
      this._rise = Math.min(1, this._rise + dt * 2.6);
      const k = 1 - Math.pow(1 - this._rise, 3);
      this.mesh.scale.y *= Math.max(0.01, k);
    }
    // El accesorio se mece un poco (campana, sombrero, concha)
    const sw = this._parts?.swing;
    if (sw && !this.isDead) sw.rotation.x = Math.sin(time * 1.7 + this.gridX) * (this._parts.glb ? 0.025 : this.golemKind === 'bell' ? 0.12 : 0.04);
    // Onda del pulso
    if (this._pulseT > 0) {
      this._pulseT = Math.max(0, this._pulseT - dt * 1.6);
      const ring = this._parts.ring;
      const t = 1 - this._pulseT;
      const s = 0.6 + t * (ring.userData.r || 1) * 2.4;
      ring.scale.set(s, s, s);
      ring.material.opacity = 0.75 * this._pulseT;
      if (this._pulseT <= 0) ring.visible = false;
    }
  }

  /** Ficha sobre la cabeza: nombre, vida y escudo (un gólem no tiene PA ni PM). */
  updateHUD() {
    if (!this.hudCtx) return;
    super.updateHUD();
    if (this.isDead || !this.hudCtx) return;
    const ctx = this.hudCtx;
    ctx.save();
    // Tapa la línea de PA / PM de la ficha base (mismo fondo que el panel, dentro de su borde)
    ctx.clearRect(19, 76, 218, 33);
    ctx.fillStyle = 'rgba(12, 19, 31, 0.85)';
    ctx.fillRect(19, 76, 218, 33);
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e7c48a';
    ctx.fillText(i18n.t('golems.tag'), 128, 98);
    ctx.restore();
    this.hudSprite.material.map.needsUpdate = true;
  }

  startTurn() { /* sin turno propio */ }
  endTurn() { /* sin turno propio */ }
}

// ------------------------------------------------------------------ reglas

export class GolemSystem {
  constructor(spellManager) {
    this.sm = spellManager;
    this.golems = [];
  }

  get grid() { return this.sm.gridManager; }
  get events() { return this.sm.events; }
  get units() { return this.sm.game?.units || this.sm.turnManager?.units || []; }

  reset() {
    this.golems = [];
    // Descarga el modelo del gólem de cada Sapidae del combate
    for (const u of this.units) if (u?.config?.sapidaeClass) preloadGolemModel(this.kindFor(u));
  }

  def(golem) { return GOLEM_DEFS[golem?.golemKind] || null; }
  alive() { return this.golems.filter((g) => !g.isDead); }
  /** Gólem vivo del lanzador (o null). */
  golemOf(owner) { return this.golems.find((g) => g.owner === owner && !g.isDead) || null; }

  /** Tipo de gólem de una unidad (por la clase del Sapidae). */
  kindFor(caster) {
    const cls = caster?.config?.sapidaeClass;
    return GOLEM_KIND_BY_CLASS[cls] || 'sentinel';
  }

  // ---------------------------------------------- invocar, mover, traer

  async summon(owner, cell, kind = null) {
    kind = kind || this.kindFor(owner);
    const tile = this.grid.getTile(cell.x, cell.z);
    if (!tile || tile.unit || tile.obstacle || tile.walkable === false) return null;
    // Un gólem por Sapidae: el anterior vuelve a la tierra sin su efecto final
    const prev = this.golemOf(owner);
    if (prev) this.retire(prev);

    const def = GOLEM_DEFS[kind];
    const maxHP = Math.max(30, Math.round((owner.maxHP || 200) * def.hpPct));
    const golem = new GolemUnit({
      id: `golem_${kind}_${Date.now().toString(36)}`,
      name: i18n.t(`golems.${kind}.name`),
      type: `golem_${kind}`,
      golemKind: kind,
      owner,
      team: owner.team,
      x: cell.x,
      z: cell.z,
      maxHP,
      scale: 1,
    }, this.grid, this.sm.sceneManager, this.sm.audio);
    await golem.loadModel();
    golem.onDeath = () => this._onBreak(golem);
    this.golems.push(golem);
    const list = this.units;
    if (!list.includes(golem)) list.push(golem);
    this.sm.audio?.playImpact?.();
    golem.flashPulse(1);
    this.events.emit('golem:summoned', { golem, owner, kind, pos: this.grid.gridToWorld(cell.x, cell.z) });
    return golem;
  }

  /** Devuelve el gólem a la tierra sin su efecto final (al invocar otro). */
  retire(golem) {
    if (!golem || golem.isDead) return;
    golem.onDeath = null;
    golem.currentHP = 0;
    golem.die();
    this.events.emit('golem:retired', { golem });
  }

  /** Marcha del Caparazón: el gólem salta a la casilla y deja tierra estable por donde pasa. */
  async move(owner, cell, { trailRounds = 0 } = {}) {
    const golem = this.golemOf(owner);
    if (!golem) return false;
    const from = { x: golem.gridX, z: golem.gridZ };
    const ok = await this.sm._teleport(golem, cell, null, { hop: true });
    if (!ok) return false;
    if (trailRounds > 0) {
      const cells = [];
      const push = (x, z) => { if (!cells.some((c) => c.x === x && c.z === z)) cells.push({ x, z }); };
      // Camino en L: primero en X, luego en Z
      let x = from.x, z = from.z;
      push(x, z);
      while (x !== cell.x) { x += Math.sign(cell.x - x); push(x, z); }
      while (z !== cell.z) { z += Math.sign(cell.z - z); push(x, z); }
      this.sm.field.placeZone({ cells, rounds: trailRounds, owner, kind: 'stable_ground', ally: { stable: true }, enemy: {} });
    }
    golem.flashPulse(1);
    return true;
  }

  /** Llevar al Herido: trae al aliado a una casilla libre junto al gólem (o junto al Sapidae si no hay gólem). */
  async fetch(owner, ally) {
    if (!ally || ally.isDead || ally === owner || ally.isGolem) return false;
    const anchor = this.golemOf(owner) || owner;
    if (manhattan(ally, anchor) === 1) return false; // ya está al lado
    const free = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dz]) => ({ x: anchor.gridX + dx, z: anchor.gridZ + dz }))
      .filter((c) => {
        const t = this.grid.getTile(c.x, c.z);
        return t && !t.unit && !t.obstacle && t.walkable !== false;
      })
      .sort((a, b) => (Math.abs(a.x - ally.gridX) + Math.abs(a.z - ally.gridZ)) - (Math.abs(b.x - ally.gridX) + Math.abs(b.z - ally.gridZ)));
    if (!free.length) return false;
    return this.sm._teleport(ally, free[0], null, { hop: true });
  }

  // ---------------------------------------------- reglas pasivas

  /** Centinela: ¿obliga a `attacker` a atacarle? (está a su lado) */
  tauntsAgainst(unit, attacker) {
    if (!unit?.isGolem || unit.isDead || !attacker || unit.team === attacker.team) return false;
    return Boolean(this.def(unit)?.tauntAdjacent) && manhattan(unit, attacker) <= 1;
  }

  /** Centinela: % de daño recibido (negativo) para un aliado a su lado. */
  damageTakenPct(target) {
    if (!target || target.isGolem || target.isDead) return 0;
    let best = 0;
    for (const g of this.golems) {
      if (g.isDead || g.team !== target.team) continue;
      const d = this.def(g);
      if (d?.guardPct && manhattan(g, target) <= 1) best = Math.max(best, d.guardPct);
    }
    return -best;
  }

  /** Sombrero: casillas extra a las que llegan las órdenes con `spell.relay`. */
  relayCells(caster) {
    const g = this.golemOf(caster);
    const r = g && this.def(g)?.relayRadius;
    if (!r) return [];
    const out = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > r) continue;
        const x = g.gridX + dx, z = g.gridZ + dz;
        if (this.grid.isValidCoord(x, z)) out.push({ x, z });
      }
    }
    return out;
  }

  /** Tierra estable (Caparazón y su rastro): +1 PM, Arraigado y sin quemadura ni veneno. Una vez por turno. */
  applyStableGround(unit, source = null) {
    if (!unit || unit.isDead || unit.isGolem) return;
    const stamp = `${this.sm.field?.round || 0}:${this.sm.turnManager?.currentIndex ?? 0}`;
    if (unit._stableStamp === stamp) return;
    unit._stableStamp = stamp;
    const d = GOLEM_DEFS.shell;
    unit.currentPM = Math.max(0, unit.currentPM + d.groundPM);
    this.sm.statuses.clear(unit, 'debuff', Infinity, d.groundCleanse);
    // Duración 2: cubre su turno y los turnos enemigos hasta el siguiente
    this.sm.statuses.apply(unit, 'unmovable', { duration: 2, source });
    unit.updateHUD?.();
    this.events.emit('unit:resourceGained', { unit, source, spell: null, pm: d.groundPM });
    this.events.emit('golem:stableGround', { unit, source });
  }

  // ---------------------------------------------- ciclo de turnos

  /** Al empezar el turno de cualquier unidad: tierra estable del Caparazón. */
  onUnitTurnStart(unit) {
    if (!unit || unit.isGolem) return;
    for (const g of this.golems) {
      const d = this.def(g);
      if (g.isDead || !d?.groundRadius || g.team !== unit.team) continue;
      if (manhattan(g, unit) <= d.groundRadius) { this.applyStableGround(unit, g); break; }
    }
  }

  /** Al terminar el turno del dueño: caducan estados y escudo del gólem, y el gólem hace su pulso. */
  onOwnerTurnEnd(owner) {
    for (const g of this.golems) {
      if (g.isDead || g.owner !== owner) continue;
      this._tick(g);
      if (!g.isDead) this._pulse(g);
    }
  }

  _tick(g) {
    const st = this.sm.statuses;
    // Regeneración (los gólems no tienen turno: se cura aquí)
    const regen = st.get(g, 'regen');
    if (regen && regen.value > 0 && !(regen.delay > 0)) {
      const healed = g.heal(Math.round(regen.value));
      this.events.emit('status:tick', { unit: g, status: 'regen', heal: healed, damage: 0 });
    }
    st.onTurnEnd(g);
    if (g.shieldExpiresRound != null && (this.sm.field?.round || 1) >= g.shieldExpiresRound) {
      g.shield = 0;
      g.shieldExpiresRound = null;
    }
    g.updateHUD();
  }

  _alliesNear(g, r, { includeGolems = false } = {}) {
    return this.units.filter((u) => !u.isDead && u.team === g.team && u !== g && (includeGolems || !u.isGolem) && manhattan(u, g) <= r);
  }

  _enemiesNear(g, r) {
    return this.units.filter((u) => !u.isDead && u.team !== g.team && manhattan(u, g) <= r);
  }

  _pulse(g) {
    const d = this.def(g);
    const st = this.sm.statuses;
    if (g.golemKind === 'hat') {
      const allies = this._alliesNear(g, 1);
      for (const u of allies) st.apply(u, 'hasted', { value: d.pulseHaste, duration: 1, source: g });
      if (allies.length) { g.flashPulse(1); this.sm.audio?.playBuff?.(); }
    } else if (g.golemKind === 'bell') {
      const allies = this._alliesNear(g, d.pulseRadius, { includeGolems: true });
      for (const u of allies) {
        this.sm._heal(u, d.pulseHeal, g, null);
        if (d.pulseCleanse) st.clear(u, 'debuff', d.pulseCleanse);
      }
      for (const u of this._enemiesNear(g, d.pulseRadius)) st.apply(u, 'fragile', { value: d.pulseFragile, duration: 1, source: g });
      g.flashPulse(d.pulseRadius);
      this.sm.audio?.playHeal?.();
    }
    if (g.golemKind !== 'sentinel' && g.golemKind !== 'shell') this.events.emit('golem:pulse', { golem: g, kind: g.golemKind });
  }

  /** Al romperse (muere por daño): efecto final de cada gólem. */
  _onBreak(g) {
    const d = this.def(g);
    const st = this.sm.statuses;
    if (g.golemKind === 'sentinel') {
      for (const u of this._alliesNear(g, 1)) {
        this.sm._grantShield(u, d.breakShield);
        u.updateHUD?.();
        this.events.emit('unit:shielded', { unit: u, source: g, spell: null, amount: d.breakShield });
      }
    } else if (g.golemKind === 'hat') {
      for (const u of this._alliesNear(g, 1)) st.apply(u, 'energized', { value: d.breakEnergize, duration: 1, source: g });
    } else if (g.golemKind === 'bell') {
      for (const u of this._alliesNear(g, d.breakRadius)) this.sm._heal(u, d.breakHeal, g, null);
    } else if (g.golemKind === 'shell') {
      const cells = [];
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) cells.push({ x: g.gridX + dx, z: g.gridZ + dz });
      this.sm.field.placeZone({ cells, rounds: d.breakZoneRounds, owner: g.owner || g, kind: 'stable_ground', ally: { stable: true }, enemy: {} });
    }
    this.events.emit('golem:broken', { golem: g, kind: g.golemKind, pos: this.grid.gridToWorld(g.gridX, g.gridZ) });
  }
}
