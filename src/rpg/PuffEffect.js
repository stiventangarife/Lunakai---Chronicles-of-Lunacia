// PuffEffect.js — Nubecita de humo (cambio de Axie compañero, 19-oct).
// Bolitas de humo suaves (sprites con textura radial) que salen del suelo, crecen, suben un poco y se desvanecen.
// Autónomo: se anima con su propio requestAnimationFrame y se limpia al terminar.
import * as THREE from 'three';

let _tex = null;
function puffTexture() {
  if (_tex) return _tex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.75)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  _tex = new THREE.CanvasTexture(c);
  _tex.colorSpace = THREE.SRGBColorSpace;
  return _tex;
}

/**
 * spawnPuff(parent, position, { count, radius, duration, color }) → Promise que se resuelve al terminar.
 * parent: el objeto 3D donde se añade (la escena o el grupo de la zona).
 */
export function spawnPuff(parent, position, { count = 16, radius = 0.9, duration = 0.75, color = 0xf4f1ea } = {}) {
  if (!parent || !position) return Promise.resolve();
  const group = new THREE.Group();
  group.name = 'CompanionPuff';
  group.position.copy(position);
  parent.add(group);
  const puffs = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({ map: puffTexture(), color, transparent: true, depthWrite: false, opacity: 0.95 });
    const s = new THREE.Sprite(mat);
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const r = radius * (0.25 + Math.random() * 0.35);
    s.position.set(Math.cos(a) * r, 0.25 + Math.random() * 0.5, Math.sin(a) * r);
    const size = 0.5 + Math.random() * 0.4;
    s.scale.setScalar(size * 0.4);
    puffs.push({ s, a, size, rise: 0.4 + Math.random() * 0.6, spread: radius * (0.5 + Math.random() * 0.5), delay: Math.random() * 0.12 });
    group.add(s);
  }
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      for (const p of puffs) {
        const k = Math.max(0, Math.min(1, (t - p.delay) / duration));
        const e = 1 - Math.pow(1 - k, 3); // sale rápido y frena
        p.s.position.x = Math.cos(p.a) * p.spread * (0.3 + 0.7 * e);
        p.s.position.z = Math.sin(p.a) * p.spread * (0.3 + 0.7 * e);
        p.s.position.y = 0.25 + p.rise * e;
        p.s.scale.setScalar(p.size * (0.4 + 0.9 * e));
        p.s.material.opacity = 0.95 * (1 - k * k);
      }
      if (t < duration + 0.15) { requestAnimationFrame(tick); return; }
      parent.remove(group);
      puffs.forEach((p) => p.s.material.dispose());
      resolve();
    };
    requestAnimationFrame(tick);
  });
}
