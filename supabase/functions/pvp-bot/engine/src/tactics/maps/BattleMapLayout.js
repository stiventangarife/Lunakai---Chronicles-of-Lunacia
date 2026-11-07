// BattleMapLayout.js - Parser de mapas de combate escritos como texto (Hito 35).
// Lógica pura: sin Three.js ni DOM, para que el validador de Node la use tal cual.
//
// Leyenda de casillas (una letra por casilla, filas de igual longitud; x = columna, z = fila):
//   .  suelo                       ,  suelo alternativo (sendero, arena, hielo, camino dorado)
//   =  puente (suelo de tablones)   P  salida del jugador (suelo)     E  salida del enemigo (suelo)
//   T  obstáculo: árbol             R  obstáculo: roca                 C  obstáculo: especial del bioma
//   w  agua: bloquea el paso, NO bloquea la línea de visión
//   #  sin casilla: terreno natural (decorado)
//   ~  sin casilla: grieta / vacío (no hay suelo debajo)

export const CELL = {
  FLOOR: 'floor',
  PATH: 'path',
  BRIDGE: 'bridge',
  WATER: 'water',
  OBSTACLE: 'obstacle',
  NONE: 'none',
  CHASM: 'chasm',
};

const OBSTACLE_SLOTS = { T: 'tree', R: 'rock', C: 'special' };

/**
 * Convierte la definición de un mapa en una disposición utilizable por GridManager.
 * @returns {{ id, width, height, cells: string[][], obstacles: {x,z,slot}[], spawns: {player, enemy}, walkableCount }}
 */
export function parseBattleMap(def) {
  const rows = def.layout;
  if (!Array.isArray(rows) || !rows.length) throw new Error(`[BattleMap] ${def.id}: layout vacío`);
  const height = rows.length;
  const width = rows[0].length;
  const cells = [];
  const obstacles = [];
  const player = [];
  const enemy = [];
  let walkableCount = 0;

  for (let x = 0; x < width; x++) cells[x] = [];

  rows.forEach((row, z) => {
    if (row.length !== width) throw new Error(`[BattleMap] ${def.id}: la fila ${z} mide ${row.length}, se esperaba ${width}`);
    for (let x = 0; x < width; x++) {
      const ch = row[x];
      let kind;
      switch (ch) {
        case '.': kind = CELL.FLOOR; break;
        case ',': kind = CELL.PATH; break;
        case '=': kind = CELL.BRIDGE; break;
        case 'P': kind = CELL.FLOOR; player.push({ x, z }); break;
        case 'E': kind = CELL.FLOOR; enemy.push({ x, z }); break;
        case 'w': kind = CELL.WATER; break;
        case '#': kind = CELL.NONE; break;
        case '~': kind = CELL.CHASM; break;
        case 'T': case 'R': case 'C':
          kind = CELL.OBSTACLE;
          obstacles.push({ x, z, slot: OBSTACLE_SLOTS[ch] });
          break;
        default:
          throw new Error(`[BattleMap] ${def.id}: carácter desconocido '${ch}' en (${x}, ${z})`);
      }
      cells[x][z] = kind;
      if (kind === CELL.FLOOR || kind === CELL.PATH || kind === CELL.BRIDGE) walkableCount++;
    }
  });

  return {
    id: def.id,
    width,
    height,
    cells,
    obstacles,
    spawns: { player: orderSpawns(player, enemy), enemy: orderSpawns(enemy, player) },
    walkableCount,
  };
}

/** Una casilla forma parte del tablero (se puede apuntar, empujar contra ella, etc.). */
export function cellExists(kind) {
  return kind !== CELL.NONE && kind !== CELL.CHASM && kind !== undefined;
}

export function cellWalkable(kind) {
  return kind === CELL.FLOOR || kind === CELL.PATH || kind === CELL.BRIDGE;
}

/**
 * Orden de las salidas: primero la más central del bando (ahí va el Sapidae o el líder de la manada)
 * y después por cercanía a esa primera. Es determinista.
 */
function orderSpawns(list, opposing) {
  if (!list.length) return [];
  const cx = list.reduce((s, c) => s + c.x, 0) / list.length;
  const cz = list.reduce((s, c) => s + c.z, 0) / list.length;
  // La más cercana al centro del bando; a igualdad, la más cercana al rival (va en cabeza)
  const ox = opposing.length ? opposing.reduce((s, c) => s + c.x, 0) / opposing.length : cx;
  const oz = opposing.length ? opposing.reduce((s, c) => s + c.z, 0) / opposing.length : cz;
  const score = (c) => Math.hypot(c.x - cx, c.z - cz) * 10 + Math.hypot(c.x - ox, c.z - oz) * 0.01;
  const sorted = [...list].sort((a, b) => score(a) - score(b) || a.z - b.z || a.x - b.x);
  const head = sorted[0];
  const rest = sorted.slice(1).sort((a, b) => (Math.abs(a.x - head.x) + Math.abs(a.z - head.z)) - (Math.abs(b.x - head.x) + Math.abs(b.z - head.z)) || a.z - b.z || a.x - b.x);
  return [head, ...rest];
}

/** Ángulo (rotation.y de Unit) para mirar desde una casilla hacia el centro del bando contrario. */
export function facingTowards(from, targets) {
  if (!targets.length) return 0;
  const tx = targets.reduce((s, c) => s + c.x, 0) / targets.length;
  const tz = targets.reduce((s, c) => s + c.z, 0) / targets.length;
  return Math.atan2(tx - from.x, tz - from.z);
}
