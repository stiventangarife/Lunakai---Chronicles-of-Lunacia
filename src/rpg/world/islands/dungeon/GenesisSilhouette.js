import * as THREE from 'three';

/**
 * Silhouette of Genesis seen on the horizon from the other islands (replaces the old
 * volcano / lunar craters): a wide low garden plateau crowned by clusters of layered lavender
 * stone pillars, rounded tree canopies and the great arch of the Sanctum of Origin.
 * Low poly, one atmospheric material (the caller's), no shadows.
 */
export function buildGenesisSilhouette(group, material) {
  const add = (geo) => {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = false;
    m.receiveShadow = false;
    m.frustumCulled = false;
    group.add(m);
  };
  // Garden plateau (two low, wide terraces)
  const base = new THREE.CylinderGeometry(250, 290, 46, 18, 1);
  base.translate(0, 23, 0);
  add(base);
  const upper = new THREE.CylinderGeometry(150, 190, 34, 16, 1);
  upper.translate(30, 46 + 17, 40);
  add(upper);
  // Layered lavender pillars (stacked drums with mushroom caps)
  const pillars = [
    { x: -190, z: -20, h: 190, r: 34 }, { x: -150, z: 40, h: 140, r: 28 }, { x: -220, z: 60, h: 110, r: 24 },
    { x: 170, z: -40, h: 170, r: 30 }, { x: 215, z: 30, h: 120, r: 24 }, { x: -60, z: -120, h: 125, r: 24 },
    { x: 80, z: 120, h: 105, r: 22 }
  ];
  for (const p of pillars) {
    const n = Math.max(3, Math.round(p.h / 34));
    let y = 40;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const r = p.r * (1 - 0.25 * t) * (0.9 + ((i * 37) % 5) * 0.05);
      const h = p.h / n;
      const d = new THREE.CylinderGeometry(r, r * 1.06, h * 0.92, 9, 1);
      d.translate(p.x + ((i % 2) - 0.5) * 4, y + h / 2, p.z);
      add(d);
      y += h;
    }
    const cap = new THREE.CylinderGeometry(p.r * 1.25, p.r * 1.05, 18, 10, 1);
    cap.translate(p.x, y + 9, p.z);
    add(cap);
    const dome = new THREE.SphereGeometry(p.r * 1.2, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.scale(1, 0.4, 1);
    dome.translate(p.x, y + 18, p.z);
    add(dome);
  }
  // Rounded tree canopies of the Ancestral Grove
  const trees = [[-80, -60, 42], [-30, -90, 48], [30, -70, 40], [90, -80, 44], [120, 10, 38], [-110, 90, 36], [0, -30, 34]];
  for (const [x, z, r] of trees) {
    const trunk = new THREE.CylinderGeometry(r * 0.12, r * 0.18, r * 1.1, 6, 1);
    trunk.translate(x, 46 + r * 0.55, z);
    add(trunk);
    const crown = new THREE.IcosahedronGeometry(r, 1);
    crown.scale(1, 0.85, 1);
    crown.translate(x, 46 + r * 1.55, z);
    add(crown);
  }
  // Great arch of the Sanctum of Origin
  for (const s of [-1, 1]) {
    const col = new THREE.CylinderGeometry(9, 11, 120, 8, 1);
    col.translate(40 + s * 38, 80 + 60, 60);
    add(col);
  }
  const arch = new THREE.TorusGeometry(38, 9, 6, 16, Math.PI);
  arch.translate(40, 200, 60);
  add(arch);
  return group;
}
