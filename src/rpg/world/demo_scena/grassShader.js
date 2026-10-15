import * as THREE from 'three';

/**
 * grassShader.js - Shaders e Iluminación Pictórica estilo The Legend of Zelda: Breath of the Wild (BotW).
 *
 * Características BotW:
 * 1. Shading Difuso Half-Lambert (Estilo Studio Ghibli): Elimina sombras oscuras facetadas y genera
 *    un sombreado continuo, luminoso y suave.
 * 2. Subsurface Scattering / Backlight Glow: Brillo solar translúcido en las puntas a contraluz
 *    cuando la cámara apunta hacia la dirección del sol (amanecer, mediodía, atardecer).
 * 3. Normales unificadas alineadas al terreno y al cenit vertical (vec3(0, 1, 0)).
 * 4. Animación de Viento BotW: Macro-ondas continuas que viajan por las colinas con micro-flutter orgánico
 *    y compensación física de longitud parabólica en arco.
 * 5. Destellos de luz en crestas de viento y Dither Fade estocástico en la lejanía.
 * 6. Suelo Gouache multi-escala 100% sincronizado con la paleta de la campiña de Hyrule.
 */

// =========================================================================
// 1. FUNCIONES MATEMÁTICAS SINCRONIZADAS CPU (JavaScript)
// =========================================================================

export function hash21(x, y) {
  const dot = x * 127.1 + y * 311.7;
  const sin = Math.sin(dot) * 43758.5453123;
  return sin - Math.floor(sin);
}

export function valueNoise2D(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  // Quintic Hermite suave C2-continuo (elimina líneas de corte en enteros)
  const ux = fx * fx * fx * (fx * (fx * 6.0 - 15.0) + 10.0);
  const uy = fy * fy * fy * (fy * (fy * 6.0 - 15.0) + 10.0);

  const a = hash21(ix, iy);
  const b = hash21(ix + 1.0, iy);
  const c = hash21(ix, iy + 1.0);
  const d = hash21(ix + 1.0, iy + 1.0);

  return (a * (1.0 - ux) + b * ux) * (1.0 - uy) + (c * (1.0 - ux) + d * ux) * uy;
}

export function fbm2D(x, y) {
  let total = 0.0;
  let amp = 0.5;
  let px = x;
  let py = y;
  for (let i = 0; i < 4; i++) {
    total += amp * valueNoise2D(px, py);
    // Matriz de rotación no-axial para que los octavos no se alineen en cuadrícula
    const rx = 0.80 * px - 0.60 * py;
    const ry = 0.60 * px + 0.80 * py;
    px = rx * 2.02;
    py = ry * 2.02;
    amp *= 0.5;
  }
  return total / 0.9375;
}

// =========================================================================
// 2. MÁSCARAS DE BIOMA Y DISTRIBUCIÓN POR COLONIAS (CPU)
// =========================================================================

export function getRoadMask(x, z, roadManager = null) {
  if (roadManager && typeof roadManager.getRoadFactor === 'function') {
    return roadManager.getRoadFactor(x, z);
  }
  return 0.0;
}

export function getSoilAndMeadowData(x, z, roadManager = null, soilPatchScale = 0.1, soilPatchCoverage = 0.84) {
  const roadFactor = getRoadMask(x, z, roadManager);

  // Warping multi-octava orgánico sincronizado exactamente con el shader GPU
  const warpMacroX = Math.sin(z * 0.08 + x * 0.05) * 2.6;
  const warpMacroZ = Math.cos(x * 0.07 - z * 0.06) * 2.6;
  const warpedX = x + warpMacroX;
  const warpedZ = z + warpMacroZ;

  const dirtNoise = fbm2D(warpedX * soilPatchScale, warpedZ * soilPatchScale);
  const soilThreshold = 1.0 - soilPatchCoverage * 0.65;
  const clearingFactor = dirtNoise > soilThreshold ? Math.min(1.0, (dirtNoise - soilThreshold) / Math.max(0.01, 1.0 - soilThreshold)) : 0.0;

  const combinedSoil = Math.max(roadFactor, clearingFactor * 0.85);
  // Depresión sutil en senderos y parches de tierra
  const depressionOffset = -0.16 * combinedSoil;
  const canSpawnGrass = combinedSoil < 0.30;

  return {
    roadFactor,
    clearingFactor,
    combinedSoil,
    depressionOffset,
    canSpawnGrass
  };
}

export function getBladeClusterWeight(x, z, roadFactor = 0.0, clusterScale = 0.15, islandCoverage = 0.95) {
  const noiseVal = fbm2D(x * clusterScale, z * clusterScale);

  let roadsideBoost = 0.0;
  if (roadFactor > 0.02 && roadFactor < 0.38) {
    roadsideBoost = Math.sin(((roadFactor - 0.02) / 0.36) * Math.PI) * 0.25;
  }

  const islandThreshold = 1.0 - islandCoverage;
  let weight = (noiseVal - islandThreshold) / islandCoverage + roadsideBoost;

  if (roadFactor > 0.15) {
    weight *= Math.max(0.0, 1.0 - (roadFactor - 0.15) / 0.25);
  }

  return Math.max(0.0, Math.min(1.0, weight));
}

export function evaluateClusterCandidate(x, z, roadFactor = 0.0) {
  const weight = getBladeClusterWeight(x, z, roadFactor);
  const minClusterWeight = 0.26;

  if (weight < minClusterWeight) {
    return { accept: false, weight: 0.0, edgeTaper: 0.0 };
  }

  const normWeight = (weight - minClusterWeight) / (1.0 - minClusterWeight);
  const acceptProb = Math.pow(normWeight, 1.20);
  if (Math.random() > acceptProb) {
    return { accept: false, weight, edgeTaper: 0.0 };
  }

  // Escalado progresivo hacia los bordes: briznas más esbeltas y bajas en los extremos
  const edgeTaper = 0.45 + 0.55 * Math.pow(normWeight, 0.55);

  return {
    accept: true,
    weight,
    normWeight,
    edgeTaper
  };
}

// =========================================================================
// 3. SHADER FRAGMENTOS GLSL COMPARTIDOS
// =========================================================================

export const glslNoiseFunctions = `
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float valueNoise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    // Quintic Hermite suave C2-continuo (elimina lineas de corte en enteros)
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm2D(vec2 p) {
    mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
    float total = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      total += amp * valueNoise2D(p);
      p = rot * p * 2.02;
      amp *= 0.5;
    }
    return total / 0.9375;
  }

  // Versión optimizada de 2 octavas de alto rendimiento para GPU (viento, meandros y sombras)
  float fbm2DFast(vec2 p) {
    mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
    float total = 0.5 * valueNoise2D(p);
    p = rot * p * 2.02;
    total += 0.25 * valueNoise2D(p);
    return total / 0.75;
  }
`;

// =========================================================================
// 4. VERTEX & FRAGMENT SHADERS PARA CÉSPED 3D (InstancedMesh Estilo BotW)
// =========================================================================

export const grassV3VertexShader = `
  precision highp float;

  attribute vec3 aTerrainNormal;

  uniform float uTime;
  uniform float uWindSpeed;
  uniform float uWindScale;
  uniform float uWindStrength;
  uniform float uHeightScale;
  uniform float uWidthScale;
  uniform float uDistanceFadeNear;
  uniform float uDistanceFadeFar;

  // Interacción interactiva: Pisadas y apartamiento de hierba (Sapidae & Axie)
  uniform vec3 uPlayerPos;
  uniform vec3 uCompanionPos;
  uniform float uPlayerRadius;
  uniform float uCompanionRadius;
  uniform float uTrampleStrength;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vTerrainNormal;
  varying float vWindWave;
  varying float vDistanceFade;

  ${glslNoiseFunctions}

  void main() {
    vUv = uv;

    // Extraer origen de la mata en coordenadas de mundo
    vec3 clumpOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;

    // Normal del terreno
    vTerrainNormal = length(aTerrainNormal) > 0.1 ? normalize(aTerrainNormal) : vec3(0.0, 1.0, 0.0);

    // Animación de macro-olas de viento continuas estilo BotW (optimizada a 2 octavas para 1.2M de vértices)
    vec2 windDir = normalize(vec2(1.0, 0.55));
    vec2 windUv = clumpOrigin.xz * uWindScale - windDir * (uTime * uWindSpeed);
    float windNoise = fbm2DFast(windUv);

    // Micro-vibración orgánica suave individual (flutter)
    float flutter = sin(uTime * 4.2 + clumpOrigin.x * 2.1 + clumpOrigin.z * 1.8) * 0.12;
    float totalWind = (windNoise + flutter) * uWindStrength;

    // =========================================================================
    // INTERACCIÓN Y DEFORMACIÓN DE HIERBA (Sapidae & Companion Axie)
    // Reducción directa de escala en altura (squash) y flexión lateral suave al pisar
    // =========================================================================
    // 1. Reacción al Sapidae (Jugador)
    vec2 toPlayer = clumpOrigin.xz - uPlayerPos.xz;
    float distPlayer = length(toPlayer);
    float dyPlayer = abs(clumpOrigin.y - uPlayerPos.y);
    float vertFactorP = 1.0 - smoothstep(0.35, 2.2, dyPlayer);
    float trampleP = (1.0 - smoothstep(0.0, uPlayerRadius, distPlayer)) * vertFactorP;
    vec2 pushDirP = distPlayer > 0.001 ? (toPlayer / distPlayer) : vec2(0.0, 1.0);

    // 2. Reacción al Compañero Axie
    vec2 toComp = clumpOrigin.xz - uCompanionPos.xz;
    float distComp = length(toComp);
    float dyComp = abs(clumpOrigin.y - uCompanionPos.y);
    float vertFactorC = 1.0 - smoothstep(0.35, 2.2, dyComp);
    float trampleC = (1.0 - smoothstep(0.0, uCompanionRadius, distComp)) * vertFactorC;
    vec2 pushDirC = distComp > 0.001 ? (toComp / distComp) : vec2(1.0, 0.0);

    float trampleFactor = clamp(trampleP * 1.0 + trampleC * 0.85, 0.0, 1.0) * clamp(uTrampleStrength, 0.0, 2.0);

    // Reducción drástica de la escala en altura al pisarla (la mata se aplasta contra el suelo)
    float trampleHeightScale = mix(1.0, 0.18, trampleFactor);
    // Ensanchamiento sutil por aplastamiento (conservación de volumen de la mata)
    float trampleWidthScale = mix(1.0, 1.25, trampleFactor);

    // Ponderación de flexión en arco parabólico (la raíz vUv.y = 0 permanece 100% inmóvil)
    float bendWeight = pow(clamp(uv.y, 0.0001, 1.0), 1.85);
    vec2 horizontalDisplacement = windDir * (totalWind * bendWeight);

    // Apartamiento sutil hacia los lados en las puntas (sin romper ni deformar la malla)
    vec2 pushDirCombined = normalize(pushDirP * trampleP * 1.2 + pushDirC * trampleC * 1.0 + vec2(0.0001));
    vec2 tramplePartXZ = pushDirCombined * (trampleFactor * 0.32 * bendWeight);

    // Posición local con escala de altura y grosor dinámicas (afectadas por la pisada)
    float effectiveHeight = position.y * uHeightScale * trampleHeightScale;
    float effectiveWidth = uWidthScale * trampleWidthScale;
    vec4 localPos = vec4(position.x * effectiveWidth, effectiveHeight, position.z * effectiveWidth, 1.0);
    vec3 worldPosition = (modelMatrix * instanceMatrix * localPos).xyz;

    // Desplazamiento horizontal por viento y apartamiento lateral suave
    worldPosition.xz += horizontalDisplacement * (1.0 - trampleFactor * 0.45) + tramplePartXZ;

    // Compensación física de longitud BotW: a mayor flexión horizontal, la altura baja en arco parabólico
    float dispLength = length(horizontalDisplacement);
    worldPosition.y -= (dispLength * dispLength * 0.22) * uv.y;

    vWorldPosition = worldPosition;
    vWindWave = clamp(windNoise, 0.0, 1.0);

    // Atenuación suave por distancia (distance fade)
    float camDist = distance(worldPosition, cameraPosition);
    vDistanceFade = 1.0 - smoothstep(uDistanceFadeNear, uDistanceFadeFar, camDist);

    gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);
  }
`;

export const grassV3FragmentShader = `
  precision highp float;

  uniform vec3 uBaseColor;
  uniform vec3 uMidColor;
  uniform vec3 uTipColor;
  uniform vec3 uWindHighlightColor;
  uniform vec3 uBacklightColor;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform vec3 uAmbientColor;
  uniform float uGradientCurve;
  uniform float uNormalUpBlend;
  uniform float uHalfLambertBias;
  uniform float uBacklightStrength;
  uniform float uBacklightPower;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vTerrainNormal;
  varying float vWindWave;
  varying float vDistanceFade;

  void main() {
    if (vDistanceFade <= 0.005) {
      discard;
    }

    // 1. Gradiente Vertical Suave BotW (Raíz Oscura -> Cuerpo Esmeralda -> Puntas Cálidas)
    float t = pow(clamp(vUv.y, 0.0001, 1.0), uGradientCurve);
    vec3 bladeColor;
    if (t < 0.45) {
      bladeColor = mix(uBaseColor, uMidColor, t / 0.45);
    } else {
      bladeColor = mix(uMidColor, uTipColor, (t - 0.45) / 0.55);
    }

    // 2. Destellos soleados en crestas de viento (la luz del sol brilla en las puntas al doblarse)
    float windShine = vWindWave * pow(clamp(vUv.y, 0.0001, 1.0), 1.85) * 0.38;
    bladeColor = mix(bladeColor, uWindHighlightColor, windShine);

    // 3. Normales Unificadas BotW (orientadas hacia el cenit para iluminación continua de colina)
    vec3 upNormal = vec3(0.0, 1.0, 0.0);
    vec3 unifiedNormal = normalize(mix(vTerrainNormal, upNormal, uNormalUpBlend));

    // 4. Iluminación Difusa Half-Lambert de Studio Ghibli / Breath of the Wild
    // Evita sombras negras duras y produce una suave degradación pictórica entre luz y penumbra
    vec3 N = unifiedNormal;
    vec3 L = normalize(uSunDirection);
    vec3 V = normalize(cameraPosition - vWorldPosition);

    float NdotL = dot(N, L);
    float halfLambert = clamp((NdotL + uHalfLambertBias) / (1.0 + uHalfLambertBias), 0.0, 1.0);
    float diffuseFactor = 0.35 + 0.65 * pow(max(halfLambert, 0.0001), 1.15);

    // 5. Subsurface Scattering / Backlight Solar Glow de BotW
    // Resplandor cálido translúcido en las puntas cuando la cámara mira hacia el sol
    float viewDotSun = clamp(dot(V, -L), 0.0, 1.0);
    float backLight = pow(max(viewDotSun, 0.0001), uBacklightPower) * pow(clamp(vUv.y, 0.0001, 1.0), 1.75) * uBacklightStrength;
    vec3 sssGlow = uBacklightColor * backLight;

    // Auto-oclusión de raíz (Root AO): Atenúa la luz en la base para crear sombra de contacto
    float rootAO = 0.52 + 0.48 * smoothstep(0.0, 0.28, vUv.y);

    // Color final iluminado
    vec3 finalLight = (diffuseFactor * uSunColor + uAmbientColor) * rootAO;
    vec3 finalColor = bladeColor * finalLight + sssGlow;

    // 6. Dither Fade en la distancia para fusionar de forma invisible con el suelo
    if (vDistanceFade < 0.95) {
      vec2 screenCoord = gl_FragCoord.xy;
      float dither = fract(sin(dot(screenCoord, vec2(12.9898, 78.233))) * 43758.5453);
      if (dither > vDistanceFade) {
        discard;
      }
    }

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// =========================================================================
// 5. CONFIGURACIÓN DE UNIFORMS Y MATERIAL DE CÉSPED V3 (Estilo BotW)
// =========================================================================

export function createGrassV3Material(renderer = null, grassTex = null, options = {}) {
  const uniforms = {
    uTime: { value: 0.0 },

    // Paleta Oficial Inspirada en Zelda: Breath of the Wild (Hyrule Field)
    uBaseColor: { value: new THREE.Color(options.baseColor || '#183b1d') },          // Sombra raíz profunda fundida con suelo
    uMidColor: { value: new THREE.Color(options.midColor || '#48962c') },            // Verde esmeralda pradera vivo y fresco
    uTipColor: { value: new THREE.Color(options.tipColor || '#a2e742') },            // Verde lima cálido iluminado por el sol
    uSunGrassColor: { value: new THREE.Color(options.sunGrassColor || '#5ea832') },  // Chartreuse soleado en lomas altas
    uWetGrassColor: { value: new THREE.Color(options.wetGrassColor || '#1a441e') },  // Esmeralda fresco en hondonadas húmedas
    uDryGrassColor: { value: new THREE.Color(options.dryGrassColor || '#788d38') },  // Oliva seco en bordes de tierra
    uSoilHumusColor: { value: new THREE.Color(options.soilHumusColor || '#382413') }, // Humus marrón chocolate en depresiones
    uSoilClayColor: { value: new THREE.Color(options.soilClayColor || '#7a522a') },   // Arcilla sienna en cuerpo principal
    uSoilDryColor: { value: new THREE.Color(options.soilDryColor || '#c2a26c') },    // Arena seca calcárea en crestas
    uWindHighlightColor: { value: new THREE.Color(options.windHighlightColor || '#e0f866') }, // Brillo en crestas de viento
    uBacklightColor: { value: new THREE.Color(options.backlightColor || '#ebfa75') }, // Resplandor dorado translúcido (Fake SSS)
    uClearingGrassColor: { value: new THREE.Color(options.clearingColor || '#5a9e3e') },
    uDirtCenterColor: { value: new THREE.Color(options.dirtCenterColor || '#d1a872') },
    uDirtEdgeColor: { value: new THREE.Color(options.dirtEdgeColor || '#9b7346') },
    uMossColor: { value: new THREE.Color(options.mossColor || '#557329') },          // Musgo oliva húmedo de transición

    // Dirección solar y ambiente de Hyrule
    uSunDirection: { value: new THREE.Vector3(0.55, 0.85, 0.35).normalize() },
    uSunColor: { value: new THREE.Color('#fffbf0') },
    uAmbientColor: { value: new THREE.Color('#324b2d') },

    // Viento
    uWindSpeed: { value: 1.25 },
    uWindScale: { value: 0.085 },
    uWindStrength: { value: options.windStrength !== undefined ? options.windStrength : 0.30 },

    // Proporciones de brizna
    uHeightScale: { value: options.heightScale !== undefined ? options.heightScale : 0.85 },
    uWidthScale: { value: options.widthScale !== undefined ? options.widthScale : (options.width !== undefined ? options.width : 1.00) },
    uGradientCurve: { value: 1.65 },
    uNormalUpBlend: { value: 0.78 },       // Fuerte orientación hacia el cenit para suavidad pictórica
    uHalfLambertBias: { value: 0.55 },     // Factor Half-Lambert suave
    uBacklightStrength: { value: 0.85 },   // Intensidad de resplandor solar BotW
    uBacklightPower: { value: 2.60 },      // Potencia del ángulo de contraluz

    // Rango de visibilidad con Dither Fade
    uDistanceFadeNear: { value: 85.0 },
    uDistanceFadeFar: { value: 165.0 },

    // Deformación y pisadas de hierba (Sapidae & Companion Axie)
    uPlayerPos: { value: new THREE.Vector3(-9999, -9999, -9999) },
    uCompanionPos: { value: new THREE.Vector3(-9999, -9999, -9999) },
    uPlayerRadius: { value: options.playerRadius !== undefined ? options.playerRadius : 1.35 },
    uCompanionRadius: { value: options.companionRadius !== undefined ? options.companionRadius : 1.05 },
    uTrampleStrength: { value: options.trampleStrength !== undefined ? options.trampleStrength : 1.30 }
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: grassV3VertexShader,
    fragmentShader: grassV3FragmentShader,
    uniforms: uniforms,
    side: THREE.DoubleSide,
    depthWrite: true,
    depthTest: true
  });

  return { material, uniforms };
}

// =========================================================================
// 6. INYECCIÓN DEL SHADER DE SUELO/TERRENO V3 (Sincronizado con BotW y Genshin)
// =========================================================================

export function getGrassV3GroundShaderDefs() {
  return `
    uniform float uTime;
    uniform sampler2D uV3GrassTex;
    uniform sampler2D uV3SoilTex;
    uniform float uGroundTexScale;
    uniform float uSoilTexScale;
    uniform vec3 uV3BaseColor;
    uniform vec3 uV3MidColor;
    uniform vec3 uV3TipColor;
    uniform vec3 uV3SunGrassColor;
    uniform vec3 uV3WetGrassColor;
    uniform vec3 uV3DryGrassColor;
    uniform vec3 uV3SoilHumusColor;
    uniform vec3 uV3SoilClayColor;
    uniform vec3 uV3SoilDryColor;
    uniform vec3 uV3MossColor;
    uniform vec3 uV3WindHighlightColor;
    uniform vec3 uV3ClearingGrassColor;
    uniform vec3 uV3DirtCenterColor;
    uniform vec3 uV3DirtEdgeColor;
    uniform float uV3SoilPatchCoverage;
    uniform float uV3SoilPatchScale;
    uniform float uV3MacroNoiseScale;
    uniform float uV3WindSpeed;
    uniform float uV3WindScale;

    ${glslNoiseFunctions}

    // Calcula el color Gouache multi-escala del terreno V3 sincronizado con BotW y Genshin
    vec3 computeGrassV3Ground(vec3 worldPos, vec3 normal, float roadFactor, float pathOpacity) {
      // 1. Muestreo multi-escala del lienzo Gouache de hierba (uV3GrassTex)
      vec2 uvBase = worldPos.xz * uGroundTexScale;
      vec2 warp = vec2(sin(worldPos.z * 0.18 + uTime * 0.05), cos(worldPos.x * 0.18 + uTime * 0.05)) * 0.055;
      vec2 uv1 = uvBase + warp;

      mat2 rot45 = mat2(0.7071, -0.7071, 0.7071, 0.7071);
      vec2 uv2 = rot45 * (uvBase * 1.32) - warp * 0.5;

      vec3 tex1 = texture2D(uV3GrassTex, uv1).rgb;
      vec3 tex2 = texture2D(uV3GrassTex, uv2).rgb;
      vec3 gouacheSample = mix(tex1, tex2, 0.45);

      // Extraer strokeLuminance (mapa de altura de las pinceladas Gouache de hierba)
      float strokeLuminance = dot(gouacheSample, vec3(0.299, 0.587, 0.114));

      // 2. Modulación macro de tonalidades de verde estilo BotW (clima y exposición solar en colinas)
      float macroNoise = fbm2D(worldPos.xz * uV3MacroNoiseScale);
      vec3 dynamicBed = mix(uV3WetGrassColor, uV3BaseColor, smoothstep(0.18, 0.48, macroNoise));
      dynamicBed = mix(dynamicBed, uV3SunGrassColor * 0.72, smoothstep(0.60, 0.90, macroNoise));

      vec3 dynamicMid = mix(mix(uV3BaseColor * 1.25, uV3MidColor, 0.75), uV3MidColor, smoothstep(0.20, 0.50, macroNoise));
      dynamicMid = mix(dynamicMid, uV3SunGrassColor, smoothstep(0.55, 0.88, macroNoise));

      vec3 dynamicTip = mix(uV3MidColor * 1.15, uV3TipColor, smoothstep(0.25, 0.70, macroNoise));

      vec3 strokeColor = mix(dynamicBed, dynamicMid, smoothstep(0.20, 0.55, strokeLuminance));
      strokeColor = mix(strokeColor, dynamicTip, smoothstep(0.55, 0.88, strokeLuminance));

      // 3. Muestreo multi-escala del lienzo Gouache de tierra (uV3SoilTex)
      vec2 uvSoilBase = worldPos.xz * (uSoilTexScale > 0.001 ? uSoilTexScale : 0.15);
      vec2 warpSoil = vec2(sin(worldPos.z * 0.20 + uTime * 0.03), cos(worldPos.x * 0.20 + uTime * 0.03)) * 0.045;
      vec2 uvS1 = uvSoilBase + warpSoil;
      mat2 rotSoil = mat2(0.80, -0.60, 0.60, 0.80);
      vec2 uvS2 = rotSoil * (uvSoilBase * 1.35) - warpSoil * 0.5;

      vec3 soilTex1 = texture2D(uV3SoilTex, uvS1).rgb;
      vec3 soilTex2 = texture2D(uV3SoilTex, uvS2).rgb;
      vec3 soilSample = mix(soilTex1, soilTex2, 0.45);

      // 4. Domain Warping multi-octava para contornos orgánicos, sinuosos y con meandros (estilo Genshin)
      vec2 warpMacro = vec2(
        sin(worldPos.z * 0.08 + worldPos.x * 0.05),
        cos(worldPos.x * 0.07 - worldPos.z * 0.06)
      ) * 2.8;
      float cachedClusterNoise = fbm2DFast(worldPos.xz * 0.15);
      vec2 warpDetail = vec2(
        cachedClusterNoise,
        fbm2DFast(worldPos.zx * 0.15 + vec2(4.3, 1.7))
      ) * 2.4 - 1.2;
      vec2 warpedWorldPos = worldPos.xz + warpMacro + warpDetail;

      // Parches naturales de tierra sinuosos
      float soilNoise = fbm2D(warpedWorldPos * uV3SoilPatchScale);
      float soilThreshold = 1.0 - uV3SoilPatchCoverage * 0.65;
      float naturalSoil = clamp((soilNoise - soilThreshold) / max(0.01, 1.0 - soilThreshold), 0.0, 1.0);
      naturalSoil = smoothstep(0.05, 0.95, naturalSoil);

      // Deformación sinuosa en los bordes del camino (lengüetas orgánicas de Genshin)
      float roadWarp = (fbm2DFast(warpedWorldPos * 0.18) - 0.5) * 0.60;
      float roadBorderZone = roadFactor * (1.0 - roadFactor) * 3.6;
      float organicRoad = clamp(roadFactor + roadWarp * roadBorderZone, 0.0, 1.0);
      float pathSoil = organicRoad * (pathOpacity * 2.5);

      // Erosión en pendientes
      float slope = clamp(normal.y, 0.0, 1.0);
      float slopeErosion = (1.0 - smoothstep(0.68, 0.85, slope)) * 0.45;

      float rawSoil = clamp(max(naturalSoil, pathSoil) + slopeErosion, 0.0, 1.0);

      // 5. Paleta de tierra tri-tonal enriquecida con la textura de gouache (uV3SoilTex)
      vec3 soilGrad = mix(uV3SoilHumusColor, uV3SoilClayColor, smoothstep(0.10, 0.55, rawSoil));
      soilGrad = mix(soilGrad, uV3SoilDryColor, smoothstep(0.55, 0.95, rawSoil));
      vec3 texturedSoil = soilGrad * (soilSample * 1.45 + 0.10);

      // 6. Entrelazado con el verde (Height-Based Blending con strokeLuminance)
      // Las briznas de césped del lienzo gouache cortan como dedos y lengüetas en la tierra
      float heightMask = rawSoil + (0.50 - strokeLuminance) * 0.44;

      // Capa intermedia de musgo húmedo (el verde que se entrelaza en las hendiduras del camino estilo Genshin)
      float mossZone = smoothstep(0.12, 0.40, heightMask) * (1.0 - smoothstep(0.48, 0.82, heightMask));
      vec3 colMoss = mix(uV3DryGrassColor, uV3MossColor, 0.65) * (soilSample * 1.35 + 0.15);

      // Borde de hierba seca perimetral
      float fringeZone = smoothstep(0.10, 0.35, heightMask) * (1.0 - smoothstep(0.35, 0.65, heightMask));
      strokeColor = mix(strokeColor, uV3DryGrassColor, fringeZone * 0.65);

      // Composición multi-capa: Césped -> Musgo entrelazado -> Tierra texturizada viva
      vec3 compositeGround = mix(strokeColor, colMoss, mossZone * 0.88);
      float soilBlend = smoothstep(0.38, 0.62, heightMask);
      compositeGround = mix(compositeGround, texturedSoil, soilBlend);

      // 7. Sincronizar ondas de viento sobre las puntas pintadas del suelo
      vec2 windDir = normalize(vec2(1.0, 0.55));
      vec2 groundWindUv = worldPos.xz * uV3WindScale - windDir * (uTime * uV3WindSpeed);
      float groundWindWave = fbm2DFast(groundWindUv);
      compositeGround = mix(compositeGround, uV3WindHighlightColor, groundWindWave * smoothstep(0.60, 0.95, strokeLuminance) * (1.0 - soilBlend) * 0.35);

      // 8. Oscurecer profundamente debajo de las colonias 3D (Root Shadow / Contact AO reutilizando cachedClusterNoise)
      float clusterNoise = cachedClusterNoise;
      float clusterWeight = (clusterNoise - 0.05) / 0.95;
      if (clusterWeight > 0.24) {
        float normW = clamp((clusterWeight - 0.24) / 0.76, 0.0, 1.0);
        compositeGround = mix(compositeGround, compositeGround * 0.80, normW * 0.58 * (1.0 - soilBlend * 0.8));
      }

      return compositeGround;
    }
  `;
}
