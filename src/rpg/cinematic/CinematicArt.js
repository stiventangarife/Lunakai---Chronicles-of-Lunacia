// CinematicArt.js — Arte procedural de la cinemática del prólogo (Hito 48). Todo se dibuja en Canvas 2D,
// sin imágenes externas: papel, constelaciones, luna, Gran Árbol, friso de piedra, islas y tótems.
// Cada función devuelve un <canvas> que PrologueCinematic convierte en textura.

/** Generador pseudoaleatorio con semilla (las texturas salen iguales en cada partida). */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
}

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/** Papel: fondo cálido con manchas, fibras y motas. Se repite (RepeatWrapping) y se multiplica en el post. */
export function paperCanvas(size = 1024, seed = 7) {
  const c = cv(size, size), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#ece0c4'; g.fillRect(0, 0, size, size);
  // manchas suaves (se dibujan 3 veces desplazadas para que el borde empalme al repetir)
  const blot = (x, y, rad, col, a) => {
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
      gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(1, col.replace('A', 0));
      g.fillStyle = gr; g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
    }
  };
  for (let i = 0; i < 70; i++) blot(r() * size, r() * size, 40 + r() * 220, 'rgba(150,118,70,A)', 0.05 + r() * 0.08);
  for (let i = 0; i < 40; i++) blot(r() * size, r() * size, 30 + r() * 160, 'rgba(255,250,235,A)', 0.08 + r() * 0.1);
  // fibras
  g.lineCap = 'round';
  for (let i = 0; i < 1600; i++) {
    const x = r() * size, y = r() * size, l = 6 + r() * 26, a = r() * Math.PI * 2;
    g.strokeStyle = `rgba(${r() < 0.5 ? '120,92,52' : '255,248,230'},${0.05 + r() * 0.08})`;
    g.lineWidth = 0.6 + r() * 0.8;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  // motas
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(90,64,30,${0.04 + r() * 0.12})`;
    const s = r() < 0.92 ? 1 : 2;
    g.fillRect(r() * size, r() * size, s, s);
  }
  return c;
}

/** Degradado vertical a pantalla completa (fondo de cada plano). stops: [[0,'#..'],[1,'#..']]. */
export function gradientCanvas(stops, w = 16, h = 512, radial = false) {
  const c = cv(radial ? 512 : w, h), g = c.getContext('2d');
  const gr = radial ? g.createRadialGradient(256, h * 0.45, 0, 256, h * 0.45, h * 0.75) : g.createLinearGradient(0, 0, 0, h);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, c.width, h);
  return c;
}

/** Disco suave para brillos (estrellas, ojos, esquirlas). */
export function glowCanvas(size = 128, inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = cv(size, size), g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner); gr.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.55)')); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return c;
}

/** Estrella de 4 puntas (destello). */
export function sparkleCanvas(size = 128) {
  const c = cv(size, size), g = c.getContext('2d'), m = size / 2;
  const gr = g.createRadialGradient(m, m, 0, m, m, m);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, 'rgba(255,240,200,0.9)'); gr.addColorStop(0.4, 'rgba(255,220,150,0.15)'); gr.addColorStop(1, 'rgba(255,220,150,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  g.fillStyle = 'rgba(255,250,230,0.95)';
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, rr = i % 2 === 0 ? m * 0.98 : m * 0.07;
    g.lineTo(m + Math.cos(a) * rr, m + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
  return c;
}

/** Luna con cráteres a tinta (papel marfil). */
/**
 * Mordisco de la luna rota (coordenadas 0–1 del lienzo, como crackPaths): el trozo que se desprende al
 * romperse. Lo que queda es una media luna abierta hacia abajo a la derecha.
 */
export const MOON_BITE = { x: 0.77, y: 0.72, r: 0.22 };

export function moonCanvas(size = 512, seed = 11, bite = null) {
  const c = cv(size, size), g = c.getContext('2d'), r = rng(seed), m = size / 2, R = m * 0.94;
  const gr = g.createRadialGradient(m * 0.8, m * 0.75, R * 0.1, m, m, R);
  gr.addColorStop(0, '#fff8e6'); gr.addColorStop(0.7, '#f1dfb2'); gr.addColorStop(1, '#d9bb7d');
  g.fillStyle = gr; g.beginPath(); g.arc(m, m, R, 0, Math.PI * 2); g.fill();
  g.save(); g.beginPath(); g.arc(m, m, R, 0, Math.PI * 2); g.clip();
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R * 0.85, cr = 6 + r() * r() * 70;
    const x = m + Math.cos(a) * d, y = m + Math.sin(a) * d;
    g.fillStyle = `rgba(160,120,60,${0.08 + r() * 0.12})`; g.beginPath(); g.arc(x, y, cr, 0, Math.PI * 2); g.fill();
    g.strokeStyle = `rgba(110,78,36,${0.25 + r() * 0.25})`; g.lineWidth = 1.5 + r() * 2;
    g.beginPath(); g.arc(x, y, cr, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
  }
  // sombreado a plumilla en el borde
  g.strokeStyle = 'rgba(110,78,36,0.18)'; g.lineWidth = 2;
  for (let i = 0; i < 70; i++) {
    const a = Math.PI * 0.15 + (i / 70) * Math.PI * 0.9;
    g.beginPath(); g.moveTo(m + Math.cos(a) * R * 0.78, m + Math.sin(a) * R * 0.78); g.lineTo(m + Math.cos(a) * R, m + Math.sin(a) * R); g.stroke();
  }
  g.restore();
  g.strokeStyle = '#6e4e24'; g.lineWidth = 6; g.beginPath(); g.arc(m, m, R, 0, Math.PI * 2); g.stroke();
  if (bite) {
    // Se recorta el trozo que se rompió y se repasa su borde con la misma tinta (solo dentro del disco)
    const bx = bite.x * size, by = bite.y * size, br = bite.r * size;
    g.save(); g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill();
    g.restore();
    g.save(); g.beginPath(); g.arc(m, m, R + 4, 0, Math.PI * 2); g.clip();
    g.strokeStyle = '#6e4e24'; g.lineWidth = 6; g.beginPath(); g.arc(bx, by, br + 2, 0, Math.PI * 2); g.stroke();
    g.restore();
  }
  return c;
}

/** Corazón pequeño dorado y luminoso (vínculo Sapidae–Axie). */
export function heartCanvas(size = 128, col = '255,216,137') {
  const c = cv(size, size), g = c.getContext('2d'), m = size / 2;
  const heart = (s) => {
    g.beginPath();
    g.moveTo(m, m + s * 0.62);
    g.bezierCurveTo(m - s * 0.95, m + s * 0.02, m - s * 0.62, m - s * 0.72, m, m - s * 0.3);
    g.bezierCurveTo(m + s * 0.62, m - s * 0.72, m + s * 0.95, m + s * 0.02, m, m + s * 0.62);
    g.closePath();
  };
  const gl = g.createRadialGradient(m, m, 0, m, m, m);
  gl.addColorStop(0, `rgba(${col},0.55)`); gl.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gl; g.fillRect(0, 0, size, size);
  heart(size * 0.36); g.fillStyle = `rgba(${col},1)`; g.fill();
  heart(size * 0.2); g.fillStyle = 'rgba(255,248,225,0.9)'; g.fill();
  return c;
}

/** Grietas de la luna: polilíneas quebradas desde un punto (coordenadas 0–1 del disco). */
export function crackPaths(seed = 21, count = 7, { from = [0.47, 0.42], within = null } = {}) {
  const r = rng(seed), out = [];
  // within = { x, y, r }: las grietas no salen de ese círculo (el trozo que se va a romper)
  const inside = (x, y) => Math.hypot(x - 0.5, y - 0.5) <= 0.47 && (!within || Math.hypot(x - within.x, y - within.y) <= within.r * 1.05);
  for (let i = 0; i < count; i++) {
    const pts = [[...from]];
    let a = (i / count) * Math.PI * 2 + r() * 0.5, x = from[0], y = from[1];
    const steps = 5 + Math.floor(r() * 4);
    for (let k = 0; k < steps; k++) {
      a += (r() - 0.5) * 0.9;
      const l = 0.05 + r() * 0.07;
      x += Math.cos(a) * l; y += Math.sin(a) * l;
      pts.push([x, y]);
      if (!inside(x, y)) break;
    }
    out.push(pts);
    if (r() < 0.6) { // rama
      const b = pts[Math.min(pts.length - 1, 2 + Math.floor(r() * 2))];
      const br = [[...b]]; let bx = b[0], by = b[1], ba = a + (r() < 0.5 ? 1 : -1) * (0.7 + r() * 0.6);
      for (let k = 0; k < 3; k++) { ba += (r() - 0.5) * 0.7; bx += Math.cos(ba) * 0.05; by += Math.sin(ba) * 0.05; if (!inside(bx, by)) break; br.push([bx, by]); }
      if (br.length > 1) out.push(br);
    }
  }
  return out;
}

/** Gran Árbol sobre una colina (silueta a tinta, transparente). */
export function treeCanvas(w = 1024, h = 1024, seed = 5, ink = '#3b2614') {
  const c = cv(w, h), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = ink; g.strokeStyle = ink; g.lineCap = 'round';
  // colina
  g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * 0.86);
  g.bezierCurveTo(w * 0.25, h * 0.80, w * 0.38, h * 0.74, w * 0.5, h * 0.74);
  g.bezierCurveTo(w * 0.62, h * 0.74, w * 0.78, h * 0.81, w, h * 0.87); g.lineTo(w, h); g.closePath(); g.fill();
  // tronco y ramas
  const branch = (x, y, a, len, wid, depth) => {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    g.lineWidth = wid;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo((x + x2) / 2 + (r() - 0.5) * len * 0.3, (y + y2) / 2 + (r() - 0.5) * len * 0.3, x2, y2); g.stroke();
    if (depth <= 0 || wid < 2) {
      // copa: racimo de hojas
      for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(x2 + (r() - 0.5) * 60, y2 + (r() - 0.5) * 44, 16 + r() * 30, 0, Math.PI * 2); g.fill(); }
      return;
    }
    const n = 2 + (r() < 0.45 ? 1 : 0);
    for (let i = 0; i < n; i++) branch(x2, y2, a + (r() - 0.5) * 1.25 + (i - (n - 1) / 2) * 0.5, len * (0.68 + r() * 0.12), wid * 0.66, depth - 1);
  };
  // raíces
  for (let i = 0; i < 6; i++) branch(w / 2 + (r() - 0.5) * 30, h * 0.75, Math.PI * (0.1 + r() * 0.8), 50 + r() * 60, 14, 0);
  g.lineWidth = 64; g.beginPath(); g.moveTo(w / 2 - 6, h * 0.76); g.quadraticCurveTo(w / 2 + 18, h * 0.6, w / 2, h * 0.47); g.stroke();
  branch(w / 2, h * 0.5, -Math.PI / 2 - 0.25, 170, 40, 5);
  branch(w / 2, h * 0.5, -Math.PI / 2 + 0.3, 160, 38, 5);
  branch(w / 2, h * 0.56, -Math.PI / 2 - 0.9, 130, 30, 4);
  branch(w / 2, h * 0.56, -Math.PI / 2 + 0.95, 130, 30, 4);
  return c;
}

/** Islas flotantes en silueta (franja ancha, transparente). */
export function islandsCanvas(w = 2048, h = 512, seed = 3, ink = '#4a3320', n = 6) {
  const c = cv(w, h), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = ink;
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5 + (r() - 0.5) * 0.4) * (w / n), cy = h * (0.35 + r() * 0.3), iw = 90 + r() * 170, ih = 40 + r() * 60;
    g.beginPath(); g.moveTo(cx - iw, cy);
    // parte superior con colinas
    for (let k = 0; k <= 8; k++) g.lineTo(cx - iw + (k / 8) * iw * 2, cy - (r() * 0.5 + 0.2) * ih * Math.sin((k / 8) * Math.PI));
    // roca colgante
    g.lineTo(cx + iw * 0.7, cy + ih * 0.5); g.lineTo(cx + iw * 0.2, cy + ih * 1.6); g.lineTo(cx - iw * 0.1, cy + ih * 2.4); g.lineTo(cx - iw * 0.45, cy + ih * 1.2); g.lineTo(cx - iw * 0.8, cy + ih * 0.4);
    g.closePath(); g.fill();
    // arbolitos
    for (let k = 0; k < 3; k++) {
      const tx = cx - iw * 0.6 + r() * iw * 1.2, ty = cy - ih * 0.35;
      g.beginPath(); g.moveTo(tx, ty - 50 - r() * 30); g.lineTo(tx - 18, ty); g.lineTo(tx + 18, ty); g.closePath(); g.fill();
    }
  }
  return c;
}

/** Friso de piedra: banda con greca arriba y abajo, piedra con vetas y lunas talladas. */
export function friezeCanvas(w = 4096, h = 768, seed = 9) {
  const c = cv(w, h), g = c.getContext('2d'), r = rng(seed);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#c9ac7c'); gr.addColorStop(0.5, '#d8bf93'); gr.addColorStop(1, '#bf9f6c');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // vetas y poros de la piedra
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '95,70,40' : '250,235,205'},${0.05 + r() * 0.1})`;
    g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 10, 1 + r() * 4, r() * 3, 0, Math.PI * 2); g.fill();
  }
  // juntas de los bloques
  g.strokeStyle = 'rgba(90,64,34,0.35)'; g.lineWidth = 3;
  for (let x = 0; x < w; x += 512 + r() * 80) { g.beginPath(); g.moveTo(x, h * 0.17); g.lineTo(x + (r() - 0.5) * 8, h * 0.83); g.stroke(); }
  // bandas con greca
  const band = (y0, bh) => {
    g.fillStyle = '#5a3d1e'; g.fillRect(0, y0, w, bh);
    g.strokeStyle = '#d9b46a'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(0, y0 + 6); g.lineTo(w, y0 + 6); g.moveTo(0, y0 + bh - 6); g.lineTo(w, y0 + bh - 6); g.stroke();
    const s = bh - 28, y = y0 + 14;
    g.lineWidth = 6; g.strokeStyle = '#c99a4a';
    for (let x = 10; x < w; x += s * 1.6) {
      g.beginPath();
      g.moveTo(x, y + s); g.lineTo(x, y); g.lineTo(x + s, y); g.lineTo(x + s, y + s * 0.62); g.lineTo(x + s * 0.38, y + s * 0.62); g.lineTo(x + s * 0.38, y + s * 0.3);
      g.moveTo(x + s, y + s); g.lineTo(x + s * 1.6, y + s);
      g.stroke();
    }
  };
  band(0, h * 0.14); band(h * 0.86, h * 0.14);
  // lunas y estrellas talladas
  g.fillStyle = 'rgba(90,64,34,0.28)';
  for (let x = 220; x < w; x += 680) {
    const y = h * 0.27;
    g.beginPath(); g.arc(x, y, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d3b98c'; g.beginPath(); g.arc(x + 14, y - 6, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(90,64,34,0.28)';
  }
  // suelo tallado
  g.strokeStyle = 'rgba(70,48,24,0.5)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(0, h * 0.76); for (let x = 0; x <= w; x += 64) g.lineTo(x, h * 0.76 + Math.sin(x * 0.01) * 4); g.stroke();
  return c;
}

/** Tótem con hueco para la esquirla (silueta). */
export function totemCanvas(w = 256, h = 768, ink = '#24120a') {
  const c = cv(w, h), g = c.getContext('2d');
  g.fillStyle = ink;
  g.beginPath();
  g.moveTo(w * 0.32, h); g.lineTo(w * 0.3, h * 0.35); g.lineTo(w * 0.12, h * 0.3); g.lineTo(w * 0.22, h * 0.2);
  g.lineTo(w * 0.36, h * 0.24); g.lineTo(w * 0.5, h * 0.12); g.lineTo(w * 0.64, h * 0.24); g.lineTo(w * 0.78, h * 0.2);
  g.lineTo(w * 0.88, h * 0.3); g.lineTo(w * 0.7, h * 0.35); g.lineTo(w * 0.68, h); g.closePath(); g.fill();
  // tallas
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(w * 0.5, h * (0.45 + i * 0.13), w * 0.1, h * 0.025, 0, 0, Math.PI * 2); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  return c;
}

/** Humo / tinta para la corrupción (manchas negras difusas). */
export function smokeCanvas(size = 256, seed = 13) {
  const c = cv(size, size), g = c.getContext('2d'), r = rng(seed), m = size / 2;
  for (let i = 0; i < 18; i++) {
    const x = m + (r() - 0.5) * size * 0.5, y = m + (r() - 0.5) * size * 0.5, rad = size * (0.12 + r() * 0.22);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(10,4,4,0.55)'); gr.addColorStop(1, 'rgba(10,4,4,0)');
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
  }
  return c;
}

/** Anillo (onda expansiva). */
export function ringCanvas(size = 512, col = '255,226,150') {
  const c = cv(size, size), g = c.getContext('2d'), m = size / 2;
  const gr = g.createRadialGradient(m, m, m * 0.62, m, m, m);
  gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.7, `rgba(${col},0.9)`); gr.addColorStop(0.8, `rgba(255,255,255,1)`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return c;
}

/** Rayos de luz (abanico desde abajo al centro). */
export function raysCanvas(size = 1024, n = 22, seed = 17, col = '255,214,130') {
  const c = cv(size, size), g = c.getContext('2d'), r = rng(seed), m = size / 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.2, wdt = 0.03 + r() * 0.06;
    const gr = g.createRadialGradient(m, m, 0, m, m, m);
    gr.addColorStop(0, `rgba(${col},${0.5 + r() * 0.4})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(m, m); g.arc(m, m, m, a - wdt, a + wdt); g.closePath(); g.fill();
  }
  return c;
}

/**
 * Constelaciones de Axies (perfil). Puntos en [-1, 1] (y hacia arriba) y aristas por índice.
 * Formas sencillas y redondeadas: orejas grandes, cuerpo de gominola y cola.
 */
export const CONSTELLATIONS = [
  { // Axie bestia (orejas puntiagudas, cola rizada)
    pts: [[-0.95, 0.15], [-1.2, 0.55], [-1.0, 0.85], [-0.6, 0.35], [-0.1, 0.5], [0.35, 0.75], [0.25, 1.15], [0.6, 0.85], [0.85, 1.12], [0.95, 0.65], [1.05, 0.25], [0.8, -0.05], [0.45, -0.2], [0.5, -0.65], [0.1, -0.35], [-0.35, -0.38], [-0.45, -0.7], [-0.75, -0.25]],
    edges: [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [12, 14], [14, 15], [15, 16], [15, 17], [17, 0]],
    big: [5, 9, 3, 12],
  },
  { // Axie pájaro (ala alzada, pico)
    pts: [[-0.9, -0.1], [-1.25, 0.1], [-1.1, -0.35], [-0.5, 0.2], [-0.2, 0.95], [0.15, 0.55], [0.45, 0.6], [0.8, 0.75], [1.2, 0.55], [0.85, 0.35], [0.7, 0.0], [0.3, -0.3], [0.25, -0.75], [-0.25, -0.4], [-0.35, -0.8]],
    edges: [[0, 1], [0, 2], [0, 3], [3, 4], [4, 5], [3, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [11, 13], [13, 14], [13, 0]],
    big: [4, 7, 11],
  },
  { // Axie acuático (aleta dorsal, cola de pez)
    pts: [[-1.25, 0.45], [-0.95, 0.05], [-1.25, -0.35], [-0.55, 0.15], [-0.2, 0.45], [0.0, 0.95], [0.3, 0.5], [0.75, 0.55], [1.15, 0.2], [0.95, -0.2], [0.5, -0.4], [0.15, -0.75], [-0.25, -0.35], [-0.55, -0.15]],
    edges: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [4, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [10, 12], [12, 13], [13, 1]],
    big: [5, 8, 10],
  },
];

/**
 * Suelo continuo de colinas en silueta (transparente arriba). El borde de las colinas queda a ~62 % de la altura
 * desde arriba, así que con un plano de alto H centrado en y, el suelo está en y + H * (0.5 - 0.62).
 */
export function hillsCanvas(w = 2048, h = 512, seed = 19, ink = '#070202') {
  const c = cv(w, h), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = ink;
  g.beginPath(); g.moveTo(0, h);
  const base = h * 0.62;
  for (let x = 0; x <= w; x += 16) {
    const y = base - Math.sin(x * 0.004 + 1.3) * h * 0.025 - Math.sin(x * 0.011) * h * 0.012;
    g.lineTo(x, y);
  }
  g.lineTo(w, h); g.closePath(); g.fill();
  // matas de hierba y rocas
  for (let i = 0; i < 160; i++) {
    const x = r() * w, y = base - Math.sin(x * 0.004 + 1.3) * h * 0.025 - Math.sin(x * 0.011) * h * 0.012 + 2;
    g.beginPath(); g.moveTo(x - 6, y);
    g.lineTo(x - 2 + (r() - 0.5) * 6, y - 10 - r() * 18); g.lineTo(x + 1, y);
    g.lineTo(x + 4 + (r() - 0.5) * 6, y - 8 - r() * 14); g.lineTo(x + 7, y); g.closePath(); g.fill();
  }
  return c;
}
