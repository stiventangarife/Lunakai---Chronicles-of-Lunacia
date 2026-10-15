// BiomeThemeManager.js - Visual styling, colors, lighting and atmosphere for all 4 Lunacia Biomes
import * as THREE from 'three';

export const BIOMES = {
  forest: {
    id: 'forest',
    name: 'Forest of Lunacia',
    badge: '🌲 FOREST',
    palette: {
      groundColorOverride: null,      // Muestra directamente la textura fiel del suelo del bosque de referencia
      pathColorOverride: '#d8d696',   // Camino suave beige-lima pastel
      grassRoot: '#5ca628',          // Verde hoja fresco en la base de briznas 3D
      grassTip: '#c6ea4c',           // Amarillo-lima luminoso en las puntas (matching the texture)
      grassRootB: '#6cb830',
      grassTipB: '#d2f256',
      grassDensityFactor: 1.0,       // 100% Máxima densidad de briznas instanciadas
      grassScale: 0.28,              // Briznas finas con cobertura completa sin perder forma
      grassAO: 0.18,                 // Contact AO suave para asentar el césped
      flowerTint: 0xffffff,
      flowerTintStrength: 0.85,
      treeCanopy: 0x38b44a,          // Verde esmeralda vivo y soleado para el follaje
      treeTrunkRoughness: 0.85,
      groundSoilTint: [0.604, 0.439, 0.314],
      groundMossTint: [0.557, 0.596, 0.325],
    },
    lighting: {
      sunColor: 0xfff2d6,            // Luz solar cálida y ligeramente dorada
      sunIntensity: 2.95,            // Intensidad equilibrada que evita quemar el terreno blanco
      sunPosition: [22, 26, 14],     // Ángulo oblicuo (~52°) con sombras direccionales definidas
      hemiSky: 0xbedaf5,             // Cielo azul anime desaturado (sombras ligeramente frías)
      hemiGround: 0x445f32,          // Rebote ambiental verde musgo / tierra cálida
      hemiIntensity: 0.92,           // Iluminación ambiental que equilibra y suaviza las sombras
      fogColor: 0xcde4f7,            // Niebla atmosférica suave celeste armonizada con el horizonte
      fogDensity: 0.0030             // Sutil y gradual (cristalina de cerca, suave profundidad lejana)
    },
    particles: 'pollen'
  },
  savannah: {
    id: 'savannah',
    name: 'Arid Wastes of Atia',
    badge: '🏜️ SAVANNAH',
    palette: {
      groundColorOverride: '#FAC651',
      groundColorSecondary: '#D89236',
      hasRoad: false,
      grassRoot: '#b55829',
      grassTip: '#F99A5D',
      grassRootB: '#9e4a20',
      grassTipB: '#ffa66b',
      grassDensityFactor: 0.30,
      showFlowers: false,
      treeCanopy: 0xDF6637, // Exact requested color for tree leaves: #DF6637
      treeTrunkRoughness: 0.88,
      groundSoilTint: [0.780, 0.620, 0.380],
      groundMossTint: [0.680, 0.520, 0.300],
    },
    lighting: {
      sunColor: 0xfff0cc,
      sunIntensity: 3.0,
      sunPosition: [16, 18, 9],
      hemiSky: 0xffedd5,
      hemiGround: 0xb45309,
      hemiIntensity: 0.95,
      fogColor: 0xfef3c7,
      fogDensity: 0.005
    },
    particles: 'sand_dust'
  },
  arctic: {
    id: 'arctic',
    name: 'Glacial Peaks of Lunacia',
    badge: '❄️ ARCTIC',
    palette: {
      groundColorOverride: '#F3F3F6',
      hasRoad: false,
      pathColorOverride: '#F3F3F6',
      grassRoot: '#3d6325',
      grassTip: '#F3F3F6',
      grassRootB: '#2f4f1c',
      grassTipB: '#E6E6EB',
      grassDensityFactor: 0.35,
      showFlowers: true,
      flowerTint: 0xbae6fd,
      flowerTintStrength: 0.85,
      treeCanopy: 0x1d5b54, // Teal / Verde azulado alpino
      treeSnow: 1.0, // Snow layer on foliage
      treeTrunkRoughness: 0.88,
      groundSoilTint: [0.720, 0.750, 0.800],
      groundMossTint: [0.650, 0.700, 0.750],
    },
    lighting: {
      sunColor: 0xeef6ff,
      sunIntensity: 2.9,
      sunPosition: [14, 18, 12],
      hemiSky: 0xecfdf5,
      hemiGround: 0x527267,
      hemiIntensity: 0.92,
      fogColor: 0xdbeafe,
      fogDensity: 0.005
    },
    particles: 'snowflakes'
  },
  mystic: {
    id: 'mystic',
    name: 'Astral Plains of Lunacia',
    badge: '🔮 MYSTIC',
    palette: {
      groundColorOverride: '#1E6E84',
      grassRoot: '#B66C8A',
      grassTip: '#FD9DA9',
      grassRootB: '#9d5873',
      grassTipB: '#fda5b0',
      grassDensityFactor: 0.85,
      showFlowers: true,
      flowerTint: 0xf472b6,
      treeCanopy: 0xFA7E1E,
      treeDualTone: 1.0,
      treeCanopyBase: 0xFA7E1E,
      treeCanopyShadow: 0xF472B6,
      treeSnow: 0.0,
      treeTrunkRoughness: 0.82,
      groundSoilTint: [0.220, 0.400, 0.480],
      groundMossTint: [0.180, 0.350, 0.420],
    },
    lighting: {
      sunColor: 0xfdf2f8,
      sunIntensity: 2.7,
      sunPosition: [14, 17, 10],
      hemiSky: 0xf5f3ff,
      hemiGround: 0x1e3a47,
      hemiIntensity: 0.92,
      fogColor: 0x13273b,
      fogDensity: 0.005
    },
    particles: 'astral_spores'
  },
  dungeon: {
    id: 'dungeon',
    name: 'Shadow Fortress of Lunacia',
    badge: '🏰 DUNGEON',
    palette: {
      groundColorOverride: '#231D28',
      grassRoot: '#1C1521',
      grassTip: '#42343F',
      grassRootB: '#2a1a15',
      grassTipB: '#5c3a32',
      grassDensityFactor: 0.85,
      showFlowers: true,
      flowerTint: 0xef4444,
      flowerTintStrength: 0.85,
      treeCanopy: 0x374151,
      treeDualTone: 1.0,
      treeCanopyBase: 0x4b5563,
      treeCanopyShadow: 0x1f2937,
      treeSnow: 0.0,
      treeTrunkRoughness: 0.92,
      groundSoilTint: [0.160, 0.120, 0.180],
      groundMossTint: [0.220, 0.160, 0.240],
    },
    lighting: {
      sunColor: 0xffaa77,
      sunIntensity: 2.2,
      sunPosition: [12, 16, 9],
      hemiSky: 0x3a2238,
      hemiGround: 0x1c1012,
      hemiIntensity: 0.92,
      fogColor: 0x1a121d,
      fogDensity: 0.008
    },
    particles: 'cinders'
  }
};

export class BiomeThemeManager {
  constructor(scene, stylizedEnv, decorationManager = null, skybox = null, particleManager = null) {
    this.scene = scene;
    this.env = stylizedEnv;
    this.decorationManager = decorationManager;
    this.skybox = skybox;
    this.particleManager = particleManager;
    this.currentBiome = 'forest';
    this.currentBiomeDef = BIOMES.forest;
  }

  setDecorationManager(decorationManager) {
    this.decorationManager = decorationManager;
  }

  setSkybox(skybox) {
    this.skybox = skybox;
    if (this.skybox && this.currentBiomeDef) {
      this.skybox.setBiome(this.currentBiomeDef.id, 0);
    }
  }

  setParticleManager(particleManager) {
    this.particleManager = particleManager;
    if (this.particleManager && this.currentBiomeDef) {
      this.particleManager.setBiome(this.currentBiomeDef.id, 0);
    }
  }

  applyBiome(biomeKey, transitionDuration = 1.5, gx = null, gy = null) {
    const biome = BIOMES[biomeKey] || BIOMES.forest;
    this.currentBiome = biome.id;
    this.currentBiomeDef = biome;

    console.log(`[BiomeThemeManager] Transitioning environment to biome: ${biome.name} (${biome.id})`);

    // Synchronize centralized EnvironmentSystem preset for Macro-Zone [2, 2]
    if (window.environmentSystem) {
      if (gx === 2 && gy === 2) {
        window.environmentSystem.setPreset('dojo_day');
      } else if (biome.id === 'forest') {
        window.environmentSystem.setPreset('forest_day');
      }
    }

    // 1. Update Sun & Sky Lighting
    if (this.env && this.env.sunLight) {
      this.env.sunLight.color.set(biome.lighting.sunColor);
      this.env.sunLight.intensity = biome.lighting.sunIntensity;
      this.env.sunLight.position.set(...biome.lighting.sunPosition);
    }

    // Update scene hemisphere light if present
    this.scene.traverse((obj) => {
      if (obj.isHemisphereLight) {
        obj.color.set(biome.lighting.hemiSky);
        obj.groundColor.set(biome.lighting.hemiGround);
        obj.intensity = biome.lighting.hemiIntensity;
      }
    });

    // 2. Update Scene Atmospheric Fog
    this.scene.fog = new THREE.FogExp2(biome.lighting.fogColor, biome.lighting.fogDensity);

    // 3. Update Grass Colors & Shading
    if (this.env && this.env.grass && this.env.grass.uniforms) {
      const u = this.env.grass.uniforms;
      u.uRootColor.value.set(biome.palette.grassRoot);
      u.uTipColor.value.set(biome.palette.grassTip);
      u.uRootColorB.value.set(biome.palette.grassRootB);
      u.uTipColorB.value.set(biome.palette.grassTipB);
      if (u.uSunPosition) {
        u.uSunPosition.value.set(...biome.lighting.sunPosition).normalize();
      }
    }

    // 4. Update Grass Density Factor & Scale
    if (this.env && this.env.grass && this.env.grass.setDensityFactor) {
      const densityFactor = biome.palette.grassDensityFactor !== undefined ? biome.palette.grassDensityFactor : 1.0;
      this.env.grass.setDensityFactor(densityFactor);
    }
    if (this.env && this.env.grass && this.env.grass.setScale) {
      const scale = biome.palette.grassScale !== undefined ? biome.palette.grassScale : 0.50;
      this.env.grass.setScale(scale);
    }
    if (biome.palette.grassAO !== undefined) {
      if (this.env && this.env.grass && this.env.grass.setGrassAO) {
        this.env.grass.setGrassAO(biome.palette.grassAO);
      }
      if (this.env && this.env.ground && this.env.ground.setGrassAO) {
        this.env.ground.setGrassAO(biome.palette.grassAO);
      }
    }

    // 5. Update Flowers Visibility (hidden in desert/savannah)
    if (this.env && this.env.flowers && this.env.flowers.setVisible) {
      const showFlowers = biome.palette.showFlowers !== undefined ? biome.palette.showFlowers : true;
      this.env.flowers.setVisible(showFlowers);
    }

    // 5b. Update Flowers Tint Color (white in forest, original in other biomes)
    if (this.env && this.env.flowers && this.env.flowers.setTint) {
      const tintColor = biome.palette.flowerTint !== undefined ? biome.palette.flowerTint : 0xffffff;
      const tintStrength = biome.palette.flowerTintStrength !== undefined ? biome.palette.flowerTintStrength : 0.0;
      this.env.flowers.setTint(tintColor, tintStrength);
    }

    // 6. Update Trees Foliage Materials & Visibility
    if (this.env && this.env.trees) {
      if (this.env.trees.group) {
        this.env.trees.group.visible = (biome.id !== 'savannah');
      }
      if (this.env.trees.setLeafless) {
        this.env.trees.setLeafless(biome.palette.treeLeafless === true);
      }
      if (this.env.trees.setTrunkColor) {
        this.env.trees.setTrunkColor(biome.palette.treeTrunkColor || null);
      }
      if (this.env.trees.setSnowAmount) {
        this.env.trees.setSnowAmount(biome.palette.treeSnow !== undefined ? biome.palette.treeSnow : 0.0);
      }
      if (this.env.trees.setDualTone) {
        const dualToneAmount = biome.palette.treeDualTone !== undefined ? biome.palette.treeDualTone : 0.0;
        this.env.trees.setDualTone(dualToneAmount, biome.palette.treeCanopyBase, biome.palette.treeCanopyShadow);
      }
      if (this.env.trees.foliageMaterials) {
        this.env.trees.foliageMaterials.forEach((mat) => {
          if (!mat.userData || !mat.userData.isCustomCanopy) {
            mat.color.set(biome.palette.treeCanopy);
            mat.needsUpdate = true;
          }
        });
      }
    }

    // 6b. Update Ground Foliage & Tree Vines Visibility (enabled in forest, hidden in savannah)
    if (this.env && this.env.groundFoliage) {
      this.env.groundFoliage.setVisible(biome.id === 'forest');
    }
    if (this.env && this.env.treeVines) {
      this.env.treeVines.setVisible(biome.id === 'forest');
    }

    // 7. Update Ground Color Override & Soil Tints
    if (this.env && this.env.ground) {
      if (biome.palette.groundColorOverride) {
        this.env.ground.setGroundColorOverride(
          biome.palette.groundColorOverride,
          true,
          biome.palette.groundColorSecondary || null
        );
      } else {
        this.env.ground.setGroundColorOverride(null, false);
      }
      // 7b. Update Path/Road Color Override
      if (biome.palette.pathColorOverride) {
        this.env.ground.setPathColorOverride(biome.palette.pathColorOverride, true);
      } else {
        this.env.ground.setPathColorOverride(null, false);
      }
      if (this.env.ground.uniforms && this.env.ground.uniforms.uSoilTint) {
        this.env.ground.uniforms.uSoilTint.value.set(...biome.palette.groundSoilTint);
      }
    }

    // 7c. Update Road / Path Visibility (e.g. disabled in Savannah for pure sand terrain)
    const hasRoad = (biome.palette && biome.palette.hasRoad !== undefined) ? biome.palette.hasRoad : true;
    if (this.env && typeof this.env.setRoadActive === 'function') {
      this.env.setRoadActive(hasRoad);
    } else {
      if (this.env && this.env.ground && typeof this.env.ground.setRoadActive === 'function') {
        this.env.ground.setRoadActive(hasRoad);
      }
      if (this.env && this.env.grass && typeof this.env.grass.setRoadActive === 'function') {
        this.env.grass.setRoadActive(hasRoad);
      }
    }

    // 8. Update Biome-Specific 3D Decorations (Cacti, desert trees, rocks)
    if (this.decorationManager) {
      this.decorationManager.setBiome(biome.id, gx, gy);
    }

    // 9. Update Magical Skybox Theme
    if (this.skybox) {
      this.skybox.setBiome(biome.id);
    }

    // 10. Update Environmental Zone Particles (Leaves, Sand, Snow, Fireflies, Mist)
    if (this.particleManager) {
      this.particleManager.setBiome(biome.id);
    }

    return biome;
  }
}
