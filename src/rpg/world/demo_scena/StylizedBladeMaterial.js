import * as THREE from 'three';

// Constantes exactas de stylized-components
export const MAX_ROCKS = 24;
export const MAX_SHADOW_TAPS = 4;

export const GROUND_MASK_UNIFORMS = /* glsl */ `
  uniform vec3  uDirtColor;
  uniform float uDirtScale;      // patch size (world units⁻¹)
  uniform float uDirtCoverage;   // 0 = no dirt, 1 = all dirt
  uniform float uDirtSoftness;   // width of the grass→dirt transition
  uniform float uDirtWarp;       // domain warp — breaks up the round blobs
`;

export const GROUND_MASK_GLSL = /* glsl */ `
  float _gmHash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  float _gmNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(_gmHash(i),                  _gmHash(i + vec2(1.0, 0.0)), u.x),
      mix(_gmHash(i + vec2(0.0, 1.0)), _gmHash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float _gmFbm(vec2 p) {
    float v = 0.0, a = 0.5, n = 0.0;
    for (int i = 0; i < 4; i++) {
      v += a * _gmNoise(p);
      n += a;
      p = p * 2.03 + vec2(3.1, 7.7);
      a *= 0.5;
    }
    return v / max(n, 0.001);
  }

  float groundDirt(vec2 worldXZ) {
    vec2 p = worldXZ * uDirtScale;
    if (uDirtWarp > 0.001) {
      vec2 w = vec2(_gmFbm(p + vec2(11.3, 2.7)), _gmFbm(p + vec2(5.9, 17.1)));
      p += (w - 0.5) * uDirtWarp;
    }
    float n = _gmFbm(p);
    float threshold = 1.0 - uDirtCoverage;
    return smoothstep(threshold - uDirtSoftness, threshold + uDirtSoftness, n);
  }
`;

export const GRASS_BLADE_UNIFORMS = /* glsl */ `
  uniform float uTime;
  uniform float uWindStrength;
  uniform float uWindSpeed;
  uniform float uWindFreq;
  uniform float uWindTurb;
  uniform float uWindLean;
  uniform vec2  uWindDir;

  varying float vBH;
  varying vec3  vWorldPos;
  varying vec3  vBladeN;
  varying float vDirt;
  varying float vPatch;
  uniform float uPatchScale;
  varying float vRockInfl;

  uniform float uWindFixLocal;
  uniform float uDirtCut;
  uniform float uShadowSampleY;
  uniform float uShadowRadius;

  #ifdef USE_SHADOWMAP
    varying vec4 vGrassShCoord[ GRASS_SHADOW_TAPS ];
  #endif

  uniform vec4  uRocks[ MAX_ROCKS ];
  uniform int   uRockCount;
  uniform float uRockRadiusMul;
  uniform float uRockFalloff;
  uniform float uRockFlatten;
  uniform float uRockBend;

  uniform float uBladeWidthScale;
  uniform float uBladeLengthScale;
`;

export const GRASS_BLADE_VERTEX = /* glsl */ `
  #include <begin_vertex>
  transformed.x *= uBladeWidthScale;
  transformed.y *= uBladeLengthScale;

  vec2 baseXZ = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
  vDirt = groundDirt(baseXZ);
  vPatch = _gmFbm(baseXZ * uPatchScale);

  float rockInfl = 0.0;
  vec2  rockAway = vec2(1.0, 0.0);
  for (int i = 0; i < MAX_ROCKS; i++) {
    if (i >= uRockCount) break;
    vec4  rock = uRocks[i];
    vec2  d    = baseXZ - rock.xz;
    float dist = length(d);
    float rad  = rock.w * uRockRadiusMul;
    float infl = 1.0 - smoothstep(rad, rad + uRockFalloff, dist);
    if (infl > rockInfl) {
      rockInfl = infl;
      rockAway = dist > 1e-4 ? d / dist : vec2(1.0, 0.0);
    }
  }
  vRockInfl = rockInfl;

  float shrink = (1.0 - uDirtCut * vDirt) * (1.0 - uRockFlatten * rockInfl);
  transformed.y *= shrink;

  vBH = position.y * shrink;
  float hMask = vBH * vBH;

  vec3 wPos = (instanceMatrix * vec4(position, 1.0)).xyz;
  vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;

  float primary = sin(dot(wPos.xz, uWindDir) * uWindFreq + uTime * uWindSpeed);
  float second  = sin(dot(wPos.xz, uWindDir) * uWindFreq * 2.6 + uTime * uWindSpeed * 1.8 + 1.3) * 0.35;
  vec2  perp    = vec2(-uWindDir.y, uWindDir.x);
  float turb    = sin(dot(wPos.xz, perp) * uWindFreq * 1.9 + uTime * uWindSpeed * 0.7 + 2.6) * uWindTurb;
  float swing   = (primary + second + turb) * uWindStrength * hMask;
  float lean    = uWindLean * hMask;

  mat3 instRot = mat3(
    normalize(vec3(instanceMatrix[0])),
    normalize(vec3(instanceMatrix[1])),
    normalize(vec3(instanceMatrix[2]))
  );
  vec3 windWrong = vec3(uWindDir.x, 0.0, uWindDir.y);
  vec3 windRight = transpose(instRot) * windWrong;
  vec3 windLocal = mix(windWrong, windRight, uWindFixLocal);
  transformed += windLocal * (swing + lean);

  if (rockInfl > 0.001) {
    vec3 awayLocal = transpose(instRot) * vec3(rockAway.x, 0.0, rockAway.y);
    transformed += awayLocal * (uRockBend * rockInfl * hMask);
  }

  vBladeN = normalize(mat3(modelMatrix) * instRot * normal);
`;

export const GRASS_SHADOW_VERTEX = /* glsl */ `
  #if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )
    vec4 worldPosition = vec4( 1e6, 1e6, 1e6, 1.0 );
  #endif

  #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
    vec3 _shBase = ( modelMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
    vec3 _shTip  = ( modelMatrix * instanceMatrix * vec4( 0.0, 1.0, 0.0, 1.0 ) ).xyz;
    vec3 _shCenter = mix( _shBase, _shTip, uShadowSampleY );

    float _rot = fract( sin( dot( _shBase.xz, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ) * 6.2831853;

    for ( int _k = 0; _k < GRASS_SHADOW_TAPS; _k++ ) {
      float _a   = _rot + 6.2831853 * ( float( _k ) + 0.5 ) / float( GRASS_SHADOW_TAPS );
      vec2  _off = vec2( cos( _a ), sin( _a ) ) * uShadowRadius;
      vGrassShCoord[ _k ] = directionalShadowMatrix[ 0 ] * vec4( _shCenter + vec3( _off.x, 0.0, _off.y ), 1.0 );
    }
  #endif
`;

function bladeHalfWidth(t) {
  return 0.5 * Math.pow(1 - t, 1.2);
}

/**
 * Geometría cónica de brizna estilizada con segmentos configurables (7 vértices para seg=3).
 */
export function makeBladeGeometry(segments = 3) {
  const seg = Math.max(1, Math.round(segments));
  const positions = new Float32Array((seg * 2 + 1) * 3);
  for (let i = 0; i < seg; i++) {
    const t = i / seg;
    const w = bladeHalfWidth(t);
    positions[i * 6 + 0] = -w;
    positions[i * 6 + 1] = t;
    positions[i * 6 + 3] = w;
    positions[i * 6 + 4] = t;
  }
  positions[seg * 6 + 1] = 1; // tip

  const indices = [];
  for (let i = 0; i < seg - 1; i++) {
    const l = i * 2;
    const r = l + 1;
    const nl = l + 2;
    const nr = l + 3;
    indices.push(l, nl, r, r, nl, nr);
  }
  const lastL = (seg - 1) * 2;
  indices.push(lastL, seg * 2, lastL + 1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Material MeshLambertMaterial con onBeforeCompile que implementa
 * el shader exacto de stylized-components (translucidez, pisoteo de rocas,
 * parches ambientales, gradiente de color y sombras suaves multi-tap).
 */
export function makeBladeMaterial(uniforms) {
  const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    // ── Vertex ───────────────────────────────────────────────────────────────
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
      #define MAX_ROCKS ${MAX_ROCKS}
      #define GRASS_SHADOW_TAPS ${MAX_SHADOW_TAPS}
      ${GROUND_MASK_UNIFORMS}
      ${GROUND_MASK_GLSL}
      ${GRASS_BLADE_UNIFORMS}`
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      GRASS_BLADE_VERTEX
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <worldpos_vertex>",
      GRASS_SHADOW_VERTEX
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <defaultnormal_vertex>",
      `#include <defaultnormal_vertex>
      transformedNormal = normalize( mat3( viewMatrix ) * vec3( 0.0, 1.0, 0.0 ) );`
    );

    // ── Fragment ─────────────────────────────────────────────────────────────
    shader.fragmentShader =
      `#define GRASS_SHADOW_TAPS ${MAX_SHADOW_TAPS}
      varying float vBH;
      varying vec3  vWorldPos;
      varying vec3  vBladeN;
      varying float vDirt;
      varying float vPatch;
      varying float vRockInfl;
      uniform int   uDebugChannel;
      uniform vec3  uGrassBottom;
      uniform vec3  uGrassTop;
      uniform float uBrightness;
      uniform float uGradStart;
      uniform float uGradEnd;
      uniform float uGradPower;
      uniform vec3  uDirtColor;
      uniform float uDirtBlend;
      uniform vec3  uPatchLush;
      uniform vec3  uPatchDry;
      uniform float uPatchStrength;
      uniform float uPatchBias;
      uniform int   uShadowSamples;
      uniform float uShadowStrength;
      uniform vec3  uSunDir;
      uniform vec3  uSunColor;
      uniform vec3  uTransColor;
      uniform float uTransStrength;
      uniform float uTransPower;
      uniform float uTransTip;
      uniform float uTransShadow;
      #ifdef USE_SHADOWMAP
        varying vec4 vGrassShCoord[ GRASS_SHADOW_TAPS ];
      #endif\n` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_begin>",
      `#include <normal_fragment_begin>
      normal = normalize( mat3( viewMatrix ) * vec3( 0.0, 1.0, 0.0 ) );`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "vec4 diffuseColor = vec4( diffuse, opacity );",
      `float _gT = clamp( ( vBH - uGradStart ) / max( uGradEnd - uGradStart, 0.001 ), 0.0, 1.0 );
      _gT = pow( _gT, uGradPower );
      vec3 _bladeCol = mix( uGrassBottom, uGrassTop, _gT );

      float _pt = pow( clamp( vPatch, 0.0, 1.0 ), uPatchBias );
      _bladeCol = mix( _bladeCol, mix( uPatchLush, uPatchDry, _pt ), uPatchStrength );

      _bladeCol = mix( _bladeCol, uDirtColor, vDirt * uDirtBlend );

      vec4 diffuseColor = vec4( _bladeCol * uBrightness, opacity );`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `#include <opaque_fragment>
      {
        float _shadow = 1.0;
        #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
          DirectionalLightShadow _dls = directionalLightShadows[ 0 ];
          float _sSum = 0.0;
          int   _sN   = 0;
          for ( int _k = 0; _k < GRASS_SHADOW_TAPS; _k++ ) {
            if ( _k >= uShadowSamples ) break;
            _sSum += getShadow(
              directionalShadowMap[ 0 ],
              _dls.shadowMapSize,
              _dls.shadowIntensity,
              _dls.shadowBias,
              _dls.shadowRadius,
              vGrassShCoord[ _k ]
            );
            _sN++;
          }
          _shadow = _sSum / float( max( _sN, 1 ) );
        #endif

        gl_FragColor.rgb *= ( 1.0 - uShadowStrength * ( 1.0 - _shadow ) );

        vec3  _L    = normalize( uSunDir );
        vec3  _V    = normalize( cameraPosition - vWorldPos );
        float _back = pow( max( dot( _V, -_L ), 0.0 ), uTransPower );
        float _thin = mix( 1.0, vBH, uTransTip );
        float _edge = 1.0 - abs( dot( normalize( vBladeN ), _L ) );
        float _sh   = mix( 1.0, _shadow, uTransShadow );

        vec3 _trans = uTransColor * uSunColor * uTransStrength
                    * _back * _thin * _edge * _sh;

        gl_FragColor.rgb += _trans;

        if ( uDebugChannel == 1 ) {
          gl_FragColor.rgb = vec3( vBH );
        } else if ( uDebugChannel == 2 ) {
          gl_FragColor.rgb = vec3( vDirt );
        } else if ( uDebugChannel == 3 ) {
          gl_FragColor.rgb = vec3( vRockInfl );
        } else if ( uDebugChannel == 4 ) {
          gl_FragColor.rgb = vec3( _shadow );
        } else if ( uDebugChannel == 5 ) {
          gl_FragColor.rgb = _trans;
        } else if ( uDebugChannel == 6 ) {
          gl_FragColor.rgb = normalize( vBladeN ) * 0.5 + 0.5;
        }
      }`
    );
  };

  return mat;
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOWER SHADERS & MATERIALS (stylized-components)
// ─────────────────────────────────────────────────────────────────────────────

export const FLOWER_WIND_UNIFORMS = /* glsl */ `
  attribute float aQuadIndex;
  uniform float uTime;
  uniform float uWindStrength;
  uniform float uWindSpeed;
  uniform float uWindFreq;
  uniform float uWindTurb;
  uniform float uWindLean;
  uniform vec2  uWindDir;
  uniform float uBendAmp;
  uniform float uBendFreq;
  uniform float uFlDirtMax;
  varying vec2  vFlUv;
`;

export const FLOWER_WIND_VERTEX = /* glsl */ `
  #include <begin_vertex>
  vFlUv = uv;

  #ifdef USE_INSTANCING
    vec2 _flBaseXZ = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
  #else
    vec2 _flBaseXZ = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
  #endif
  if (groundDirt(_flBaseXZ) > uFlDirtMax) {
    transformed = vec3(0.0);
  }

  float _flH = transformed.y * transformed.y;

  #ifdef USE_INSTANCING
    vec3 _flWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
    mat3 _flRot = mat3(
      normalize(vec3(instanceMatrix[0])),
      normalize(vec3(instanceMatrix[1])),
      normalize(vec3(instanceMatrix[2]))
    );
    vec3 _flWindLocal = transpose(_flRot) * vec3(uWindDir.x, 0.0, uWindDir.y);
  #else
    vec3 _flWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
    vec3 _flWindLocal = vec3(uWindDir.x, 0.0, uWindDir.y);
  #endif

  // Sistema de LOD y culling automático a distancia en GPU:
  // > 90m: Culling total (0 triángulos)
  // 36m a 90m (LOD 1): Un solo quad plano (50% menos polígonos)
  // <= 36m (LOD 0): Flor volumétrica completa en cruz 3D (2 quads)
  float _flCamDist = distance(_flWorld.xz, cameraPosition.xz);
  if (_flCamDist > 90.0) {
    transformed = vec3(0.0);
  } else if (_flCamDist > 36.0 && aQuadIndex > 0.5) {
    transformed = vec3(0.0);
  }

  float _flPrimary = sin(dot(_flWorld.xz, uWindDir) * uWindFreq + uTime * uWindSpeed);
  float _flSecond  = sin(dot(_flWorld.xz, uWindDir) * uWindFreq * 2.6 + uTime * uWindSpeed * 1.8 + 1.3) * 0.35;
  vec2  _flPerp    = vec2(-uWindDir.y, uWindDir.x);
  float _flTurb    = sin(dot(_flWorld.xz, _flPerp) * uWindFreq * 1.9 + uTime * uWindSpeed * 0.7 + 2.6) * uWindTurb;

  transformed += _flWindLocal * ((_flPrimary + _flSecond + _flTurb) * uWindStrength * _flH + uWindLean * _flH);
  transformed.x += sin(transformed.y * uBendFreq + uTime * uWindSpeed * 0.4 + _flWorld.x * 0.7) * uBendAmp * _flH;
`;

export const FLOWER_UNIFORMS = /* glsl */ `
  varying vec2 vFlUv;
  uniform sampler2D uFlowerMask;
  uniform sampler2D uFlowerRGB;
  uniform sampler2D uFlowerGradient;
  uniform vec3  uColorR;
  uniform vec3  uColorG;
  uniform vec3  uColorB;
  uniform vec3  uColorStem;
  uniform vec3  uGrassColor;
  uniform float uBrightness;
`;

export const FLOWER_DIFFUSE = /* glsl */ `
  if ( texture2D( uFlowerMask, vFlUv ).r < 0.5 ) discard;

  float _gradFade = smoothstep( 0.0, 0.7, texture2D( uFlowerGradient, vFlUv ).r );
  vec3  _rgb = texture2D( uFlowerRGB, vFlUv ).rgb;

  float _isR = max( 0.0, _rgb.r - max( _rgb.g, _rgb.b ) );
  float _isG = max( 0.0, _rgb.g - max( _rgb.r, _rgb.b ) );
  float _isB = max( 0.0, _rgb.b - max( _rgb.r, _rgb.b ) );
  float _isW = min( _rgb.r, min( _rgb.g, _rgb.b ) );
  float _tot = _isR + _isG + _isB + _isW;
  vec3  _fc  = _tot < 0.01 ? uColorStem :
    ( _isR * uColorR + _isG * uColorG + _isB * uColorB + _isW * uColorStem ) / _tot;

  vec3 _flCol = mix( uGrassColor, _fc, _gradFade ) * uBrightness;
  vec4 diffuseColor = vec4( _flCol, opacity );
`;

const FLOWER_VERTEX_HEADER =
  FLOWER_WIND_UNIFORMS + GROUND_MASK_UNIFORMS + GROUND_MASK_GLSL;

export function makeFlowerMaterial(uniforms) {
  const mat = new THREE.MeshLambertMaterial({
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: true,
  });

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = FLOWER_VERTEX_HEADER + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      FLOWER_WIND_VERTEX
    );

    shader.fragmentShader = FLOWER_UNIFORMS + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      FLOWER_DIFFUSE
    );
  };

  return mat;
}

export function makeFlowerDepthMaterial(uniforms) {
  const mat = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    side: THREE.DoubleSide,
  });

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = FLOWER_VERTEX_HEADER + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      FLOWER_WIND_VERTEX
    );

    shader.fragmentShader =
      `varying vec2 vFlUv;\nuniform sampler2D uFlowerMask;\n` +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
      if ( texture2D( uFlowerMask, vFlUv ).r < 0.5 ) discard;`
    );
  };

  return mat;
}

/**
 * Geometría en cruz con soporte nativo de LOD por vértice (aQuadIndex).
 * Quad 1 (Z=0) se dibuja en LOD 0 y LOD 1.
 * Quad 2 (X=0) se dibuja en LOD 0 y colapsa a 0 en LOD 1 para ahorrar 50% de polígonos.
 */
export function makeFlowerCrossGeometry() {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([
    // Quad 1: plano X-Y en Z=0 (ancho 1.0, alto 1.0 centrado en la base)
    -0.5, 0.0, 0.0,
     0.5, 0.0, 0.0,
     0.5, 1.0, 0.0,
    -0.5, 1.0, 0.0,

    // Quad 2: plano Z-Y en X=0 (perpendicular)
     0.0, 0.0, -0.5,
     0.0, 0.0,  0.5,
     0.0, 1.0,  0.5,
     0.0, 1.0, -0.5,
  ]);

  const uvs = new Float32Array([
    // Quad 1
    0.0, 0.0,
    1.0, 0.0,
    1.0, 1.0,
    0.0, 1.0,

    // Quad 2
    0.0, 0.0,
    1.0, 0.0,
    1.0, 1.0,
    0.0, 1.0,
  ]);

  const normals = new Float32Array([
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,

    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
  ]);

  const quadIndices = new Float32Array([
    0.0, 0.0, 0.0, 0.0, // Quad 1
    1.0, 1.0, 1.0, 1.0, // Quad 2
  ]);

  const indices = [
    0, 1, 2,
    0, 2, 3,
    4, 5, 6,
    4, 6, 7,
  ];

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('aQuadIndex', new THREE.BufferAttribute(quadIndices, 1));
  geo.setIndex(indices);

  return geo;
}


