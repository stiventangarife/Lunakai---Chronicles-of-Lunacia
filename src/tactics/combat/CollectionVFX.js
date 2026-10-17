// CollectionVFX.js — VFX propio de las partes de colección especial (Japan, Xmas, Mystic, Summer, Nightmare, Shiny, Bionic).
//
// Escucha el bus de eventos del combate (spell:cast) como cualquier motor de presentación: si la carta lanzada es de
// colección (spell.collection, cartas Japan/Xmas) o sale de una parte de colección del lanzador (caster.partCollections),
// añade sobre el lanzador un anillo y una nube de partículas con la estética de esa colección. No toca la lógica.
// Se puede desinstalar o sustituir por el motor de VFX propio sin cambiar nada más (uninstall()).

import * as THREE from 'three';

const THEMES = {
  japan:     { colors: [0xffb7d5, 0xff8fbf, 0xffffff], shape: 'petal', ring: 0xff7eb6, count: 26, rise: -0.25, spread: 1.6, spin: 2.2 },
  xmas:      { colors: [0xffffff, 0xd9f2ff, 0xff4d4d, 0x3ddc84], shape: 'flake', ring: 0xe8f7ff, count: 30, rise: -0.35, spread: 1.7, spin: 1.2 },
  mystic:    { colors: [0xc9a2ff, 0xffe08a, 0x8fd3ff], shape: 'star', ring: 0xb388ff, count: 24, rise: 0.9, spread: 1.2, spin: 1.6 },
  summer:    { colors: [0x5ee7ff, 0xffe066, 0xffffff], shape: 'dot', ring: 0x4fd1ff, count: 24, rise: 0.7, spread: 1.3, spin: 0.6 },
  nightmare: { colors: [0x5b2a86, 0x8e44ad, 0x1b0a2a], shape: 'wisp', ring: 0x7b2cbf, count: 22, rise: 1.0, spread: 1.0, spin: 0.8 },
  shiny:     { colors: [0xff6b6b, 0xffd93d, 0x6bcB77, 0x4d96ff, 0xc77dff], shape: 'star', ring: 0xffffff, count: 30, rise: 0.8, spread: 1.4, spin: 2.5 },
  bionic:    { colors: [0x5ef2ff, 0xb0fbff, 0xffffff], shape: 'dot', ring: 0x22d3ee, count: 22, rise: 0.5, spread: 1.1, spin: 3.0 },
};
const DURATION = 1.4; // s

function makeTexture(shape) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.translate(32, 32); g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  if (shape === 'petal') { g.beginPath(); g.ellipse(0, 0, 12, 24, 0.5, 0, Math.PI * 2); g.fill(); }
  else if (shape === 'flake') { g.lineWidth = 4; for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 26); g.moveTo(0, 15); g.lineTo(7, 21); g.moveTo(0, 15); g.lineTo(-7, 21); g.stroke(); } }
  else if (shape === 'star') { g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 10 : 28; const a = (i / 10) * Math.PI * 2; g.lineTo(Math.sin(a) * r, Math.cos(a) * r); } g.closePath(); g.fill(); }
  else { const grd = g.createRadialGradient(0, 0, 0, 0, 0, 30); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(shape === 'wisp' ? 0.6 : 0.35, 'rgba(255,255,255,0.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(-32, -32, 64, 64); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class CollectionVFX {
  constructor(scene) {
    this.scene = scene;
    this._offs = [];
    this._tex = {};
    this._live = new Set();
    this._raf = null;
  }

  install(events) {
    this._offs.push(events.on('spell:cast', ({ caster, spell, casterPos }) => {
      const col = spell?.collection || caster?.partCollections?.[spell?.id];
      if (col && THEMES[col] && casterPos) this.play(col, casterPos);
    }));
    return this;
  }

  uninstall() {
    this._offs.forEach((off) => typeof off === 'function' && off());
    this._offs = [];
  }

  _texture(shape) { return (this._tex[shape] ||= makeTexture(shape)); }

  /** Anillo + partículas de la colección sobre una posición del mundo. */
  play(collection, pos) {
    const th = THEMES[collection];
    if (!th || !this.scene) return;
    const group = new THREE.Group();
    group.position.set(pos.x, (pos.y || 0) + 0.05, pos.z);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 1.0, 64),
      new THREE.MeshBasicMaterial({ color: th.ring, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);

    const tex = this._texture(th.shape);
    const parts = [];
    for (let i = 0; i < th.count; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, color: th.colors[i % th.colors.length], transparent: true, depthWrite: false, blending: collection === 'nightmare' ? THREE.NormalBlending : THREE.AdditiveBlending });
      const s = new THREE.Sprite(m);
      const a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * th.spread;
      const startY = th.rise < 0 ? 3.2 + Math.random() * 1.6 : 0.2 + Math.random() * 0.8;
      s.userData = { a, r, y0: startY, vy: th.rise * (0.6 + Math.random() * 0.8), w: (Math.random() - 0.5) * th.spin, size: 0.35 + Math.random() * 0.35, delay: Math.random() * 0.35 };
      s.scale.setScalar(0.001);
      group.add(s); parts.push(s);
    }
    this.scene.add(group);
    this._live.add({ group, ring, parts, t: 0 });
    if (!this._raf) this._loop(performance.now());
  }

  _loop(prev) {
    this._raf = requestAnimationFrame((now) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      for (const fx of [...this._live]) {
        fx.t += dt;
        const k = fx.t / DURATION;
        fx.ring.scale.setScalar(1 + k * 2.6);
        fx.ring.material.opacity = Math.max(0, 0.9 * (1 - k));
        for (const s of fx.parts) {
          const u = s.userData, lt = Math.max(0, fx.t - u.delay);
          const a = u.a + u.w * lt, r = u.r + lt * 1.1;
          s.position.set(Math.cos(a) * r, Math.max(0.05, u.y0 + u.vy * lt * 3.2), Math.sin(a) * r);
          const life = Math.min(1, lt / 0.2) * Math.max(0, 1 - lt / (DURATION - u.delay));
          s.scale.setScalar(u.size * (0.4 + life));
          s.material.opacity = life;
          s.material.rotation += u.w * dt;
        }
        if (fx.t >= DURATION) this._dispose(fx);
      }
      if (this._live.size) this._loop(now); else this._raf = null;
    });
  }

  _dispose(fx) {
    this._live.delete(fx);
    this.scene.remove(fx.group);
    fx.ring.geometry.dispose(); fx.ring.material.dispose();
    fx.parts.forEach((s) => s.material.dispose());
  }
}
