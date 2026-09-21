// GridManager.js - Tactical Isometric Grid, Pathfinding (A*), Line of Sight, and Highlighting
import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

export const TILE_SIZE = 1.6;
export const GRID_WIDTH = 10;
export const GRID_HEIGHT = 10;

export class GridManager {
  constructor(scene) {
    this.scene = scene;
    this.width = GRID_WIDTH;
    this.height = GRID_HEIGHT;
    this.tiles = [];
    this.tileMeshes = [];
    this.gridGroup = new THREE.Group();
    this.scene.add(this.gridGroup);

    this.highlightGroup = new THREE.Group();
    this.scene.add(this.highlightGroup);

    this.highlightMeshes = new Map();
    this.obstacleGroup = new THREE.Group();
    this.scene.add(this.obstacleGroup);

    this._initGrid();
    this._createVisualTiles();
  }

  _initGrid() {
    this.tiles = [];
    for (let x = 0; x < this.width; x++) {
      this.tiles[x] = [];
      for (let z = 0; z < this.height; z++) {
        this.tiles[x][z] = {
          x,
          z,
          walkable: true,
          obstacle: null,
          unit: null,
          height: 0,
        };
      }
    }
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
        this.gridGroup.add(mesh);
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
        tile.walkable = true;
      }
    }
  }

  setupBiome(biomeId = 'lunacia_plains', customObstacles = null) {
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

  setObstacle(gx, gz, type = 'pillar') {
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
    tile.obstacle = { type };

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

  spawnImpactDecal(worldPos, type = 'scorch') {
    const geo = new THREE.PlaneGeometry(1.3, 1.3);
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

    const texture = new THREE.CanvasTexture(canvas);
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
        decal.geometry.dispose();
        decal.material.dispose();
      } else {
        decal.material.opacity = (1.0 - progress) * 0.75;
      }
    }, 60);
  }

  gridToWorld(gx, gz) {
    const halfW = (this.width * TILE_SIZE) / 2;
    const halfH = (this.height * TILE_SIZE) / 2;
    return new THREE.Vector3(
      (gx + 0.5) * TILE_SIZE - halfW,
      0,
      (gz + 0.5) * TILE_SIZE - halfH
    );
  }

  worldToGrid(wx, wz) {
    const halfW = (this.width * TILE_SIZE) / 2;
    const halfH = (this.height * TILE_SIZE) / 2;
    const gx = Math.floor((wx + halfW) / TILE_SIZE);
    const gz = Math.floor((wz + halfH) / TILE_SIZE);
    if (this.isValidCoord(gx, gz)) {
      return { x: gx, z: gz };
    }
    return null;
  }

  isValidCoord(gx, gz) {
    return gx >= 0 && gx < this.width && gz >= 0 && gz < this.height;
  }

  getTile(gx, gz) {
    if (!this.isValidCoord(gx, gz)) return null;
    return this.tiles[gx][gz];
  }

  isCellTraversable(gx, gz, movingUnit = null) {
    if (!this.isValidCoord(gx, gz)) return false;
    const tile = this.tiles[gx][gz];
    if (!tile || !tile.walkable || tile.obstacle) return false;

    // Empty tile is always traversable
    if (!tile.unit) return true;

    // If unit on tile is the moving unit itself: traversable
    if (tile.unit === movingUnit) return true;

    // If unit on tile is a friendly ally of the moving unit: PASS-THROUGH IS ALLOWED!
    if (movingUnit && movingUnit.team && tile.unit.team === movingUnit.team) {
      return true;
    }

    // Enemies block traversal
    return false;
  }

  isCellDestinationValid(gx, gz, movingUnit = null) {
    if (!this.isCellTraversable(gx, gz, movingUnit)) return false;
    const tile = this.tiles[gx][gz];
    // Final destination cell CANNOT be occupied by another unit (neither ally nor enemy)
    if (tile.unit && tile.unit !== movingUnit) return false;
    return true;
  }

  isCellWalkable(gx, gz, ignoreUnitAt = null) {
    return this.isCellTraversable(gx, gz, ignoreUnitAt);
  }

  getDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
  }

  hasLineOfSight(from, to) {
    if (!this.isValidCoord(from.x, from.z) || !this.isValidCoord(to.x, to.z)) return false;
    let x0 = from.x;
    let z0 = from.z;
    const x1 = to.x;
    const z1 = to.z;

    const dx = Math.abs(x1 - x0);
    const dz = Math.abs(z1 - z0);
    const sx = x0 < x1 ? 1 : -1;
    const sz = z0 < z1 ? 1 : -1;
    let err = dx - dz;

    while (x0 !== x1 || z0 !== z1) {
      const e2 = 2 * err;
      if (e2 > -dz) {
        err -= dz;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        z0 += sz;
      }

      if (x0 === x1 && z0 === z1) break;

      const tile = this.tiles[x0][z0];
      if (tile.obstacle) {
        return false;
      }
    }
    return true;
  }

  getReachableCells(startCellOrX, maxPMOrZ, unitOrMaxPM = null, optionalUnit = null) {
    let startCell, maxPM, unit;
    if (typeof startCellOrX === 'object' && startCellOrX !== null) {
      startCell = startCellOrX;
      maxPM = maxPMOrZ;
      unit = unitOrMaxPM;
    } else {
      startCell = { x: startCellOrX, z: maxPMOrZ };
      maxPM = unitOrMaxPM;
      unit = optionalUnit;
    }

    const reachable = [];
    const visited = new Map();
    const queue = [{ x: startCell.x, z: startCell.z, cost: 0, path: [startCell] }];
    visited.set(startCell.x + ',' + startCell.z, 0);

    const neighbors = [
      { dx: 1, dz: 0 },
      { dx: -1, dz: 0 },
      { dx: 0, dz: 1 },
      { dx: 0, dz: -1 }
    ];

    while (queue.length > 0) {
      const current = queue.shift();

      // Only valid EMPTY destination cells can be reached as stopping positions
      // An ally's cell can be passed through, but cannot be an end destination!
      if (current.cost > 0 && this.isCellDestinationValid(current.x, current.z, unit)) {
        reachable.push({
          x: current.x,
          z: current.z,
          cost: current.cost,
          path: current.path
        });
      }

      if (current.cost < maxPM) {
        for (const n of neighbors) {
          const nx = current.x + n.dx;
          const nz = current.z + n.dz;
          // Intermediate cell must be traversable (empty ground or friendly ally)
          if (!this.isCellTraversable(nx, nz, unit)) continue;

          const nextCost = current.cost + 1;
          const key = nx + ',' + nz;
          if (!visited.has(key) || visited.get(key) > nextCost) {
            visited.set(key, nextCost);
            queue.push({
              x: nx,
              z: nz,
              cost: nextCost,
              path: [...current.path, { x: nx, z: nz }]
            });
          }
        }
      }
    }
    return reachable;
  }

  findPath(start, goal, maxPM = 999, unit = null) {
    if (start.x === goal.x && start.z === goal.z) return [start];
    // The goal MUST be a valid empty destination (cannot end on an ally or enemy)
    if (!this.isCellDestinationValid(goal.x, goal.z, unit)) return null;

    const openSet = [{ ...start, g: 0, h: this.getDistance(start, goal), f: this.getDistance(start, goal), parent: null }];
    const closedSet = new Set();

    const neighbors = [
      { dx: 1, dz: 0 },
      { dx: -1, dz: 0 },
      { dx: 0, dz: 1 },
      { dx: 0, dz: -1 }
    ];

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      const currentKey = current.x + ',' + current.z;

      if (current.x === goal.x && current.z === goal.z) {
        const path = [];
        let curr = current;
        while (curr) {
          path.unshift({ x: curr.x, z: curr.z });
          curr = curr.parent;
        }
        return path;
      }

      closedSet.add(currentKey);

      for (const n of neighbors) {
        const nx = current.x + n.dx;
        const nz = current.z + n.dz;
        const neighborKey = nx + ',' + nz;

        if (closedSet.has(neighborKey)) continue;
        // Intermediate cell must be traversable (empty ground or friendly ally)
        if (!this.isCellTraversable(nx, nz, unit)) continue;

        const gScore = current.g + 1;
        if (gScore > maxPM) continue;

        let existing = openSet.find(node => node.x === nx && node.z === nz);
        if (!existing) {
          const h = this.getDistance({ x: nx, z: nz }, goal);
          openSet.push({
            x: nx,
            z: nz,
            g: gScore,
            h,
            f: gScore + h,
            parent: current
          });
        } else if (gScore < existing.g) {
          existing.g = gScore;
          existing.f = gScore + existing.h;
          existing.parent = current;
        }
      }
    }
    return null;
  }

  clearHighlights() {
    while (this.highlightGroup.children.length > 0) {
      const child = this.highlightGroup.children[0];
      this.highlightGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    this.highlightMeshes.clear();
  }

  highlightReachable(cells) {
    const geo = new THREE.PlaneGeometry(TILE_SIZE * 0.9, TILE_SIZE * 0.9);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });

    cells.forEach(c => {
      const mesh = new THREE.Mesh(geo, mat);
      const wPos = this.gridToWorld(c.x, c.z);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(wPos.x, 0.02, wPos.z);
      this.highlightGroup.add(mesh);
      this.highlightMeshes.set(c.x + ',' + c.z, mesh);
    });
  }

  highlightSpellRange(cells) {
    const geo = new THREE.PlaneGeometry(TILE_SIZE * 0.9, TILE_SIZE * 0.9);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff4d4d,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide
    });

    cells.forEach(c => {
      const mesh = new THREE.Mesh(geo, mat);
      const wPos = this.gridToWorld(c.x, c.z);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(wPos.x, 0.025, wPos.z);
      this.highlightGroup.add(mesh);
      this.highlightMeshes.set('spell_' + c.x + ',' + c.z, mesh);
    });
  }

  highlightAoE(cells) {
    const geo = new THREE.PlaneGeometry(TILE_SIZE * 0.92, TILE_SIZE * 0.92);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });

    cells.forEach(c => {
      if (!this.isValidCoord(c.x, c.z)) return;
      const mesh = new THREE.Mesh(geo, mat);
      const wPos = this.gridToWorld(c.x, c.z);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(wPos.x, 0.035, wPos.z);
      this.highlightGroup.add(mesh);
    });
  }

  highlightHover(gx, gz, color = 0xffffff) {
    if (!this.isValidCoord(gx, gz)) return;
    const geo = new THREE.PlaneGeometry(TILE_SIZE * 0.94, TILE_SIZE * 0.94);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    const wPos = this.gridToWorld(gx, gz);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(wPos.x, 0.03, wPos.z);
    this.highlightGroup.add(mesh);
  }

  highlightPath(path) {
    if (!path || path.length <= 1) return;
    const geo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

    for (let i = 1; i < path.length; i++) {
      const step = path[i];
      const mesh = new THREE.Mesh(geo, mat);
      const wPos = this.gridToWorld(step.x, step.z);
      mesh.position.set(wPos.x, 0.04, wPos.z);
      this.highlightGroup.add(mesh);
    }
  }
}
