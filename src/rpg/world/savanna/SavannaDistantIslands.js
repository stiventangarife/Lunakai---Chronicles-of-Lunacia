import * as THREE from 'three';
import { buildGenesisSilhouette } from '../islands/dungeon/GenesisSilhouette.js';

/**
 * SavannaDistantIslands.js - Distant Island Silhouettes viewed from Savannah Island:
 * Since Savannah Island is located on the East (X = +1550 in world coordinates):
 * 1. WEST: Isla del Bosque (Center) - Rolling green hills, Dojo ridge, and the Colossal Sacred Elder Tree of Atia.
 * 2. NORTH: Isla del Ártico - Jagged glacial horn peaks (Matterhorn style) and polar ice needles.
 * 3. SOUTH: Isla Genesis - Garden plateau, layered lavender pillars, round canopies and the Sanctum arch.
 * 4. FAR WEST: Isla Mística - Arcane spires and floating crystals.
 * 
 * 100% Optimized:
 * - Low-poly silhouette geometry with distinctive profiles.
 * - Single-pass aerial perspective shader matching horizon haze.
 * - Zero dynamic shadow overhead.
 */
export class SavannaDistantIslands {
  constructor(parentGroup) {
    this.parentGroup = parentGroup;
    this.group = new THREE.Group();
    this.group.name = 'SavannaDistantIslandsGroup';
    if (this.parentGroup) {
      this.parentGroup.add(this.group);
    }

    this.materials = [];
    this.createIslands();
  }

  createIslands() {
    // 1. ISLA OESTE: ISLA DEL BOSQUE Y GRAN ÁRBOL DE ATIA (Centro del archipiélago)
    const forestMat = this.createThemedAtmosphericMaterial(
      0x13381a, // Verde bosque basal profundo
      0x348c48, // Verde pradera templado
      0x7ee06e, // Esmeralda luminoso de dosel sagrado
      360
    );
    this.buildForestIsland(-1550, -1.0, 0, forestMat);

    // 2. ISLA NORTE: ISLA DEL ÁRTICO
    const arcticMat = this.createThemedAtmosphericMaterial(
      0x1b3c63, // Azul hielo profundo
      0x48b6d6, // Turquesa glacial
      0xf5fbff, // Blanco nieve brillante
      390
    );
    this.buildArcticIsland(0, -1.0, -1550, arcticMat);

    // 3. ISLA SUR: GENESIS (Jardines Reales del Origen)
    const genesisMat = this.createThemedAtmosphericMaterial(
      0x1b2142, // Azul noche de la tierra de Genesis
      0x7a6fc4, // Lavanda de los pilares
      0xf2d48a, // Dorado de los caminos y del arco
      260
    );
    const genesis = new THREE.Group();
    genesis.position.set(0, -1.0, 1550);
    buildGenesisSilhouette(genesis, genesisMat);
    this.group.add(genesis);
  }

  // =========================================================================
  // 1. SILUETA DE LA ISLA DEL BOSQUE (OESTE) - Colinas + Gran Árbol Sagrado
  // =========================================================================
  buildForestIsland(posX, posY, posZ, material) {
    const group = new THREE.Group();
    group.position.set(posX, posY, posZ);

    // Colinas ondulantes de la isla. La central es una meseta (cono truncado): el Gran Árbol se apoya en su
    // cima plana en lugar de sobre una punta (antes parecía flotar). Hito 58.
    const plateau = new THREE.CylinderGeometry(72, 240, 118, 12);
    plateau.translate(0, 59, 0);
    const plateauMesh = new THREE.Mesh(plateau, material);
    plateauMesh.frustumCulled = false;
    group.add(plateauMesh);
    const hills = [
      { x: -160, z: 40, r: 180, h: 150 }, // Colina del Dojo
      { x: 170, z: -30, r: 170, h: 112 },
      { x: -70, z: -80, r: 140, h: 100 }
    ];

    hills.forEach(hill => {
      const hillGeo = new THREE.ConeGeometry(hill.r, hill.h, 12);
      hillGeo.translate(0, hill.h * 0.5, 0);
      const mesh = new THREE.Mesh(hillGeo, material);
      mesh.position.set(hill.x, 0, hill.z);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      group.add(mesh);
    });

    // Copas de bosque bajas sobre las laderas: el árbol no queda solo y la isla se lee como bosque
    const clumps = [
      { x: -95, y: 92, z: 40, r: 34 }, { x: -205, y: 80, z: 10, r: 30 }, { x: 110, y: 78, z: -20, r: 32 },
      { x: 205, y: 58, z: -50, r: 26 }, { x: -40, y: 70, z: -110, r: 28 }, { x: 70, y: 96, z: 50, r: 30 }
    ];
    clumps.forEach(c => {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(c.r, 0), material);
      m.position.set(c.x, c.y, c.z);
      m.scale.set(1, 0.8, 1);
      m.frustumCulled = false;
      group.add(m);
    });

    // Silueta del Gran Árbol Ancestral de Atia (icono del Bosque): un 15 % más pequeño, con el tronco hundido en
    // la meseta y raíces anchas en la base para que se vea anclado
    const treeGroup = new THREE.Group();
    treeGroup.position.set(0, 110, 0);
    treeGroup.scale.setScalar(0.85);

    // Raíces (cono ancho y bajo) + tronco colosal
    const rootGeo = new THREE.CylinderGeometry(30, 70, 34, 8);
    rootGeo.translate(0, 17, 0);
    treeGroup.add(new THREE.Mesh(rootGeo, material));
    const trunkGeo = new THREE.CylinderGeometry(18, 36, 120, 8);
    trunkGeo.translate(0, 60, 0);
    const trunkMesh = new THREE.Mesh(trunkGeo, material);
    treeGroup.add(trunkMesh);

    // Cúpulas masivas de follaje
    const crownDomes = [
      { x: 0, y: 145, z: 0, r: 75 },
      { x: -35, y: 120, z: 20, r: 52 },
      { x: 40, y: 115, z: -15, r: 56 },
      { x: 10, y: 165, z: -10, r: 44 }
    ];

    crownDomes.forEach(d => {
      const domeGeo = new THREE.DodecahedronGeometry(d.r, 1);
      const domeMesh = new THREE.Mesh(domeGeo, material);
      domeMesh.position.set(d.x, d.y, d.z);
      treeGroup.add(domeMesh);
    });

    group.add(treeGroup);
    this.group.add(group);
  }

  // =========================================================================
  // 2. SILUETA DE LA ISLA DEL ÁRTICO (NORTE) - Picos Glaciares Escarpados
  // =========================================================================
  buildArcticIsland(posX, posY, posZ, material) {
    const group = new THREE.Group();
    group.position.set(posX, posY, posZ);

    const peaks = [
      { x: 0, z: 0, r: 170, h: 360, seg: 5 },
      { x: -140, z: 60, r: 130, h: 290, seg: 5 },
      { x: 160, z: -40, r: 140, h: 275, seg: 5 },
      { x: 270, z: 50, r: 90, h: 195, seg: 4 },
      { x: -260, z: -30, r: 100, h: 210, seg: 4 }
    ];

    peaks.forEach(p => {
      const geo = new THREE.ConeGeometry(p.r, p.h, p.seg);
      geo.translate(0, p.h * 0.5, 0);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(p.x, 0, p.z);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      group.add(mesh);
    });

    this.group.add(group);
  }

  // =========================================================================
  // 3. SILUETA DE LA ISLA LUNAR Y VOLCÁNICA (SUR) - Calderas y Magma
  // =========================================================================
  buildLunarVolcanoIsland(posX, posY, posZ, material) {
    const group = new THREE.Group();
    group.position.set(posX, posY, posZ);

    const craters = [
      { x: 0, z: 0, rTop: 140, rBottom: 250, h: 240, seg: 10 },
      { x: -190, z: 45, rTop: 95, rBottom: 175, h: 185, seg: 8 },
      { x: 210, z: -35, rTop: 105, rBottom: 190, h: 205, seg: 8 }
    ];

    craters.forEach(c => {
      const geo = new THREE.CylinderGeometry(c.rTop, c.rBottom, c.h, c.seg);
      geo.translate(0, c.h * 0.5, 0);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(c.x, 0, c.z);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      group.add(mesh);
    });

    this.group.add(group);
  }

  createThemedAtmosphericMaterial(hazeHex, midSlopeHex, peakHex, heightMax = 340) {
    const mat = new THREE.ShaderMaterial({
      fog: false,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0.65, 0.75, -0.45).normalize() },
        uHazeBaseColor: { value: new THREE.Color(hazeHex) },
        uMidSlopeColor: { value: new THREE.Color(midSlopeHex) },
        uSunlitPeakColor: { value: new THREE.Color(peakHex) },
        uHorizonHazeColor: { value: new THREE.Color(0xe6b57e) },
        uHeightMax: { value: heightMax }
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
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        void main() {
          float heightT = clamp(vWorldPos.y / uHeightMax, 0.0, 1.0);
          vec3 baseGrad = mix(uHazeBaseColor, uMidSlopeColor, smoothstep(0.0, 0.48, heightT));
          baseGrad = mix(baseGrad, uSunlitPeakColor, smoothstep(0.48, 1.0, heightT));

          float NdotL = max(0.0, dot(vNormal, uSunDir));
          float toonLight = smoothstep(0.20, 0.70, NdotL) * 0.35 + 0.75;
          vec3 litColor = baseGrad * toonLight;

          float horizonHaze = mix(0.40, 0.05, smoothstep(0.05, 0.80, heightT));
          vec3 finalColor = mix(litColor, uHorizonHazeColor, horizonHaze);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    this.materials.push(mat);
    return mat;
  }

  setHorizonColor(colorHex) {
    this.materials.forEach(m => {
      if (m.uniforms && m.uniforms.uHorizonHazeColor) {
        m.uniforms.uHorizonHazeColor.value.setHex(colorHex);
      }
    });
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}
