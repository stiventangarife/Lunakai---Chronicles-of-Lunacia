import * as THREE from 'three';
import { createSeededRandom } from './MathUtils.js';

/**
 * WaterManager.js - Gestor del agua estilizada: Río continuo, sombras de peces nadando contracorriente,
 * espadañas maduras (ripe bulrush) en el agua, y rocas con ondas de choque y burbujas sutiles.
 */
export class WaterManager {
  constructor(scene, terrain, assetManager = null) {
    this.scene = scene;
    this.terrain = terrain;
    this.assetManager = assetManager;
    this.time = 0;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.waterMaterialUpper = null;
    this.waterMaterialLower = null;
    this.oceanMaterial = null;
    this.oceanMesh = null;
    this.foamParticles = null;

    this.fishes = [];
    this.bulrushClusters = [];
    this.riverWakeMaterials = [];
    this.bubbleParticles = [];

    this.createRiver();
    this.createOcean();
    this.createFishShadows();
    this.createBulrushesAndRiverRocks();
  }

  /**
   * Hito 66: el río cruza la isla de lado a lado. Antes nacía en un manantial (z = -115); ahora llega hasta el mar
   * del norte (empieza en RIVER_Z0, en la orilla) y baja en unos rápidos hasta el nivel del mar.
   */
  static RIVER_Z0 = -152;        // la malla del agua empieza ya sobre el mar del norte y se desvanece en él
  static RIVER_Z1 = 150;         // y termina sobre el mar del sur
  static RIVER_CARVE_Z0 = -190;  // el cauce se excava hasta el fondo del mar: sin lengua de arena en la boca
  static MOUTH_FADE = 13;        // metros en los que el agua del río se funde con el mar en cada extremo
  static RIVER_Z_SPRING = -115; // manantial antiguo (lo usa Terrain en modo «alturas antiguas»)

  /**
   * Vados (Hito 66): tramos donde el lecho sube y el agua cubre solo FORD_DEPTH m, así se cruzan a pie.
   *   · norte: a lo largo del camino principal, que ya cruzaba el río en diagonal («Vado del Río», RoadManager);
   *   · sur: un paso recto entre el puente y el mar.
   */
  static FORD_DEPTH = 0.28;
  static FORDS = [
    { id: 'north', road: 'main', zMin: -84, zMax: -42, halfWidth: 3.0 }, // solo donde el camino atraviesa el río
    { id: 'south', a: { x: 14, z: 95 }, b: { x: 52, z: 95 }, halfWidth: 3.2 }
  ];

  /** 0–1: cuánto pertenece (x, z) a un vado (1 = centro del paso, 0 = fuera). Se suaviza 2 m en el borde. */
  static getFordFactor(x, z, roadManager = null) {
    let best = 0;
    for (const f of WaterManager.FORDS) {
      let d = Infinity;
      if (f.road) {
        if (z < f.zMin - 3 || z > f.zMax + 3 || !roadManager) continue;
        const pts = WaterManager._roadSamples(roadManager, f.road);
        for (let i = 0; i < pts.length; i++) {
          const dx = pts[i].x - x, dz = pts[i].y - z;
          const q = dx * dx + dz * dz;
          if (q < d) d = q;
        }
        d = Math.sqrt(d);
        d += Math.max(0, f.zMin - z, z - f.zMax); // fin del vado en sus extremos
      } else {
        const ax = f.a.x, az = f.a.z, bx = f.b.x - ax, bz = f.b.z - az;
        const t = Math.max(0, Math.min(1, ((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz)));
        d = Math.hypot(x - (ax + bx * t), z - (az + bz * t));
      }
      if (d >= f.halfWidth + 2) continue;
      const u = Math.min(1, Math.max(0, (f.halfWidth + 2 - d) / 2));
      best = Math.max(best, u * u * (3 - 2 * u));
    }
    return best;
  }

  /** Puntos muestreados de una curva de RoadManager (en caché). */
  static _roadSamples(rm, name) {
    if (!rm) return [];
    if (!rm._fordSamples) rm._fordSamples = {};
    if (!rm._fordSamples[name]) {
      const curve = name === 'main' ? rm.mainCurve : name === 'fork' ? rm.forkCurve : name === 'dojo' ? rm.dojoCurve : rm.elderCurve;
      const pts = [];
      if (curve) for (let i = 0; i <= 400; i++) pts.push(curve.getPoint(i / 400));
      rm._fordSamples[name] = pts;
    }
    return rm._fordSamples[name];
  }

  // Altura exacta de la superficie del agua en cualquier punto (x, z)
  static getRiverWaterHeight(z) {
    if (z < -112) {
      // Desembocadura norte (Hito 66): baja del nivel del río al del mar repartido en 35 m (corriente suave)
      const t = Math.min(1, (-112 - z) / (147 - 112));
      const s = t * t * (3 - 2 * t);
      return THREE.MathUtils.lerp(2.0, 0.45, s);
    }
    if (z <= 16) return 2.0;
    if (z >= 34) return 0.45;
    // Transición suave cúbica (Hermite) tipo rápidos / desnivel natural
    const t = (z - 16) / (34 - 16);
    const s = t * t * (3 - 2 * t);
    return THREE.MathUtils.lerp(2.0, 0.45, s);
  }

  /**
   * Ensanche de la desembocadura norte (estuario): 1 en el río y hasta ×1,7 al llegar al mar. Lo usan el cauce
   * (Terrain) y el agua (malla), así la orilla se curva hacia dentro en lugar de cruzar la boca.
   * Solo se abre hacia el OESTE: la orilla este conserva el camino principal hasta el mirador del mar.
   */
  static getNorthMouthFactor(z) {
    if (z >= -126) return 1;
    const t = Math.min(1, (-126 - z) / 40);
    return 1 + 0.7 * t * t * (3 - 2 * t);
  }

  /** 1 en el río, 0 en el extremo de la malla: el agua del río se desvanece sobre el mar en cada boca. */
  static getMouthFade(z) {
    const F = WaterManager.MOUTH_FADE;
    const a = Math.min(1, Math.max(0, (z - WaterManager.RIVER_Z0) / F));
    const b = Math.min(1, Math.max(0, (WaterManager.RIVER_Z1 - z) / F));
    const f = Math.min(a, b);
    return f * f * (3 - 2 * f);
  }

  // Centro X y semi-ancho del río en cualquier Z
  static getRiverBounds(z) {
    const riverCenterX = 18 + Math.sin(z * 0.025) * 16 + Math.cos(z * 0.012) * 8;
    const riverHalfWidth = 10.0 + Math.sin(z * 0.04) * 3.0 + 3.0;
    return { riverCenterX, riverHalfWidth };
  }

  createRiver() {
    // Río continuo de mar a mar (Hito 66): del mar del norte (RIVER_Z0) a la desembocadura sur en la bahía (Z: 148)
    const riverGeo = this.generateContinuousRiverMeshGeometry(WaterManager.RIVER_Z0, WaterManager.RIVER_Z1);
    this.waterMaterialUpper = this.createWaterShaderMaterial();
    this.waterMaterialLower = this.waterMaterialUpper; // Comparten el mismo shader perfeccionado

    const riverMesh = new THREE.Mesh(riverGeo, this.waterMaterialUpper);
    riverMesh.name = 'ContinuousRiverMesh';
    this.group.add(riverMesh);
  }

  createOcean() {
    // Plano oceánico infinito/horizonte que rodea la isla (6000m x 6000m)
    // Conecta perfectamente con el nivel del mar y la desembocadura (Y = 0.45)
    const size = 6000;
    const oceanGeo = new THREE.PlaneGeometry(size, size, 80, 80);
    oceanGeo.rotateX(-Math.PI / 2);

    this.oceanMaterial = this.createOceanShaderMaterial();
    this.oceanMesh = new THREE.Mesh(oceanGeo, this.oceanMaterial);
    this.oceanMesh.position.set(0, 0.45, 0);
    this.oceanMesh.name = 'VastOceanHorizonMesh';
    this.group.add(this.oceanMesh);
  }

  createOceanShaderMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      forceSinglePass: true, // agua vista siempre desde arriba: una pasada en lugar de dos
      fog: true,
      uniforms: {
        ...THREE.UniformsLib.fog,
        uTime: { value: 0 },
        uDeepColor: { value: new THREE.Color(0x116584) },    // Turquesa zafiro idéntico al río
        uShallowColor: { value: new THREE.Color(0x4ee2e8) }, // Aguamarina luminoso idéntico al río
        uFoamColor: { value: new THREE.Color(0xb2eff5) },    // Espuma suave pastel idéntica al río
        uOpacity: { value: 0.88 },
        uFoamIntensity: { value: 1.35 },                     // Intensidad de espuma costera
        uToonSpecEnabled: { value: 1.0 }
      },
      vertexShader: `
        #include <common>
        #include <fog_pars_vertex>
        uniform float uTime;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        void main() {
          vec3 pos = position;
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPos.xyz;

          float distCenter = length(worldPos.xz);

          // Oleaje oceánico suave
          float wave1 = sin(worldPos.x * 0.035 + uTime * 1.2 + worldPos.z * 0.025) * 0.10;
          float wave2 = cos(worldPos.z * 0.04 - uTime * 0.95 + worldPos.x * 0.015) * 0.08;

          // Olas concéntricas suaves que avanzan hacia la costa
          float shoreRoll = sin(uTime * 2.2 - distCenter * 0.42) * 0.07;
          float nearCoastFactor = (1.0 - smoothstep(136.0, 185.0, distCenter));

          // Atenuar la altura vertical justo antes del suelo firme (136m - 142m)
          float calmFactor = smoothstep(136.5, 155.0, distCenter);
          pos.y += ((wave1 + wave2) + shoreRoll * nearCoastFactor) * calmFactor;

          vNormal = normalize(vec3(-wave1 * 0.08, 1.0, -wave2 * 0.08));

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          #include <fog_vertex>
        }
      `,
      fragmentShader: `
        #include <common>
        #include <fog_pars_fragment>
        uniform float uTime;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uFoamColor;
        uniform float uOpacity;
        uniform float uFoamIntensity;
        uniform float uToonSpecEnabled;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        void main() {
          float distToIsland = length(vWorldPosition.xz);
          float angle = atan(vWorldPosition.z, vWorldPosition.x);

          // 1. MÁSCARA TOTAL DE EXCLUSIÓN: El océano no entra al interior de la isla
          if (distToIsland < 136.5) {
            discard;
          }

          float shoreAlpha = smoothstep(136.5, 142.0, distToIsland);

          // 2. Ondas y oleaje armónico de mar abierto
          vec2 p = vWorldPosition.xz * 0.024;
          float swell1 = sin(p.x * 2.2 + uTime * 1.25 + p.y * 1.6);
          float swell2 = cos(p.y * 2.5 - uTime * 1.10 + p.x * 1.3);
          float pattern = (swell1 + swell2) * 0.5;

          // 3. Gradiente cromático: agua cristalina clara en la orilla, zafiro en profundidad
          float shallowCoastFactor = (1.0 - smoothstep(136.5, 168.0, distToIsland));
          float depthMix = clamp(smoothstep(-0.35, 0.70, pattern) + shallowCoastFactor * 0.50, 0.0, 1.0);
          vec3 col = mix(uDeepColor, uShallowColor, depthMix);

          // 4. EFECTO DINÁMICO DE ESPUMA DE OLAS EN CONTACTO CON LA COSTA:
          // Perturbación angular orgánica para que la orilla siga los contornos naturales
          float coastPerturb = sin(angle * 7.0 + sin(angle * 13.0) * 0.6) * 3.2;
          float effDist = distToIsland + coastPerturb;

          // Dos trenes de olas sucesivas rompiendo hacia la costa (Surf Breakers)
          float waveRoll1 = sin(uTime * 2.4 - effDist * 0.50);
          float waveRoll2 = sin(uTime * 2.0 - effDist * 0.36 + 2.1);

          // Zona activa de rompiente costera (136.5m a 168m)
          float surfZone = (1.0 - smoothstep(150.0, 170.0, distToIsland)) * smoothstep(136.5, 141.0, distToIsland);
          
          // Bandas de espuma blanca de las olas al romper contra la costa
          float surfWaveFoam1 = smoothstep(0.35, 0.85, waveRoll1) * surfZone;
          float surfWaveFoam2 = smoothstep(0.40, 0.88, waveRoll2) * surfZone * 0.75;

          // Espuma densa de orilla (Shoreline Contact Ribbon / Swash):
          // El oleaje que lame y retrocede sobre la orilla
          float shoreContactDist = distToIsland - 137.0;
          float shoreWash = sin(uTime * 1.8 + coastPerturb * 0.35) * 1.4;
          float maxShoreWash = max(7.5 + shoreWash, 0.8);
          float shoreContactFoam = (1.0 - smoothstep(0.2, maxShoreWash, shoreContactDist)) * 1.25;

          // Textura de encaje y burbujas anime (Froth Lace)
          float laceUv = sin((vWorldPosition.x * 2.2 + vWorldPosition.z * 1.7) + uTime * 1.4) *
                         cos((vWorldPosition.z * 2.0 - vWorldPosition.x * 1.5) - uTime * 1.2);
          float laceFactor = smoothstep(-0.25, 0.65, laceUv) * 0.35 + 0.65;

          // Espuma de crestas en mar abierto
          float openSeaFoam = smoothstep(0.72, 0.95, pattern) * 0.35 * smoothstep(155.0, 185.0, distToIsland);

          // Combinación y aplicación de espuma
          float totalCoastFoam = (surfWaveFoam1 + surfWaveFoam2 + shoreContactFoam) * laceFactor * uFoamIntensity;
          float totalFoam = clamp(totalCoastFoam + openSeaFoam, 0.0, 1.0);

          // Mezcla con el color de espuma
          col = mix(col, uFoamColor, totalFoam * 0.95);

          // Resplandor Bloom suave en la espuma de rompiente
          if (totalFoam > 0.25) {
            col += uFoamColor * ((totalFoam - 0.25) * 0.45);
          }

          // 5. Destello especular Toon
          if (uToonSpecEnabled > 0.5) {
            vec3 lightDir = normalize(vec3(0.5, 0.8, 0.4));
            vec3 viewDir = normalize(cameraPosition - vWorldPosition);
            vec3 halfVector = normalize(lightDir + viewDir + vec3(0.0001));
            float NdotH = clamp(dot(normalize(vNormal), halfVector), 0.0, 1.0);
            float toonSpec = smoothstep(0.94, 0.985, NdotH) * 0.28;
            col += vec3(toonSpec);
          }

          gl_FragColor = vec4(col, uOpacity * shoreAlpha);
          #include <fog_fragment>
        }
      `
    });
  }

  generateContinuousRiverMeshGeometry(zStart, zEnd) {
    const segmentsZ = Math.round(240 * (zEnd - zStart) / 263); // misma densidad que el río original (263 m, 240 tramos)
    const segmentsX = 26;
    const geom = new THREE.BufferGeometry();

    const positions = [];
    const uvs = [];
    const fades = []; // 1 = río, 0 = fundido con el mar (aFade, Hito 66)
    const indices = [];

    for (let i = 0; i <= segmentsZ; i++) {
      const tz = i / segmentsZ;
      const z = zStart + (zEnd - zStart) * tz;
      const { riverCenterX, riverHalfWidth } = WaterManager.getRiverBounds(z);
      const waterY = WaterManager.getRiverWaterHeight(z);

      let effectiveHalfWidth = riverHalfWidth;
      let westHalfWidth = null;
      if (zStart < -140 && z < -126) {
        // Desembocadura norte: estuario que se abre hacia el mar por el oeste (mismo ensanche que el cauce)
        westHalfWidth = effectiveHalfWidth * WaterManager.getNorthMouthFactor(z);
      } else if (zStart >= -140 && tz < 0.08) {
        const t = tz / 0.08;
        effectiveHalfWidth *= (0.25 + 0.75 * Math.sin(t * Math.PI * 0.5));
      } else if (z > 120) {
        const t = (z - 120) / (148 - 120);
        effectiveHalfWidth *= (1.0 + t * 0.40); // Apertura suave de la desembocadura hacia el mar
      }

      for (let j = 0; j <= segmentsX; j++) {
        const tx = j / segmentsX;
        const wHW = westHalfWidth ?? effectiveHalfWidth;
        const x = riverCenterX - wHW + tx * (wHW + effectiveHalfWidth);

        positions.push(x, waterY, z);
        uvs.push(tx, ((z + 115) / 263) * 20.0); // mismo reparto que antes en el tramo original
        // En las bocas el agua también se desvanece hacia los lados, para que el borde lateral no se vea sobre el mar
        const mouth = Math.max(Math.min(1, Math.max(0, (-130 - z) / 15)), Math.min(1, Math.max(0, (z - 134) / 12)));
        const lat = 1 - Math.abs(tx * 2 - 1);
        const side = Math.min(1, lat / 0.35);
        fades.push(WaterManager.getMouthFade(z) * (1 - mouth + mouth * side * side * (3 - 2 * side)));
      }
    }

    for (let i = 0; i < segmentsZ; i++) {
      for (let j = 0; j < segmentsX; j++) {
        const a = i * (segmentsX + 1) + j;
        const b = (i + 1) * (segmentsX + 1) + j;
        const c = (i + 1) * (segmentsX + 1) + (j + 1);
        const d = i * (segmentsX + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setAttribute('aFade', new THREE.Float32BufferAttribute(fades, 1));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    return geom;
  }

  createWaterShaderMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      forceSinglePass: true, // agua vista siempre desde arriba: una pasada en lugar de dos
      fog: true,
      uniforms: {
        ...THREE.UniformsLib.fog,
        uTime: { value: 0 },
        uDeepColor: { value: new THREE.Color(0x116584) },    // Turquesa zafiro idéntico al mar
        uShallowColor: { value: new THREE.Color(0x4ee2e8) }, // Aguamarina luminoso idéntico al mar
        uFoamColor: { value: new THREE.Color(0xb2eff5) },    // Espuma suave pastel idéntica al mar
        uOpacity: { value: 0.88 },
        uFoamIntensity: { value: 1.10 }, // Espuma contacto = 110% por defecto
        uToonSpecEnabled: { value: 1.0 }
      },
      vertexShader: `
        #include <common>
        #include <fog_pars_vertex>
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Ondulación superficial suave orgánica coordinada
          float wave1 = sin(pos.x * 0.35 + uTime * 2.0 + pos.z * 0.18) * 0.05;
          float wave2 = cos(pos.z * 0.30 - uTime * 1.6) * 0.04;
          pos.y += wave1 + wave2;

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPos.xyz;
          vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          #include <fog_vertex>
        }
      `,
      fragmentShader: `
        #include <common>
        #include <fog_pars_fragment>
        uniform float uTime;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uFoamColor;
        uniform float uOpacity;
        uniform float uFoamIntensity;
        uniform float uToonSpecEnabled;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        void main() {
          // Coordenadas de onda animadas a lo largo de la corriente del río
          vec2 waveUv = vUv * 3.5;
          float noise = sin(waveUv.x * 2.8 + uTime * 1.8) * cos(waveUv.y * 2.8 - uTime * 1.4);
          float ripple = sin((vWorldPosition.x + vWorldPosition.z) * 0.5 + uTime * 2.0) * 0.5 + 0.5;

          // Espuma de orilla lateral del río
          float edgeDist = min(vUv.x, 1.0 - vUv.x);

          // En la desembocadura al mar (z > 120), desvanecer suavemente la espuma lateral
          float estuarySoftness = 1.0 - smoothstep(120.0, 148.0, vWorldPosition.z) * 0.85;

          float wavePulse = sin(uTime * 2.8 - edgeDist * 22.0) * 0.5 + 0.5;
          float foamFactor = (1.0 - smoothstep(0.012, 0.14, edgeDist + (noise * 0.035) + (wavePulse * 0.025))) * estuarySoftness;

          // Gradiente de profundidad y transparencia armónico
          vec3 waterCol = mix(uDeepColor, uShallowColor, ripple * 0.40 + (1.0 - edgeDist) * 0.35);

          // Mezcla con espuma de contacto
          float effectiveFoam = foamFactor * 0.90 * uFoamIntensity;
          vec3 finalColor = mix(waterCol, uFoamColor, clamp(effectiveFoam, 0.0, 1.0));

          // Resplandor Bloom armónico en la espuma
          if (effectiveFoam > 0.15) {
            finalColor += uFoamColor * (effectiveFoam * 0.30);
          }

          // Destello especular Toon coordinado
          if (uToonSpecEnabled > 0.5) {
            vec3 lightDir = normalize(vec3(0.5, 0.8, 0.4));
            vec3 viewDir = normalize(cameraPosition - vWorldPosition);
            vec3 halfVector = normalize(lightDir + viewDir + vec3(0.0001));
            float NdotH = clamp(dot(normalize(vNormal), halfVector), 0.0, 1.0);
            float toonSpec = smoothstep(0.94, 0.985, NdotH) * 0.28;
            finalColor += vec3(toonSpec);
          }

          gl_FragColor = vec4(finalColor, uOpacity);
          #include <fog_fragment>
        }
      `
    });
  }

  createFishShadows() {
    this.fishGroup = new THREE.Group();
    this.fishGroup.name = 'RiverFishShadows';
    this.group.add(this.fishGroup);

    // Silueta estilizada del pez: cuerpo ahusado y cola flexible
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(0, 0.42); // Morro (hacia adelante)
    bodyShape.bezierCurveTo(0.12, 0.26, 0.13, 0.05, 0.09, -0.14);
    bodyShape.lineTo(0.045, -0.22);
    bodyShape.lineTo(-0.045, -0.22);
    bodyShape.lineTo(-0.09, -0.14);
    bodyShape.bezierCurveTo(-0.13, 0.05, -0.12, 0.26, 0, 0.42);

    const bodyGeo = new THREE.ShapeGeometry(bodyShape);
    bodyGeo.rotateX(-Math.PI / 2); // Orienta al plano horizontal XZ, apuntando hacia -Z

    // Aletas pectorales estilizadas
    const rFinShape = new THREE.Shape();
    rFinShape.moveTo(0, 0);
    rFinShape.lineTo(0.14, -0.06);
    rFinShape.lineTo(0.10, -0.14);
    rFinShape.closePath();
    const rFinGeo = new THREE.ShapeGeometry(rFinShape);
    rFinGeo.rotateX(-Math.PI / 2);

    const lFinShape = new THREE.Shape();
    lFinShape.moveTo(0, 0);
    lFinShape.lineTo(-0.14, -0.06);
    lFinShape.lineTo(-0.10, -0.14);
    lFinShape.closePath();
    const lFinGeo = new THREE.ShapeGeometry(lFinShape);
    lFinGeo.rotateX(-Math.PI / 2);

    // Aleta caudal / cola
    const tailShape = new THREE.Shape();
    tailShape.moveTo(0.04, 0);
    tailShape.bezierCurveTo(0.06, -0.10, 0.14, -0.22, 0.20, -0.32);
    tailShape.lineTo(0.0, -0.24); // Muesca central
    tailShape.lineTo(-0.20, -0.32);
    tailShape.bezierCurveTo(-0.14, -0.22, -0.06, -0.10, -0.04, 0);
    tailShape.closePath();

    const tailGeo = new THREE.ShapeGeometry(tailShape);
    tailGeo.rotateX(-Math.PI / 2);

    // Material de sombra acuática translúcida (estilo Zelda BotW / Ghibli / Genshin)
    const fishMaterial = new THREE.MeshBasicMaterial({
      color: 0x092636,
      transparent: true,
      opacity: 0.68,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // 6 bancos / zonas de peces a lo largo del curso del río
    const schoolZones = [
      { centerZ: -82, spanZ: 34, count: 3, baseSpeed: 1.15 }, // Zona alta tranquila
      { centerZ: -44, spanZ: 30, count: 4, baseSpeed: 1.30 }, // Tramo bosque
      { centerZ: -8,  spanZ: 26, count: 3, baseSpeed: 1.10 }, // Aproximación al puente
      { centerZ: 38,  spanZ: 28, count: 4, baseSpeed: 1.45 }, // Remanso post-rápidos
      { centerZ: 78,  spanZ: 34, count: 4, baseSpeed: 1.25 }, // Meandro central
      { centerZ: 125, spanZ: 38, count: 3, baseSpeed: 1.10 }  // Tramo bajo abierto
    ];

    // Los 21 peces se dibujan con 4 InstancedMesh (cuerpo, aletas y cola) en lugar de 84 mallas
    // sueltas. Cada pez conserva su "esqueleto" de Object3D (raíz + pivote de cola) fuera de la escena:
    // la animación de update() no cambia, y al final de cada fotograma se copian sus matrices.
    // Todas las piezas comparten color y opacidad, así que el orden de dibujo no altera la mezcla.
    fishMaterial.forceSinglePass = true; // plano visto siempre desde arriba: una pasada basta
    const parts = [];
    schoolZones.forEach((zone) => {
      for (let i = 0; i < zone.count; i++) {
        const root = new THREE.Group();
        const bodyNode = new THREE.Object3D();
        const rFinNode = new THREE.Object3D();
        const lFinNode = new THREE.Object3D();

        // Pivote de la cola para aleteo ondulatorio orgánico
        const tailPivot = new THREE.Group();
        tailPivot.position.set(0, 0, 0.22);
        const tailNode = new THREE.Object3D();
        tailPivot.add(tailNode);

        root.add(bodyNode);
        root.add(rFinNode);
        root.add(lFinNode);
        root.add(tailPivot);
        parts.push([bodyNode, rFinNode, lFinNode, tailNode]);

        const scale = 0.85 + Math.random() * 0.45;
        root.scale.set(scale, scale, scale);

        const minZ = zone.centerZ - zone.spanZ * 0.5;
        const maxZ = zone.centerZ + zone.spanZ * 0.5;
        const currentZ = THREE.MathUtils.lerp(minZ, maxZ, Math.random());
        const lateralRatio = (Math.random() - 0.5) * 1.3; // Dentro del 65% del ancho del río

        this.fishes.push({
          root,
          tailPivot,
          minZ,
          maxZ,
          currentZ,
          lateralRatio,
          speed: zone.baseSpeed * (0.85 + Math.random() * 0.35),
          wiggleFreq: 7.0 + Math.random() * 3.5,
          wigglePhase: Math.random() * Math.PI * 2,
          wanderPhase: Math.random() * Math.PI * 2,
          heading: -1 // -1 = nadando río arriba (hacia -Z, contracorriente)
        });
      }
    });

    const n = this.fishes.length;
    this.fishParts = parts;
    this.fishMeshes = [bodyGeo, rFinGeo, lFinGeo, tailGeo].map((geo, k) => {
      const im = new THREE.InstancedMesh(geo, fishMaterial, n);
      im.name = ['RiverFishBody', 'RiverFishFinR', 'RiverFishFinL', 'RiverFishTail'][k];
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.frustumCulled = false; // nadan por todo el río: una sola llamada, sin esfera que recalcular
      this.fishGroup.add(im);
      return im;
    });
    this._syncFishInstances();
  }

  /** Copia la pose de cada pez (raíz + cola) a sus 4 InstancedMesh. */
  _syncFishInstances() {
    if (!this.fishMeshes) return;
    for (let i = 0; i < this.fishes.length; i++) {
      const root = this.fishes[i].root;
      root.updateMatrixWorld(true); // la raíz no está en la escena: matrixWorld = matriz local en fishGroup
      const p = this.fishParts[i];
      for (let k = 0; k < 4; k++) this.fishMeshes[k].setMatrixAt(i, p[k].matrixWorld);
    }
    for (let k = 0; k < 4; k++) this.fishMeshes[k].instanceMatrix.needsUpdate = true;
  }

  createBulrushesAndRiverRocks() {
    const reedRng = createSeededRandom(88001);
    this.bulrushGroup = new THREE.Group();
    this.bulrushGroup.name = 'RiverBulrushesAndWakes';
    this.group.add(this.bulrushGroup);

    // Geometrías base de espadaña madura (ripe bulrush)
    const stalkGeo = new THREE.CylinderGeometry(0.016, 0.024, 2.2, 7);
    stalkGeo.translate(0, 1.1, 0); // Base en el suelo

    const spikeGeo = new THREE.CapsuleGeometry(0.045, 0.38, 6, 10);
    spikeGeo.translate(0, 1.65, 0); // En el tercio superior del tallo

    const spikeTipGeo = new THREE.CylinderGeometry(0.007, 0.014, 0.16, 6);
    spikeTipGeo.translate(0, 1.92, 0); // Puntas doradas/secas del bulrush maduro

    // Hojas curvadas acintadas
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.lineTo(0.028, 0.6);
    leafShape.lineTo(0.018, 1.4);
    leafShape.lineTo(0, 1.9);
    leafShape.lineTo(-0.018, 1.4);
    leafShape.lineTo(-0.028, 0.6);
    leafShape.closePath();
    const leafGeo = new THREE.ShapeGeometry(leafShape);
    leafGeo.rotateY(Math.PI / 2);

    // Materiales botánicos de espadaña madura
    const stalkMat = new THREE.MeshStandardMaterial({
      color: 0x466d35,
      roughness: 0.75,
      flatShading: true
    });
    const ripeSpikeMat = new THREE.MeshStandardMaterial({
      color: 0x3d2012, // Marrón oscuro aterciopelado característico de la espiga madura
      roughness: 0.90,
      metalness: 0.05
    });
    const spikeTipMat = new THREE.MeshStandardMaterial({
      color: 0xc8a855, // Punta dorada / estambre seco
      roughness: 0.85
    });
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x557e3f,
      roughness: 0.70,
      side: THREE.DoubleSide
    });

    // Creador de material de ondas de choque de agua en rocas
    const createWakeMaterial = () => {
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        forceSinglePass: true, // plano horizontal visto desde arriba: una pasada basta
        uniforms: {
          uTime: { value: 0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec4 p = vec4(position, 1.0);
            #ifdef USE_INSTANCING
              p = instanceMatrix * p;
            #endif
            gl_Position = projectionMatrix * modelViewMatrix * p;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            vec2 p = (vUv - 0.5) * 2.0;
            // Estiramiento sutil hacia la corriente (+Z)
            p.y *= 0.85;
            float dist = length(p);
            if (dist > 1.0) discard;

            // Ondulaciones concéntricas de choque
            float wave1 = sin(dist * 20.0 - uTime * 4.2);
            float wave2 = sin(dist * 12.0 - uTime * 2.8);
            float rings = clamp(wave1 * 0.65 + wave2 * 0.35, 0.0, 1.0);

            // Choque frontal contracorriente (p.y < 0): cresta de espuma más densa
            float bowWave = (1.0 - smoothstep(-0.5, 0.15, p.y)) * (1.0 - smoothstep(0.2, 0.7, dist));

            // Desvanecimiento suave en los bordes exteriores
            float edgeFade = (1.0 - smoothstep(0.45, 1.0, dist)) * smoothstep(0.1, 0.28, dist);

            float foam = (rings * 0.55 + bowWave * 0.50) * edgeFade;
            vec3 foamCol = mix(vec3(0.68, 0.94, 0.98), vec3(0.96, 0.99, 1.0), bowWave * 0.7 + rings * 0.3);

            gl_FragColor = vec4(foamCol, foam * 0.75);
          }
        `
      });
      this.riverWakeMaterials.push(mat);
      return mat;
    };

    // Material de roca de río estilizada
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x3d4948,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true
    });

    // Material y geometría de burbujas muy sutiles ("muy pocas partículas de burbujas")
    const bubbleGeo = new THREE.SphereGeometry(0.032, 6, 6);
    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0xdef8ff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // 9 emplazamientos escénicos a lo largo del río para las espadañas y rocas con ondas
    const clusterSites = [
      { z: -84, side: -0.80, countStalks: 7, rocks: [{ ox: -0.4, oz: 0.2, r: 0.48 }] },
      { z: -62, side:  0.82, countStalks: 8, rocks: [{ ox:  0.3, oz: -0.3, r: 0.55 }] },
      { z: -38, side: -0.78, countStalks: 6, rocks: [{ ox: -0.2, oz: 0.4, r: 0.45 }] },
      { z: -14, side:  0.84, countStalks: 8, rocks: [{ ox:  0.4, oz: 0.1, r: 0.60 }] },
      { z:  16, side: -0.82, countStalks: 7, rocks: [{ ox: -0.3, oz: -0.2, r: 0.52 }] },
      { z:  44, side:  0.80, countStalks: 9, rocks: [{ ox:  0.5, oz: 0.3, r: 0.58 }] },
      { z:  74, side: -0.85, countStalks: 7, rocks: [{ ox: -0.4, oz: -0.1, r: 0.50 }] },
      { z: 104, side:  0.82, countStalks: 8, rocks: [{ ox:  0.3, oz: 0.4, r: 0.54 }] },
      { z: 136, side: -0.78, countStalks: 7, rocks: [{ ox: -0.3, oz: 0.2, r: 0.48 }] }
    ];

    const pendingRiverRocks = [];
    // Espadañas, ondas y burbujas: se dibujan instanciadas (antes eran ~490 mallas sueltas).
    // La disposición es idéntica: se calculan las mismas transformaciones, en el mismo orden y con
    // la misma semilla, y se guardan como matrices de instancia.
    const tmpStalk = new THREE.Object3D();
    const tmpLeaf = new THREE.Object3D();
    const tmpMat = new THREE.Matrix4();
    const pendingWakes = [];
    const pendingBubbles = [];
    const makeInstanced = (geo, mat, matrices, name) => {
      const im = new THREE.InstancedMesh(geo, mat, matrices.length);
      im.name = name;
      matrices.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      im.matrixAutoUpdate = false; // fija dentro de su grupo (el grupo sí se mece)
      return im;
    };

    clusterSites.forEach((site) => {
      const { riverCenterX, riverHalfWidth } = WaterManager.getRiverBounds(site.z);
      const waterY = WaterManager.getRiverWaterHeight(site.z);
      const baseX = riverCenterX + site.side * (riverHalfWidth * 0.88);
      const baseZ = site.z;

      // 1. Grupo de Espadañas maduras dentro del agua poco profunda
      const clusterGroup = new THREE.Group();
      clusterGroup.position.set(baseX, waterY - 0.4, baseZ); // Raíz sumergida en el lecho del río

      const stalkMatrices = [];
      const leafLocal = [];
      const leafMatrices = [];
      for (let s = 0; s < site.countStalks; s++) {
        const offsetX = (reedRng() - 0.5) * 1.4;
        const offsetZ = (reedRng() - 0.5) * 1.4;
        tmpStalk.position.set(offsetX, 0, offsetZ);
        tmpStalk.rotation.set(0, 0, 0);
        tmpStalk.scale.set(1, 1, 1);

        // 2 a 3 hojas curvadas por tallo
        const leafCount = 2 + Math.floor(reedRng() * 2);
        leafLocal.length = 0;
        for (let l = 0; l < leafCount; l++) {
          tmpLeaf.position.set(0, 0, 0);
          tmpLeaf.rotation.set(0, (l / leafCount) * Math.PI * 2 + reedRng() * 0.5, 0);
          tmpLeaf.rotation.z = 0.12 + reedRng() * 0.18;
          tmpLeaf.scale.set(0.9, 0.8 + reedRng() * 0.4, 0.9);
          tmpLeaf.updateMatrix();
          leafLocal.push(tmpLeaf.matrix.clone());
        }

        const hScale = 0.82 + reedRng() * 0.38;
        tmpStalk.scale.set(1.0, hScale, 1.0);
        tmpStalk.rotation.y = reedRng() * Math.PI * 2;
        tmpStalk.rotation.x = (reedRng() - 0.5) * 0.14;
        tmpStalk.rotation.z = (reedRng() - 0.5) * 0.14;
        tmpStalk.updateMatrix();

        stalkMatrices.push(tmpStalk.matrix.clone());
        for (const lm of leafLocal) leafMatrices.push(tmpMat.multiplyMatrices(tmpStalk.matrix, lm).clone());
      }
      clusterGroup.add(makeInstanced(stalkGeo, stalkMat, stalkMatrices, 'BulrushStalks'));
      clusterGroup.add(makeInstanced(spikeGeo, ripeSpikeMat, stalkMatrices, 'BulrushSpikes'));
      clusterGroup.add(makeInstanced(spikeTipGeo, spikeTipMat, stalkMatrices, 'BulrushTips'));
      clusterGroup.add(makeInstanced(leafGeo, leafMat, leafMatrices, 'BulrushLeaves'));

      this.bulrushClusters.push({
        group: clusterGroup,
        phase: reedRng() * Math.PI * 2,
        swaySpeed: 1.4 + reedRng() * 0.5
      });
      this.bulrushGroup.add(clusterGroup);

      // 2. Rocas semi-sumergidas que acompañan a las espadañas con ondas de choque de agua
      site.rocks.forEach((rInfo) => {
        const rx = baseX + rInfo.ox;
        const rz = baseZ + rInfo.oz;
        const rWaterY = WaterManager.getRiverWaterHeight(rz);

        // Registrar posición para malla instanciada de rocas
        pendingRiverRocks.push({
          pos: new THREE.Vector3(rx, rWaterY - rInfo.r * 0.45, rz),
          rot: new THREE.Euler(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.3),
          scale: new THREE.Vector3(1.15 * rInfo.r, 0.75 * rInfo.r, 1.1 * rInfo.r)
        });

        // Malla horizontal de ondas por el choque del agua (Collision Wake Ripple)
        const wakeSize = rInfo.r * 3.6;
        pendingWakes.push(new THREE.Matrix4().compose(
          new THREE.Vector3(rx, rWaterY + 0.012, rz),
          new THREE.Quaternion(),
          new THREE.Vector3(wakeSize, 1, wakeSize)
        ));

        // 3. Burbujas muy sutiles y escasas ("muy pocas partículas de burbujas")
        // Exactamente 4 a 6 burbujas por roca
        const bubbleCount = 4 + Math.floor(Math.random() * 3);
        for (let b = 0; b < bubbleCount; b++) {
          const bAngle = Math.random() * Math.PI * 2;
          const bRadius = rInfo.r * (0.65 + Math.random() * 0.6);
          const originX = rx + Math.cos(bAngle) * bRadius;
          const originZ = rz + Math.sin(bAngle) * bRadius;
          const startY = rWaterY - 0.25 - Math.random() * 0.15;

          const bScale = 0.5 + Math.random() * 0.6;

          this.bubbleParticles.push({
            index: pendingBubbles.length,
            x: originX,
            y: startY,
            z: originZ,
            scale: bScale,
            visible: true, // como antes: las inactivas se ven quietas hasta su primer ascenso
            originX,
            originZ,
            waterY: rWaterY,
            riseSpeed: 0.22 + Math.random() * 0.14,
            wobbleSeed: Math.random() * 10,
            active: Math.random() > 0.35 // Algunas inactivas al inicio para espaciar el efecto
          });
          pendingBubbles.push(null);
        }
      });
    });

    // Ondas de choque: una sola InstancedMesh con un único material (todas compartían el mismo tiempo)
    if (pendingWakes.length > 0) {
      const wakePlane = new THREE.PlaneGeometry(1, 1);
      wakePlane.rotateX(-Math.PI / 2); // Plano horizontal sobre el agua
      this.bulrushGroup.add(makeInstanced(wakePlane, createWakeMaterial(), pendingWakes, 'RiverRockWakes'));
    }

    // Burbujas: una InstancedMesh; una burbuja "oculta" se dibuja con escala 0
    if (pendingBubbles.length > 0) {
      bubbleMat.forceSinglePass = true;
      this.bubbleMesh = new THREE.InstancedMesh(bubbleGeo, bubbleMat, pendingBubbles.length);
      this.bubbleMesh.name = 'RiverBubbles';
      this.bubbleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.bubbleMesh.frustumCulled = false; // repartidas por todo el río: una sola llamada
      this.bubbleMesh.matrixAutoUpdate = false;
      this.bulrushGroup.add(this.bubbleMesh);
      this._bubbleTmp = new THREE.Matrix4();
      this._bubbleQ = new THREE.Quaternion();
      this._bubblePos = new THREE.Vector3();
      this._bubbleScale = new THREE.Vector3();
      for (const bp of this.bubbleParticles) this._writeBubble(bp);
      this.bubbleMesh.instanceMatrix.needsUpdate = true;
    }

    // Crear InstancedMesh para todas las rocas de río
    if (pendingRiverRocks.length > 0) {
      const baseRockGeo = new THREE.DodecahedronGeometry(1.0, 1);
      const instancedRiverRocks = new THREE.InstancedMesh(baseRockGeo, rockMat, pendingRiverRocks.length);
      instancedRiverRocks.castShadow = true;
      instancedRiverRocks.receiveShadow = true;

      const dummy = new THREE.Object3D();
      pendingRiverRocks.forEach((r, idx) => {
        dummy.position.copy(r.pos);
        dummy.rotation.copy(r.rot);
        dummy.scale.copy(r.scale);
        dummy.updateMatrix();
        instancedRiverRocks.setMatrixAt(idx, dummy.matrix);
      });
      instancedRiverRocks.instanceMatrix.needsUpdate = true;
      this.bulrushGroup.add(instancedRiverRocks);
    }
  }

  _writeBubble(bp) {
    const s = bp.visible ? bp.scale : 0;
    this._bubblePos.set(bp.x, bp.y, bp.z);
    this._bubbleScale.set(s, s, s);
    this._bubbleTmp.compose(this._bubblePos, this._bubbleQ, this._bubbleScale);
    this.bubbleMesh.setMatrixAt(bp.index, this._bubbleTmp);
  }

  update(delta) {
    this.time += delta;

    // 1. Uniform de tiempo del shader del río y océano
    if (this.waterMaterialUpper) {
      this.waterMaterialUpper.uniforms.uTime.value = this.time;
    }
    if (this.oceanMaterial && this.oceanMaterial.uniforms.uTime) {
      this.oceanMaterial.uniforms.uTime.value = this.time;
    }

    // 2. Uniform de tiempo de las ondulaciones de choque en rocas
    for (let i = 0; i < this.riverWakeMaterials.length; i++) {
      this.riverWakeMaterials[i].uniforms.uTime.value = this.time;
    }

    // 3. Animación de natación de las sombras de peces contracorriente
    for (let i = 0; i < this.fishes.length; i++) {
      const f = this.fishes[i];

      // Movimiento longitudinal (río arriba / deriva)
      // heading = -1 (río arriba, hacia -Z)
      f.currentZ += f.heading * f.speed * delta;

      // Al alcanzar el límite upstream de su tramo patrullado:
      if (f.currentZ < f.minZ) {
        f.heading = 1; // Deriva río abajo suavemente
        f.currentZ = f.minZ;
      } else if (f.currentZ > f.maxZ) {
        f.heading = -1; // Vuelve a remontar río arriba contracorriente
        f.currentZ = f.maxZ;
      }

      // Parámetros del río en la Z actual
      const { riverCenterX, riverHalfWidth } = WaterManager.getRiverBounds(f.currentZ);
      const waterY = WaterManager.getRiverWaterHeight(f.currentZ);

      // Posicionamiento horizontal y serpenteo suave natural
      const lateralWander = Math.sin(this.time * 1.4 + f.wanderPhase) * 0.4;
      const posX = riverCenterX + f.lateralRatio * (riverHalfWidth * 0.70) + lateralWander;
      const posY = waterY - 0.12; // Justo por debajo de la superficie del agua

      f.root.position.set(posX, posY, f.currentZ);

      // Orientación: mira en la dirección de nado (-Z río arriba o +Z río abajo)
      const targetAngleY = f.heading < 0 ? 0 : Math.PI;
      f.root.rotation.y = targetAngleY + Math.sin(this.time * 2.0 + f.wanderPhase) * 0.12;

      // Ondulación rápida de la aleta caudal proporcional a la velocidad
      const wiggleSpeed = f.heading < 0 ? f.wiggleFreq : f.wiggleFreq * 0.5;
      if (f.tailPivot) {
        f.tailPivot.rotation.y = Math.sin(this.time * wiggleSpeed + f.wigglePhase) * 0.38;
      }
    }
    this._syncFishInstances();

    // 4. Suave balanceo por el viento de las espadañas maduras (Ripe Bulrushes)
    for (let i = 0; i < this.bulrushClusters.length; i++) {
      const b = this.bulrushClusters[i];
      const sway = Math.sin(this.time * b.swaySpeed + b.phase) * 0.038;
      b.group.rotation.z = sway;
      b.group.rotation.x = Math.cos(this.time * (b.swaySpeed * 0.8) + b.phase) * 0.022;
    }

    // 5. Partículas de burbujas escasas y sutiles en las rocas
    let bubblesChanged = false;
    for (let i = 0; i < this.bubbleParticles.length; i++) {
      const bp = this.bubbleParticles[i];
      if (!bp.active) {
        if (Math.random() < delta * 0.7) {
          bp.active = true;
          bp.visible = true;
          bp.y = bp.waterY - 0.30 - Math.random() * 0.12;
          this._writeBubble(bp);
          bubblesChanged = true;
        }
        continue;
      }

      // Ascenso lento hacia la superficie del agua
      bp.y += bp.riseSpeed * delta;
      // Oscilación horizontal orgánica
      bp.x = bp.originX + Math.sin(this.time * 4.0 + bp.wobbleSeed) * 0.018;
      bp.z = bp.originZ + Math.cos(this.time * 3.5 + bp.wobbleSeed) * 0.018;

      // Al romper la superficie del agua: la burbuja estalla y se reinicia
      if (bp.y >= bp.waterY) {
        bp.active = false;
        bp.visible = false;
        bp.y = bp.waterY - 0.32;
      }
      this._writeBubble(bp);
      bubblesChanged = true;
    }
    if (bubblesChanged && this.bubbleMesh) this.bubbleMesh.instanceMatrix.needsUpdate = true;
  }

  setFoamIntensity(val) {
    if (this.waterMaterialUpper && this.waterMaterialUpper.uniforms.uFoamIntensity) {
      this.waterMaterialUpper.uniforms.uFoamIntensity.value = val;
    }
  }

  setToonSpecEnabled(enabled) {
    if (this.waterMaterialUpper && this.waterMaterialUpper.uniforms.uToonSpecEnabled) {
      this.waterMaterialUpper.uniforms.uToonSpecEnabled.value = enabled ? 1.0 : 0.0;
    }
  }

  setVisible(visible) {
    if (this.group) {
      this.group.visible = visible;
    }
  }
}
