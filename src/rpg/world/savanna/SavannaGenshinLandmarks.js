import * as THREE from 'three';
import { mergeGeometries } from '../../../../vendor/utils/BufferGeometryUtils.js';
import { getSoftToonRamp } from '../demo_scena/genshin/GenshinMaterials.js';

/**
 * SavannaGenshinLandmarks — the three Savanna landmarks rebuilt with stylised primitives
 * (placeholders until the final assets are chosen):
 *   1. Campamento de Bing  : adobe house (replaces the tent) + two stone lamps at the entrance;
 *                            the campfire, archery target and banner of the old camp stay.
 *   2. Altar de Atia       : stepped sandstone dais with a statue of Atia (replaces the Sun altar),
 *                            two braziers; the Desert Sentinel now stands outside, on the trail.
 *   3. Fragua de Baruk     : stone furnace with chimney, awning, anvil, quench barrel, ingots
 *                            + an adobe house; Baruk stands in front of the forge.
 * NPC positions live in MapRegistry (ZONE_NPCS['3_2']); the constants below are the same values.
 */
export const SAVANNA_LANDMARKS = {
  camp: { house: { x: -33.0, z: -40.0, yaw: Math.PI / 4 }, lamps: [[-25.38, -35.62], [-29.62, -31.38]] },
  altar: { x: 68.0, z: -30.0, face: -1.33 },
  forge: { x: 45.5, z: 51.0, face: -2.356, house: { x: 51.5, z: 47.1 } }
};

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

/** Adobe house (front = local +Z). Returns { solid parts, glow parts }. */
function housePartsList(w, d, h, roofColor) {
  const parts = [];
  const glow = [];
  parts.push([box(w, h, d, 0, h / 2, 0), C.adobe]);
  parts.push([box(w + 0.3, 0.35, d + 0.3, 0, 0.17, 0), C.adobeShade]);                 // plinth
  parts.push([box(w + 0.25, 0.22, d + 0.25, 0, h + 0.05, 0), C.adobeShade]);           // parapet band
  // Hip roof with eaves (4-sided pyramid stretched to the footprint)
  const roof = new THREE.ConeGeometry(Math.SQRT1_2 * 1.0, 1.0, 4, 1);
  roof.rotateY(Math.PI / 4);
  roof.scale(w + 1.1, 1.9, d + 1.1);
  roof.translate(0, h + 0.15 + 0.95, 0);
  parts.push([roof, roofColor]);
  // Protruding roof beams (vigas) on the front and back
  for (let i = 0; i < 5; i++) {
    const x = -w / 2 + 0.6 + i * ((w - 1.2) / 4);
    parts.push([cyl(0.09, 0.09, d + 0.9, 6, 0, 0, 0).rotateX(Math.PI / 2).translate(x, h - 0.25, 0), C.wood]);
  }
  // Door with wooden frame + steps
  parts.push([box(1.2, 2.05, 0.12, 0, 1.12, d / 2 + 0.02), C.door]);
  parts.push([box(1.5, 0.16, 0.2, 0, 2.2, d / 2 + 0.05), C.wood]);
  parts.push([box(1.8, 0.18, 0.7, 0, 0.09, d / 2 + 0.4), C.sandDark]);
  // Windows (glowing) on the front and the sides
  for (const sx of [-1, 1]) {
    glow.push([box(0.75, 0.75, 0.08, sx * (w / 2 - 1.05), 1.55, d / 2 + 0.03), C.glow]);
    parts.push([box(0.95, 0.12, 0.14, sx * (w / 2 - 1.05), 1.12, d / 2 + 0.06), C.wood]);
    glow.push([box(0.08, 0.7, 0.7, sx * (w / 2 + 0.03), 1.55, 0), C.glow]);
  }
  return { parts, glow };
}

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
    this.flames = [];
    this.lights = [];
    this.time = 0;
    this.solidMat = toon(0xffffff, { vertexColors: true });
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    this.glowMat.color.setScalar(1.35);

    this._hideLegacy();
    this._buildCamp();
    this._buildAltar();
    this._buildForge();
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

  // 1. Bing's camp: adobe house where the tent stood + two stone lamps at the trail entrance
  _buildCamp() {
    const { house, lamps } = SAVANNA_LANDMARKS.camp;
    const hp = housePartsList(6.0, 4.6, 3.1, C.roof);
    this._place(hp.parts, hp.glow, house.x, house.z, house.yaw, 'Savanna_BingHouse');
    this.colliders.push([house.x, house.z, 3.1]);
    const lp = lampParts();
    for (const [x, z] of lamps) {
      this._place(lp.parts, lp.glow, x, z, house.yaw, 'Savanna_StoneLamp', 0.02);
      this.colliders.push([x, z, 0.55]);
    }
  }

  // 2. Altar of Atia: stepped dais, statue of the spirit of the Great Tree, two braziers
  _buildAltar() {
    const { x, z, face } = SAVANNA_LANDMARKS.altar;
    const parts = [];
    const glow = [];
    parts.push([cyl(4.3, 4.5, 0.4, 10, 0, 0.2, 0), C.sandDark]);
    parts.push([cyl(3.3, 3.45, 0.38, 10, 0, 0.59, 0), C.sand]);
    parts.push([cyl(2.1, 2.2, 0.36, 10, 0, 0.96, 0), C.sandDark]);
    // Statue pedestal
    parts.push([box(1.5, 0.9, 1.5, 0, 1.59, 0), C.sand]);
    parts.push([box(1.75, 0.16, 1.75, 0, 2.1, 0), C.sandDark]);
    // Robed figure (lathe), hands holding a sapling, head with a leaf crown
    const robeProfile = [[0.0, 0], [0.62, 0], [0.58, 0.4], [0.46, 1.1], [0.36, 1.7], [0.3, 2.05], [0.18, 2.2], [0.0, 2.22]].map(([r, y]) => new THREE.Vector2(r, y));
    parts.push([new THREE.LatheGeometry(robeProfile, 10).translate(0, 2.18, 0), C.sand]);
    parts.push([new THREE.SphereGeometry(0.3, 10, 8).translate(0, 4.62, 0), C.sand]);
    parts.push([new THREE.CapsuleGeometry(0.11, 0.55, 3, 6).rotateX(Math.PI / 2.4).translate(-0.22, 3.55, 0.3), C.sand]);
    parts.push([new THREE.CapsuleGeometry(0.11, 0.55, 3, 6).rotateX(Math.PI / 2.4).translate(0.22, 3.55, 0.3), C.sand]);
    parts.push([cyl(0.04, 0.06, 0.6, 5, 0, 3.95, 0.62), C.wood]);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      glow.push([new THREE.OctahedronGeometry(0.14, 0).scale(1, 0.5, 1.6).rotateY(a).translate(Math.sin(a) * 0.14, 4.3, 0.62 + Math.cos(a) * 0.14), C.leaf]);
      parts.push([new THREE.ConeGeometry(0.07, 0.3, 4).translate(Math.sin(a) * 0.24, 4.95, Math.cos(a) * 0.24), C.leaf]);
    }
    // Halo behind the head + glyph ring on the dais
    glow.push([new THREE.TorusGeometry(0.62, 0.05, 6, 24).translate(0, 4.65, -0.32), C.gold]);
    glow.push([new THREE.TorusGeometry(2.75, 0.03, 4, 40).rotateX(Math.PI / 2).translate(0, 0.79, 0), C.gold]);
    // Braziers on the front corners
    const braziers = [[-2.6, 3.1], [2.6, 3.1]];
    for (const [bx, bz] of braziers) {
      parts.push([cyl(0.18, 0.28, 1.1, 8, bx, 0.95, bz), C.stoneDark]);
      parts.push([cyl(0.55, 0.32, 0.38, 10, bx, 1.65, bz), C.stoneDark]);
    }
    const g = this._place(parts, glow, x, z, face, 'Savanna_AtiaAltar', 0.15);
    this.colliders.push([x, z, 4.45]);
    // Animated flames + one warm light for the altar
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa040, toneMapped: false, transparent: true, opacity: 0.92 });
    for (const [bx, bz] of braziers) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 7), flameMat);
      f.position.set(bx, 2.15, bz);
      g.add(f);
      this.flames.push(f);
    }
    const light = new THREE.PointLight(0xffc070, 4.0, 16, 2);
    light.position.set(0, 3.0, 2.2);
    g.add(light);
    this.lights.push({ light, base: 4.0 });
  }

  // 3. Baruk's forge: furnace + chimney, awning, anvil, quench barrel, ingots, adobe house
  _buildForge() {
    const { x, z, face, house } = SAVANNA_LANDMARKS.forge;
    const parts = [];
    const glow = [];
    // Furnace (back of the workshop, local −Z) with an arched glowing mouth facing +Z
    parts.push([box(2.8, 1.9, 2.2, 0, 0.95, -0.6), C.stone]);
    parts.push([box(3.0, 0.2, 2.4, 0, 1.95, -0.6), C.stoneDark]);
    parts.push([cyl(0.45, 0.75, 2.6, 8, 0.6, 3.3, -0.9), C.stone]);
    parts.push([cyl(0.55, 0.55, 0.22, 8, 0.6, 4.7, -0.9), C.stoneDark]);
    glow.push([box(1.2, 0.75, 0.1, 0, 0.95, 0.52), 0xff6a1a]);
    glow.push([box(0.9, 0.18, 0.1, 0, 1.45, 0.52), 0xffb04a]);
    // Bellows
    parts.push([box(0.8, 0.35, 1.0, -1.85, 0.75, -0.3), C.door]);
    parts.push([new THREE.ConeGeometry(0.16, 0.6, 6).rotateX(Math.PI / 2).translate(-1.85, 0.75, 0.45), C.wood]);
    // Awning on four posts over the work area
    for (const [px, pz] of [[-2.2, 2.6], [2.2, 2.6], [-2.2, -1.9], [2.2, -1.9]]) parts.push([cyl(0.09, 0.1, 2.9, 6, px, 1.45, pz), C.wood]);
    const awning = box(5.0, 0.12, 5.0, 0, 3.0, 0.35);
    awning.rotateX(-0.12);
    parts.push([awning, C.cloth]);
    // Anvil on a wooden stump
    parts.push([cyl(0.38, 0.45, 0.7, 8, 1.2, 0.35, 2.3), C.wood]);
    parts.push([box(0.45, 0.32, 0.95, 1.2, 0.86, 2.3), C.steel]);
    parts.push([new THREE.ConeGeometry(0.16, 0.42, 6).rotateX(Math.PI / 2).translate(1.2, 0.9, 2.95), C.steel]);
    // Quench barrel with iron bands + water
    parts.push([cyl(0.5, 0.45, 0.95, 10, -1.9, 0.48, 1.9), C.wood]);
    parts.push([new THREE.TorusGeometry(0.49, 0.03, 4, 14).rotateX(Math.PI / 2).translate(-1.9, 0.3, 1.9), C.steel]);
    parts.push([new THREE.TorusGeometry(0.5, 0.03, 4, 14).rotateX(Math.PI / 2).translate(-1.9, 0.75, 1.9), C.steel]);
    parts.push([new THREE.CircleGeometry(0.44, 12).rotateX(-Math.PI / 2).translate(-1.9, 0.9, 1.9), 0x2f8fa0]);
    // Ingots + tool rack
    for (let i = 0; i < 5; i++) parts.push([box(0.32, 0.14, 0.7, 2.1 + (i % 3) * 0.36, 0.07 + Math.floor(i / 3) * 0.15, 0.8), C.steel]);
    parts.push([box(1.6, 0.08, 0.08, -0.4, 1.6, 2.6), C.wood]);
    for (let i = 0; i < 4; i++) parts.push([cyl(0.025, 0.025, 0.9, 4, -1.0 + i * 0.4, 1.15, 2.62), C.steel]);
    const g = this._place(parts, glow, x, z, face, 'Savanna_BarukForge', 0.08);
    const toWorld = (lx, lz) => {
      const c = Math.cos(face), s = Math.sin(face);
      return [x + lx * c + lz * s, z - lx * s + lz * c];
    };
    this.colliders.push([...toWorld(0, -0.6), 1.9], [...toWorld(1.2, 2.4), 0.6], [...toWorld(-1.9, 1.9), 0.6]);
    const light = new THREE.PointLight(0xff6a1a, 4.5, 14, 2);
    light.position.set(0, 1.2, 1.6);
    g.add(light);
    this.lights.push({ light, base: 4.5, fast: true });
    // House next to the forge (darker roof to tell it from Bing's)
    const hp = housePartsList(5.4, 4.4, 3.0, C.roofB);
    this._place(hp.parts, hp.glow, house.x, house.z, face, 'Savanna_BarukHouse');
    this.colliders.push([house.x, house.z, 2.9]);
  }

  update(delta) {
    this.time += delta;
    const t = this.time;
    this.flames.forEach((f, i) => {
      const k = 0.85 + Math.sin(t * 9 + i * 1.7) * 0.1 + Math.sin(t * 15.3 + i) * 0.06;
      f.scale.set(1, k, 1);
    });
    this.lights.forEach(({ light, base, fast }, i) => {
      light.intensity = base * (0.88 + Math.sin(t * (fast ? 8 : 5) + i) * 0.08 + Math.sin(t * 13.1 + i * 2.3) * 0.05);
    });
  }
}
