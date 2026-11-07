// GridRules.js — Reglas del tablero táctico sin gráficos (Arena PvP, fase P0).
//
// Casillas, ocupación, caminos (A*), casillas alcanzables y línea de visión. GridManager (con three.js) hereda de aquí
// y añade el dibujo (casillas, obstáculos, marcas, resaltados); el motor sin gráficos usa esta clase tal cual
// (árbitro, repeticiones, pruebas en Node). Mismas reglas en los dos: cualquier cambio de reglas va aquí.
//
// Lo que solo es estado (cargar un mapa, poner o quitar un obstáculo) tiene aquí su versión sin dibujo; GridManager
// la sustituye por la suya, que además crea y libera las mallas.

import { cellExists } from './maps/BattleMapLayout.js';

export const TILE_SIZE = 1.6;
export const GRID_WIDTH = 10;
export const GRID_HEIGHT = 10;

export class GridRules {
  constructor() {
    this.width = GRID_WIDTH;
    this.height = GRID_HEIGHT;
    this.tiles = [];
    this.layout = null;
    this._initGrid();
  }

  _initGrid(layout = null) {
    this.tiles = [];
    for (let x = 0; x < this.width; x++) {
      this.tiles[x] = [];
      for (let z = 0; z < this.height; z++) {
        const kind = layout ? layout.cells[x][z] : 'floor';
        const exists = layout ? cellExists(kind) : true;
        // Agua: existe (se puede apuntar a través de ella) pero no se pisa; los obstáculos del mapa se ponen aparte
        const baseWalkable = layout ? (exists && kind !== 'water') : true;
        this.tiles[x][z] = {
          x,
          z,
          walkable: baseWalkable,
          baseWalkable,
          exists,
          kind,
          obstacle: null,
          unit: null,
          height: 0,
        };
      }
    }
  }

  gridToWorld(gx, gz) {
    const halfW = (this.width * TILE_SIZE) / 2;
    const halfH = (this.height * TILE_SIZE) / 2;
    return {
      x: (gx + 0.5) * TILE_SIZE - halfW,
      y: 0,
      z: (gz + 0.5) * TILE_SIZE - halfH,
    };
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
    if (!(gx >= 0 && gx < this.width && gz >= 0 && gz < this.height)) return false;
    // Hito 35: en los mapas con forma, las casillas fuera del tablero no existen
    return !this.layout || this.tiles[gx][gz].exists !== false;
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
      // Hito 35: en los mapas con paredes (cañón, glaciar) el terreno fuera del tablero tapa la visión
      if (this.layout && this.layout.terrainRise && tile.kind === 'none') {
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

  // ---------------------------------------------- estado sin dibujo (GridManager tiene su versión con mallas)

  /** Mapa de bioma (BattleMaps): tamaño, forma y obstáculos fijos. */
  loadLayout(map, obstacleTypes = {}) {
    this.clearObstacles();
    this.layout = map;
    this.currentBiomeId = map.biome;
    this.width = map.width;
    this.height = map.height;
    this._initGrid(map);
    for (const o of map.obstacles) this.setObstacle(o.x, o.z, obstacleTypes[o.slot] || o.slot, { visual: false, permanent: true });
  }

  /** El 10×10 de siempre. */
  useLegacyLayout() {
    if (!this.layout) return;
    this.clearObstacles();
    this.layout = null;
    this.width = GRID_WIDTH;
    this.height = GRID_HEIGHT;
    this._initGrid();
  }

  clearObstacles() {
    for (let x = 0; x < this.width; x++) {
      for (let z = 0; z < this.height; z++) {
        const tile = this.tiles[x][z];
        tile.obstacle = null;
        tile.obstacleMesh = null;
        tile.walkable = tile.baseWalkable !== false;
      }
    }
  }

  setObstacle(gx, gz, type = 'pillar', opts = {}) {
    if (!this.isValidCoord(gx, gz)) return;
    const tile = this.tiles[gx][gz];
    tile.walkable = false;
    tile.obstacle = opts.permanent ? { type, permanent: true } : { type };
  }

  removeObstacle(gx, gz) {
    if (!this.isValidCoord(gx, gz)) return;
    const tile = this.tiles[gx][gz];
    if (tile.obstacle && tile.obstacle.permanent) return; // los árboles y rocas del mapa no se quitan
    tile.obstacleMesh = null;
    tile.obstacle = null;
    tile.walkable = tile.baseWalkable !== false;
  }

  // Sin dibujo
  clearHighlights() {}
  spawnImpactDecal() {}
}
