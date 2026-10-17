// EnemyNameplate.js — Placa de nombre y alerta de los enemigos del mundo abierto (Crónica Celeste).
//
// Sigue la «Placa de entidad» del sistema de diseño: nombre en tipografía de títulos con sombra, un filo
// con el color del bando y una línea de datos (nivel y tamaño del grupo). Sin caja: deja ver la escena.
//
// Criterios de UX:
//   · Aparece al acercarse y se desvanece con la distancia → el mundo no se llena de etiquetas lejanas.
//   · Al detectarte, la placa pasa a rojo y sale el rombo «!» (mismo lenguaje que las marcas de los NPC).
//   · El grupo (×3) va como dato aparte, no pegado al nombre.
import * as THREE from 'three';

const W = 512, H = 136;
const FONT_NAME = "'Marcellus', Georgia, serif";
const FONT_UI = "'Nunito Sans', 'Segoe UI', sans-serif";

/** Separa «Support Slime (x3)» en nombre y tamaño del grupo. */
function parseName(config) {
  const raw = String(config.name || 'Quimera');
  const m = raw.match(/\s*\((?:x|×)\s*(\d+)\)\s*$/i);
  const name = m ? raw.slice(0, m.index) : raw;
  const pack = m ? Number(m[1]) : (config.packData?.packSize || 1);
  return { name: name.charAt(0).toUpperCase() + name.slice(1), pack };
}

function drawPlate(canvas, { name, tier, pack, alert }) {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, W, H);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';

  // Nombre
  let size = 44;
  c.font = `400 ${size}px ${FONT_NAME}`;
  while (c.measureText(name).width > W - 40 && size > 26) { size -= 2; c.font = `400 ${size}px ${FONT_NAME}`; }
  c.shadowColor = 'rgba(0, 0, 0, 0.75)';
  c.shadowBlur = 10;
  c.shadowOffsetY = 2;
  c.fillStyle = alert ? '#FFD6D3' : '#FAF6EE';
  c.fillText(name, W / 2, 54);
  // contorno suave para leerse sobre hierba clara
  c.shadowBlur = 0; c.shadowOffsetY = 0;
  c.lineWidth = 3; c.strokeStyle = 'rgba(11, 15, 28, 0.55)';
  c.strokeText(name, W / 2, 54);
  c.fillText(name, W / 2, 54);

  // Filo con el color del bando (rojo enemigo; más intenso en alerta)
  const lw = Math.min(W - 80, Math.max(180, c.measureText(name).width + 40));
  const g = c.createLinearGradient(W / 2 - lw / 2, 0, W / 2 + lw / 2, 0);
  const col = alert ? '232, 112, 107' : '211, 174, 108';
  g.addColorStop(0, `rgba(${col}, 0)`);
  g.addColorStop(0.5, `rgba(${col}, ${alert ? 1 : 0.85})`);
  g.addColorStop(1, `rgba(${col}, 0)`);
  c.fillStyle = g;
  c.fillRect(W / 2 - lw / 2, 68, lw, 3);
  // rombo central
  c.save();
  c.translate(W / 2, 69.5);
  c.rotate(Math.PI / 4);
  c.fillStyle = alert ? '#E8706B' : '#EED39A';
  c.fillRect(-5, -5, 10, 10);
  c.restore();

  // Datos: nivel · grupo
  const parts = [];
  if (tier) parts.push(`NV. ${tier}`);
  if (pack > 1) parts.push(`GRUPO ×${pack}`);
  if (parts.length) {
    c.font = `800 22px ${FONT_UI}`;
    c.shadowColor = 'rgba(0, 0, 0, 0.8)'; c.shadowBlur = 6;
    c.fillStyle = alert ? '#FF9C95' : '#C8CFDF';
    const txt = parts.join('  ·  ');
    // espaciado de letras manual (canvas no tiene letter-spacing en todos los navegadores)
    const chars = [...txt];
    const sp = 2.2;
    const total = chars.reduce((a, ch) => a + c.measureText(ch).width + sp, -sp);
    let x = W / 2 - total / 2;
    c.textAlign = 'left';
    chars.forEach((ch) => { c.fillText(ch, x, 104); x += c.measureText(ch).width + sp; });
    c.shadowBlur = 0;
  }
}

function drawAlert(canvas) {
  const c = canvas.getContext('2d');
  const S = canvas.width;
  c.clearRect(0, 0, S, S);
  c.save();
  c.translate(S / 2, S / 2);
  c.rotate(Math.PI / 4);
  const r = S * 0.3;
  // halo
  c.shadowColor = 'rgba(232, 112, 107, 0.75)';
  c.shadowBlur = S * 0.08;
  const g = c.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, '#F6A39E');
  g.addColorStop(0.55, '#E0605A');
  g.addColorStop(1, '#8A2622');
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(-r, -r, r * 2, r * 2, S * 0.05);
  c.fill();
  c.shadowBlur = 0;
  // borde oscuro y filo marfil
  c.lineWidth = S * 0.035;
  c.strokeStyle = 'rgba(11, 15, 28, 0.85)';
  c.stroke();
  c.lineWidth = S * 0.012;
  c.strokeStyle = 'rgba(255, 241, 207, 0.85)';
  c.beginPath();
  c.roundRect(-r + S * 0.03, -r + S * 0.03, (r - S * 0.03) * 2, (r - S * 0.03) * 2, S * 0.035);
  c.stroke();
  c.restore();
  // «!»
  c.fillStyle = '#FFFFFF';
  c.font = `900 ${Math.round(S * 0.42)}px ${FONT_UI}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.shadowColor = 'rgba(0, 0, 0, 0.45)'; c.shadowBlur = S * 0.02; c.shadowOffsetY = S * 0.01;
  c.fillText('!', S / 2, S / 2 + S * 0.01);
}

/** Rombo «!» de alerta. Devuelve un Sprite oculto (escala 0); WanderingMonsters lo hace aparecer. */
export function createEnemyAlertSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  drawAlert(canvas);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(0, 0, 1);
  sprite.renderOrder = 11;
  if (document.fonts?.load) document.fonts.load(`900 100px ${FONT_UI}`).then(() => { drawAlert(canvas); tex.needsUpdate = true; }).catch(() => {});
  return sprite;
}

/**
 * Placa de nombre. Devuelve { sprite, setAlert(bool), updateDistance(dist, detectionRadius) }.
 */
export function createEnemyNameplate(config) {
  const info = { ...parseName(config), tier: config.tier || 0, alert: false };
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  drawPlate(canvas, info);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.5, 2.5 * H / W, 1);
  sprite.renderOrder = 10;
  sprite.visible = false;

  const redraw = () => { drawPlate(canvas, info); tex.needsUpdate = true; };
  if (document.fonts?.load) {
    Promise.all([document.fonts.load(`400 44px ${FONT_NAME}`), document.fonts.load(`800 22px ${FONT_UI}`)]).then(redraw).catch(() => {});
  }

  let shown = 0;
  return {
    sprite,
    setAlert(on) {
      on = Boolean(on);
      if (on === info.alert) return;
      info.alert = on;
      redraw();
    },
    /** Visible al acercarse: aparece desde ~2,2× el radio de detección y queda nítida a ~1,6×. En alerta, siempre visible. */
    updateDistance(dist, detectionRadius = 7, dt = 0.016) {
      const far = detectionRadius * 2.2, near = detectionRadius * 1.6;
      const target = info.alert ? 1 : Math.max(0, Math.min(1, (far - dist) / Math.max(0.001, far - near)));
      shown += (target - shown) * Math.min(1, dt * 8);
      if (shown < 0.01) { sprite.visible = false; mat.opacity = 0; return; }
      sprite.visible = true;
      mat.opacity = shown;
    }
  };
}
