import * as THREE from 'three';
import { resolveQuality } from '../../demo_scena/genshin/GenshinArtDirection.js';
import { GenshinMountains } from '../../demo_scena/genshin/GenshinMountains.js';
import { GenshinPostFX } from '../../demo_scena/genshin/GenshinPostFX.js';
import { applyGenshinCharacterStyle, getSoftToonRamp } from '../../demo_scena/genshin/GenshinMaterials.js';
import { IslandTerrainData } from './IslandTerrainData.js';
import { createIslandTerrainMaterial } from './IslandTerrainMaterial.js';
import { IslandGrassField } from './IslandGrassField.js';
import { IslandTrees } from './IslandTrees.js';
import { IslandSky } from './IslandSky.js';
import { createIslandOcean, IslandWaterBody } from './IslandWater.js';
import { IslandParticles } from './IslandParticles.js';

/**
 * IslandArtLayer — Shared Genshin-style art pipeline for the four outer islands, built from
 * the same pieces as the Forest (sky, haze, mountains, painterly ground + patchy paths, soft
 * grass, brush-stroke trees, Genshin water, post FX, character style). Each island only
 * supplies a profile (palette, lighting, GLSL ground hooks, paths, vegetation, water).
 *
 * ctx = { om, renderer, root: THREE.Group, terrain: { size, segments, geometry, mesh }, lightingManager }
 */
export class IslandArtLayer {
  constructor(ctx, profile) {
    this.ctx = ctx;
    this.om = ctx.om;
    this.profile = profile;
    this.active = false;
    this._time = 0;
    this._characterStyledAt = -1;
    this.quality = resolveQuality(ctx.renderer);
    this.sunDir = profile.light.sunDir.clone().normalize();
    this.updatables = [];

    this.root = new THREE.Group();
    this.root.name = `IslandArt_${profile.id}`;
    ctx.root.add(this.root);

    // 1. Baked terrain data (height, grass/path/flower/wet masks, path frame)
    this.data = new IslandTerrainData(ctx.terrain, profile);

    // 2. Painterly lit ground
    if (ctx.terrain.mesh) {
      this.legacyTerrainMaterial = ctx.terrain.mesh.material;
      this.terrainMaterial = createIslandTerrainMaterial(this.data, profile);
      ctx.terrain.mesh.material = this.terrainMaterial;
      ctx.terrain.mesh.receiveShadow = true;
    }

    // 3. Sky, distant ranges
    this.sky = new IslandSky(this.root, { ...profile.sky, sunDir: this.sunDir });
    if (profile.mountains !== false) {
      this.mountains = new GenshinMountains(this.root);
      const M = profile.mountains || {};
      const u = this.mountains.uniforms;
      u.uSunDir.value.copy(this.sunDir);
      if (M.sunColor !== undefined) u.uSunColor.value.set(M.sunColor);
      if (M.haze !== undefined) u.uHaze.value.set(M.haze);
      if (M.hazeAway !== undefined) u.uHazeAway.value.set(M.hazeAway);
      if (M.rockNear !== undefined) u.uRockNear.value.set(M.rockNear);
      if (M.rockFar !== undefined) u.uRockFar.value.set(M.rockFar);
      if (M.snow !== undefined) u.uSnow.value.set(M.snow);
      if (M.grass !== undefined) u.uGrass.value.set(M.grass);
    }

    // 4. Grass & flowers
    if (profile.grass) {
      this.grass = new IslandGrassField(this.root, this.data, this.quality, profile.grass);
    }

    // 5. Trees
    const trees = profile.trees ? profile.trees(this.data, ctx) : [];
    if (trees.length) this.trees = new IslandTrees(this.root, trees, this.sunDir, profile.treeCfg || {});

    // 6. Sea & water bodies
    if (profile.sea && !profile.sea.reuseExisting) {
      this.ocean = createIslandOcean(this.root, { ...profile.sea, sunDir: this.sunDir });
    }
    this.waterBodies = (profile.water || []).map((w) => new IslandWaterBody(this.root, {
      ...w, data: this.data, sunDir: this.sunDir, sky: { zenith: profile.sky.zenith, horizon: profile.sky.horizon }
    }));

    // 7. Ambient particles
    this.particles = (profile.particles || []).map((p) => new IslandParticles(this.root, p));

    // 8. Island atmosphere (exponential haze kept even if another zone swaps the scene fog)
    this.fog = new THREE.FogExp2(profile.fog.color, profile.fog.density);

    // 9. Post FX (same pass as the Forest, island grade)
    this.postFX = new GenshinPostFX(this.om.camera, { godRays: this.quality.godRays });
    const pf = profile.postFX || {};
    const pu = this.postFX.pass.uniforms;
    if (pf.warm) pu.uWarm.value.setRGB(...pf.warm);
    if (pf.cool) pu.uCool.value.setRGB(...pf.cool);
    if (pf.saturation !== undefined) pu.uSaturation.value = pf.saturation;
    if (pf.vignette !== undefined) pu.uVignette.value = pf.vignette;
    if (pf.godRays !== undefined) pu.uGodRayStrength.value = pf.godRays;
    if (pf.flare !== undefined) pu.uFlareStrength.value = pf.flare;
    this.postFX.pass.enabled = false;
    this._postInserted = false;

    if (typeof profile.build === 'function') profile.build(this);
  }

  /** Golden-hour style lighting on the zone's LightingManager. */
  applyLighting() {
    const lm = this.ctx.lightingManager;
    const L = this.profile.light;
    if (!lm) return;
    lm.dirLight.color.setHex(L.sunColor);
    lm.dirLight.intensity = L.sunIntensity;
    lm._lightOffset.copy(this.sunDir).multiplyScalar(150);
    lm.dirLight.position.copy(lm._lightOffset);
    lm.dirLight.target.position.set(0, 0, 0);
    lm.hemiLight.color.setHex(L.skyFill);
    lm.hemiLight.groundColor.setHex(L.groundFill);
    lm.hemiLight.intensity = L.hemiIntensity;
    lm.ambientLight.color.setHex(L.ambientColor);
    lm.ambientLight.intensity = L.ambientIntensity;
    lm.dirLight.shadow.radius = 3;
    lm.dirLight.castShadow = true;
  }

  _ensurePostFX() {
    if (this._postInserted) return;
    const env = this.om && this.om.environmentSystem;
    if (!env || !env.composer) return;
    const passes = env.composer.passes;
    const outIdx = passes.indexOf(env.outputPass);
    if (outIdx >= 0) env.composer.insertPass(this.postFX.pass, outIdx);
    else env.composer.addPass(this.postFX.pass);
    this._postInserted = true;
    this.postFX.pass.enabled = this.active && this.quality.postFX;
  }

  update(delta, playerPos) {
    if (!this.active) return;
    this._time += delta;
    const cam = this.om.camera;
    const camPos = cam ? cam.position : playerPos;
    this.sky.update(delta, camPos);
    if (this.mountains) this.mountains.update(camPos);
    if (this.grass) {
      const comp = this.om.player && this.om.player.companionGroup ? this.om.player.companionGroup.position : null;
      this.grass.update(delta, playerPos, comp);
    }
    if (this.trees) this.trees.update(delta);
    if (this.ocean) this.ocean.material.uniforms.uTime.value += delta;
    this.waterBodies.forEach((w) => w.update(delta));
    this.particles.forEach((p) => p.update(delta, playerPos));
    if (this.terrainMaterial) this.terrainMaterial.userData.islandUniforms.uTime.value += delta;
    this.updatables.forEach((fn) => fn(delta, playerPos));

    this._ensurePostFX();
    if (this.postFX.pass.enabled) this.postFX.update(delta, this.sunDir);
    const env = this.om.environmentSystem;
    const B = this.profile.bloom || { strength: 0.42, radius: 0.55, threshold: 0.92 };
    if (env && env.bloomPass) {
      env.bloomPass.strength = B.strength;
      env.bloomPass.radius = B.radius;
      env.bloomPass.threshold = B.threshold;
    }
    if (this.ctx.renderer) this.ctx.renderer.toneMappingExposure = this.profile.exposure ?? 1.05;

    // Island haze: re-apply if another zone (shared scene) replaced the fog
    const scene = this.om.scene;
    if (scene && scene.fog !== this.fog) scene.fog = this.fog;
    if (this.ctx.renderer && this._clearSet !== true) {
      this.ctx.renderer.setClearColor(this.profile.fog.color);
      this._clearSet = true;
    }

    if (this._characterStyledAt < 0 || this._time - this._characterStyledAt > 4.0) {
      this._characterStyledAt = this._time;
      const p = this.om.player;
      if (p && p.mesh) applyGenshinCharacterStyle(p.mesh, p.toonOutline || null);
      const npcs = (this.om.npcManager && this.om.npcManager.npcs) || [];
      for (const npc of npcs) if (npc && npc.group) applyGenshinCharacterStyle(npc.group);
    }
  }

  setActive(active) {
    this.active = active;
    this.root.visible = active;
    this._clearSet = false;
    if (this.postFX) this.postFX.pass.enabled = active && this.quality.postFX && this._postInserted;
    if (active) {
      this.applyLighting();
      if (this.om.scene) {
        this.om.scene.fog = this.fog;
        this.om.scene.background = null;
      }
      if (this.ctx.renderer) {
        this.ctx.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.ctx.renderer.toneMappingExposure = this.profile.exposure ?? 1.05;
      }
    }
  }
}

/** Converts plain Lambert / Standard / Phong meshes (procedural landmarks) to the soft toon ramp. */
export function toonifyGroup(group, opts = {}) {
  const ramp = getSoftToonRamp();
  const cache = new Map();
  group.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const conv = (m) => {
      if (!(m.isMeshLambertMaterial || m.isMeshStandardMaterial || m.isMeshPhongMaterial)) return m;
      if (cache.has(m)) return cache.get(m);
      const t = new THREE.MeshToonMaterial({
        color: m.color ? m.color.clone().multiplyScalar(opts.brighten ?? 1.0) : 0xffffff,
        map: m.map || null,
        emissive: m.emissive ? m.emissive.clone() : 0x000000,
        emissiveIntensity: m.emissiveIntensity ?? 1,
        transparent: m.transparent,
        opacity: m.opacity,
        side: m.side,
        gradientMap: ramp
      });
      t.name = (m.name || 'mat') + '_toon';
      cache.set(m, t);
      return t;
    };
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
    o.castShadow = true;
    o.receiveShadow = true;
  });
}
