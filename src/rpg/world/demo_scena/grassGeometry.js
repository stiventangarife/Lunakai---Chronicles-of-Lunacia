import * as THREE from 'three';

/**
 * grassGeometry.js - Geometría Híbrida de Alta Densidad estilo The Legend of Zelda: Breath of the Wild (BotW).
 *
 * Arquitectura de Relleno Denso:
 * 1. BASE VOLUMÉTRICA DE 4 CARAS (Cross Cards / Volume Core):
 *    - 4 planos cruzados en estrella (*) en la mitad inferior (0.0 a 0.45m).
 *    - Bloquean la visión directa de la tierra desde ángulos diagonales o cenitales,
 *      creando un "colchón" verde opaco y espeso.
 * 2. CORONA DE BRIZNAS HÉROE ESTILIZADAS (Top Needle Blades):
 *    - 4 briznas esbeltas independientes con afilado en aguja (Needle Taper)
 *      y curvatura en arco parabólico que se elevan hasta 1.15m.
 *    - Dan la silueta nítida y el movimiento orgánico al viento.
 * 3. NORMALES ESCULTÓRICAS UNIFICADAS:
 *    - Normales suaves orientadas fuertemente hacia arriba (Ghibli Shading),
 *      garantizando que la masa completa se ilumine suavemente como un cojín de hierba.
 * 4. PIVOTE EXACTO EN LA BASE (y = 0, vUv.y = 0 en raíz, vUv.y = 1 en la punta).
 */
export function createClumpGeometry(options = {}) {
  const {
    bladeWidth = 0.16,      // Ancho esbelto de las briznas superiores
    bladeHeight = 1.10,     // Altura de la brizna principal
    baseCardWidth = 0.28,   // Ancho generoso de las tarjetas base para tapar el suelo
    baseCardHeight = 0.48,  // Altura del núcleo volumétrico de 4 caras
    bladeTilt = 0.24,       // Curvatura en abanico
    bladeTaper = 0.85,      // Perfil de afilado en aguja
    rootRadius = 0.05,      // Desfase de raíces
    segments = 4            // Segmentos verticales de las briznas
  } = options;

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  let vertexOffset = 0;

  // =========================================================================
  // PARTE 1: NÚCLEO VOLUMÉTRICO DE 4 CARAS CRUZADAS (BASE FILLER CARDS)
  // =========================================================================
  // 4 tarjetas en estrella orientadas a 0°, 45°, 90°, 135° en la base
  const cardAngles = [0.0, Math.PI * 0.25, Math.PI * 0.50, Math.PI * 0.75];

  for (let c = 0; c < cardAngles.length; c++) {
    const angle = cardAngles[c];
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const halfW = baseCardWidth * 0.5;
    const topHalfW = halfW * 0.45; // Se estrecha ligeramente hacia arriba
    const h = baseCardHeight * (0.90 + (c % 2) * 0.20);

    const startIdx = vertexOffset;

    // Vértices inferiores (y = 0, v = 0)
    positions.push(-sinA * -halfW, 0.0, cosA * -halfW);
    positions.push(-sinA * halfW, 0.0, cosA * halfW);
    uvs.push(0.0, 0.0);
    uvs.push(1.0, 0.0);

    // Vértices medios (y = h * 0.5, v = 0.22)
    positions.push(-sinA * -halfW * 0.75, h * 0.5, cosA * -halfW * 0.75);
    positions.push(-sinA * halfW * 0.75, h * 0.5, cosA * halfW * 0.75);
    uvs.push(0.0, 0.22);
    uvs.push(1.0, 0.22);

    // Vértices superiores de la tarjeta base (y = h, v = 0.42)
    positions.push(-sinA * -topHalfW, h, cosA * -topHalfW);
    positions.push(-sinA * topHalfW, h, cosA * topHalfW);
    uvs.push(0.0, 0.42);
    uvs.push(1.0, 0.42);

    // Normales suaves que apuntan fuertemente hacia arriba y en abanico
    for (let k = 0; k < 6; k++) {
      normals.push(cosA * 0.20, 0.88, sinA * 0.20);
    }

    vertexOffset += 6;

    // Triángulos de los dos segmentos de la tarjeta base (doble cara)
    // Segmento inferior
    indices.push(startIdx, startIdx + 1, startIdx + 2);
    indices.push(startIdx + 1, startIdx + 3, startIdx + 2);
    indices.push(startIdx + 2, startIdx + 1, startIdx);
    indices.push(startIdx + 2, startIdx + 3, startIdx + 1);

    // Segmento superior
    indices.push(startIdx + 2, startIdx + 3, startIdx + 4);
    indices.push(startIdx + 3, startIdx + 5, startIdx + 4);
    indices.push(startIdx + 4, startIdx + 3, startIdx + 2);
    indices.push(startIdx + 4, startIdx + 5, startIdx + 3);
  }

  // =========================================================================
  // PARTE 2: CORONA DE BRIZNAS HÉROE ESTILIZADAS (TOP NEEDLE BLADES BOTW)
  // =========================================================================
  // 4 briznas asimétricas con silueta afilada y curvatura orgánica
  const bladeConfigs = [
    { angle: 0.18, heightMul: 1.05, widthMul: 1.00, tiltMul: 1.00, rootOffset: [0.03, -0.02] },   // Brizna héroe central alta
    { angle: 1.40, heightMul: 0.88, widthMul: 0.90, tiltMul: 1.30, rootOffset: [-0.04, 0.03] },  // Brizna lateral derecha
    { angle: 2.80, heightMul: 0.80, widthMul: 1.05, tiltMul: 1.15, rootOffset: [-0.02, -0.04] }, // Brizna lateral posterior
    { angle: 4.25, heightMul: 0.96, widthMul: 0.95, tiltMul: 1.40, rootOffset: [0.04, 0.03] }    // Brizna frontal izquierda
  ];

  for (let b = 0; b < bladeConfigs.length; b++) {
    const cfg = bladeConfigs[b];
    const angle = cfg.angle;

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const widthDirX = -sinA;
    const widthDirZ = cosA;

    const tiltDirX = cosA;
    const tiltDirZ = sinA;

    const rootX = cfg.rootOffset[0] * (rootRadius / 0.05);
    const rootZ = cfg.rootOffset[1] * (rootRadius / 0.05);

    const h = bladeHeight * cfg.heightMul;
    const w = bladeWidth * cfg.widthMul;
    const tiltStrength = bladeTilt * cfg.tiltMul;

    const startVertexIndex = vertexOffset;

    for (let s = 0; s <= segments; s++) {
      const t = s / segments; // 0.0 en raíz -> 1.0 en punta

      const y = t * h;

      // Ancho decreciente con perfil ahusado hacia la punta de aguja (Needle Taper BotW)
      const taper = Math.pow(Math.max(0.0, 1.0 - t), bladeTaper);
      const currentHalfW = Math.max(0.002, (w * 0.5) * taper);

      // Curvatura parabólica no lineal en arco
      const bend = Math.pow(t, 2.15) * (tiltStrength * h);
      const offsetX = rootX + tiltDirX * bend;
      const offsetZ = rootZ + tiltDirZ * bend;

      // Vértice Izquierdo
      const vlX = -widthDirX * currentHalfW + offsetX;
      const vlY = y;
      const vlZ = -widthDirZ * currentHalfW + offsetZ;

      // Vértice Derecho
      const vrX = widthDirX * currentHalfW + offsetX;
      const vrY = y;
      const vrZ = widthDirZ * currentHalfW + offsetZ;

      positions.push(vlX, vlY, vlZ);
      positions.push(vrX, vrY, vrZ);

      // Normal orientada fuertemente hacia el cielo
      const normY = 0.85;
      const normOut = 0.26;
      const normLen = Math.hypot(tiltDirX * normOut, normY, tiltDirZ * normOut);
      const nx = (tiltDirX * normOut) / normLen;
      const ny = normY / normLen;
      const nz = (tiltDirZ * normOut) / normLen;

      normals.push(nx, ny, nz);
      normals.push(nx, ny, nz);

      // UVs
      uvs.push(0.0, t);
      uvs.push(1.0, t);

      vertexOffset += 2;
    }

    // Triángulos de la brizna (doble cara)
    for (let s = 0; s < segments; s++) {
      const i0 = startVertexIndex + s * 2;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;

      indices.push(i0, i1, i2);
      indices.push(i1, i3, i2);
      indices.push(i2, i1, i0);
      indices.push(i2, i3, i1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

export const createGrassClumpGeometry = createClumpGeometry;
