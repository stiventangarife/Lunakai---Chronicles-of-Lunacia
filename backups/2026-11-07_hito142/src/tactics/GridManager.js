// GridManager.js - Tactical Isometric Grid, Pathfinding (A*), Line of Sight, and Highlighting
import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';
import { GridRules, TILE_SIZE, GRID_WIDTH, GRID_HEIGHT } from './GridRules.js'; // Arena PvP P0: reglas sin gráficos
import { access } from '../ui/AccessPrefs.js';

export { TILE_SIZE, GRID_WIDTH, GRID_HEIGHT };

export class GridManager extends GridRules {
  constructor(scene) {
    super(); // ancho, alto, casillas y layout (GridRules)
    this.scene = scene;
    this.tileMeshes = [];
    this.gridGroup = new THREE.Group();
    this.scene.add(this.gridGroup);

    this.highlightGroup = new THREE.Group();
    this.scene.add(this.highlightGroup);
    // Hito 85: colores (modo daltonismo) y dibujo de las casillas (alto contraste) según Opciones
    access.onChange(() => this.applyAccess());

    this.highlightMeshes = new Map();
    this.obstacleGroup = new THREE.Group();
    this.scene.add(this.obstacleGroup);

    // Hito 35: el 10×10 de siempre (tutorial y niveles de la campaña) vive en su propio grupo;
    // los mapas de bioma (loadLayout) lo ocultan y dibujan su tablero en BattleArena.
    this.legacyTilesGroup = new THREE.Group();
    this.legacyTilesGroup.name = 'LegacyTiles';
    this.gridGroup.add(this.legacyTilesGroup);

    this._createVisualTiles();
  }


  /**
   * Hito 35 — Carga un mapa de bioma (src/tactics/maps/BattleMaps.js): cambia el tamaño y la forma
   * del tablero y pone sus obstáculos fijos. Solo lógica: el aspecto lo dibuja BattleArena.
   * Las casillas que no existen devuelven false en isValidCoord, así que movimiento, alcance, áreas,
   * empujes (chocan como contra un muro) e IA funcionan sin cambios.
   */
  loadLayout(map, obstacleTypes = {}) {
    this.clearObstacles();
    this.clearHighlights();
    this.layout = map;
    this.currentBiomeId = map.biome;
    this.width = map.width;
    this.height = map.height;
    this._initGrid(map);
    this.legacyTilesGroup.visible = false;
    for (const o of map.obstacles) {
      // Sin malla propia: BattleArena dibuja el árbol, la roca o el cristal de esa casilla
      this.setObstacle(o.x, o.z, obstacleTypes[o.slot] || o.slot, { visual: false, permanent: true });
    }
  }

  /** Vuelve al 10×10 de siempre (tutorial, niveles antiguos). No hace nada si ya está activo. */
  useLegacyLayout() {
    if (!this.layout) return;
    this.clearObstacles();
    this.clearHighlights();
    this.layout = null;
    this.width = GRID_WIDTH;
    this.height = GRID_HEIGHT;
    this._initGrid();
    this.legacyTilesGroup.visible = true;
  }

  /** Extensión del tablero en el mundo (para la cámara, las sombras y el escenario). */
  getBoardExtents() {
    return {
      halfW: (this.width * TILE_SIZE) / 2,
      halfD: (this.height * TILE_SIZE) / 2,
      tileSize: TILE_SIZE,
    };
  }

  _createVisualTiles() {
    const tileGeo = new THREE.BoxGeometry(TILE_SIZE * 0.94, 0.25, TILE_SIZE * 0.94);
    
    this.grassTextureLight = TextureGenerator.createGrassTexture(false);
    this.grassTextureDark = TextureGenerator.createGrassTexture(true);

    const matLight = new THREE.MeshStandardMaterial({
      map: this.grassTextureLight,
      roughness: 0.74,
      metalness: 0.04,
    });
    const matDark = new THREE.MeshStandardMaterial({
      map: this.grassTextureDark,
      roughness: 0.78,
      metalness: 0.04,
    });

    this.tileMeshes = [];
    for (let x = 0; x < this.width; x++) {
      this.tileMeshes[x] = [];
      for (let z = 0; z < this.height; z++) {
        const isDark = (x + z) % 2 === 1;
        const mat = isDark ? matDark.clone() : matLight.clone();
        const mesh = new THREE.Mesh(tileGeo, mat);
        const worldPos = this.gridToWorld(x, z);
        mesh.position.set(worldPos.x, -0.125, worldPos.z);
        mesh.receiveShadow = true;
        mesh.userData = { gridX: x, gridZ: z, isTile: true };
        this.legacyTilesGroup.add(mesh);
        this.tileMeshes[x][z] = mesh;

        const edges = new THREE.EdgesGeometry(tileGeo);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0x24461f, transparent: true, opacity: 0.28 })
        );
        mesh.add(line);
      }
    }
  }

  clearObstacles() {
    // 1. Cleanly dispose and remove all meshes in obstacleGroup
    while (this.obstacleGroup.children.length > 0) {
      const obj = this.obstacleGroup.children[0];
      this.obstacleGroup.remove(obj);
      if (obj.traverse) {
        obj.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        });
      }
    }

    // 2. Reset all grid tile obstacle state
    for (let x = 0; x < this.width; x++) {
      for (let z = 0; z < this.height; z++) {
        const tile = this.tiles[x][z];
        tile.obstacle = null;
        tile.obstacleMesh = null;
        tile.walkable = tile.baseWalkable !== false;
      }
    }
  }

  setupBiome(biomeId = 'lunacia_plains', customObstacles = null) {
    this.useLegacyLayout(); // Hito 35: el tutorial y la campaña antigua siguen en el 10×10
    this.currentBiomeId = biomeId;
    this.clearObstacles();

    // Ensure material caches
    if (!this.biomeMaterials) {
      this.biomeMaterials = {
        grassLight: new THREE.MeshStandardMaterial({ map: TextureGenerator.createGrassTexture(false), roughness: 0.74, metalness: 0.04 }),
        grassDark: new THREE.MeshStandardMaterial({ map: TextureGenerator.createGrassTexture(true), roughness: 0.78, metalness: 0.04 }),
        woodLight: new THREE.MeshStandardMaterial({ map: TextureGenerator.createWoodPlanksTexture(false), roughness: 0.70, metalness: 0.05 }),
        woodDark: new THREE.MeshStandardMaterial({ map: TextureGenerator.createWoodPlanksTexture(true), roughness: 0.75, metalness: 0.05 }),
        cobbleLight: new THREE.MeshStandardMaterial({ map: TextureGenerator.createCobblestoneTexture(false), roughness: 0.80, metalness: 0.1 }),
        cobbleDark: new THREE.MeshStandardMaterial({ map: TextureGenerator.createCobblestoneTexture(true), roughness: 0.85, metalness: 0.1 }),
        dirtLight: new THREE.MeshStandardMaterial({ map: TextureGenerator.createDirtTexture(false), roughness: 0.88, metalness: 0.02 }),
        dirtDark: new THREE.MeshStandardMaterial({ map: TextureGenerator.createDirtTexture(true), roughness: 0.90, metalness: 0.02 }),
        iceLight: new THREE.MeshStandardMaterial({ map: TextureGenerator.createIceTexture(false), roughness: 0.15, metalness: 0.15, transparent: true, opacity: 0.92 }),
        iceDark: new THREE.MeshStandardMaterial({ map: TextureGenerator.createIceTexture(true), roughness: 0.18, metalness: 0.15, transparent: true, opacity: 0.92 }),
        rockLight: new THREE.MeshStandardMaterial({ map: TextureGenerator.createRockTileTexture(false), roughness: 0.85, metalness: 0.05 }),
        rockDark: new THREE.MeshStandardMaterial({ map: TextureGenerator.createRockTileTexture(true), roughness: 0.88, metalness: 0.05 }),
        waterLight: new THREE.MeshStandardMaterial({ map: TextureGenerator.createWaterTexture(false), roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }),
        waterDark: new THREE.MeshStandardMaterial({ map: TextureGenerator.createWaterTexture(true), roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }),
      };
    }

    const mats = this.biomeMaterials;

    // Apply layout textures
    for (let x = 0; x < this.width; x++) {
      for (let z = 0; z < this.height; z++) {
        const isDark = (x + z) % 2 === 1;
        const mesh = this.tileMeshes[x][z];

        if (biomeId === 'training_dojo') {
          // Inner 6x6 dojo wood floor, surrounded by lush grass
          if (x >= 2 && x <= 7 && z >= 2 && z <= 7) {
            mesh.material = isDark ? mats.woodDark : mats.woodLight;
          } else {
            mesh.material = isDark ? mats.grassDark : mats.grassLight;
          }
        } else if (biomeId === 'frozen_peaks') {
          // Center frozen lake, surrounded by slate rock tiles
          if (x >= 3 && x <= 6 && z >= 3 && z <= 6) {
            mesh.material = isDark ? mats.iceDark : mats.iceLight;
          } else {
            mesh.material = isDark ? mats.rockDark : mats.rockLight;
          }
        } else if (biomeId === 'mystic_grove') {
          // Lush forest with sparkling water stream
          if (x === 4 || z === 5) {
            mesh.material = isDark ? mats.waterDark : mats.waterLight;
          } else {
            mesh.material = isDark ? mats.grassDark : mats.grassLight;
          }
        } else if (biomeId === 'canyon_rock') {
          // Arid canyon: packed dirt paths with rugged slate rock borders
          if (x >= 2 && x <= 7 && z >= 2 && z <= 7) {
            mesh.material = isDark ? mats.dirtDark : mats.dirtLight;
          } else {
            mesh.material = isDark ? mats.rockDark : mats.rockLight;
          }
        } else if (biomeId === 'boss_arena') {
          // Ceremonial boss arena: dark cobblestone with obsidian rock perimeter
          if (x >= 3 && x <= 6 && z >= 3 && z <= 6) {
            mesh.material = isDark ? mats.cobbleDark : mats.cobbleLight;
          } else if (x >= 1 && x <= 8 && z >= 1 && z <= 8) {
            mesh.material = isDark ? mats.rockDark : mats.rockLight;
          } else {
            mesh.material = isDark ? mats.cobbleDark : mats.cobbleLight;
          }
        } else {
          // lunacia_plains: Lush meadow with cobblestone crossway
          if (x === 4 || x === 5 || z === 4 || z === 5) {
            mesh.material = isDark ? mats.cobbleDark : mats.cobbleLight;
          } else {
            mesh.material = isDark ? mats.grassDark : mats.grassLight;
          }
        }
      }
    }

    // If custom obstacles are provided by level or dynamic encounter, use ONLY those!
    // Never mix default obstacles with custom obstacles.
    if (Array.isArray(customObstacles)) {
      customObstacles.forEach(obs => this.setObstacle(obs.x, obs.z, obs.type));
      return;
    }

    // Default obstacles (only as fallback when no custom obstacles specified)
    if (biomeId === 'training_dojo') {
      const dojoObs = [
        { x: 2, z: 6, type: 'wood_post' },
        { x: 6, z: 6, type: 'wood_post' }
      ];
      dojoObs.forEach(obs => this.setObstacle(obs.x, obs.z, obs.type));
    } else if (biomeId === 'frozen_peaks') {
      const iceObs = [
        { x: 4, z: 4, type: 'ice_crystal' },
        { x: 5, z: 5, type: 'ice_crystal' }
      ];
      iceObs.forEach(obs => this.setObstacle(obs.x, obs.z, obs.type));
    } else if (biomeId === 'mystic_grove') {
      const groveObs = [
        { x: 3, z: 3, type: 'wood_post' },
        { x: 6, z: 6, type: 'rock' }
      ];
      groveObs.forEach(obs => this.setObstacle(obs.x, obs.z, obs.type));
    } else if (biomeId === 'canyon_rock') {
      const canyonObs = [
        { x: 5, z: 4, type: 'pillar_rock' },
        { x: 4, z: 5, type: 'rock' }
      ];
      canyonObs.forEach(obs => this.setObstacle(obs.x, obs.z, obs.type));
    } else if (biomeId === 'boss_arena') {
      const bossObs = [
        { x: 4, z: 3, type: 'pillar_rock' },
        { x: 4, z: 6, type: 'pillar_rock' }
      ];
      bossObs.forEach(obs => this.setObstacle(obs.x, obs.z, obs.type));
    } else {
      // Standard lunacia_plains obstacles
      const plainsObs = [
        { x: 5, z: 4, type: 'pillar_rock' },
        { x: 4, z: 6, type: 'pillar_rock' }
      ];
      plainsObs.forEach(obs => this.setObstacle(obs.x, obs.z, obs.type));
    }
  }

  setObstacle(gx, gz, type = 'pillar', opts = {}) {
    if (!this.isValidCoord(gx, gz)) return;
    const tile = this.tiles[gx][gz];

    // If an obstacle already exists on this tile, remove and dispose its mesh first
    if (tile.obstacleMesh) {
      this.obstacleGroup.remove(tile.obstacleMesh);
      if (tile.obstacleMesh.traverse) {
        tile.obstacleMesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        });
      }
      tile.obstacleMesh = null;
    }

    tile.walkable = false;
    tile.obstacle = opts.permanent ? { type, permanent: true } : { type };
    if (opts.visual === false) return; // Hito 35: obstáculo de mapa, lo dibuja BattleArena

    const worldPos = this.gridToWorld(gx, gz);
    let mesh;

    if (type === 'wood_post') {
      const group = new THREE.Group();
      const geo = new THREE.CylinderGeometry(0.28, 0.32, 1.4, 8);
      if (!this.woodPostTexture) {
        this.woodPostTexture = TextureGenerator.createWoodPlanksTexture(false);
      }
      const mat = new THREE.MeshStandardMaterial({
        map: this.woodPostTexture,
        roughness: 0.8,
        metalness: 0.05
      });
      const post = new THREE.Mesh(geo, mat);
      post.position.y = 0.7;
      post.castShadow = true;
      post.receiveShadow = true;
      group.add(post);

      const armGeo = new THREE.BoxGeometry(1.0, 0.2, 0.2);
      const arm = new THREE.Mesh(armGeo, mat);
      arm.position.y = 1.0;
      arm.castShadow = true;
      group.add(arm);

      const targetSack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.6, 8),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 })
      );
      targetSack.position.y = 0.7;
      group.add(targetSack);

      group.position.set(worldPos.x, 0, worldPos.z);
      this.obstacleGroup.add(group);
      mesh = group;
    } else if (type === 'pillar' || type === 'pillar_rock') {
      const group = new THREE.Group();
      const geo = new THREE.CylinderGeometry(0.45, 0.55, 1.6, 8);
      if (!this.pillarTexture) {
        this.pillarTexture = TextureGenerator.createPillarTexture();
      }
      const mat = new THREE.MeshStandardMaterial({
        map: this.pillarTexture,
        roughness: 0.65,
        metalness: 0.1
      });
      const pillar = new THREE.Mesh(geo, mat);
      pillar.position.y = 0.8;
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      group.add(pillar);

      const ringGeo = new THREE.TorusGeometry(0.46, 0.05, 8, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.9;
      group.add(ring);

      group.position.set(worldPos.x, 0, worldPos.z);
      this.obstacleGroup.add(group);
      mesh = group;
    } else if (type === 'crystal' || type === 'ice_crystal') {
      const group = new THREE.Group();
      const geo = new THREE.ConeGeometry(0.4, 1.4, 5);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9, // Glowing azure mana crystal
        emissive: 0x38bdf8,
        emissiveIntensity: 0.8,
        roughness: 0.15,
        metalness: 0.2
      });
      const crystal = new THREE.Mesh(geo, mat);
      crystal.position.y = 0.7;
      crystal.castShadow = true;
      group.add(crystal);

      const smallGeo = new THREE.ConeGeometry(0.2, 0.8, 5);
      const c2 = new THREE.Mesh(smallGeo, mat);
      c2.position.set(0.3, 0.4, 0.2);
      c2.rotation.z = -0.3;
      group.add(c2);

      group.position.set(worldPos.x, 0, worldPos.z);
      this.obstacleGroup.add(group);
      mesh = group;
    } else {
      const geo = new THREE.DodecahedronGeometry(0.65, 1);
      if (!this.rockTexture) {
        this.rockTexture = TextureGenerator.createRockTexture();
      }
      const mat = new THREE.MeshStandardMaterial({
        map: this.rockTexture,
        roughness: 0.85,
        metalness: 0.05,
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(1, 0.85, 1.1);
      mesh.position.set(worldPos.x, 0.5, worldPos.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.obstacleGroup.add(mesh);
    }

    tile.obstacleMesh = mesh;
  }

  /** Quita el obstáculo de una casilla (invocaciones temporales que caducan). */
  removeObstacle(gx, gz) {
    if (!this.isValidCoord(gx, gz)) return;
    const tile = this.tiles[gx][gz];
    if (tile.obstacle && tile.obstacle.permanent) return; // Hito 35: los árboles y rocas del mapa no se quitan
    if (tile.obstacleMesh) {
      this.obstacleGroup.remove(tile.obstacleMesh);
      if (tile.obstacleMesh.traverse) {
        tile.obstacleMesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else if (child.material.map !== this.woodPostTexture) child.material.dispose();
          }
        });
      }
    }
    tile.obstacleMesh = null;
    tile.obstacle = null;
    tile.walkable = tile.baseWalkable !== false;
  }

  spawnImpactDecal(worldPos, type = 'scorch') {
    // La textura de cada tipo y la geometría se crean una sola vez y se comparten: antes cada impacto
    // pintaba un lienzo nuevo y lo subía a la GPU. Cada marca sigue teniendo su propio material (su
    // propia opacidad al desvanecerse).
    const D = (GridManager._decal ||= { geo: new THREE.PlaneGeometry(1.3, 1.3), tex: new Map() });
    const geo = D.geo;
    let texture = D.tex.get(type);
    if (!texture) { texture = GridManager._decalTexture(type); D.tex.set(type, texture); }
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const decal = new THREE.Mesh(geo, mat);
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(worldPos.x, 0.012, worldPos.z);
    this.gridGroup.add(decal);

    const startTime = performance.now();
    const duration = 4000;
    const fadeInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;
      if (progress >= 1.0) {
        clearInterval(fadeInterval);
        this.gridGroup.remove(decal);
        decal.material.dispose(); // la geometría y la textura son compartidas: no se destruyen
      } else {
        decal.material.opacity = (1.0 - progress) * 0.75;
      }
    }, 60);
  }

  /**
   * Marcas de impacto para el precalentado del combate (main._prewarmBattle): una por tipo, con el mismo
   * material que spawnImpactDecal (mapa, transparente, DoubleSide). Así su shader y sus texturas se preparan
   * detrás del velo y no en el primer golpe que deja marca (p. ej. los choques del empuje de la Ultimate).
   */
  static decalWarmGroup() {
    const D = (GridManager._decal ||= { geo: new THREE.PlaneGeometry(1.3, 1.3), tex: new Map() });
    const g = new THREE.Group();
    g.name = 'impact_decal_warmup';
    const mats = [];
    for (const type of ['scorch', 'ice', 'poison', 'nature', 'arcane', 'crater']) {
      let texture = D.tex.get(type);
      if (!texture) { texture = GridManager._decalTexture(type); D.tex.set(type, texture); }
      const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide });
      mats.push(mat);
      g.add(new THREE.Mesh(D.geo, mat));
    }
    g.position.set(0, -60, 0);
    g.userData.release = () => { for (const m of mats) m.dispose(); };
    return g;
  }

  /** Lienzo con el degradado de cada tipo de marca (el mismo dibujo de siempre). */
  static _decalTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    if (type === 'ice') {
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
      grad.addColorStop(0.5, 'rgba(14, 165, 233, 0.45)');
    } else if (type === 'poison') {
      grad.addColorStop(0, 'rgba(132, 204, 22, 0.85)');
      grad.addColorStop(0.5, 'rgba(74, 222, 128, 0.45)');
    } else if (type === 'nature') {
      grad.addColorStop(0, 'rgba(34, 197, 94, 0.85)');
      grad.addColorStop(0.5, 'rgba(21, 128, 61, 0.45)');
    } else if (type === 'arcane') {
      grad.addColorStop(0, 'rgba(168, 85, 247, 0.85)');
      grad.addColorStop(0.5, 'rgba(126, 34, 206, 0.45)');
    } else if (type === 'crater') {
      grad.addColorStop(0, 'rgba(30, 41, 59, 0.9)');
      grad.addColorStop(0.5, 'rgba(71, 85, 105, 0.5)');
    } else { // scorch
      grad.addColorStop(0, 'rgba(25, 18, 14, 0.9)');
      grad.addColorStop(0.5, 'rgba(180, 50, 20, 0.5)');
    }
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    return new THREE.CanvasTexture(canvas);
  }












  /** Centro de la casilla en el mundo (THREE.Vector3; GridRules devuelve un objeto sencillo con las mismas x, y, z). */
  gridToWorld(gx, gz) {
    const halfW = (this.width * TILE_SIZE) / 2;
    const halfH = (this.height * TILE_SIZE) / 2;
    return new THREE.Vector3(
      (gx + 0.5) * TILE_SIZE - halfW,
      0,
      (gz + 0.5) * TILE_SIZE - halfH
    );
  }

  // ── Casillas resaltadas (Hito 65) ─────────────────────────────────────────────────────────
  // Una baldosa con relleno suave y borde nítido (textura de canvas creada una vez) y UNA malla instanciada
  // por capa: cada capa se dibuja en una sola llamada, se vean 5 casillas o 80. Nada se crea ni se destruye
  // al mover el ratón: solo se rellenan matrices y se cambia el número de instancias.
  //   reach   alcance de movimiento (azul)          path   camino elegido (puntos verdes)
  //   spell   alcance de la habilidad (rojo)        hover  casilla bajo el cursor (color por llamada)
  //   blocked a tiro pero sin línea de visión (apagado)
  //   target  objetivo válido: donde el clic lanza (rojo intenso con pulso)
  //   aoe     área de efecto (naranja)
  static HL_STYLE = {
    reach:   { color: 0x2f7dff, opacity: 1.00, y: 0.020, order: 2, size: 0.94 },
    blocked: { color: 0x6b5a66, opacity: 0.55, y: 0.021, order: 2, size: 0.94 },
    spell:   { color: 0xff1f3d, opacity: 0.95, y: 0.022, order: 3, size: 0.94 },
    target:  { color: 0xff2020, opacity: 1.00, y: 0.026, order: 4, size: 0.94 },
    aoe:     { color: 0xff9a1f, opacity: 0.95, y: 0.032, order: 5, size: 0.96 },
    hover:   { color: 0xffffff, opacity: 1.00, y: 0.036, order: 6, size: 0.98 },
    path:    { color: 0x39e75f, opacity: 1.00, y: 0.040, order: 7 }
  };

  /**
   * Textura de la baldosa: relleno translúcido + borde opaco con un brillo interior (blanco, se tiñe con el color).
   * Hito 85 (alto contraste): además del color, un dibujo por capa → 'dots' movimiento, 'stripes' alcance y
   * objetivos, 'cross' área. Una textura por dibujo, creada una vez y compartida.
   */
  static _tileTexture(pattern = 'plain') {
    GridManager._tileTexs = GridManager._tileTexs || {};
    if (GridManager._tileTexs[pattern]) return GridManager._tileTexs[pattern];
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d');
    const rr = (p, r) => { x.beginPath(); x.moveTo(p + r, p); x.arcTo(N - p, p, N - p, N - p, r); x.arcTo(N - p, N - p, p, N - p, r); x.arcTo(p, N - p, p, p, r); x.arcTo(p, p, N - p, p, r); x.closePath(); };
    const plain = pattern === 'plain';
    rr(6, 16); x.fillStyle = `rgba(255,255,255,${plain ? 0.42 : 0.30})`; x.fill();    // relleno
    const g = x.createRadialGradient(N / 2, N / 2, N * 0.18, N / 2, N / 2, N * 0.62); // brillo hacia el borde
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(255,255,255,${plain ? 0.35 : 0.2})`);
    rr(6, 16); x.fillStyle = g; x.fill();
    if (!plain) {
      x.save(); rr(10, 12); x.clip();
      x.fillStyle = x.strokeStyle = 'rgba(255,255,255,0.95)';
      if (pattern === 'dots') {
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(22 + i * 28, 22 + j * 28, 6, 0, Math.PI * 2); x.fill(); }
      } else {
        x.lineWidth = 7;
        const lines = (dir) => { for (let k = -N; k <= 2 * N; k += 26) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + dir * N, N); x.stroke(); } };
        lines(1);
        if (pattern === 'cross') lines(-1);
      }
      x.restore();
    }
    rr(8, 14); x.lineWidth = plain ? 7 : 9; x.strokeStyle = 'rgba(255,255,255,1)'; x.stroke(); // borde nítido
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true;
    GridManager._tileTexs[pattern] = t;
    if (plain) GridManager._tileTex = t;
    return t;
  }

  /** Hito 85: color de cada capa (modo daltonismo) y su dibujo (alto contraste). Solo cambia color y textura: sin recompilar. */
  applyAccess() {
    const r = this._hlRes;
    if (!r) return;
    const pal = access.palette, hc = access.contrast;
    const PATTERN = { reach: 'dots', spell: 'stripes', target: 'stripes', aoe: 'cross' };
    for (const k in r.layers) {
      const mat = r.layers[k].material;
      if (pal[k] !== undefined) mat.color.setHex(pal[k]);
      if (k !== 'path' && mat.map) mat.map = GridManager._tileTexture(hc && PATTERN[k] ? PATTERN[k] : 'plain');
    }
  }

  _hl() {
    const cap = Math.max(100, this.width * this.height);
    if (this._hlRes && this._hlRes.cap >= cap) return this._hlRes;
    if (this._hlRes) { for (const k in this._hlRes.layers) this.highlightGroup.remove(this._hlRes.layers[k]); } // tablero más grande: se rehacen
    const S = GridManager.HL_STYLE, tex = GridManager._tileTexture();
    const layers = {};
    for (const k of ['reach', 'blocked', 'spell', 'target', 'aoe', 'hover', 'path']) {
      const st = S[k];
      let geo, mat;
      if (k === 'path') {
        geo = new THREE.CylinderGeometry(0.16, 0.16, 0.06, 16);
        mat = new THREE.MeshBasicMaterial({ color: st.color, toneMapped: false });
      } else {
        geo = new THREE.PlaneGeometry(TILE_SIZE * st.size, TILE_SIZE * st.size); geo.rotateX(-Math.PI / 2);
        mat = new THREE.MeshBasicMaterial({ map: tex, color: st.color, transparent: true, opacity: st.opacity, depthWrite: false, toneMapped: false,
          polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      }
      mat.name = `GridHL_${k}`;
      const m = new THREE.InstancedMesh(geo, mat, k === 'hover' ? 4 : cap);
      m.name = `GridHL_${k}`; m.count = 0; m.renderOrder = st.order; m.frustumCulled = false;
      if (k === 'hover') m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(4 * 3), 3);
      this.highlightGroup.add(m);
      layers[k] = m;
    }
    this._hlRes = { cap, layers, m4: new THREE.Matrix4(), col: new THREE.Color() };
    this.applyAccess();
    return this._hlRes;
  }

  /** Añade una instancia a la capa `kind` en la casilla (gx, gz). */
  _hlAdd(kind, gx, gz, color = null) {
    const r = this._hl(), m = r.layers[kind];
    if (m.count >= m.instanceMatrix.count) return;
    const w = this.gridToWorld(gx, gz);
    r.m4.makeTranslation(w.x, GridManager.HL_STYLE[kind].y, w.z);
    m.setMatrixAt(m.count, r.m4);
    if (color !== null && m.instanceColor) { r.col.setHex(color); m.setColorAt(m.count, r.col); m.instanceColor.needsUpdate = true; }
    m.count++;
    m.instanceMatrix.needsUpdate = true;
  }

  clearHighlights() {
    this.highlightVersion = (this.highlightVersion || 0) + 1;
    const r = this._hlRes;
    if (r) for (const k in r.layers) r.layers[k].count = 0;
    this.highlightMeshes.clear();
  }

  highlightReachable(cells) {
    this.highlightVersion = (this.highlightVersion || 0) + 1;
    cells.forEach(c => { this._hlAdd('reach', c.x, c.z); this.highlightMeshes.set(c.x + ',' + c.z, true); });
  }

  /** Alcance de la habilidad: todas las casillas a tiro, haya o no unidades (estilo Dofus). */
  highlightSpellRange(cells) {
    this.highlightVersion = (this.highlightVersion || 0) + 1;
    cells.forEach(c => { this._hlAdd('spell', c.x, c.z); this.highlightMeshes.set('spell_' + c.x + ',' + c.z, true); });
  }

  /** Dentro de la distancia pero tapadas por un obstáculo (sin línea de visión). */
  highlightSpellBlocked(cells) {
    this.highlightVersion = (this.highlightVersion || 0) + 1;
    cells.forEach(c => this._hlAdd('blocked', c.x, c.z));
  }

  /** Objetivos válidos: donde un clic lanza la habilidad (rojo intenso, con pulso). */
  highlightSpellTargets(cells) {
    this.highlightVersion = (this.highlightVersion || 0) + 1;
    cells.forEach(c => this._hlAdd('target', c.x, c.z));
  }

  highlightAoE(cells) {
    this.highlightVersion = (this.highlightVersion || 0) + 1;
    cells.forEach(c => { if (this.isValidCoord(c.x, c.z)) this._hlAdd('aoe', c.x, c.z); });
  }

  highlightHover(gx, gz, color = 0xffffff) {
    if (!this.isValidCoord(gx, gz)) return;
    this.highlightVersion = (this.highlightVersion || 0) + 1;
    this._hlAdd('hover', gx, gz, color);
  }

  highlightPath(path) {
    if (!path || path.length <= 1) return;
    this.highlightVersion = (this.highlightVersion || 0) + 1;
    for (let i = 1; i < path.length; i++) this._hlAdd('path', path[i].x, path[i].z);
  }

  /** Pulso de los objetivos válidos y del camino (un valor por capa y fotograma; sin coste si no se ven). */
  tickHighlights(time) {
    const r = this._hlRes;
    if (!r) return;
    const t = r.layers.target, h = r.layers.hover;
    const pulse = access.reduceMotion ? 0 : 1; // Hito 85: sin pulso con «Reducir movimiento»
    if (t.count) t.material.opacity = 0.78 + Math.sin(time * 5.0) * 0.22 * pulse;
    if (h.count) h.material.opacity = 0.85 + Math.sin(time * 6.0) * 0.15 * pulse;
  }

}
