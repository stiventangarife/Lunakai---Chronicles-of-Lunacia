import * as THREE from 'three';
import { mergeGeometries } from '../../../../vendor/utils/BufferGeometryUtils.js';
import { getSoftToonRamp } from '../demo_scena/genshin/GenshinMaterials.js';
import { placeIslandProps, updateFloatingProps } from '../islands/kit/IslandProps.js';

/**
 * SavannaGenshinLandmarks — the Savanna landmarks (Hito 55: GLB models where there were primitives):
 *   1. Campamento de Bing  : house.glb (same house as the Forest village) where the tent stood, two stone lamps
 *                            at the entrance and totem_2.glb beside the house; campfire, target and banner stay.
 *   2. Altar de Atia       : altar_atia.glb replaces the Sun altar (no braziers or light any more);
 *                            the Desert Sentinel stands outside, on the trail.
 *   3. Casa de Baruk       : one house.glb where the old adobe house stood (the furnace/anvil/awning forge is gone).
 *   4. Embarcadero (Kawa) : table_surf.glb on the sand next to the ferryman and balsa.glb (canoe) bobbing in the sea.
 * NPC positions live in MapRegistry (ZONE_NPCS['3_2']); the constants below are the same values.
 * yaw/face: the model's front (local +Z) looks towards (sin yaw, cos yaw), like the NPC rotation.
 */
export const SAVANNA_LANDMARKS = {
  camp: {
    house: { x: -33.0, z: -40.0, yaw: Math.PI / 4 },
    lamps: [[-25.38, -35.62], [-29.62, -31.38]],
    totem: { x: -27.6, z: -42.6, yaw: Math.PI / 4 }
  },
  altar: { x: 68.0, z: -30.0, face: -1.33 },
  // Baruk's house stands where the old adobe house was (the forge spot behind Baruk is hidden by the big
  // tree from the trail); its door faces the trail like before. forge.x/z is still read by SavannaGenshinNature
  // (area kept clear of rocks and flora), so the yard in front of the house stays open.
  forge: { x: 45.5, z: 51.0, face: -2.356, house: { x: 51.5, z: 47.1 } },
  dock: { surf: { x: -136.5, z: 37.5, yaw: 1.2 }, canoe: { x: -144.5, z: 45.0, yaw: 0.5 } }
};

// GLB models, scales and colliders: islands/kit/IslandProps.js (shared with the Arctic, cache key `#islas`).

const C = {
  adobe: 0xe6b47c, adobeShade: 0xc98f58, roof: 0xc4552e, roofB: 0xa86a3a, wood: 0x7a4a2a, woodDark: 0x5a3420,
  door: 0x6b3b1f, glow: 0xffc46a, sand: 0xe2c08e, sandDark: 0xc79a62, stone: 0x8a7462, stoneDark: 0x5e4c40,
  steel: 0x5b6470, gold: 0xffd27a, leaf: 0x8fce4a, cloth: 0x2f7fb5
};

/** Soft toon material (same light ramp as the rest of the island). */
function toon(color, opts = {}) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: getSoftToonRamp(), ...opts });
  return m;
}

/** Bakes a list of [geometry, color] into one vertex-coloured geometry (1 draw call per landmark). */
function bake(parts) {
  const geos = parts.map(([g, color]) => {
    const geo = g.index ? g.toNonIndexed() : g;
    const n = geo.attributes.position.count;
    const col = new THREE.Color(color);
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    return geo;
  });
  const merged = mergeGeometries(geos, false);
  merged.computeBoundingSphere();
  return merged;
}

const box = (w, h, d, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
const cyl = (rt, rb, h, seg, x = 0, y = 0, z = 0) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(x, y, z); return g; };

/** Stone lamp (toro-like, carved sandstone) with a glowing lantern box. */
function lampParts() {
  const parts = [
    [box(0.9, 0.25, 0.9, 0, 0.12, 0), C.sandDark],
    [cyl(0.2, 0.26, 1.15, 8, 0, 0.82, 0), C.sand],
    [box(0.75, 0.14, 0.75, 0, 1.47, 0), C.sandDark],
    [box(0.62, 0.08, 0.62, 0, 2.06, 0), C.sandDark]
  ];
  const cap = new THREE.ConeGeometry(0.62, 0.45, 4, 1);
  cap.rotateY(Math.PI / 4);
  cap.translate(0, 2.32, 0);
  parts.push([cap, C.sandDark]);
  parts.push([cyl(0.05, 0.05, 0.2, 6, 0, 2.6, 0), C.sandDark]);
  const glow = [[box(0.48, 0.48, 0.48, 0, 1.78, 0), C.glow]];
  // Pillars around the lantern
  for (const [px, pz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) parts.push([box(0.09, 0.5, 0.09, px, 1.78, pz), C.sand]);
  return { parts, glow };
}

export class SavannaGenshinLandmarks {
  constructor(art) {
    this.art = art;
    this.zone = art.zone;
    this.root = new THREE.Group();
    this.root.name = 'SavannaGenshinLandmarks';
    art.layer.root.add(this.root);
    this.colliders = [];
    this.floating = [];
    this.time = 0;
    this.solidMat = toon(0xffffff, { vertexColors: true });
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    this.glowMat.color.setScalar(1.35);

    this._hideLegacy();
    this._buildCamp();
    this._buildModels();
  }

  _place(parts, glow, x, z, yaw, name, sink = 0.05) {
    const y = this.zone.terrain.getHeight(x, z) - sink;
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    const solid = new THREE.Mesh(bake(parts), this.solidMat);
    solid.castShadow = true;
    solid.receiveShadow = true;
    g.add(solid);
    if (glow && glow.length) g.add(new THREE.Mesh(bake(glow), this.glowMat));
    this.root.add(g);
    return g;
  }

  _hideLegacy() {
    const lm = this.zone.landmarksManager;
    if (!lm || !lm.group) return;
    lm.group.traverse((o) => {
      if (o.name === 'Landmark_DesiertoDelSolNaciente' || o.name === 'Landmark_FraguaNomadaDeBaruk') this.art._hide(o);
      if (o.name === 'Landmark_CampamentoDeBing') {
        // The tent and its central pole are replaced by the house; fire, target and banner stay
        const tent = o.children.find((c) => c.isMesh && c.geometry && c.geometry.type === 'ConeGeometry');
        const pole = o.children.find((c) => c.isMesh && c.geometry && c.geometry.type === 'CylinderGeometry' && c.position.y > 2.0 && Math.abs(c.position.x) < 0.01);
        if (tent) this.art._hide(tent);
        if (pole) this.art._hide(pole);
      }
    });
  }

  // Two stone lamps at the entrance of Bing's camp (the house and the totem are GLB, see _buildModels)
  _buildCamp() {
    const { house, lamps } = SAVANNA_LANDMARKS.camp;
    const lp = lampParts();
    for (const [x, z] of lamps) {
      this._place(lp.parts, lp.glow, x, z, house.yaw, 'Savanna_StoneLamp', 0.02);
      this.colliders.push([x, z, 0.55]);
    }
  }

  /** Placements of the GLB pieces. Colliders are known now (SavannaGenshinArt reads them right after construction). */
  _buildModels() {
    const L = SAVANNA_LANDMARKS;
    const list = [
      { model: 'house', ...L.camp.house, name: 'Savanna_BingHouse' },
      { model: 'totem_2', ...L.camp.totem, name: 'Savanna_BingTotem' },
      { model: 'altar', x: L.altar.x, z: L.altar.z, yaw: L.altar.face, name: 'Savanna_AtiaAltar' },
      { model: 'house', ...L.forge.house, yaw: L.forge.face, name: 'Savanna_BarukHouse' },
      { model: 'surf', ...L.dock.surf, name: 'Savanna_SurfBoard' },
      { model: 'canoe', ...L.dock.canoe, name: 'Savanna_Canoe' }
    ];
    const props = placeIslandProps(this.root, list, { height: (x, z) => (this.zone.terrain ? this.zone.terrain.getHeight(x, z) : 0), seaLevel: 0.45, plinthColor: 0xb98a62 });
    this.colliders.push(...props.colliders);
    this.floating = props.floating;
    this.ready = props.ready;
  }

  update(delta) {
    this.time += delta;
    updateFloatingProps(this.floating, this.time);   // the canoe bobs and rocks on the sea
  }
}
