#!/usr/bin/env node
// mirror-map.mjs — Versión «espejo» de un mapa de combate para la Arena PvP (fase P5). Plan: docs/PLAN_ARENA_PVP.md §16.
// Uso: node tools/pvp/mirror-map.mjs <id> [--keep P|E]
//
// Se queda con la mitad de un bando (la del jugador, P, por defecto) y la copia girada media vuelta (180°) en el lado
// contrario, cambiando sus salidas P por E. Así los dos bandos tienen EXACTAMENTE el mismo tablero, cada uno visto
// desde su lado (el bando B ya mira con la cámara girada media vuelta). La línea de corte es la que separa mejor las
// dos salidas: filas (arriba / abajo) o columnas (izquierda / derecha). Si el número de filas o columnas es impar, la
// fila o columna del centro se hace simétrica a partir de su mitad del lado conservado.
// Escribe el `layout` listo para pegar en src/tactics/maps/BattleMaps.js.

globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
const { BATTLE_MAPS } = await import(new URL('../../src/tactics/maps/BattleMaps.js', import.meta.url));

/**
 * @param {string[]} layout  filas del mapa original
 * @param {'P'|'E'} keep     bando cuya mitad se conserva
 * @returns {{ layout: string[], axis: 'rows'|'cols' }}
 */
export function mirrorLayout(layout, keep = 'P') {
  const H = layout.length, W = layout[0].length;
  const at = (x, z) => layout[z][x];
  const spots = (ch) => { const out = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (at(x, z) === ch) out.push({ x, z }); return out; };
  const mean = (l, k) => l.reduce((t, c) => t + c[k], 0) / Math.max(1, l.length);
  const P = spots('P'), E = spots('E');
  const dz = Math.abs(mean(P, 'z') - mean(E, 'z')) / H, dx = Math.abs(mean(P, 'x') - mean(E, 'x')) / W;
  const axis = dz >= dx ? 'rows' : 'cols';
  const mine = keep === 'P' ? P : E;
  // ¿El bando conservado está en la parte alta (z / x pequeños) o en la baja?
  const low = axis === 'rows' ? mean(mine, 'z') < H / 2 : mean(mine, 'x') < W / 2;
  const grid = Array.from({ length: H }, (_, z) => Array.from({ length: W }, (_, x) => at(x, z)));
  const inKept = (x, z) => {
    const v = axis === 'rows' ? z : x, n = axis === 'rows' ? H : W;
    const mid = (n - 1) / 2;
    return low ? v < mid : v > mid;
  };
  const onMid = (x, z) => {
    const v = axis === 'rows' ? z : x, n = axis === 'rows' ? H : W;
    return n % 2 === 1 && v === (n - 1) / 2;
  };
  const out = grid.map((row) => row.slice());
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const rx = W - 1 - x, rz = H - 1 - z;
      if (inKept(x, z)) continue;                     // su mitad: igual
      if (onMid(x, z)) {
        // Centro: la mitad del centro del lado conservado, girada (sin salidas: las del centro se quitan)
        const v = axis === 'rows' ? x : z, n = axis === 'rows' ? W : H, mid = (n - 1) / 2;
        const keepLowInMid = low;                     // en la fila central se conserva el mismo lado que el bando
        const isKeptHalf = keepLowInMid ? v <= mid : v >= mid;
        const src = isKeptHalf ? grid[z][x] : grid[rz][rx];
        out[z][x] = src === 'P' || src === 'E' ? '.' : src;
        continue;
      }
      const src = grid[rz][rx];                       // la otra mitad: la conservada girada 180°
      out[z][x] = src === 'P' || src === 'E' ? (src === keep ? (keep === 'P' ? 'E' : 'P') : '.') : src;
    }
  }
  // La mitad conservada no tiene salidas del rival (se pasan a suelo)
  const foe = keep === 'P' ? 'E' : 'P';
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (inKept(x, z) && out[z][x] === foe) out[z][x] = '.';
  return { layout: out.map((r) => r.join('')), axis };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const id = process.argv[2];
  const keep = process.argv.includes('--keep') ? process.argv[process.argv.indexOf('--keep') + 1] : 'P';
  const def = BATTLE_MAPS[id];
  if (!def) { console.error(`no existe el mapa ${id}`); process.exit(1); }
  const { layout, axis } = mirrorLayout(def.layout, keep);
  console.log(`// ${id} espejo (mitad ${keep}, eje ${axis === 'rows' ? 'filas' : 'columnas'})`);
  console.log(`    layout: [\n${layout.map((r) => `      '${r}',`).join('\n')}\n    ],`);
}
