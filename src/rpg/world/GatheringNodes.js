// GatheringNodes.js — Puntos de recolección en el mundo (pesca, árboles, vetas y flores), hechos con primitivas.
//
// Se integra como ForgeStation: un nodo más de QuestInteractablesManager (mismo aviso «E · …» y misma tecla E).
// Cada isla monta solo sus puntos (GatheringCatalog) al cargar la zona. El estado (disponible / agotado) viene de
// GatheringService y se refresca cada medio segundo: un punto agotado se ve vacío (tocón, roca sin cobre, tallo sin
// flor, agua quieta) y su aviso dice cuándo vuelve.
// Efectos que usa GatheringActors: shake() (árbol), sparks() (veta), pluck() (flor), splash() (agua).

import * as THREE from 'three';
import { GATHER_KINDS, GATHER_RULES, nodesForZone, promptFor } from '../../tactics/data/GatheringCatalog.js';
import { canonicalZoneKey } from './islands/IslandWorldLayout.js';
import { formatWait } from '../GatheringService.js';
import * as i18n from '../../i18n/i18n.js';

const TAG = 'gather_node';
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...o });

/**
 * Los árboles de las islas llevan un atributo por instancia (aLodFade) que maneja su LOD. Para un árbol suelto se
 * usa una copia ligera de la geometría (mismos búferes de vértices) con aLodFade = 1. Se guarda por geometría para
 * no crear copias nuevas en cada visita, y nunca se libera (liberaría los búferes que comparte con la isla).
 */
const LOD_FREE = new WeakMap();
function lodFreeGeometry(src) {
  if (!src.attributes.aLodFade) return src;
  let geo = LOD_FREE.get(src);
  if (geo) return geo;
  geo = new THREE.BufferGeometry();
  geo.setIndex(src.index);
  for (const [k, a] of Object.entries(src.attributes)) if (k !== 'aLodFade') geo.setAttribute(k, a);
  geo.setAttribute('aLodFade', new THREE.InstancedBufferAttribute(new Float32Array([1]), 1));
  geo.groups = src.groups;
  geo.boundingSphere = src.boundingSphere?.clone() || null;
  geo.boundingBox = src.boundingBox?.clone() || null;
  geo.userData.sharedGatherGeometry = true;
  LOD_FREE.set(src, geo);
  return geo;
}

/** Partículas sencillas (chispas, hojas, gotas, pétalos) que viven en la escena y se reciclan. */
class Burst {
  constructor(scene, { color = 0xffffff, size = 0.12, max = 40 } = {}) {
    this.max = max;
    this.items = Array.from({ length: max }, () => ({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), g: 9 }));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 3), 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.95, depthWrite: false }));
    this.points.frustumCulled = false;
    this.points.name = 'GatherBurst';
    scene.add(this.points);
  }

  emit(origin, n, { speed = 3, up = 3, spread = 1, life = 0.8, gravity = 9, color = null } = {}) {
    if (color != null) this.points.material.color.set(color);
    let k = 0;
    for (const it of this.items) {
      if (k >= n) break;
      if (it.life > 0) continue;
      it.life = it.max = life * (0.7 + Math.random() * 0.6);
      it.p.copy(origin);
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6) * spread;
      it.v.set(Math.cos(a) * s, up * (0.6 + Math.random() * 0.6), Math.sin(a) * s);
      it.g = gravity;
      k++;
    }
  }

  update(dt) {
    const arr = this.points.geometry.attributes.position.array;
    this.items.forEach((it, i) => {
      if (it.life > 0) {
        it.life -= dt;
        it.v.y -= it.g * dt;
        it.p.addScaledVector(it.v, dt);
        arr[i * 3] = it.p.x; arr[i * 3 + 1] = it.p.y; arr[i * 3 + 2] = it.p.z;
      } else { arr[i * 3 + 1] = -9999; }
    });
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.points.parent?.remove(this.points);
    this.points.geometry.dispose(); this.points.material.dispose();
  }
}

/** Insignia del hacha (canvas compartido; cada sprite tiene su material, la textura no se libera al cambiar de isla). */
let _axeTex = null;
function axeBadgeTexture() {
  if (_axeTex) return _axeTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.beginPath(); x.arc(64, 64, 54, 0, Math.PI * 2);
  x.fillStyle = 'rgba(30, 24, 18, 0.78)'; x.fill();
  x.lineWidth = 7; x.strokeStyle = '#E9B44C'; x.stroke();
  // Hito 75: hacha dibujada (antes un emoji, que no casaba con el estilo del juego)
  x.save(); x.translate(64, 66); x.rotate(-0.62);
  x.lineCap = 'round'; x.lineWidth = 9; x.strokeStyle = '#8A5A2B'; x.beginPath(); x.moveTo(0, 34); x.lineTo(0, -30); x.stroke();
  x.lineWidth = 3; x.strokeStyle = '#5B3A1A'; x.beginPath(); x.moveTo(0, 34); x.lineTo(0, 26); x.stroke();
  x.beginPath(); x.moveTo(2, -30); x.lineTo(26, -38); x.quadraticCurveTo(34, -20, 26, -4); x.lineTo(2, -12); x.closePath();
  x.fillStyle = '#E8EEF4'; x.fill(); x.lineWidth = 3; x.strokeStyle = '#E9B44C'; x.stroke();
  x.restore();
  _axeTex = new THREE.CanvasTexture(c);
  _axeTex.colorSpace = THREE.SRGBColorSpace;
  return _axeTex;
}

export class GatheringNodes {
  /**
   * @param {object} ow OverworldManager
   * @param {{ service: object, onUse: (node) => void, isBusy?: () => boolean }} opts
   */
  constructor(ow, { service, onUse, isBusy = () => false }) {
    this.ow = ow;
    this.service = service;
    this.onUse = onUse;
    this.isBusy = isBusy;
    this.items = [];        // { def, node (qi), group, parts…, available }
    this.zoneKey = null;
    this._t = 0;
    this._refreshT = 0;
    const qi = ow.questInteractables;
    if (!qi) return;
    this.qi = qi;
    this.burst = new Burst(qi.scene, { size: 0.13, max: 60 });
    const load = qi.loadForZone.bind(qi);
    qi.loadForZone = (key) => { load(key); this._sync(key); };
    const update = qi.update.bind(qi);
    qi.update = (dt, pos) => {
      this._animate(dt || 0);
      update(dt, pos);
      if (this.isBusy()) qi.hidePrompt(); // durante la recolección no hay aviso
    };
    this.unsub = service.onChange?.(() => this._refresh(true));
    if (qi.currentZoneKey) this._sync(qi.currentZoneKey);
  }

  /** Punto (del catálogo) por id, si está montado en la isla actual. */
  item(id) { return this.items.find((it) => it.def.id === id) || null; }

  _sync(key) {
    this.ow.collisions?.removeCirclesByTag?.(TAG);
    this.items.forEach((it) => {
      this.qi.scene.remove(it.group);
      it.group.traverse((c) => { c.geometry?.dispose?.(); c.material?.dispose?.(); });
      if (it.model) { this.qi.scene.remove(it.model); it.model.traverse((c) => c.dispose?.()); } // InstancedMesh.dispose: solo sus búferes de instancias
    });
    this.items = [];
    this.zoneKey = canonicalZoneKey(String(key || '').replace(/^zone_/, ''));
    for (const def of nodesForZone(this.zoneKey)) {
      const it = this._build(def);
      it.group.position.set(def.x, this._ground(def.x, def.z), def.z);
      this.qi.scene.add(it.group);
      if (it.model) { it.model.position.copy(it.group.position); this.qi.scene.add(it.model); }
      if (it.collider) this.ow.collisions?.addCircle?.(def.x, def.z, it.collider, `${TAG}_${def.id}`);
      it.node = {
        id: `gather_${def.id}`, type: 'gather', group: it.group, radius: GATHER_RULES.useRadius,
        promptText: promptFor(def), onInteract: () => this.onUse?.(it),
      };
      this.qi.nodes.push(it.node);
      this.items.push(it);
    }
    this._refresh(true);
  }

  _ground(x, z) {
    const y = this.ow.getGroundHeight?.(x, z);
    return Number.isFinite(y) ? y : 0;
  }

  /** Disponible / agotado: aspecto y texto del aviso. */
  _refresh(force = false) {
    for (const it of this.items) {
      const left = this.service.remainingMs(it.def.id);
      const available = left <= 0;
      it.node.promptText = available ? promptFor(it.def) : i18n.t('notices.gather.backIn', { name: it.def.name, t: formatWait(left) });
      if (!force && available === it.available) continue;
      it.available = available;
      it.setAvailable?.(available);
      if (it.ring) it.ring.visible = available;
      if (it.marker) it.marker.visible = available;
    }
  }

  _animate(dt) {
    this._t += dt;
    this.burst?.update(dt);
    if (!this.items.length) return;
    this._refreshT -= dt;
    if (this._refreshT <= 0) {
      this._refreshT = 0.5;
      this._refresh();
      // el terreno puede terminar de cargar después: se reajusta la altura
      this.items.forEach((it) => { it.group.position.y = this._ground(it.def.x, it.def.z); });
    }
    for (const it of this.items) {
      if (it.ring?.visible) it.ring.material.opacity = it.def.highlight ? 0.62 + Math.sin(this._t * 2.2 + it.def.x) * 0.2 : 0.28 + Math.sin(this._t * 2.2 + it.def.x) * 0.12;
      if (it.marker?.visible) it.marker.position.y = 8.4 + Math.sin(this._t * 1.8 + it.def.z) * 0.18;
      it.animate?.(dt, this._t);
    }
  }

  // ───────────────────────────────────────────── construcción por tipo
  _build(def) {
    const g = new THREE.Group();
    g.name = `Gather_${def.id}`;
    const it = { def, group: g, available: null, collider: 0 };
    if (def.kind === 'fish') this._buildFish(it);
    else if (def.kind === 'chop') this._buildTree(it);
    else if (def.kind === 'mine') this._buildVein(it);
    else this._buildFlower(it);
    // Anillo del color de la actividad: se puede usar
    const color = new THREE.Color(GATHER_KINDS[def.kind]?.color || '#D3AE6C');
    const r = def.kind === 'chop' ? 1.6 : 1.15;
    const w = def.highlight ? 0.3 : 0.12;   // Hito 64: los puntos destacados (abetos del Ártico) llevan un anillo más ancho
    const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + w, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.renderOrder = 2;
    g.add(ring); it.ring = ring;
    if (def.highlight) {
      // Hacha flotante sobre la copa: se ve desde lejos entre los demás abetos (se oculta mientras rebrota)
      const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: axeBadgeTexture(), transparent: true, depthWrite: false }));
      marker.scale.set(1.5, 1.5, 1);
      marker.position.y = def.kind === 'chop' ? 8.4 : 2.4;
      marker.renderOrder = 3;
      g.add(marker); it.marker = marker;
    }
    g.traverse((c) => { if (c.isMesh && c !== ring) { c.castShadow = true; c.receiveShadow = true; } });
    return it;
  }

  /** Pesca: estaca con un cubo en la orilla y ondas en el agua (en el punto del corcho). */
  _buildFish(it) {
    const { def, group: g } = it;
    const wood = mat(0x7A5230), woodDark = mat(0x5A3A22), rope = mat(0xC9B48A);
    const dir = new THREE.Vector2(def.water.x - def.x, def.water.z - def.z).normalize();
    // estaca y cubo un poco tierra adentro, para no tapar al Axie
    const side = new THREE.Vector3(-dir.y, 0, dir.x);
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 6), woodDark);
    stake.position.set(side.x * 0.9 - dir.x * 0.4, 0.5, side.z * 0.9 - dir.y * 0.4);
    g.add(stake);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.05), wood);
    sign.position.copy(stake.position).add(new THREE.Vector3(0, 0.45, 0));
    sign.rotation.y = Math.atan2(dir.x, dir.y);
    g.add(sign);
    const fishMark = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 4), mat(0x5FB6E8, { emissive: 0x2A6E96, emissiveIntensity: 0.4 }));
    fishMark.rotation.z = Math.PI / 2; fishMark.position.copy(sign.position).add(new THREE.Vector3(0, 0, 0.04));
    fishMark.rotation.y = sign.rotation.y;
    g.add(fishMark);
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.32, 10), wood);
    bucket.position.set(-side.x * 0.9 - dir.x * 0.5, 0.16, -side.z * 0.9 - dir.y * 0.5);
    g.add(bucket);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.02, 4, 12), rope);
    band.rotation.x = Math.PI / 2; band.position.copy(bucket.position).add(new THREE.Vector3(0, 0.06, 0));
    g.add(band);
    // Ondas en el agua (posición relativa al grupo; la altura del agua se ajusta en animate)
    const ripples = new THREE.Group();
    ripples.position.set(def.water.x - def.x, 0, def.water.z - def.z);
    const rings = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 28), new THREE.MeshBasicMaterial({ color: 0xE8F6FF, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; ripples.add(m); return m;
    });
    g.add(ripples);
    it.water = new THREE.Vector3(def.water.x, 0, def.water.z);
    it.waterY = () => this._waterY(def);
    it.setAvailable = (on) => { ripples.visible = on; fishMark.visible = on; };
    it.animate = (dt, t) => {
      ripples.position.y = it.waterY() - g.position.y + 0.04;
      rings.forEach((m, i) => {
        const k = ((t * 0.5 + i / 3) % 1);
        m.scale.setScalar(0.4 + k * 1.6);
        m.material.opacity = 0.55 * (1 - k);
      });
    };
    it.splash = (big = false, at = null) => {
      const p = new THREE.Vector3(at ? at.x : def.water.x, it.waterY() + 0.05, at ? at.z : def.water.z);
      this.burst.emit(p, big ? 18 : 8, { speed: big ? 1.6 : 0.9, up: big ? 3.2 : 2, life: 0.6, gravity: 9, color: 0xDFF3FF });
    };
  }

  /** Altura del agua junto al punto de pesca: el punto más bajo del lecho cerca del corcho, o la del río del Bosque. */
  _waterY(def) {
    const z = def.water.z;
    if (this.zoneKey === '2_2') {
      if (z <= 16) return 2.0;
      if (z >= 34) return 0.45;
      const t = (z - 16) / 18, s = t * t * (3 - 2 * t);
      return 2.0 + (0.45 - 2.0) * s;
    }
    return 0.45;
  }

  /** Árbol: roble del Bosque o abeto escarchado del Ártico. Agotado: tocón. */
  _buildTree(it) {
    const { def, group: g } = it;
    const fir = def.tree === 'fir';
    // Bosque: el mismo árbol que el resto de la isla (GenshinTrees: frondoso pintado, con viento)
    const gt = !fir && this.ow.demoScenaZone?.genshinArt?.trees;
    if (gt?.archetypes?.broad?.length && gt.leafMaterial) { this._buildForestTree(it, gt); return; }
    // Ártico: uno de los abetos de la isla (IslandTrees, el mismo arte que el resto del Ártico)
    const parts = fir ? this._islandConiferParts() : null;
    if (parts) { this._buildModelTree(it, parts, { leafY: 6, leafColor: 0xEAF4FF, collider: 0.6 }); return; }
    const bark = mat(fir ? 0x5E4632 : 0x6B4A2E), barkDark = mat(0x4A3424);
    const crown = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.36, fir ? 2.2 : 2.6, 8), bark);
    trunk.position.y = (fir ? 2.2 : 2.6) / 2;
    crown.add(trunk);
    if (fir) {
      const green = mat(0x2F6B55), snow = mat(0xF2F7FF, { roughness: 0.6 });
      [[1.7, 1.6, 1.8], [1.35, 1.4, 2.9], [0.95, 1.2, 3.85], [0.55, 0.9, 4.6]].forEach(([r, h, y]) => {
        const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), green); c.position.y = y; crown.add(c);
        const s = new THREE.Mesh(new THREE.ConeGeometry(r * 0.62, h * 0.42, 8), snow); s.position.y = y + h * 0.3; crown.add(s);
      });
    } else {
      const leaf = mat(0x4E9A4B), leafHi = mat(0x6DB55A);
      [[0, 3.4, 0, 1.45, leaf], [0.9, 3.0, 0.3, 1.0, leafHi], [-0.8, 3.1, -0.4, 1.05, leaf], [0.1, 4.2, -0.2, 0.95, leafHi]].forEach(([x, y, z, r, m]) => {
        const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), m); s.position.set(x, y, z); s.rotation.set(x, y, z); crown.add(s);
      });
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.1, 6), bark);
      branch.position.set(0.45, 2.3, 0); branch.rotation.z = -0.9; crown.add(branch);
    }
    g.add(crown);
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.42, 8), barkDark);
    stump.position.y = 0.21; g.add(stump);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 8), mat(0xC8A26E));
    top.position.y = 0.43; g.add(top);
    const roots = [0, 1, 2, 3].map((i) => {
      const r = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 5), barkDark);
      const a = i * Math.PI / 2 + 0.4; r.position.set(Math.cos(a) * 0.38, 0.08, Math.sin(a) * 0.38); r.rotation.set(Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3);
      g.add(r); return r;
    });
    void roots;
    it.collider = 0.55;
    it.crown = crown;
    it.leafColor = fir ? 0xEAF4FF : 0x6DB55A;
    let shakeT = 0;
    it.setAvailable = (on) => { crown.visible = on; top.visible = !on; };
    it.animate = (dt) => {
      if (shakeT > 0) {
        shakeT = Math.max(0, shakeT - dt);
        const k = shakeT / 0.45;
        crown.rotation.z = Math.sin(shakeT * 38) * 0.05 * k;
        crown.rotation.x = Math.cos(shakeT * 31) * 0.03 * k;
      } else { crown.rotation.set(0, 0, 0); }
    };
    it.shake = (from) => {
      shakeT = 0.45;
      const top3 = g.position.clone().add(new THREE.Vector3(0, fir ? 3.2 : 3.4, 0));
      this.burst.emit(top3, 7, { speed: 1.4, up: 0.6, life: 1.4, gravity: 2.2, color: it.leafColor });
      if (from) {
        const chip = g.position.clone().lerp(from, 0.18).add(new THREE.Vector3(0, 0.9, 0));
        this.burst.emit(chip, 5, { speed: 2.2, up: 2.2, life: 0.5, gravity: 10, color: 0xC8A26E });
      }
    };
  }

  /**
   * Árbol del Bosque con el modelo de la isla (GenshinTrees, frondoso verde). Su geometría y materiales son los
   * de la isla (compartidos): van en un grupo aparte (it.model) que se quita de la escena sin liberarlos.
   * Agotado: queda el tocón de primitivas.
   */
  _buildForestTree(it, gt) {
    const arch = gt.archetypes.broad[1] || gt.archetypes.broad[0];
    const scale = new THREE.Matrix4().makeScale(1.05, 1.05, 1.05);
    this._buildModelTree(it, [
      { geo: arch.trunk, mat: gt._getTrunkMaterial?.('green') || gt.trunkMaterial, color: new THREE.Color(0xffffff), matrix: scale },
      { geo: arch.foliage, mat: gt.leafMaterial, color: new THREE.Color(0x6fae3c), matrix: scale },
    ], { leafY: 5.5, leafColor: 0x86bf45, collider: 0.6 });
  }

  /**
   * Un abeto del Ártico tal como lo dibuja la isla: busca un tronco y su copa (IslandTreeTrunk/Foliage_conifer_*)
   * en el mismo sitio y copia su forma, giro, escala y colores. Null si el arte de la isla no está.
   */
  _islandConiferParts() {
    const fol = [], trunks = [];
    this.qi.scene.traverse((o) => {
      if (!o.isInstancedMesh || !o.count) return;
      let p = o.parent, onArctic = false;
      while (p) { if (/arctic/i.test(p.name || '')) { onArctic = true; break; } p = p.parent; }
      if (!onArctic) return;
      if (/^IslandTreeFoliage_conifer_\d+$/.test(o.name)) fol.push(o);
      else if (/^IslandTreeTrunk_conifer_\d+_fir/.test(o.name)) trunks.push(o);
    });
    const mf = new THREE.Matrix4(), mt = new THREE.Matrix4(), pf = new THREE.Vector3(), pt = new THREE.Vector3();
    for (const f of fol) {
      const kind = f.name.replace('IslandTreeFoliage_', '');
      const ts = trunks.filter((t) => t.name.startsWith(`IslandTreeTrunk_${kind}_`));
      for (let i = 0; i < f.count; i++) {
        f.getMatrixAt(i, mf); pf.setFromMatrixPosition(mf);
        for (const t of ts) {
          for (let j = 0; j < t.count; j++) {
            t.getMatrixAt(j, mt); pt.setFromMatrixPosition(mt);
            if (Math.hypot(pt.x - pf.x, pt.z - pf.z) > 0.05) continue;
            const local = (m) => m.clone().setPosition(0, 0, 0);
            const col = (mesh, k) => { const c = new THREE.Color(1, 1, 1); if (mesh.instanceColor) mesh.getColorAt(k, c); return c; };
            return [
              { geo: lodFreeGeometry(t.geometry), mat: t.material, color: col(t, j), matrix: local(mt) },
              { geo: lodFreeGeometry(f.geometry), mat: f.material, color: col(f, i), matrix: local(mf) },
            ];
          }
        }
      }
    }
    return null;
  }

  /**
   * Árbol con el modelo de la isla. Geometría y materiales son los de la isla (compartidos): van en un grupo
   * aparte (it.model) que se quita de la escena sin liberarlos. Agotado: queda un tocón de primitivas.
   * parts = [{ geo, mat, color, matrix }] (tronco y copa).
   */
  _buildModelTree(it, parts, { leafY = 5.5, leafColor = 0x86bf45, collider = 0.6 } = {}) {
    const { group: g } = it;
    const model = new THREE.Group();
    model.name = 'GatherIslandTree';
    const crown = new THREE.Group();
    for (const { geo, mat: material, color, matrix } of parts) {
      const m = new THREE.InstancedMesh(geo, material, 1);
      m.setMatrixAt(0, matrix);
      m.setColorAt(0, color);
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
      m.castShadow = true; m.receiveShadow = true;
      crown.add(m);
    }
    model.add(crown);
    it.model = model;
    const barkDark = mat(0x4A3424);
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.5, 9), barkDark);
    stump.position.y = 0.25; g.add(stump);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.02, 9), mat(0xC8A26E));
    top.position.y = 0.51; g.add(top);
    stump.visible = false; top.visible = false;
    it.collider = collider;
    it.leafColor = leafColor;
    let shakeT = 0;
    it.setAvailable = (on) => { model.visible = on; stump.visible = !on; top.visible = !on; };
    it.animate = (dt) => {
      model.position.copy(g.position);
      if (shakeT > 0) {
        shakeT = Math.max(0, shakeT - dt);
        const k = shakeT / 0.45;
        crown.rotation.z = Math.sin(shakeT * 38) * 0.025 * k;
        crown.rotation.x = Math.cos(shakeT * 31) * 0.015 * k;
      } else { crown.rotation.set(0, 0, 0); }
    };
    it.shake = (from) => {
      shakeT = 0.45;
      const top3 = g.position.clone().add(new THREE.Vector3(0, leafY, 0));
      this.burst.emit(top3, 9, { speed: 1.8, up: 0.6, life: 1.8, gravity: 2.2, color: it.leafColor });
      if (from) {
        const chip = g.position.clone().lerp(from, 0.25).add(new THREE.Vector3(0, 0.9, 0));
        this.burst.emit(chip, 5, { speed: 2.2, up: 2.2, life: 0.5, gravity: 10, color: 0xC8A26E });
      }
    };
  }

  /** Veta de cobre al pie de la roca: piedra oscura con cristales de cobre. Agotada: piedra sin cobre. */
  _buildVein(it) {
    const { def, group: g } = it;
    const rock = mat(0x8A6A4E), rockDark = mat(0x6A4F3A);
    const copper = mat(0xD98A4E, { roughness: 0.35, metalness: 0.7, emissive: 0x7A3A12, emissiveIntensity: 0.35 });
    const face = def.face ? Math.atan2(def.x - def.face.x, def.z - def.face.z) : 0;
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), rock);
    base.scale.set(1.2, 0.75, 0.9); base.position.y = 0.45; g.add(base);
    const side = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), rockDark);
    side.position.set(0.75, 0.3, -0.25); g.add(side);
    const crystals = new THREE.Group();
    [[0, 0.95, 0.35, 0.22, 0.2], [-0.4, 0.7, 0.5, 0.16, -0.5], [0.38, 0.75, 0.45, 0.14, 0.6], [0.1, 0.55, 0.68, 0.12, 0.1], [-0.2, 1.05, 0.05, 0.13, -0.2]].forEach(([x, y, z, r, rz]) => {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), copper);
      c.scale.y = 1.8; c.position.set(x, y, z); c.rotation.set(0.3, x * 2, rz); crystals.add(c);
    });
    g.add(crystals);
    g.rotation.y = face; // los cristales (+z local) miran hacia fuera de la roca
    it.collider = 0.75;
    it.setAvailable = (on) => { crystals.visible = on; base.material.color.set(on ? 0x8A6A4E : 0x6E5A4A); };
    it.animate = (dt, t) => { if (crystals.visible) copper.emissiveIntensity = 0.3 + Math.sin(t * 3 + def.x) * 0.12; };
    it.sparks = () => {
      const p = new THREE.Vector3(0, 0.8, 0.55).applyMatrix4(g.matrixWorld);
      this.burst.emit(p, 10, { speed: 2.4, up: 2.4, life: 0.45, gravity: 12, color: 0xFFC46B });
    };
  }

  /** Flor lunar: tallo, hojas y cinco pétalos que brillan. Agotada: solo las hojas. */
  _buildFlower(it) {
    const { group: g } = it;
    const stemM = mat(0x3E7D5A), leafM = mat(0x56A06E);
    const petalM = new THREE.MeshStandardMaterial({ color: 0xD9C8FF, emissive: 0x9B7BFF, emissiveIntensity: 0.9, roughness: 0.5, flatShading: true });
    const leaves = [0, 1, 2].map((i) => {
      const l = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 4), leafM);
      const a = i * 2.1; l.position.set(Math.cos(a) * 0.18, 0.15, Math.sin(a) * 0.18); l.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      g.add(l); return l;
    });
    void leaves;
    const bloom = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.75, 5), stemM);
    stem.position.y = 0.37; bloom.add(stem);
    const head = new THREE.Group(); head.position.y = 0.78;
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4), petalM);
      const a = (i / 5) * Math.PI * 2; p.scale.set(1, 0.35, 0.6); p.position.set(Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14); p.rotation.y = -a;
      head.add(p);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshStandardMaterial({ color: 0xFFF2B0, emissive: 0xFFD86B, emissiveIntensity: 1.2 }));
    head.add(core);
    bloom.add(head);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshBasicMaterial({ color: 0xB79BF2, transparent: true, opacity: 0.18, depthWrite: false }));
    glow.position.y = 0.78; bloom.add(glow);
    g.add(bloom);
    it.bloom = bloom;
    let pluckT = 0;
    it.setAvailable = (on) => { if (!pluckT) bloom.visible = on; bloom.scale.setScalar(1); };
    it.animate = (dt, t) => {
      if (pluckT > 0) {
        pluckT = Math.max(0, pluckT - dt);
        bloom.scale.setScalar(Math.max(0.01, pluckT / 0.5));
        if (!pluckT) bloom.visible = false;
        return;
      }
      if (!bloom.visible) return;
      head.rotation.y += dt * 0.4;
      head.position.y = 0.78 + Math.sin(t * 2 + g.position.x) * 0.03;
      glow.material.opacity = 0.14 + Math.sin(t * 2.6) * 0.06;
    };
    it.pluck = () => {
      pluckT = 0.5;
      const p = g.position.clone().add(new THREE.Vector3(0, 0.8, 0));
      this.burst.emit(p, 12, { speed: 1.2, up: 1.8, life: 0.9, gravity: 1.5, color: 0xD9C8FF });
    };
  }

  /**
   * Comprueba los puntos de la isla actual contra el terreno real (consola: lunakaiGathering.check()).
   * Pendiente del suelo, colisiones, distancia a NPC y objetos grandes (rocas, árboles…) encima del punto;
   * en la pesca, que el corcho caiga en agua (suelo por debajo del nivel del agua).
   */
  check() {
    const h = (x, z) => this._ground(x, z);
    const slope = (x, z) => Math.max(...[[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]].map(([a, b]) => Math.hypot(h(x + a + 0.5, z + b) - h(x + a - 0.5, z + b), h(x + a, z + b + 0.5) - h(x + a, z + b - 0.5))));
    const col = this.ow.collisions;
    const npcs = (col?.circles || []).filter((c) => /^npc_/.test(c.tag));
    const own = new Set(this.items.flatMap((it) => (it.model ? [it.group, it.model] : [it.group])));
    const big = [];
    const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
    const skip = /grass|flower|particle|fern|bulrush|wake|outline|ocean|water|river|terrain|sky|cloud|leaf|petal|distant|horizon|fog|shadow|tile|Gather/i;
    this.qi.scene.traverseVisible((o) => {
      let p = o; while (p) { if (own.has(p)) return; p = p.parent; }
      if (skip.test(o.name || o.parent?.name || '') || o.isSkinnedMesh) return;
      if (o.isInstancedMesh) {
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); m4.premultiply(o.matrixWorld); v.setFromMatrixPosition(m4); const r = o.geometry.boundingSphere.radius * Math.cbrt(Math.abs(m4.determinant())); if (r > 0.7 && r < 30 && v.y - h(v.x, v.z) < 12) big.push([v.x, v.z, r]); }
      } else if (o.isMesh) {
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const r = o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis(); v.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld);
        if (r > 0.7 && r < 30 && v.y - h(v.x, v.z) < 12) big.push([v.x, v.z, r]); // (lo que flota en el cielo o el horizonte no cuenta)
      }
    });
    return this.items.map(({ def }) => {
      const issues = [];
      const sl = slope(def.x, def.z);
      if (sl > 0.3) issues.push(`pendiente ${sl.toFixed(2)}`);
      if (col?.isPointBlocked?.(def.x, def.z, 0.3) && def.kind !== 'chop' && def.kind !== 'mine') issues.push('colisión encima');
      const npc = npcs.find((n) => Math.hypot(n.x - def.x, n.z - def.z) < 8);
      if (npc) issues.push(`cerca de ${npc.tag}`);
      const clear = Math.min(99, ...big.map(([x, z, r]) => Math.hypot(x - def.x, z - def.z) - r * 0.6));
      if (clear < (def.kind === 'mine' ? -1 : 0.8)) // la veta va pegada a su roca issues.push(`objeto encima (${clear.toFixed(1)} m)`);
      if (def.kind === 'fish' && h(def.water.x, def.water.z) > this._waterY(def) - 0.1) issues.push('el corcho no cae en agua');
      return { id: def.id, ok: !issues.length, slope: +sl.toFixed(2), clear: +clear.toFixed(1), issues: issues.join(' · ') };
    });
  }

  dispose() {
    this.unsub?.();
    this._sync(null);
    this.burst?.dispose();
  }
}
