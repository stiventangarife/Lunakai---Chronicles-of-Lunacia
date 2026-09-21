// TextureGenerator.js - Procedural Stylized Textures for Axie Tactics 3D
import * as THREE from 'three';

export class TextureGenerator {
  /**
   * Generates a stylized hand-painted fantasy meadow tile texture.
   * @param {boolean} isDark - Alternate checkerboard tone
   * @returns {THREE.CanvasTexture}
   */
  static createGrassTexture(isDark = false) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 1. Base vibrant meadow gradient
    const baseColor1 = isDark ? '#438a35' : '#529e41';
    const baseColor2 = isDark ? '#38782c' : '#478f37';
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.7);
    grad.addColorStop(0, baseColor1);
    grad.addColorStop(1, baseColor2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // 2. Stylized hand-painted grass blade strokes
    const bladeColors = isDark 
      ? ['#4ea33e', '#3b7d2f', '#5cb34b', '#306925'] 
      : ['#61b84f', '#469137', '#73cc5e', '#3c7d2e'];

    let seed = isDark ? 42 : 1337;
    function rnd() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    // Clustered grass tufts
    for (let i = 0; i < 280; i++) {
      const x = 20 + rnd() * (size - 40);
      const y = 20 + rnd() * (size - 40);
      const len = 12 + rnd() * 18;
      const angle = -Math.PI / 2 + (rnd() - 0.5) * 0.7;

      ctx.strokeStyle = bladeColors[Math.floor(rnd() * bladeColors.length)];
      ctx.lineWidth = 2.5 + rnd() * 2.5;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(angle) * (len * 0.5) + (rnd() - 0.5) * 6,
        y + Math.sin(angle) * (len * 0.5),
        x + Math.cos(angle) * len,
        y + Math.sin(angle) * len
      );
      ctx.stroke();
    }

    // 3. Tiny Lunacia clover specks & yellow flower buds
    for (let i = 0; i < 24; i++) {
      const fx = 30 + rnd() * (size - 60);
      const fy = 30 + rnd() * (size - 60);
      ctx.fillStyle = rnd() > 0.4 ? '#fef08a' : '#ffffff';
      ctx.beginPath();
      ctx.arc(fx, fy, 2.5 + rnd() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Subtle inner tile bevel shadow (gives 3D chiseled tile depth)
    const bevelGrad = ctx.createRadialGradient(size / 2, size / 2, size * 0.38, size / 2, size / 2, size * 0.52);
    bevelGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bevelGrad.addColorStop(0.85, 'rgba(15, 45, 12, 0.15)');
    bevelGrad.addColorStop(1, 'rgba(10, 35, 8, 0.45)');
    ctx.fillStyle = bevelGrad;
    ctx.fillRect(0, 0, size, size);

    // 5. Crisp stone border edge line
    ctx.strokeStyle = 'rgba(25, 60, 20, 0.4)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, size - 6, size - 6);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  /**
   * Generates a weathered granite stone texture with glowing runic carvings.
   * @returns {THREE.CanvasTexture}
   */
  static createPillarTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#877f72';
    ctx.fillRect(0, 0, size, size);

    let seed = 999;
    function rnd() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    for (let i = 0; i < 1500; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = rnd() * 3 + 1;
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(50, 45, 40, 0.25)' : 'rgba(220, 215, 205, 0.3)';
      ctx.fillRect(x, y, r, r);
    }

    ctx.strokeStyle = 'rgba(45, 40, 35, 0.45)';
    ctx.lineWidth = 4;
    for (let y = 100; y < size; y += 120) {
      ctx.beginPath();
      ctx.moveTo(0, y + (rnd() - 0.5) * 6);
      ctx.lineTo(size, y + (rnd() - 0.5) * 6);
      ctx.stroke();
    }

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 12;

    const runes = [
      [[256, 60], [220, 100], [290, 100], [256, 140]],
      [[256, 180], [256, 260], [220, 220], [290, 220]],
      [[230, 310], [280, 350], [230, 390], [280, 390]],
      [[256, 420], [220, 460], [290, 460], [256, 490]]
    ];

    runes.forEach(rune => {
      ctx.beginPath();
      rune.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt[0], pt[1]);
        else ctx.lineTo(pt[0], pt[1]);
      });
      ctx.stroke();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    return texture;
  }

  /**
   * Generates a chiseled rock texture with mossy growth.
   * @returns {THREE.CanvasTexture}
   */
  static createRockTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#6b6357';
    ctx.fillRect(0, 0, size, size);

    let seed = 777;
    function rnd() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    ctx.strokeStyle = 'rgba(35, 30, 25, 0.4)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      let cx = rnd() * size;
      let cy = rnd() * size;
      ctx.moveTo(cx, cy);
      for (let j = 0; j < 4; j++) {
        cx += (rnd() - 0.5) * 80;
        cy += (rnd() - 0.5) * 80;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(85, 140, 60, 0.4)';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(rnd() * size, rnd() * size * 0.4, 25 + rnd() * 35, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    return texture;
  }

  /**
   * Generates cobblestone / cement paving tile texture.
   */
  static createCobblestoneTexture(isDark = false) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base stone mortar color
    ctx.fillStyle = isDark ? '#4b5563' : '#64748b';
    ctx.fillRect(0, 0, size, size);

    let seed = isDark ? 101 : 202;
    function rnd() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    // Cobblestone blocks grid (4x4 staggered stones)
    const rows = 4;
    const cols = 4;
    const rowH = size / rows;
    const colW = size / cols;

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2 === 1) ? colW * 0.5 : 0;
      for (let c = -1; c <= cols; c++) {
        const bx = c * colW + offsetX + 4;
        const by = r * rowH + 4;
        const bw = colW - 8;
        const bh = rowH - 8;

        const stoneColor = isDark
          ? (rnd() > 0.5 ? '#6b7280' : '#52525b')
          : (rnd() > 0.5 ? '#94a3b8' : '#78716c');

        ctx.fillStyle = stoneColor;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 8);
        ctx.fill();

        // Stone highlight & bevel
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx + 4, by + bh - 4);
        ctx.lineTo(bx + 4, by + 4);
        ctx.lineTo(bx + bw - 4, by + 4);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.moveTo(bx + bw - 4, by + 4);
        ctx.lineTo(bx + bw - 4, by + bh - 4);
        ctx.lineTo(bx + 4, by + bh - 4);
        ctx.stroke();

        // Grain specks
        for (let i = 0; i < 20; i++) {
          ctx.fillStyle = rnd() > 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.2)';
          ctx.fillRect(bx + 6 + rnd() * (bw - 12), by + 6 + rnd() * (bh - 12), 2, 2);
        }
      }
    }

    // Outer tile border
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, size - 6, size - 6);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    return texture;
  }

  /**
   * Generates warm wooden planks tile texture for dojo / bridges.
   */
  static createWoodPlanksTexture(isDark = false) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const plankCount = 5;
    const plankH = size / plankCount;

    let seed = isDark ? 303 : 404;
    function rnd() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    for (let p = 0; p < plankCount; p++) {
      const py = p * plankH;
      const baseWood = isDark
        ? (p % 2 === 0 ? '#78350f' : '#854d0e')
        : (p % 2 === 0 ? '#b45309' : '#9a3412');

      ctx.fillStyle = baseWood;
      ctx.fillRect(0, py, size, plankH);

      // Wood grain lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.lineWidth = 2;
      for (let g = 0; g < 6; g++) {
        const gy = py + 8 + rnd() * (plankH - 16);
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(size * 0.3, gy + (rnd() - 0.5) * 12, size * 0.7, gy + (rnd() - 0.5) * 12, size, gy);
        ctx.stroke();
      }

      // Plank top edge highlight and bottom groove shadow
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, py + 1);
      ctx.lineTo(size, py + 1);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(20, 10, 5, 0.6)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, py + plankH - 2);
      ctx.lineTo(size, py + plankH - 2);
      ctx.stroke();

      // Iron nails
      [36, size - 36].forEach(nx => {
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        ctx.arc(nx, py + plankH * 0.5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        ctx.arc(nx - 1, py + plankH * 0.5 - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Outer border
    ctx.strokeStyle = 'rgba(40, 20, 10, 0.6)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, size - 6, size - 6);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    return texture;
  }

  /**
   * Generates compact dirt / earth tile texture with subtle fissures.
   */
  static createDirtTexture(isDark = false) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const c1 = isDark ? '#5c4033' : '#7c583f';
    const c2 = isDark ? '#463126' : '#61432f';
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.7);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    let seed = isDark ? 505 : 606;
    function rnd() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    // Dirt pebble clumps
    for (let i = 0; i < 400; i++) {
      const px = rnd() * size;
      const py = rnd() * size;
      const pr = 1.5 + rnd() * 4;
      ctx.fillStyle = rnd() > 0.4 ? 'rgba(30, 20, 15, 0.45)' : 'rgba(160, 130, 100, 0.35)';
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Earth cracks
    ctx.strokeStyle = 'rgba(25, 15, 10, 0.5)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) {
      let cx = 40 + rnd() * (size - 80);
      let cy = 40 + rnd() * (size - 80);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let j = 0; j < 3; j++) {
        cx += (rnd() - 0.5) * 45;
        cy += (rnd() - 0.5) * 45;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Bevel & border
    ctx.strokeStyle = 'rgba(30, 18, 12, 0.6)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, size - 6, size - 6);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    return texture;
  }

  /**
   * Generates golden autumn savanna grass tile texture.
   */
  static createAutumnGrassTexture(isDark = false) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const bg1 = isDark ? '#b45309' : '#d97706';
    const bg2 = isDark ? '#78350f' : '#92400e';
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.7);
    grad.addColorStop(0, bg1);
    grad.addColorStop(1, bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    let seed = isDark ? 707 : 808;
    function rnd() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    const blades = ['#f59e0b', '#fbbf24', '#d97706', '#ea580c', '#b45309'];
    for (let i = 0; i < 260; i++) {
      const x = 20 + rnd() * (size - 40);
      const y = 20 + rnd() * (size - 40);
      const len = 12 + rnd() * 20;
      const angle = -Math.PI / 2 + (rnd() - 0.5) * 0.7;

      ctx.strokeStyle = blades[Math.floor(rnd() * blades.length)];
      ctx.lineWidth = 2.5 + rnd() * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(angle) * (len * 0.5), y + Math.sin(angle) * (len * 0.5), x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    // Autumn red/orange fallen leaves
    for (let i = 0; i < 20; i++) {
      const lx = 30 + rnd() * (size - 60);
      const ly = 30 + rnd() * (size - 60);
      ctx.fillStyle = rnd() > 0.5 ? '#ef4444' : '#f97316';
      ctx.beginPath();
      ctx.ellipse(lx, ly, 4 + rnd() * 3, 2 + rnd() * 2, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(80, 30, 10, 0.45)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, size - 6, size - 6);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    return texture;
  }

  /**
   * Generates dark mystical swamp mossy grass tile texture.
   */
  static createSwampGrassTexture(isDark = false) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const c1 = isDark ? '#11352a' : '#1b4d3e';
    const c2 = isDark ? '#09211a' : '#133a2f';
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.7);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    let seed = isDark ? 909 : 1010;
    function rnd() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    const blades = ['#2dd4bf', '#14b8a6', '#0f766e', '#134e4a', '#042f2e'];
    for (let i = 0; i < 220; i++) {
      const x = 20 + rnd() * (size - 40);
      const y = 20 + rnd() * (size - 40);
      const len = 10 + rnd() * 18;
      const angle = -Math.PI / 2 + (rnd() - 0.5) * 0.7;

      ctx.strokeStyle = blades[Math.floor(rnd() * blades.length)];
      ctx.lineWidth = 2 + rnd() * 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    // Bioluminescent spores
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = rnd() > 0.4 ? 'rgba(45, 212, 191, 0.7)' : 'rgba(167, 243, 208, 0.6)';
      ctx.beginPath();
      ctx.arc(30 + rnd() * (size - 60), 30 + rnd() * (size - 60), 2 + rnd() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(5, 20, 15, 0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, size - 6, size - 6);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    return texture;
  }

  /**
   * Generates crystalline frosted ice tile texture.
   */
  static createIceTexture(isDark = false) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, size, size);
    if (isDark) {
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(0.5, '#38bdf8');
      grad.addColorStop(1, '#0369a1');
    } else {
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.5, '#7dd3fc');
      grad.addColorStop(1, '#bae6fd');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    let seed = isDark ? 1111 : 1212;
    function rnd() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    // Deep crystalline fracture cracks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 14; i++) {
      let cx = 30 + rnd() * (size - 60);
      let cy = 30 + rnd() * (size - 60);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let j = 0; j < 4; j++) {
        cx += (rnd() - 0.5) * 70;
        cy += (rnd() - 0.5) * 70;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Frosted glint highlights
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(rnd() * size, rnd() * size, 1.5 + rnd() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(14, 116, 144, 0.6)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, size - 6, size - 6);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    return texture;
  }

  /**
   * Generates stylized ripple water tile texture.
   */
  static createWaterTexture(isDark = false) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.7);
    if (isDark) {
      grad.addColorStop(0, '#0369a1');
      grad.addColorStop(1, '#075985');
    } else {
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(1, '#0c4a6e');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    let seed = isDark ? 1313 : 1414;
    function rnd() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    // Caustic light rings
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
    ctx.lineWidth = 3.5;
    for (let i = 0; i < 18; i++) {
      const rx = 40 + rnd() * (size - 80);
      const ry = 40 + rnd() * (size - 80);
      const rad = 25 + rnd() * 45;
      ctx.beginPath();
      ctx.ellipse(rx, ry, rad, rad * 0.55, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(8, 47, 73, 0.65)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, size - 6, size - 6);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    return texture;
  }

  /**
   * Generates solid slate rock tile texture.
   */
  static createRockTileTexture(isDark = false) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = isDark ? '#3f3f46' : '#52525b';
    ctx.fillRect(0, 0, size, size);

    let seed = isDark ? 1515 : 1616;
    function rnd() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    // Mineral striations
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.18)';
      ctx.fillRect(rnd() * size, rnd() * size, 3 + rnd() * 6, 2);
    }

    ctx.strokeStyle = 'rgba(24, 24, 27, 0.6)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, size - 6, size - 6);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    return texture;
  }
}
