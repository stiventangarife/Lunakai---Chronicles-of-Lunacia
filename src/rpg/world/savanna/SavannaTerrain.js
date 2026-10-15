import * as THREE from 'three';
import { SimplexNoise, smoothstep } from '../demo_scena/MathUtils.js';

/**
 * SavannaTerrain.js - High Stepped Mesa / Plateau Terrain (480m x 480m)
 * Matching user photo reference and geographical requirements:
 * 1. Low coastal beach perimeter meeting the ocean.
 * 2. Stepped canyon terraces rising through layered cliffs.
 * 3. Grand High Plateau (height ~25-28m) offering 360° panoramic horizon views.
 * 4. Summit oasis level with the plateau (flat sandy shelf, shallow pool ~0.25 m below the shore).
 * 5. Natural accessible canyon ramps with gentle slope (< 20°) from coast to summit.
 * 6. Toon canyon strata shader with horizontal sedimentary rock bands on cliffs.
 */
export class SavannaTerrain {
  constructor(parentGroup, assetManager) {
    this.parentGroup = parentGroup;
    this.assetManager = assetManager;

    this.size = 480;            // 480m x 480m
    this.segments = 256;        // 256x256 subdivisions
    this.noise = new SimplexNoise(7742);
    this.detailNoise = new SimplexNoise(3319);

    // Oasis center and radius
    this.oasisCenter = new THREE.Vector2(14, -12);
    this.oasisRadius = 24.0;
    // Hito 23: summit oasis level with the plateau (flat shelf + shallow pool, water ~0.25 m below shore)
    this.oasisShelf = 25.4;
    this.oasisPoolRadius = 11.0;
    this.oasisWaterLevel = 25.15;

    this.mesh = null;
    this.geometry = null;
    this.material = null;

    this.createTerrain();
  }

  /**
   * Distance from a 2D point (x, z) to a segment (p1 -> p2).
   * Used for smooth walkable canyon ramps.
   */
  _distToSegment(px, pz, ax, az, bx, bz) {
    const abx = bx - ax;
    const abz = bz - az;
    const lenSq = abx * abx + abz * abz;
    if (lenSq === 0) return { dist: Math.hypot(px - ax, pz - az), t: 0 };
    let t = ((px - ax) * abx + (pz - az) * abz) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = ax + t * abx;
    const projZ = az + t * abz;
    return {
      dist: Math.hypot(px - projX, pz - projZ),
      t: t,
      projX,
      projZ
    };
  }

  getHeight(x, z) {
    const dist = Math.sqrt(x * x + z * z);

    // 1. Base organic noise (dune waves and gentle undulations)
    const baseWave = this.noise.fbm(x * 0.008, z * 0.008, 3, 0.5, 2.0) * 3.5;
    const microDetail = this.detailNoise.noise2D(x * 0.04, z * 0.04) * 0.6;

    // 2. Stepped Plateau Profile (Meseta Alta Escalonada)
    // - Low Beach: R >= 135 -> height ~1.5m to 2.0m, smoothly meeting sea level (0.45m) at 144m
    // - Terrace 1: R in [95, 122] -> height ~13.5m
    // - High Summit Plateau: R < 92 -> height ~25.5m
    let plateauH = 25.5;

    if (dist > 92.0 && dist <= 122.0) {
      // Step from high plateau (25.5m) to middle terrace (13.5m)
      const t = smoothstep(92.0, 108.0, dist);
      // Terraced curve: steep drop followed by flat ledge
      const stepT = Math.pow(t, 2.2);
      plateauH = 25.5 * (1.0 - stepT) + 13.5 * stepT;
    } else if (dist > 122.0 && dist <= 140.0) {
      // Step from middle terrace (13.5m) down to coastal plain (2.0m)
      const t = smoothstep(122.0, 136.0, dist);
      const stepT = Math.pow(t, 2.0);
      plateauH = 13.5 * (1.0 - stepT) + 2.0 * stepT;
    } else if (dist > 140.0) {
      plateauH = 2.0;
    }

    const coastCalm = 1.0 - smoothstep(120.0, 150.0, dist);
    let h = plateauH + baseWave * (0.35 + 0.65 * coastCalm) + microDetail;

    // 3. Natural Walkable Canyon Ramps (Rampas de Ascenso Suave)
    // Ramp A: Southwestern Pass (Starts at coast x: -118, z: 40 -> ends at plateau x: -35, z: 6)
    const rampA = this._distToSegment(x, z, -120, 42, -35, 8);
    const rampAWidth = 14.0;
    if (rampA.dist < rampAWidth) {
      // Target height smoothly interpolating from coast (3.2m) to plateau (25.2m)
      const targetH = 3.2 + rampA.t * 22.0;
      const blend = Math.cos((rampA.dist / rampAWidth) * Math.PI * 0.5);
      const smoothBlend = Math.pow(blend, 1.6);
      h = h * (1.0 - smoothBlend) + targetH * smoothBlend;
    }

    // Ramp B: Northeastern Trail (Starts at coast x: 88, z: -108 -> ends at plateau x: 32, z: -44)
    const rampB = this._distToSegment(x, z, 90, -108, 30, -42);
    const rampBWidth = 13.0;
    if (rampB.dist < rampBWidth) {
      const targetH = 3.2 + rampB.t * 22.0;
      const blend = Math.cos((rampB.dist / rampBWidth) * Math.PI * 0.5);
      const smoothBlend = Math.pow(blend, 1.6);
      h = h * (1.0 - smoothBlend) + targetH * smoothBlend;
    }

    // 4. Summit Oasis (Hito 23): the lagoon sits ON the plateau, level with the ground —
    // no recessed basin. A flat sandy shelf (Y = oasisShelf) with a shallow dished pool whose
    // water line is only ~25 cm below the shore.
    const dxOasis = x - this.oasisCenter.x;
    const dzOasis = z - this.oasisCenter.y;
    const oasisDist = Math.sqrt(dxOasis * dxOasis + dzOasis * dzOasis);

    if (oasisDist < this.oasisRadius + 6.0) {
      const outerR = this.oasisRadius + 6.0;
      // Organic lagoon outline (lobed shoreline instead of a perfect circle)
      const oa = Math.atan2(dzOasis, dxOasis);
      const poolR = this.oasisPoolRadius * (1.0 + 0.17 * Math.sin(oa * 3.0 + 0.7) + 0.09 * Math.sin(oa * 5.0 + 2.1) + 0.05 * Math.sin(oa * 9.0 + 4.0));
      let oasisH = this.oasisShelf;
      if (oasisDist <= poolR) {
        // Shallow dish: 1.1 m deep at the centre, meeting the shelf at the pool rim
        const f = oasisDist / poolR;
        oasisH = this.oasisShelf - 1.1 * (1.0 - f * f);
      }
      // Blend the shelf smoothly into the surrounding plateau (no slope down, no rim wall)
      const blend = smoothstep(outerR, poolR + 2.0, oasisDist);
      h = h * (1.0 - blend) + oasisH * blend;
    }

    // 5. Ocean Perimeter Falloff
    // Smooth slope into sea level (0.45m at ~144m) and submerged ocean bed (-2.5m)
    const coastStart = 136.0;
    const coastEnd = 162.0;
    if (dist > coastStart) {
      const cFactor = smoothstep(coastStart, coastEnd, dist);
      h = h * (1.0 - cFactor) + (-2.5) * cFactor;
    }
    if (dist >= coastEnd) {
      h = Math.min(h, -2.5);
    }

    return h;
  }

  getNormal(x, z) {
    const eps = 0.5;
    const hL = this.getHeight(x - eps, z);
    const hR = this.getHeight(x + eps, z);
    const hD = this.getHeight(x, z - eps);
    const hU = this.getHeight(x, z + eps);

    const normal = new THREE.Vector3(hL - hR, 2.0 * eps, hD - hU);
    normal.normalize();
    return normal;
  }

  createTerrain() {
    this.geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    this.geometry.rotateX(-Math.PI / 2);

    const posAttr = this.geometry.attributes.position;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = this.getHeight(x, z);
      posAttr.setY(i, y);
    }

    this.geometry.computeVertexNormals();

    this.material = this.createStylizedCanyonMaterial();

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.mesh.name = 'SavannaTerrainMesh';

    if (this.parentGroup) {
      this.parentGroup.add(this.mesh);
    }
  }

  createStylizedCanyonMaterial() {
    return new THREE.ShaderMaterial({
      fog: true,
      uniforms: {
        ...THREE.UniformsLib.fog,
        uSunDirection: { value: new THREE.Vector3(0.65, 0.75, -0.45).normalize() },
        uSunColor: { value: new THREE.Color('#fff0d0') },
        uAmbientColor: { value: new THREE.Color('#785038') },

        // Flat plateau turf & sand
        uPlateauColor: { value: new THREE.Color('#d89f38') },      // Golden savannah grass
        uHighDuneColor: { value: new THREE.Color('#f0c466') },     // Sunlit golden sand dunes
        uOasisShoreColor: { value: new THREE.Color('#e5c282') },   // Soft oasis sand bank
        uBeachColor: { value: new THREE.Color('#deb578') },        // Coastal sand

        // Canyon Cliff Rock Strata
        uStrataRed: { value: new THREE.Color('#944227') },         // Terracotta clay stratum
        uStrataOchre: { value: new THREE.Color('#c97c36') },       // Deep ochre sandstone
        uStrataGold: { value: new THREE.Color('#dfa44d') },        // Golden sandstone stratum
        uStrataDark: { value: new THREE.Color('#542617') },        // Dark burnt sienna iron band

        uOasisCenter: { value: this.oasisCenter },
        uOasisRadius: { value: this.oasisRadius }
      },
      vertexShader: `
        #include <common>
        #include <fog_pars_vertex>
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: `
        #include <common>
        #include <fog_pars_fragment>
        uniform vec3 uSunDirection;
        uniform vec3 uSunColor;
        uniform vec3 uAmbientColor;

        uniform vec3 uPlateauColor;
        uniform vec3 uHighDuneColor;
        uniform vec3 uOasisShoreColor;
        uniform vec3 uBeachColor;

        uniform vec3 uStrataRed;
        uniform vec3 uStrataOchre;
        uniform vec3 uStrataGold;
        uniform vec3 uStrataDark;

        uniform vec2 uOasisCenter;
        uniform float uOasisRadius;

        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;

        // Simple hash/noise for organic strata micro-displacement
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          vec3 N = normalize(vNormal);
          vec3 L = normalize(uSunDirection);

          float slope = N.y; // 1.0 = completely flat, 0.0 = sheer vertical cliff
          float heightY = vWorldPosition.y;

          // 1. Canyon Horizontal Strata Color (for cliffs & steep faces)
          // Multi-frequency banding mimicking grand canyon sedimentary layers
          float strataNoise = hash(floor(vWorldPosition.xz * 0.15)) * 0.8;
          float bandCoord = (heightY * 0.45) + sin(vWorldPosition.x * 0.04) * 0.35 + strataNoise * 0.2;
          float bandFract = fract(bandCoord);

          vec3 cliffColor;
          if (bandFract < 0.28) {
            cliffColor = mix(uStrataRed, uStrataOchre, bandFract / 0.28);
          } else if (bandFract < 0.60) {
            cliffColor = mix(uStrataOchre, uStrataGold, (bandFract - 0.28) / 0.32);
          } else if (bandFract < 0.82) {
            cliffColor = mix(uStrataGold, uStrataDark, (bandFract - 0.60) / 0.22);
          } else {
            cliffColor = mix(uStrataDark, uStrataRed, (bandFract - 0.82) / 0.18);
          }

          // 2. Flat Terrain Color (Grass, Sand, Oasis, Beach)
          float distToOasis = length(vWorldPosition.xz - uOasisCenter);
          vec3 flatColor;

          if (distToOasis < uOasisRadius + 8.0) {
            // Oasis basin & sand shoreline
            float oasisT = clamp(distToOasis / (uOasisRadius + 8.0), 0.0, 1.0);
            flatColor = mix(uOasisShoreColor, uPlateauColor, oasisT);
          } else if (heightY > 18.0) {
            // High plateau golden turf & dunes
            float duneWave = sin(vWorldPosition.x * 0.06 + vWorldPosition.z * 0.05) * 0.5 + 0.5;
            flatColor = mix(uPlateauColor, uHighDuneColor, duneWave * 0.45);
          } else if (heightY > 8.0) {
            // Mid terrace dry turf
            flatColor = mix(uPlateauColor, uOasisShoreColor, 0.35);
          } else {
            // Coastal lower beach
            flatColor = uBeachColor;
          }

          // 3. Slope Blending (Cliff Strata vs Flat Turf/Sand)
          float slopeBlend = smoothstep(0.68, 0.82, slope);
          vec3 albedo = mix(cliffColor, flatColor, slopeBlend);

          // 4. Half-Lambert Lighting
          float NdotL = dot(N, L);
          float halfLambert = clamp((NdotL + 0.45) / 1.45, 0.0, 1.0);
          vec3 lighting = uAmbientColor + uSunColor * halfLambert;

          // Warm subtle rim/sun tint
          vec3 finalColor = albedo * lighting;

          gl_FragColor = vec4(finalColor, 1.0);
          #include <fog_fragment>
        }
      `
    });
  }

  update(delta) {
    // Terrain mesh static; shader updates if needed
  }
}
