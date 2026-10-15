import * as THREE from 'three';
import { GENSHIN_PALETTE, SUN_DIRECTION, GLSL_NOISE, getGroundColorGLSL, resolveQuality } from './GenshinArtDirection.js';
import { GenshinTerrainData } from './GenshinTerrainData.js';
import { GenshinSky } from './GenshinSky.js';
import { GenshinMountains } from './GenshinMountains.js';
import { GenshinGrassField } from './GenshinGrassField.js';
import { GenshinTrees } from './GenshinTrees.js';
import { applyGenshinRiver, applyGenshinOcean } from './GenshinWater.js';
import { GenshinPostFX } from './GenshinPostFX.js';
import {
  stylizeRockMaterial,
  stylizeFoliageMaterial,
  restyleMeshes,
  applyGenshinCharacterStyle
} from './GenshinMaterials.js';

/**
 * GenshinForestArt — Art-direction layer for Island 1 (Forest / DemoScenaZone22).
 *
 * Wraps the existing Demo_Scena systems without changing gameplay data:
 * same terrain heights, same river path, same tree/rock positions (Mulberry32 seeds),
 * same NPCs, collisions, portals, HUD and companion logic. Only the LOOK changes:
 *
 *   sky & clouds · distant mountains · golden-hour lighting · painterly terrain colour ·
 *   lush grass + wildflowers · bulky autumn/conifer trees · translucent river ·
 *   mossy weathered rocks · soft cel characters · god rays, lens flare and colour grade.
 *
 * Toggle at runtime from the console: window.genshinArt.setEnabled(false|true)
 */
export class GenshinForestArt {
  constructor(zone) {
    this.zone = zone;
    this.om = zone.om;
    this.enabled = true;
    this.quality = resolveQuality(zone.renderer);
    this._hidden = [];
    this._postInserted = false;
    this._characterStyledAt = -1;
    this._time = 0;

    this.root = new THREE.Group();
    this.root.name = 'GenshinForestArt';
    zone.group.add(this.root);

    console.log('[GenshinForestArt] 🎨 Building Genshin-style art pass for Island 1...', this.quality);

    // 1. Baked terrain data shared by grass, flowers and the terrain colour shader
    this.terrainData = new GenshinTerrainData(zone.terrain);
    this._restyleTerrain();

    // 2. Sky, clouds and distant mountains
    this.sky = new GenshinSky(this.root);
    this.mountains = new GenshinMountains(this.root);
    // Sister islands on the horizon: same sun, a touch more aerial haze so they sit in the painting
    if (zone.distantIslands && zone.distantIslands.materials) {
      zone.distantIslands.materials.forEach((m) => {
        if (m.uniforms && m.uniforms.uSunDir) m.uniforms.uSunDir.value.copy(SUN_DIRECTION);
        if (m.uniforms && m.uniforms.uExtraHaze) m.uniforms.uExtraHaze.value = 0.32;
      });
    }
    if (zone.atmosphereManager && zone.atmosphereManager.skyDome) {
      this._hide(zone.atmosphereManager.skyDome);
    }

    // 3. Grass & wildflowers (replaces V3 tufts)
    this.grass = new GenshinGrassField(this.root, this.terrainData, this.quality);
    const veg = zone.vegetationManager;
    if (veg) {
      if (veg.v3GrassGroup) this._hide(veg.v3GrassGroup);
      if (veg.grassMesh) this._hide(veg.grassMesh);
      if (veg.stylizedGrassGroup) this._hide(veg.stylizedGrassGroup);
      if (veg.stylizedFlowersGroup) this._hide(veg.stylizedFlowersGroup);
      if (veg.flowersGroup) this._hide(veg.flowersGroup);
    }

    // 4. Trees (same positions as PropsManager)
    const props = zone.propsManager;
    this.trees = new GenshinTrees(this.root, props, SUN_DIRECTION);
    if (props) {
      (props.instancedTreeMeshes || []).forEach((m) => this._hide(m));
      // 5. Rocks, pebbles and undergrowth → weathered mossy stone & soft toon foliage
      restyleMeshes(props.instancedRockMeshes || [], (m) => stylizeRockMaterial(m, 0.75));
      restyleMeshes(props.instancedPebbleMeshes || [], (m) => stylizeRockMaterial(m, 0.35));
      restyleMeshes(props.instancedVegetationMeshes || [], (m) => stylizeFoliageMaterial(m));
    }
    if (zone.waterManager) {
      // River rocks & reeds use plain meshes inside the water group
      const riverRocks = [];
      zone.waterManager.group.traverse((o) => {
        if (o.isMesh && o.material && o.material.isMeshStandardMaterial && /rock|stone|piedra/i.test(o.name + (o.material.name || ''))) riverRocks.push(o);
      });
      restyleMeshes(riverRocks, (m) => stylizeRockMaterial(m, 0.6));
      // 6. River
      applyGenshinRiver(zone.waterManager, zone.terrain);
      applyGenshinOcean(zone.waterManager);
    }

    // 7. Lighting (golden hour) — registered as a LightingManager preset so the existing
    //    setActive()/setLightingPreset() flow keeps working.
    if (zone.lightingManager) {
      zone.lightingManager.currentPreset = 'genshin_golden';
    }

    // 8. Post FX (inserted lazily: EnvironmentSystem's composer is created after the zone)
    this.postFX = new GenshinPostFX(this.om.camera, { godRays: this.quality.godRays });

    window.genshinArt = this;
    console.log('[GenshinForestArt] ✨ Genshin art pass ready.');
  }

  _hide(obj) {
    if (!obj) return;
    this._hidden.push({ obj, visible: obj.visible });
    obj.visible = false;
  }

  /** Painterly terrain colour driven by the same baked mask as the grass. */
  _restyleTerrain() {
    const terrain = this.zone.terrain;
    if (!terrain || !terrain.material) return;
    const mat = terrain.material;
    const original = mat.onBeforeCompile;
    const data = this.terrainData;
    const P = GENSHIN_PALETTE;
    const self = this;
    mat.roughness = 1.0;
    mat.metalness = 0.0;
    this.terrainUniforms = {
      ...data.uniforms(),
      uGenshinOn: { value: 1.0 },
      uPathLight: { value: new THREE.Color(P.path) },
      uSoil: { value: new THREE.Color(P.soil) },
      uSand: { value: new THREE.Color(0xe6d3a3) },
      uRockLight: { value: new THREE.Color(P.rockLight) },
      uMossT: { value: new THREE.Color(P.moss) },
      // Patchy dirt paths: baked road frame (signed distance + tangent) + cracked-earth texture set
      uRoadFrame: { value: data.bakeRoadFrame(this.zone.roadManager) },
      uPathDust: { value: new THREE.Color(0xd9c49a) },   // fallback dust (until textures load)
      uPathEarth: { value: new THREE.Color(0xa88559) },  // fallback packed earth
      uPathDark: { value: new THREE.Color(0x7a5d3e) },   // fallback grooves
      uDirtCol: { value: null },
      uDirtNrm: { value: null },
      uDirtHgt: { value: null },
      uDirtReady: { value: 0.0 }
    };
    this._loadDirtTextures();
    mat.onBeforeCompile = (shader, renderer) => {
      if (original) original.call(mat, shader, renderer);
      Object.assign(shader.uniforms, self.terrainUniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uGenshinOn;
          uniform vec3 uPathLight, uSoil, uSand, uRockLight, uMossT;
          uniform sampler2D uRoadFrame, uDirtCol, uDirtNrm, uDirtHgt;
          uniform vec3 uPathDust, uPathEarth, uPathDark;
          uniform float uDirtReady;
          ${GLSL_NOISE}
          ${GenshinTerrainData.glsl()}
          ${getGroundColorGLSL()}

          // Cracked-earth texture in world space: two differently rotated/scaled layers
          // blended by low-frequency noise so the 4 m tile never reads as a grid.
          // Returns colour (rgb) + height (a); tilt = world-space normal perturbation (x,z).
          vec4 gDirtSample(vec2 xz, out vec2 tilt) {
            vec2 uvA = xz * 0.25;
            vec2 uvB = vec2(0.8 * xz.x + 0.6 * xz.y, -0.6 * xz.x + 0.8 * xz.y) * 0.21 + vec2(0.37, 0.71);
            float wB = smoothstep(0.35, 0.65, gNoise(xz * 0.07 + 3.3));
            vec3 cA = texture2D(uDirtCol, uvA).rgb;
            vec3 cB = texture2D(uDirtCol, uvB).rgb;
            float hA = texture2D(uDirtHgt, uvA).r;
            float hB = texture2D(uDirtHgt, uvB).r;
            vec2 nA = texture2D(uDirtNrm, uvA).rg * 2.0 - 1.0;
            vec2 nB = texture2D(uDirtNrm, uvB).rg * 2.0 - 1.0;
            vec2 tB = nB.x * vec2(0.8, 0.6) + nB.y * vec2(-0.6, 0.8);   // rotate layer B back to world
            tilt = mix(nA, tB, wB);
            return vec4(mix(cA, cB, wB), mix(hA, hB, wB));
          }
          // Soft, intermittent wheel/foot ruts (height, 0..1)
          float gRut(float a, float u) {
            float wob = (gNoise(vec2(u * 0.12, 3.1)) - 0.5) * 0.4;
            float on = smoothstep(0.38, 0.62, gNoise(vec2(u * 0.07, 8.0)));
            return (1.0 - smoothstep(0.1, 0.38, abs(a - (0.8 + wob)))) * on;
          }`)
        .replace('diffuseColor.rgb = finalColor;', `
          vec2 gPathTilt = vec2(0.0);
          float gPathMask = 0.0;
          if (uGenshinOn > 0.5) {
            vec2 gxz = vWorldPosition.xz;
            vec4 gm = terrainMaskAt(gxz);
            float brush = gFbm3(gxz * 0.35);
            float h01 = clamp((vWorldPosition.y - 2.0) / 18.0, 0.0, 1.0);
            // Under/beyond the grass: same meadow colour, slightly deeper (root tone)
            vec3 g = genshinMeadowColor(gxz, h01) * (0.84 + 0.12 * brush);
            // Thin clearings: let a little warm soil breathe through
            g = mix(g, mix(uSoil, g, 0.55), (1.0 - smoothstep(0.15, 0.6, gm.r)) * 0.35);
            vec3 gMeadow = g;
            // Paths: warm packed earth with painterly broken edges
            float road = smoothstep(0.1, 0.55, gm.g + (brush - 0.5) * 0.3);
            vec3 pathCol = mix(uPathLight, uSoil, smoothstep(0.35, 0.8, gFbm3(gxz * 0.9)) * 0.55);
            g = mix(g, pathCol, road);
            // Patchy dirt path (road frame only): cracked-earth patches broken by grass islands
            vec4 rfr = texture2D(uRoadFrame, terrainUv(gxz));
            if (rfr.a > 0.5) {
              vec2 T = normalize(rfr.gb + vec2(1e-4, 0.0));
              vec2 Nn = vec2(-T.y, T.x);
              float a = abs(rfr.r);
              float sg = rfr.r >= 0.0 ? 1.0 : -1.0;
              float u = dot(gxz, T);
              float v = dot(gxz, Nn);
              // Same width variation as RoadManager.getRoadFactor(), plus a slow "breathing" along the path
              float effW = max(3.2, 4.8 + sin(gxz.x * 0.08 + gxz.y * 0.06) * 0.55 + cos(gxz.y * 0.14) * 0.35);
              float halfW = effW * 0.5 * (0.74 + 0.5 * gNoise(vec2(u * 0.045, 5.3))) + 0.15;
              // Texture (fallback: flat earth until the textures arrive)
              vec2 tTilt;
              vec4 ds = gDirtSample(gxz, tTilt);
              vec3 dc = mix(mix(uPathEarth, uPathDust, gNoise(gxz * 0.6)), ds.rgb, uDirtReady);
              float hgt = mix(0.75, ds.a, uDirtReady);
              tTilt *= uDirtReady;
              // Wavy, uneven border that follows the earth plates (cracks turn to grass first)
              float edgeN = (gNoise(gxz * 0.15 + 1.7) - 0.5) * 2.0 + (gNoise(gxz * 0.55) - 0.5) * 0.7;
              float eA = a + edgeN + (0.68 - hgt) * 1.1;
              float core = 1.0 - smoothstep(halfW - 0.18, halfW + 0.18, eA);
              // Grass islands inside the path: rarer along the walked centre, frequent toward the edges
              float isl = gNoise(gxz * 0.19 + 9.7) * 0.75 + gNoise(gxz * 0.62 - 3.3) * 0.25;
              float islTh = 0.69 - 0.13 * smoothstep(0.2, 1.0, a / halfW);
              float island = smoothstep(islTh - 0.025, islTh + 0.025, isl + (0.68 - hgt) * 0.3);
              // Loose dirt patches scattered just off the border
              float satN = gNoise(gxz * 0.36 + 4.1) * 0.75 + gNoise(gxz * 1.3 + 0.4) * 0.25;
              float bare = 1.0 - gm.r;   // strip without grass blades along the path
              float satTh = 0.64 - 0.08 * bare;
              float sat = smoothstep(satTh, satTh + 0.06, satN + (hgt - 0.68) * 0.5) * (1.0 - smoothstep(halfW + 0.4, halfW + 3.0, a));
              float dirt = max(core * (1.0 - island), sat);
              gPathMask = dirt;
              // Short trodden grass on the islands and the bladeless strip: painterly darker tufts
              float tuft = gNoise(gxz * 2.6 + 1.3) * 0.6 + gNoise(gxz * 7.0) * 0.4;
              gMeadow *= 1.0 - bare * (0.1 + 0.14 * smoothstep(0.45, 0.75, tuft));
              vec3 dirtC = gMeadow;
              if (dirt > 0.001) {
                // Light / dark earth patches (low-frequency tone) + sun-dried dust on the walked centre
                float tone = gNoise(gxz * 0.11 + 2.0) * 0.7 + gNoise(gxz * 0.37 - 6.0) * 0.3;
                dirtC = dc * mix(vec3(0.8, 0.76, 0.74), vec3(1.14, 1.1, 1.04), tone);
                dirtC = mix(dirtC, dirtC * vec3(1.1, 1.08, 1.03) + vec3(0.02), (1.0 - smoothstep(0.0, halfW * 0.65, a)) * 0.35);
                // Plates read through their height: raised tops lighter, cracks darker
                dirtC *= 0.78 + 0.3 * smoothstep(0.3, 0.88, hgt);
                // Ruts (grooves) and streaks (veins) along the path direction
                float rut = gRut(a, u);
                dirtC *= 1.0 - rut * 0.3;
                dirtC *= 0.92 + 0.16 * gNoise(vec2(u * 0.3, v * 5.0));
                // Fine dark scratch marks following the path
                float mark = 1.0 - smoothstep(0.0, 0.03, abs(gNoise(vec2(u * 0.5, v * 2.2) + 11.0) - 0.5));
                dirtC = mix(dirtC, uPathDark * 0.8, mark * 0.18 * smoothstep(0.55, 0.8, hgt));
                // Grass that grows inside the texture cracks blends into the meadow
                // (on the walked centre those cracks stay as dark earth seams instead)
                float crackG = smoothstep(0.02, 0.1, ds.g - ds.r) * uDirtReady;
                float edgeK = smoothstep(0.35, 0.85, a / halfW);
                dirtC = mix(dirtC, dirtC * 0.72, crackG * (1.0 - edgeK));
                dirtC = mix(dirtC, gMeadow * 0.9, crackG * edgeK * 0.85);
                // Slightly muted, deeper reddish-brown (reads as earth, not terracotta)
                dirtC = mix(vec3(dot(dirtC, vec3(0.3, 0.55, 0.15))), dirtC, 0.86) * 0.94;
                // Sunken patch: soft contact shade under the grass rim
                float inner = core * (1.0 - island);
                dirtC *= 0.84 + 0.16 * smoothstep(0.25, 0.95, max(inner, sat));
                // Relief: texture normal + rut gradient (rut is a dip)
                float e = 0.08;
                float dR = (gRut(a + e, u) - rut) / e;
                vec2 rutTilt = Nn * sg * dR * 0.32;
                gPathTilt = (tTilt * 0.55 + rutTilt) * dirt;
              }
              // Inside the baked band the patch composite replaces the old flat path layer
              g = mix(gMeadow, dirtC, dirt);
            }
            // River banks & beaches: light sand, darker when wet
            vec3 sand = mix(uSand, uSand * vec3(0.72, 0.68, 0.6), gm.a);
            // Sand only right at the water line (river wet band + sea beaches), grass up to the bank
            float coastSand = shoreFactor * smoothstep(118.0, 140.0, length(gxz));
            float bankSand = gm.a * (1.0 - gm.r);
            g = mix(g, sand, clamp(bankSand * 0.95 + coastSand, 0.0, 1.0));
            // Cliffs: warm stone with moss on the ledges
            vec3 stone = uRockLight * (0.78 + 0.3 * brush);
            stone = mix(stone, uMossT, smoothstep(0.5, 0.75, slope + (brush - 0.5) * 0.4) * 0.6);
            float gRock = 1.0 - smoothstep(0.5, 0.66, slope + (brush - 0.5) * 0.08);  // only real cliffs are bare stone
            g = mix(g, stone, gRock);
            finalColor = g;
          }
          diffuseColor.rgb = finalColor;`);
    };
    // Path relief: bend the shading normal with the cracked-earth normal map + rut gradient
    const prevCompile = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
      prevCompile(shader, renderer);
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          if (uGenshinOn > 0.5 && gPathMask > 0.001) {
            vec3 nW = normalize(vWorldNormal + vec3(gPathTilt.x, 0.0, gPathTilt.y));
            normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
          }`);
    };
    const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
    mat.customProgramCacheKey = () => prevKey() + '|genshin-terrain-v3-patchy-paths';
    mat.needsUpdate = true;
  }

  /** Cracked-earth texture set (ground_07, 1k) used only by the patchy dirt paths. */
  _loadDirtTextures() {
    const u = this.terrainUniforms;
    const base = './assets/stylized/ground_texture/ground_07_4k/ground_07__';
    const renderer = this.zone.renderer;
    const aniso = renderer && renderer.capabilities ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
    const placeholder = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
    placeholder.needsUpdate = true;
    u.uDirtCol.value = u.uDirtNrm.value = u.uDirtHgt.value = placeholder;
    const loader = new THREE.TextureLoader();
    const specs = [
      ['uDirtCol', 'basecolor_1k.webp', true],
      ['uDirtNrm', 'normal_gl_1k.webp', false],
      ['uDirtHgt', 'height_1k.webp', false]
    ];
    let pending = specs.length;
    specs.forEach(([key, file, srgb]) => {
      loader.load(base + file, (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = aniso;
        if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        u[key].value = tex;
        if (--pending === 0) u.uDirtReady.value = 1.0;
      }, undefined, () => { console.warn('[GenshinForestArt] dirt texture failed:', file); });
    });
  }

  _ensurePostFX() {
    if (this._postInserted) return;
    const env = this.om && this.om.environmentSystem;
    if (!env || !env.composer) return;
    const passes = env.composer.passes;
    const outIdx = passes.indexOf(env.outputPass);
    if (outIdx >= 0) {
      env.composer.insertPass(this.postFX.pass, outIdx);
    } else {
      env.composer.addPass(this.postFX.pass);
    }
    this._postInserted = true;
  }

  update(delta, playerPos) {
    if (!this.enabled) return;
    this._time += delta;
    const cam = this.om.camera;
    const camPos = cam ? cam.position : playerPos;

    this.sky.update(delta, camPos);
    this.mountains.update(camPos);
    const companion = this.om.player && this.om.player.companionGroup ? this.om.player.companionGroup.position : null;
    this.grass.update(delta, playerPos, companion);
    this.trees.update(delta);

    this._ensurePostFX();
    if (this.postFX && this.postFX.pass.enabled) this.postFX.update(delta, SUN_DIRECTION);

    // Keep bloom gentle & painterly while the island is active (EnvironmentSystem may reset it)
    const env = this.om.environmentSystem;
    if (env && env.bloomPass) {
      env.bloomPass.strength = 0.42;
      env.bloomPass.radius = 0.55;
      env.bloomPass.threshold = 0.92;
    }
    if (this.zone.renderer) this.zone.renderer.toneMappingExposure = 1.05;

    // Warm distance haze: other zones sharing the scene (e.g. the Savanna's AtmosphereManager
    // restoring its saved FogExp2 when it deactivates) can overwrite the island fog on return.
    this._ensureDistanceHaze();

    // Characters: (re)apply soft anime style shortly after load and when new NPCs appear
    if (this._characterStyledAt < 0 || this._time - this._characterStyledAt > 4.0) {
      this._characterStyledAt = this._time;
      this._styleCharacters();
    }
  }

  /** Re-applies the island's golden-hour fog (120–680 m) if something replaced it. */
  _ensureDistanceHaze() {
    const atm = this.zone.atmosphereManager;
    const scene = this.zone.scene;
    if (!atm || !scene || !atm.isActive || !atm.fogEnabled) return;
    const f = scene.fog;
    if (!f || !(f instanceof THREE.Fog) || f.near !== atm.currentFogNear || f.far !== atm.currentFogFar ||
        f.color.getHex() !== atm.currentFogColor) {
      atm.applyAtmosphereToScene();
    }
  }

  _styleCharacters() {
    const p = this.om.player;
    if (p && p.mesh) applyGenshinCharacterStyle(p.mesh, p.toonOutline || null);
    const npcs = (this.om.npcManager && this.om.npcManager.npcs) || [];
    for (const npc of npcs) {
      if (npc && npc.group) applyGenshinCharacterStyle(npc.group);
    }
  }

  setActive(active) {
    this.root.visible = active && this.enabled;
    if (this.postFX) this.postFX.setEnabled(active && this.enabled && this.quality.postFX);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.root.visible = enabled;
    this._hidden.forEach(({ obj, visible }) => { obj.visible = enabled ? false : visible; });
    if (this.terrainUniforms) this.terrainUniforms.uGenshinOn.value = enabled ? 1.0 : 0.0;
    const di = this.zone.distantIslands;
    if (di && di.materials) di.materials.forEach((m) => { if (m.uniforms && m.uniforms.uExtraHaze) m.uniforms.uExtraHaze.value = enabled ? 0.32 : 0.0; });
    if (this.zone.atmosphereManager && this.zone.atmosphereManager.skyDome) this.zone.atmosphereManager.skyDome.visible = !enabled;
    if (this.postFX) this.postFX.setEnabled(enabled);
    const wm = this.zone.waterManager;
    if (wm) {
      const river = wm.group.getObjectByName('ContinuousRiverMesh');
      if (river && wm.genshinLegacyRiverMaterial) {
        if (!this._genshinRiverMat) this._genshinRiverMat = river.material;
        river.material = enabled ? this._genshinRiverMat : wm.genshinLegacyRiverMaterial;
        wm.waterMaterialUpper = river.material;
      }
    }
    if (wm && wm.oceanMesh && wm.genshinLegacyOceanMaterial) {
      if (!this._genshinOceanMat) this._genshinOceanMat = wm.oceanMesh.material;
      wm.oceanMesh.material = enabled ? this._genshinOceanMat : wm.genshinLegacyOceanMaterial;
      wm.oceanMaterial = wm.oceanMesh.material;
    }
    const lm = this.zone.lightingManager;
    if (lm) this.zone.setLightingPreset(enabled ? 'genshin_golden' : 'sunset');
  }
}
