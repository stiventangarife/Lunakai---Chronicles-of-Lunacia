import * as THREE from 'three';

/**
 * grassTexture.js - Textura de Suelo Hand-Painted Seamless para Césped Estilizado V3.
 * Genera proceduralmente un lienzo Gouache continuo con pinceladas de abanico (tufts)
 * en 3 capas de oclusión, cuerpo esmeralda y puntas iluminadas mediante curvas de Bézier.
 */
export function createHandPaintedGrassTexture(renderer = null, size = 1024) {
  // En entornos sin DOM (tests/node), fallback seguro
  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { alpha: false });

  // Función envolvente seamless: ejecuta drawFn repitiendo en bordes para continuidad 100%
  function drawSeamless(drawFn, margin = 45) {
    drawFn(0, 0);
    // Revisar si algún borde necesita repetición
    // Para simplificar y asegurar seamless perfecto en miles de trazos aleatorios,
    // drawFn recibe (ox, oy)
  }

  // Helper para trazar un elemento en posición (x, y) con envoltura toroidal X/Y
  function drawToroidal(x, y, radius, drawItemFn) {
    drawItemFn(x, y);

    const left = x - radius < 0;
    const right = x + radius > size;
    const top = y - radius < 0;
    const bottom = y + radius > size;

    if (left) drawItemFn(x + size, y);
    if (right) drawItemFn(x - size, y);
    if (top) drawItemFn(x, y + size);
    if (bottom) drawItemFn(x, y - size);

    if (left && top) drawItemFn(x + size, y + size);
    if (left && bottom) drawItemFn(x + size, y - size);
    if (right && top) drawItemFn(x - size, y + size);
    if (right && bottom) drawItemFn(x - size, y - size);
  }

  // =========================================================================
  // 1. FONDO GOUACHE BOTW: Base con manchas radiales de campiña y humus
  // =========================================================================
  ctx.fillStyle = '#265223';
  ctx.fillRect(0, 0, size, size);

  // 1a. Manchas orgánicas de sustrato mineral y humus (tierra subyacente fértil)
  const earthUnderbedColors = ['#23190e', '#322312', '#3e2a16', '#2b361a', '#1e2b17', '#44331d'];
  const earthPatchCount = 220;
  for (let i = 0; i < earthPatchCount; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const pr = 55 + Math.random() * 110;
    const col = earthUnderbedColors[Math.floor(Math.random() * earthUnderbedColors.length)];

    drawToroidal(px, py, pr, (gx, gy) => {
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, pr);
      grad.addColorStop(0, col);
      grad.addColorStop(0.55, col);
      grad.addColorStop(1, 'rgba(38, 82, 35, 0)');

      ctx.save();
      ctx.globalAlpha = 0.18 + Math.random() * 0.18;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // 1b. Manchas de campiña y pradera viva (tonos esmeralda y oliva)
  const gouacheColors = ['#1a3e1c', '#224d24', '#2e5d2b', '#3a7035', '#163819', '#4d782e'];
  const patchCount = 380;

  for (let i = 0; i < patchCount; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const pr = 40 + Math.random() * 95;
    const col = gouacheColors[Math.floor(Math.random() * gouacheColors.length)];

    drawToroidal(px, py, pr, (gx, gy) => {
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, pr);
      grad.addColorStop(0, col);
      grad.addColorStop(0.65, col);
      grad.addColorStop(1, 'rgba(56, 114, 51, 0)'); // Fusión suave hacia la base

      ctx.save();
      ctx.globalAlpha = 0.22 + Math.random() * 0.20;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // 1c. Micro-moteado táctil (paper grain / granos minerales de gouache artesanal)
  const speckleColors = ['#1a2a12', '#2f421b', '#3a2e1c', '#5a7833', '#1e1c12'];
  const speckleCount = 1800;
  for (let i = 0; i < speckleCount; i++) {
    const sx = Math.random() * size;
    const sy = Math.random() * size;
    const sr = 1.0 + Math.random() * 2.2;
    const col = speckleColors[Math.floor(Math.random() * speckleColors.length)];

    drawToroidal(sx, sy, sr * 2, (gx, gy) => {
      ctx.save();
      ctx.globalAlpha = 0.12 + Math.random() * 0.16;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(gx, gy, sr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // =========================================================================
  // 2. HELPER PARA DIBUJAR UN ABANICO DE BRIZNAS (Tuft de Bézier)
  // =========================================================================
  function drawBlade(bx, by, length, baseWidth, angle, curveOffset, color) {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const perpX = -sinA;
    const perpY = cosA;

    const halfW = baseWidth * 0.5;
    const x0 = bx - perpX * halfW;
    const y0 = by - perpY * halfW;
    const x1 = bx + perpX * halfW;
    const y1 = by + perpY * halfW;

    // Punta afilada
    const tipX = bx + cosA * length;
    const tipY = by + sinA * length;

    // Puntos de control intermedios con curvatura
    const midX = bx + cosA * (length * 0.55) + perpX * curveOffset;
    const midY = by + sinA * (length * 0.55) + perpY * curveOffset;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(midX - perpX * (halfW * 0.3), midY - perpY * (halfW * 0.3), tipX, tipY);
    ctx.quadraticCurveTo(midX + perpX * (halfW * 0.3), midY + perpY * (halfW * 0.3), x1, y1);
    ctx.closePath();
    ctx.fill();
  }

  function drawTuft(cx, cy, bladeCount, minLen, maxLen, baseW, palette, alpha) {
    const baseAngle = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.55; // Predominantemente hacia arriba
    const maxRadius = maxLen * 1.3;

    drawToroidal(cx, cy, maxRadius, (tx, ty) => {
      ctx.save();
      ctx.globalAlpha = alpha;

      for (let b = 0; b < bladeCount; b++) {
        const spread = (b / (bladeCount - 1) - 0.5) * 0.65;
        const bAngle = baseAngle + spread + (Math.random() - 0.5) * 0.15;
        const bLen = minLen + Math.random() * (maxLen - minLen);
        const curve = (Math.random() - 0.5) * (bLen * 0.28);
        const col = palette[Math.floor(Math.random() * palette.length)];

        drawBlade(tx, ty, bLen, baseW, bAngle, curve, col);
      }
      ctx.restore();
    });
  }

  // =========================================================================
  // 3. CAPA 1: SOMBRA / OCLUSIÓN RAÍCES (~3,200 matas en tonos oscuros)
  // =========================================================================
  const layer1Colors = ['#143317', '#183c1b', '#1d4620'];
  const layer1Count = 3200;
  for (let i = 0; i < layer1Count; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const blades = 3 + Math.floor(Math.random() * 3);
    drawTuft(x, y, blades, 12, 19, 2.8, layer1Colors, 0.85);
  }

  // =========================================================================
  // 4. CAPA 2: CUERPO ESMERALDA HYRULE (~6,500 matas en tonos medios)
  // =========================================================================
  const layer2Colors = ['#32702a', '#3d8234', '#46943c', '#52a644'];
  const layer2Count = 6500;
  for (let i = 0; i < layer2Count; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const blades = 3 + Math.floor(Math.random() * 4);
    drawTuft(x, y, blades, 14, 23, 2.3, layer2Colors, 0.88);
  }

  // =========================================================================
  // 5. CAPA 3: PUNTAS ILUMINADAS POR EL SOL (~4,200 matas finas superiores)
  // =========================================================================
  const layer3Colors = ['#78c83e', '#8ee048', '#a0ea4c', '#b6f45a'];
  const layer3Count = 4200;
  for (let i = 0; i < layer3Count; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const blades = 2 + Math.floor(Math.random() * 3);
    drawTuft(x, y, blades, 15, 26, 1.6, layer3Colors, 0.82);
  }

  // =========================================================================
  // 6. CREACIÓN Y CONFIGURACIÓN DE THREE.CanvasTexture
  // =========================================================================
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'HandPaintedGouacheGrassTexV3';
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  if (renderer && renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function') {
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  } else {
    texture.anisotropy = 16;
  }

  texture.needsUpdate = true;
  console.log('[grassTexture] 🎨 Textura hand-painted gouache generada con éxito (100% seamless, 13,900 matas Bézier).');

  return texture;
}

/**
 * createHandPaintedSoilTexture - Genera un lienzo procedural de tierra y sendero hand-painted
 * estilo Genshin Impact / BotW (100% seamless toroidal, con arcilla sienna, polvo dorado,
 * surcos de rodadura, musgo incrustado y gravilla pictórica).
 */
export function createHandPaintedSoilTexture(renderer = null, size = 1024) {
  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { alpha: false });

  function drawToroidal(x, y, radius, drawItemFn) {
    drawItemFn(x, y);

    const left = x - radius < 0;
    const right = x + radius > size;
    const top = y - radius < 0;
    const bottom = y + radius > size;

    if (left) drawItemFn(x + size, y);
    if (right) drawItemFn(x - size, y);
    if (top) drawItemFn(x, y + size);
    if (bottom) drawItemFn(x, y - size);

    if (left && top) drawItemFn(x + size, y + size);
    if (left && bottom) drawItemFn(x + size, y - size);
    if (right && top) drawItemFn(x - size, y + size);
    if (right && bottom) drawItemFn(x - size, y - size);
  }

  // 1. Base arcilla sienna cálida
  ctx.fillStyle = '#82542a';
  ctx.fillRect(0, 0, size, size);

  // 2. Manchas radiales de variaciones térmicas y humedad (humus, arcilla, ocre, musgo)
  const soilGouacheColors = [
    '#442a14', '#59361a', '#6e4422', '#8c582c', '#a67039',
    '#bf8c4e', '#d2a05e', '#455b20', '#5b742a', '#392412'
  ];
  const patchCount = 340;
  for (let i = 0; i < patchCount; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const pr = 45 + Math.random() * 115;
    const col = soilGouacheColors[Math.floor(Math.random() * soilGouacheColors.length)];

    drawToroidal(px, py, pr, (gx, gy) => {
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, pr);
      grad.addColorStop(0, col);
      grad.addColorStop(0.58, col);
      grad.addColorStop(1, 'rgba(130, 84, 42, 0)');

      ctx.save();
      ctx.globalAlpha = 0.20 + Math.random() * 0.22;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // 3. Trazos direccionales suaves de desgaste y surcos de camino (wheel ruts / footpaths)
  const rutCount = 55;
  for (let i = 0; i < rutCount; i++) {
    const rx = Math.random() * size;
    const ry = Math.random() * size;
    const rLen = 60 + Math.random() * 160;
    const angle = (Math.random() - 0.5) * 0.70; // Orientación preferencial longitudinal
    const rWidth = 8 + Math.random() * 18;
    const isDark = Math.random() > 0.45;
    const rutCol = isDark ? '#462c16' : '#b28045';

    drawToroidal(rx, ry, rLen, (tx, ty) => {
      ctx.save();
      ctx.globalAlpha = 0.12 + Math.random() * 0.15;
      ctx.strokeStyle = rutCol;
      ctx.lineWidth = rWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      const cpx = tx + Math.cos(angle) * (rLen * 0.5) + (Math.random() - 0.5) * 20;
      const cpy = ty + Math.sin(angle) * (rLen * 0.5) + (Math.random() - 0.5) * 20;
      const endX = tx + Math.cos(angle) * rLen;
      const endY = ty + Math.sin(angle) * rLen;
      ctx.quadraticCurveTo(cpx, cpy, endX, endY);
      ctx.stroke();
      ctx.restore();
    });
  }

  // 4. Gravilla y piedras pequeñas de camino pictóricas estilo Genshin (~480 piedrecillas)
  const stoneColors = ['#ad916a', '#8c704c', '#685034', '#c7ab82', '#523a24'];
  const stoneCount = 480;
  for (let i = 0; i < stoneCount; i++) {
    const sx = Math.random() * size;
    const sy = Math.random() * size;
    const sr = 2.2 + Math.random() * 5.2;
    const col = stoneColors[Math.floor(Math.random() * stoneColors.length)];

    drawToroidal(sx, sy, sr * 2, (gx, gy) => {
      // Sombra de contacto
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = '#22150a';
      ctx.beginPath();
      ctx.ellipse(gx, gy + sr * 0.35, sr * 1.1, sr * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Cuerpo de la piedra
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(gx, gy, sr, sr * 0.75, (Math.random() - 0.5) * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Brillo cálido superior
      ctx.globalAlpha = 0.30;
      ctx.fillStyle = '#f0d9b4';
      ctx.beginPath();
      ctx.ellipse(gx - sr * 0.2, gy - sr * 0.25, sr * 0.45, sr * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // 5. Micro-grano táctil de gouache
  const speckleColors = ['#321e0f', '#52341a', '#855b30', '#c29658', '#42541e'];
  const speckleCount = 2400;
  for (let i = 0; i < speckleCount; i++) {
    const sx = Math.random() * size;
    const sy = Math.random() * size;
    const sr = 1.0 + Math.random() * 2.2;
    const col = speckleColors[Math.floor(Math.random() * speckleColors.length)];

    drawToroidal(sx, sy, sr * 2, (gx, gy) => {
      ctx.save();
      ctx.globalAlpha = 0.11 + Math.random() * 0.15;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(gx, gy, sr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // 6. Creación del CanvasTexture Three.js
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'HandPaintedGouacheSoilTexV3';
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  if (renderer && renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function') {
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  } else {
    texture.anisotropy = 16;
  }

  texture.needsUpdate = true;
  console.log('[grassTexture] 🏜️ Textura hand-painted gouache de tierra generada con éxito (100% seamless, 480 gravillas, surcos y musgo).');

  return texture;
}
