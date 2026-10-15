import * as THREE from 'three';
import { GenshinGrassField } from '../../demo_scena/genshin/GenshinGrassField.js';
import { getGroundColorGLSL } from '../../demo_scena/genshin/GenshinArtDirection.js';

/**
 * IslandGrassField — The Forest's soft painterly meadow (tiles, crossfade LOD, wind,
 * trampling, shadows) re-coloured per island. Only the ground colour function, the
 * wildflower palette and a few tints change; the Forest class itself is untouched.
 */
export function makeGroundGLSL(c) {
  const v = (hex) => {
    const col = new THREE.Color(hex);
    return `vec3(${col.r.toFixed(4)}, ${col.g.toFixed(4)}, ${col.b.toFixed(4)})`;
  };
  return /* glsl */ `
  vec3 genshinMeadowColor(vec2 xz, float height01) {
    float macro = gFbm3(xz * 0.018);
    float medium = gFbm3(xz * 0.075 + 4.7);
    float sunny = smoothstep(0.38, 0.78, macro);
    vec3 deep  = ${v(c.deep)};
    vec3 mid   = ${v(c.mid)};
    vec3 light = ${v(c.light)};
    vec3 dry   = ${v(c.dry)};
    vec3 col = mix(mid, light, sunny * 0.75);
    col = mix(col, deep, (1.0 - smoothstep(0.15, 0.55, medium)) * 0.35);
    col = mix(col, dry, smoothstep(0.66, 0.86, medium) * ${(c.dryAmount ?? 0.28).toFixed(3)});
    col = mix(col, light, clamp(height01, 0.0, 1.0) * 0.18);
    return col;
  }
  `;
}

export class IslandGrassField extends GenshinGrassField {
  /**
   * @param {object} cfg { ground: {deep, mid, light, dry, dryAmount}, flowers: [hex x4],
   *                       sunTint, backlight, shadowTint:[r,g,b], heightScale, windStrength, flowerCut }
   */
  constructor(parent, terrainData, quality, cfg) {
    super(parent, terrainData, { ...quality, islandGrass: cfg });
    this.group.name = 'IslandGrassField';
    const u = this.uniforms;
    if (cfg.sunTint !== undefined) u.uSunTint.value.set(cfg.sunTint);
    if (cfg.backlight !== undefined) u.uBacklight.value.set(cfg.backlight);
    if (cfg.shadowTint) u.uShadowTint.value.setRGB(cfg.shadowTint[0], cfg.shadowTint[1], cfg.shadowTint[2]);
    if (cfg.heightScale !== undefined) u.uHeightScale.value = cfg.heightScale;
    if (cfg.windStrength !== undefined) u.uWindStrength.value = cfg.windStrength;
    if (cfg.flowerCut !== undefined) u.uFlowerCut.value = cfg.flowerCut;
  }

  _commonVertexHeader() {
    const base = super._commonVertexHeader();
    const cfg = this.q.islandGrass;
    if (!cfg || !cfg.ground) return base;
    return base.replace(getGroundColorGLSL(), makeGroundGLSL(cfg.ground));
  }

  _createFlowerMaterial() {
    const mat = super._createFlowerMaterial();
    const cfg = this.q.islandGrass;
    if (cfg && cfg.flowers && cfg.flowers.length === 4) {
      const v = (hex) => {
        const c = new THREE.Color(hex);
        return `vec3(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)})`;
      };
      const [a, b, c, d] = cfg.flowers;
      mat.vertexShader = mat.vertexShader
        .replace('vec3 yellow = vec3(1.0, 0.80, 0.18);', `vec3 yellow = ${v(a)};`)
        .replace('vec3 white = vec3(1.0, 0.98, 0.93);', `vec3 white = ${v(b)};`)
        .replace('vec3 blue = vec3(0.38, 0.6, 1.0);', `vec3 blue = ${v(c)};`)
        .replace('vec3 pink = vec3(1.0, 0.62, 0.74);', `vec3 pink = ${v(d)};`);
    }
    if (cfg && cfg.flowerGlow) {
      // Bioluminescent petals (Mystic island): add a soft emissive term
      mat.fragmentShader = mat.fragmentShader.replace(
        'gl_FragColor = vec4(col, 1.0);',
        `col += albedo * ${cfg.flowerGlow.toFixed(3)};
        gl_FragColor = vec4(col, 1.0);`
      );
    }
    return mat;
  }
}
