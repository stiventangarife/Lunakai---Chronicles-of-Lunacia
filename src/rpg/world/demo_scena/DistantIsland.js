import * as THREE from 'three';
import { buildGenesisSilhouette } from '../islands/dungeon/GenesisSilhouette.js';

/**
 * DistantIsland.js - Islas Remotas del Horizonte con Siluetas y Biomas Temáticos:
 * 1. NORTE: ÁRTICO (Picos glaciares afilados estilo Cervino / agujas de hielo polar y plataformas de icebergs)
 * 2. ESTE: SABANA (Mesetas de cañón / tepuyes escalonados, estratos horizontales y siluetas de acacias gigantes)
 * 3. OESTE: BOSQUE MÍSTICO (Árbol Arcano Colosal, cúpulas de follaje sagrado, espiras orgánicas y raíces monolíticas)
 * 4. SUR: ISLA GENESIS (meseta ajardinada, pilares de lavanda apilados, copas redondas y el gran arco del Santuario del Origen)
 * 
 * Máxima Optimización:
 * - Geometrías de baja carga poligonal con formas características de silueta.
 * - Shaders analíticos con gradientes atmosféricos acordes a cada bioma.
 * - Sin casteo de sombras ni overhead en GPU.
 */
export class DistantIsland {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'DistantIslandsGroup';
    this.scene.add(this.group);

    this.createIslands();
  }

  createIslands() {
    // 1. ISLA NORTE: ÁRTICO (Agujas glaciares, cuernos de hielo escarpados y plataformas de icebergs)
    const arcticMat = this.createThemedAtmosphericMaterial(
      0x1b3c63, // Azul abisal marino / hielo profundo
      0x48b6d6, // Turquesa glacial frío
      0xf5fbff, // Blanco nieve puro con destello ártico
      380
    );
    this.buildArcticIsland(40, -1.0, -1550, arcticMat, 410);

    // 2. ISLA ESTE: SABANA (Cañones, mesetas tepuy y acacias colosales)
    const savannaMat = this.createThemedAtmosphericMaterial(
      0x9e4c32, // Terracota / arcilla roja basal
      0xd68f43, // Ocre dorado sabana tostada
      0xfce088, // Resplandor dorado de meseta soleada
      280
    );
    this.buildSavannaIsland(1550, -1.0, 40, savannaMat, 420);

    // 3. ISLA OESTE: BOSQUE MÍSTICO (Gran Árbol Arcano, cúpulas de follaje mágico y monolitos orgánicos)
    const mysticMat = this.createThemedAtmosphericMaterial(
      0x0e3b31, // Verde esmeralda profundo / musgo nocturno
      0x2ec494, // Jade bioluminiscente / menta mágica
      0xaef8e6, // Cyan etéreo espiritual de dosel arcano
      350
    );
    this.buildMysticForestIsland(-1550, -1.0, -60, mysticMat, 430);

    // 4. ISLA SUR: GENESIS (Jardines Reales del Origen: meseta ajardinada, pilares de lavanda apilados,
    //    copas redondas y el gran arco del Santuario del Origen)
    const genesisMat = this.createThemedAtmosphericMaterial(
      0x1b2142, // Azul noche de la tierra de Genesis
      0x7a6fc4, // Lavanda de los pilares
      0xf2d48a, // Dorado de los caminos y del arco
      260
    );
    this.buildGenesisIsland(60, -1.0, 1550, genesisMat, 440);
  }

  // =========================================================================
  // 1. BIOMA SABANA (ESTE) - Siluetas de Mesetas Escalonadas y Árboles Acacia
  // =========================================================================
  buildSavannaIsland(posX, posY, posZ, material, mistRadius) {
    const group = new THREE.Group();
    group.position.set(posX, posY, posZ);
    group.rotation.y = Math.PI / 2;

    // Mesetas planas tipo Cañón / Tepuy
    const mesas = [
      { x: 0, z: 0, rTop: 220, rBottom: 270, height: 280, seg: 11, rotY: 0.4 },
      { x: -210, z: 50, rTop: 150, rBottom: 195, height: 215, seg: 9, rotY: 1.2 },
      { x: 195, z: -40, rTop: 140, rBottom: 180, height: 185, seg: 8, rotY: 2.5 },
      { x: 305, z: 70, rTop: 75, rBottom: 105, height: 135, seg: 7, rotY: 0.8 },
      { x: -320, z: 30, rTop: 85, rBottom: 115, height: 145, seg: 7, rotY: 3.0 }
    ];

    mesas.forEach((m) => {
      // Cilindro facetado con cima plana horizontal
      const mesaGeo = new THREE.CylinderGeometry(m.rTop, m.rBottom, m.height, m.seg, 4, false);
      mesaGeo.translate(0, m.height * 0.5, 0);

      const pos = mesaGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let vx = pos.getX(i);
        let vy = pos.getY(i);
        let vz = pos.getZ(i);

        // Deformación de paredes verticales estratificadas (deja la cima plana perfecta)
        if (vy < m.height * 0.94) {
          const strata = Math.sin(vy * 0.08) * (m.rBottom * 0.08);
          const angle = Math.atan2(vz, vx);
          const fluting = Math.cos(angle * 4.0) * (m.rBottom * 0.09);
          vx += (vx / (m.rBottom + 0.1)) * (strata + fluting);
          vz += (vz / (m.rBottom + 0.1)) * (strata + fluting);
        }
        pos.setXYZ(i, vx, vy, vz);
      }
      mesaGeo.computeVertexNormals();
      mesaGeo.rotateY(m.rotY);
      mesaGeo.translate(m.x, 0, m.z);

      const mesh = new THREE.Mesh(mesaGeo, material);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      group.add(mesh);
    });

    // Siluetas distintivas de Acacias gigantes de copa plana (Umbrella Acacia) sobre las mesetas
    const acacias = [
      { x: -40, z: -20, y: 280, trunkH: 50, canopyR: 62 },
      { x: 60, z: 30, y: 280, trunkH: 42, canopyR: 54 },
      { x: -210, z: 45, y: 215, trunkH: 38, canopyR: 48 },
      { x: 195, z: -35, y: 185, trunkH: 34, canopyR: 44 }
    ];

    acacias.forEach((a) => {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(a.x, a.y, a.z);

      // Tronco delgado estilizado
      const trunkGeo = new THREE.CylinderGeometry(6, 12, a.trunkH, 5);
      trunkGeo.translate(0, a.trunkH * 0.5, 0);
      const trunkMesh = new THREE.Mesh(trunkGeo, material);
      treeGroup.add(trunkMesh);

      // Copa de parasol ancha y plana
      const canopyGeo = new THREE.CylinderGeometry(a.canopyR, a.canopyR * 0.85, 12, 8);
      canopyGeo.translate(0, a.trunkH + 6, 0);
      const canopyMesh = new THREE.Mesh(canopyGeo, material);
      treeGroup.add(canopyMesh);

      group.add(treeGroup);
    });

    // Bruma cálida dorada de sabana
    this.addMistLayer(group, mistRadius, 0xdeb38e, 0.35);

    this.group.add(group);
  }

  // =========================================================================
  // 2. BIOMA ÁRTICO (SUR) - Siluetas de Agujas Glaciares y Plataformas de Hielo
  // =========================================================================
  buildArcticIsland(posX, posY, posZ, material, mistRadius) {
    const group = new THREE.Group();
    group.position.set(posX, posY, posZ);

    // Cuernos y agujas de hielo ultra afilados (Matterhorn glacial horns)
    const horns = [
      { x: 0, z: 0, radius: 140, height: 380, seg: 5, rotY: 0.5 },
      { x: -160, z: 65, radius: 115, height: 295, seg: 5, rotY: 1.8 },
      { x: 150, z: -45, radius: 110, height: 275, seg: 5, rotY: 2.9 },
      { x: 255, z: 60, radius: 68, height: 200, seg: 4, rotY: 0.7 },
      { x: -270, z: 35, radius: 76, height: 215, seg: 4, rotY: 2.2 }
    ];

    horns.forEach((h) => {
      // Cono de 4 o 5 caras crea aristas filosas de hielo natural (Arêtes glaciares)
      const hornGeo = new THREE.ConeGeometry(h.radius, h.height, h.seg, 5, false);
      hornGeo.translate(0, h.height * 0.5, 0);

      const pos = hornGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let vx = pos.getX(i);
        let vy = pos.getY(i);
        let vz = pos.getZ(i);

        if (vy > 0.05 && vy < h.height * 0.98) {
          const hRatio = vy / h.height;
          // Arista asimétrica cuchilla de hielo
          const knifeEdge = Math.cos(Math.atan2(vz, vx) * 2.5) * (h.radius * 0.22 * (1.0 - hRatio));
          vx += knifeEdge;
          vz += knifeEdge;
        }
        pos.setXYZ(i, vx, vy, vz);
      }
      hornGeo.computeVertexNormals();
      hornGeo.rotateY(h.rotY);
      hornGeo.translate(h.x, 0, h.z);

      const mesh = new THREE.Mesh(hornGeo, material);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      group.add(mesh);
    });

    // Plataformas y repisas de hielo / icebergs en la base
    const iceShelves = [
      { x: -80, z: -70, r: 160, h: 42, seg: 6 },
      { x: 95, z: 80, r: 150, h: 36, seg: 6 },
      { x: -180, z: 90, r: 120, h: 32, seg: 5 },
      { x: 190, z: -60, r: 130, h: 38, seg: 5 }
    ];

    iceShelves.forEach((s) => {
      const shelfGeo = new THREE.CylinderGeometry(s.r, s.r * 1.05, s.h, s.seg);
      shelfGeo.translate(s.x, s.h * 0.5, s.z);
      const mesh = new THREE.Mesh(shelfGeo, material);
      group.add(mesh);
    });

    // Bruma glacial blanca / cian gélida
    this.addMistLayer(group, mistRadius, 0x98d4f7, 0.38);

    this.group.add(group);
  }

  // =========================================================================
  // 3. BIOMA BOSQUE MÍSTICO (OESTE) - Silueta de Gran Árbol Arcano y Espiras
  // =========================================================================
  buildMysticForestIsland(posX, posY, posZ, material, mistRadius) {
    const group = new THREE.Group();
    group.position.set(posX, posY, posZ);
    group.rotation.y = Math.PI / 2;

    // Tronco Colosal del Árbol Arcano (World Tree)
    const trunkH = 260;
    const trunkGeo = new THREE.CylinderGeometry(55, 175, trunkH, 10, 5);
    trunkGeo.translate(0, trunkH * 0.5, 0);

    const pos = trunkGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let vx = pos.getX(i);
      let vy = pos.getY(i);
      let vz = pos.getZ(i);

      // Contrafuertes orgánicos de raíces colosales en la base
      const hRatio = vy / trunkH;
      const angle = Math.atan2(vz, vx);
      const buttress = Math.cos(angle * 4.0) * (42.0 * Math.max(0.0, 1.0 - hRatio * 1.8));
      vx += (vx / (175 + 0.1)) * buttress;
      vz += (vz / (175 + 0.1)) * buttress;
      pos.setXYZ(i, vx, vy, vz);
    }
    trunkGeo.computeVertexNormals();
    const trunkMesh = new THREE.Mesh(trunkGeo, material);
    group.add(trunkMesh);

    // Cúpulas de dosel de follaje sagrado (Grandes masas de copa estilo anime)
    const canopies = [
      { x: 0, y: 290, z: 0, rx: 140, ry: 75, rz: 140 },
      { x: -95, y: 235, z: 45, rx: 105, ry: 58, rz: 105 },
      { x: 90, y: 225, z: -40, rx: 95, ry: 55, rz: 95 },
      { x: 45, y: 260, z: 75, rx: 85, ry: 50, rz: 85 }
    ];

    canopies.forEach((c) => {
      const foliageGeo = new THREE.DodecahedronGeometry(1.0, 1);
      foliageGeo.scale(c.rx, c.ry, c.rz);
      foliageGeo.translate(c.x, c.y, c.z);
      const foliageMesh = new THREE.Mesh(foliageGeo, material);
      group.add(foliageMesh);
    });

    // Espiras de roca mística y raíces monolíticas arqueadas que acompañan al árbol
    const spires = [
      { x: -220, z: -60, r: 68, h: 235, rotY: 0.6 },
      { x: 230, z: 50, r: 62, h: 220, rotY: 1.9 },
      { x: -160, z: 120, r: 55, h: 185, rotY: 2.7 }
    ];

    spires.forEach((s) => {
      const spireGeo = new THREE.ConeGeometry(s.r, s.h, 6, 4);
      spireGeo.translate(0, s.h * 0.5, 0);

      // Curvatura espiral orgánica
      const spos = spireGeo.attributes.position;
      for (let i = 0; i < spos.count; i++) {
        let vx = spos.getX(i);
        let vy = spos.getY(i);
        let vz = spos.getZ(i);
        vx += Math.sin(vy * 0.015) * 26.0;
        spos.setXYZ(i, vx, vy, vz);
      }
      spireGeo.computeVertexNormals();
      spireGeo.rotateY(s.rotY);
      spireGeo.translate(s.x, 0, s.z);

      const spireMesh = new THREE.Mesh(spireGeo, material);
      group.add(spireMesh);
    });

    // Gran Arco Marino de Raíces Arcanas emergiendo del agua
    const archGeo = new THREE.TorusGeometry(85, 20, 6, 12, Math.PI);
    archGeo.rotateX(Math.PI / 2);
    archGeo.rotateY(0.4);
    archGeo.translate(170, 0, -50);
    const archMesh = new THREE.Mesh(archGeo, material);
    group.add(archMesh);

    // Bruma esmeralda bioluminiscente mística
    this.addMistLayer(group, mistRadius, 0x62cca8, 0.36);

    this.group.add(group);
  }

  // =========================================================================
  // 4. BIOMA SUR: ISLA LUNAR Y VOLCÁNICA (Calderas, Cráteres de Impacto y Hornitos)
  // =========================================================================
  buildLunarVolcanoIsland(posX, posY, posZ, material, mistRadius) {
    const group = new THREE.Group();
    group.position.set(posX, posY, posZ);

    // -----------------------------------------------------------------------
    // A. Gran Caldera Volcánica Central (Estratovolcán Colosal con Cráter Superior)
    // -----------------------------------------------------------------------
    const mainVolcanoH = 310;
    const mainVolcanoGeo = new THREE.CylinderGeometry(110, 270, mainVolcanoH, 14, 6, false);
    mainVolcanoGeo.translate(0, mainVolcanoH * 0.5, 0);

    const mPos = mainVolcanoGeo.attributes.position;
    for (let i = 0; i < mPos.count; i++) {
      let vx = mPos.getX(i);
      let vy = mPos.getY(i);
      let vz = mPos.getZ(i);

      const hRatio = vy / mainVolcanoH;
      // Perfil cóncavo natural de estratovolcán
      if (hRatio < 0.95 && hRatio > 0.05) {
        const concavity = Math.sin(hRatio * Math.PI) * 22.0;
        const angle = Math.atan2(vz, vx);
        // Coladas de lava y estrías volcánicas radiales
        const ribs = Math.cos(angle * 7.0) * (18.0 * (1.0 - hRatio * 0.7));
        const dist = Math.sqrt(vx * vx + vz * vz);
        if (dist > 1.0) {
          vx += (vx / dist) * (ribs - concavity * 0.4);
          vz += (vz / dist) * (ribs - concavity * 0.4);
        }
      } else if (hRatio >= 0.95) {
        // Borde aserrado irregular de la caldera
        const angle = Math.atan2(vz, vx);
        const rimJagged = Math.sin(angle * 5.0) * 12.0 + Math.cos(angle * 9.0) * 8.0;
        vy += rimJagged;
      }
      mPos.setXYZ(i, vx, vy, vz);
    }
    mainVolcanoGeo.computeVertexNormals();
    const mainVolcanoMesh = new THREE.Mesh(mainVolcanoGeo, material);
    mainVolcanoMesh.castShadow = false;
    mainVolcanoMesh.receiveShadow = false;
    mainVolcanoMesh.frustumCulled = false;
    group.add(mainVolcanoMesh);

    // Cráter interior de la caldera (cono invertido dentro de la cumbre)
    const craterGeo = new THREE.ConeGeometry(95, 60, 12, 2, true);
    craterGeo.rotateX(Math.PI);
    craterGeo.translate(0, mainVolcanoH - 25, 0);
    const craterMesh = new THREE.Mesh(craterGeo, material);
    craterMesh.castShadow = false;
    craterMesh.receiveShadow = false;
    group.add(craterMesh);

    // -----------------------------------------------------------------------
    // B. Volcán Secundario (Cono Parásito Escarpado en el Flanco Oeste)
    // -----------------------------------------------------------------------
    const secH = 240;
    const secGeo = new THREE.CylinderGeometry(45, 175, secH, 11, 4, false);
    secGeo.translate(0, secH * 0.5, 0);

    const sPos = secGeo.attributes.position;
    for (let i = 0; i < sPos.count; i++) {
      let vx = sPos.getX(i);
      let vy = sPos.getY(i);
      let vz = sPos.getZ(i);
      const hRatio = vy / secH;
      if (hRatio < 0.95 && hRatio > 0.05) {
        const angle = Math.atan2(vz, vx);
        const ribs = Math.cos(angle * 5.0) * (14.0 * (1.0 - hRatio));
        const dist = Math.sqrt(vx * vx + vz * vz);
        if (dist > 1.0) {
          vx += (vx / dist) * ribs;
          vz += (vz / dist) * ribs;
        }
      }
      sPos.setXYZ(i, vx, vy, vz);
    }
    secGeo.computeVertexNormals();
    secGeo.translate(-210, 0, 50);
    const secMesh = new THREE.Mesh(secGeo, material);
    secMesh.castShadow = false;
    secMesh.receiveShadow = false;
    group.add(secMesh);

    // -----------------------------------------------------------------------
    // C. Gran Cráter de Impacto Lunar (Anillo de Cordillera Circular y Pico Central)
    // -----------------------------------------------------------------------
    // Anillo exterior elevado del cráter lunar
    const lunarRimGeo = new THREE.TorusGeometry(125, 28, 6, 16);
    lunarRimGeo.rotateX(Math.PI / 2);
    lunarRimGeo.scale(1.15, 0.50, 0.95);
    lunarRimGeo.translate(210, 32, -30);
    const lunarRimMesh = new THREE.Mesh(lunarRimGeo, material);
    lunarRimMesh.castShadow = false;
    lunarRimMesh.receiveShadow = false;
    group.add(lunarRimMesh);

    // Piso interior del cráter lunar
    const craterFloorGeo = new THREE.CylinderGeometry(118, 128, 30, 12);
    craterFloorGeo.translate(210, 15, -30);
    const craterFloorMesh = new THREE.Mesh(craterFloorGeo, material);
    craterFloorMesh.castShadow = false;
    craterFloorMesh.receiveShadow = false;
    group.add(craterFloorMesh);

    // Pico central resurgente del cráter (típico de cráteres lunares)
    const centralPeakGeo = new THREE.ConeGeometry(38, 95, 6);
    centralPeakGeo.translate(210, 47.5, -30);
    const centralPeakMesh = new THREE.Mesh(centralPeakGeo, material);
    centralPeakMesh.castShadow = false;
    centralPeakMesh.receiveShadow = false;
    group.add(centralPeakMesh);

    // -----------------------------------------------------------------------
    // D. Domo Volcánico de Lava y Cráter Menor Satélite
    // -----------------------------------------------------------------------
    // Domo de lava en el flanco este
    const domeH = 165;
    const domeGeo = new THREE.CylinderGeometry(55, 130, domeH, 9, 3);
    domeGeo.translate(330, domeH * 0.5, 70);
    const domeMesh = new THREE.Mesh(domeGeo, material);
    domeMesh.castShadow = false;
    domeMesh.receiveShadow = false;
    group.add(domeMesh);

    // Cráter menor satélite en el flanco oeste
    const smallCraterRimGeo = new THREE.TorusGeometry(65, 18, 5, 12);
    smallCraterRimGeo.rotateX(Math.PI / 2);
    smallCraterRimGeo.scale(1.0, 0.45, 1.0);
    smallCraterRimGeo.translate(-330, 20, -25);
    const smallCraterRimMesh = new THREE.Mesh(smallCraterRimGeo, material);
    smallCraterRimMesh.castShadow = false;
    smallCraterRimMesh.receiveShadow = false;
    group.add(smallCraterRimMesh);

    // -----------------------------------------------------------------------
    // E. Espiras de Basalto, Agujas de Obsidiana y Hornitos
    // -----------------------------------------------------------------------
    const spires = [
      { x: -125, z: 135, r: 42, h: 185, rotY: 0.6 },
      { x: 135, z: 125, r: 38, h: 170, rotY: 2.1 },
      { x: -370, z: 55, r: 34, h: 145, rotY: 1.4 },
      { x: 380, z: -20, r: 36, h: 155, rotY: 2.8 },
      { x: -30, z: 180, r: 30, h: 130, rotY: 0.9 },
      { x: 60, z: 175, r: 28, h: 120, rotY: 3.1 }
    ];

    spires.forEach((s) => {
      const spireGeo = new THREE.ConeGeometry(s.r, s.h, 5, 3);
      spireGeo.translate(0, s.h * 0.5, 0);

      const spPos = spireGeo.attributes.position;
      for (let i = 0; i < spPos.count; i++) {
        let vx = spPos.getX(i);
        let vy = spPos.getY(i);
        let vz = spPos.getZ(i);
        if (vy > 0.05 && vy < s.h * 0.95) {
          const edge = Math.sin(Math.atan2(vz, vx) * 3.0) * (s.r * 0.25);
          vx += edge;
          vz += edge;
        }
        spPos.setXYZ(i, vx, vy, vz);
      }
      spireGeo.computeVertexNormals();
      spireGeo.rotateY(s.rotY);
      spireGeo.translate(s.x, 0, s.z);

      const spireMesh = new THREE.Mesh(spireGeo, material);
      spireMesh.castShadow = false;
      spireMesh.receiveShadow = false;
      spireMesh.frustumCulled = false;
      group.add(spireMesh);
    });

    // -----------------------------------------------------------------------
    // F. Bruma Marina de Ceniza Volcánica y Vapores Sulfurosos
    // -----------------------------------------------------------------------
    this.addMistLayer(group, mistRadius, 0x3d1720, 0.44);
    this.addMistLayer(group, mistRadius * 0.72, 0x5c201a, 0.28);

    this.group.add(group);
  }

  // =========================================================================
  // 4. GENESIS (SUR) - Jardines Reales del Origen
  // =========================================================================
  buildGenesisIsland(posX, posY, posZ, material, mistRadius) {
    const group = new THREE.Group();
    group.position.set(posX, posY, posZ);
    buildGenesisSilhouette(group, material);
    this.addMistLayer(group, mistRadius, 0x2a2a5e, 0.4);
    this.addMistLayer(group, mistRadius * 0.72, 0x4a3f8a, 0.24);
    this.group.add(group);
  }

  // =========================================================================
  // Capa de Bruma Marina / Nubes Bajas Personalizada por Bioma
  // =========================================================================
  addMistLayer(targetGroup, radius, colorHex, opacityVal) {
    const mistGeo = new THREE.CylinderGeometry(radius, radius * 1.08, 46, 16, 1, true);
    mistGeo.translate(0, 38, 0);
    const mistMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: opacityVal,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
      // Color y opacidad uniformes y sin escritura de profundidad: la mezcla es conmutativa, así que pintar las caras
      // traseras y delanteras en una sola pasada da el mismo resultado y ahorra un draw por anillo de bruma.
      forceSinglePass: true
    });
    const mistMesh = new THREE.Mesh(mistGeo, mistMat);
    mistMesh.scale.set(1.2, 0.92, 0.84);
    targetGroup.add(mistMesh);
  }

  // =========================================================================
  // Shader Atmosférico Adaptativo con Gradiente Personalizado de Bioma
  // (fog: false para que no sea tapado por la niebla cercana del bosque)
  // =========================================================================
  createThemedAtmosphericMaterial(hazeHex, midSlopeHex, peakHex, heightMax = 320) {
    const mat = new THREE.ShaderMaterial({
      fog: false,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(-0.6, 0.7, 0.4).normalize() },
        uHazeBaseColor: { value: new THREE.Color(hazeHex) },
        uMidSlopeColor: { value: new THREE.Color(midSlopeHex) },
        uSunlitPeakColor: { value: new THREE.Color(peakHex) },
        uHorizonHazeColor: { value: new THREE.Color(0xe6b993) },
        uHeightMax: { value: heightMax },
        uExtraHaze: { value: 0.0 } // extra aerial perspective (used by the Genshin art pass)
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform vec3 uHazeBaseColor;
        uniform vec3 uMidSlopeColor;
        uniform vec3 uSunlitPeakColor;
        uniform vec3 uHorizonHazeColor;
        uniform float uHeightMax;
        uniform float uExtraHaze;
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        void main() {
          // Gradiente vertical de perspectiva aérea estilizada por bioma
          float heightT = clamp((vWorldPos.y - 0.0) / uHeightMax, 0.0, 1.0);
          vec3 baseGrad = mix(uHazeBaseColor, uMidSlopeColor, smoothstep(0.0, 0.48, heightT));
          baseGrad = mix(baseGrad, uSunlitPeakColor, smoothstep(0.48, 1.0, heightT));

          // Shading suave estilo toon anime para recortar siluetas
          float NdotL = max(0.0, dot(vNormal, uSunDir));
          float toonLight = smoothstep(0.20, 0.70, NdotL) * 0.35 + 0.75;

          vec3 litColor = baseGrad * toonLight;

          // Bruma suave en la base marina que se funde armónicamente con la calina del horizonte
          float horizonHaze = mix(0.40, 0.04, smoothstep(0.05, 0.78, heightT));
          vec3 finalColor = mix(litColor, uHorizonHazeColor, horizonHaze);
          finalColor = mix(finalColor, uHorizonHazeColor, clamp(uExtraHaze, 0.0, 1.0));

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    if (!this.materials) this.materials = [];
    this.materials.push(mat);
    return mat;
  }

  setHorizonColor(colorHex) {
    if (this.materials) {
      this.materials.forEach((m) => {
        if (m.uniforms && m.uniforms.uHorizonHazeColor) {
          m.uniforms.uHorizonHazeColor.value.setHex(colorHex);
        }
      });
    }
  }

  setVisible(visible) {
    if (this.group) {
      this.group.visible = visible;
    }
  }
}
