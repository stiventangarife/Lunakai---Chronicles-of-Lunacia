#!/usr/bin/env node
// build.mjs — Prepara el motor del árbitro de la Arena PvP (fase P4) para la Edge Function `pvp-arbiter`.
//
// La función de Supabase solo puede importar archivos de su propia carpeta, así que aquí se copia el motor del juego
// (tactics/sim/PvpArbiter.js y todo lo que importa: reglas, cartas, mapas, textos) a
// supabase/functions/pvp-arbiter/engine/src/…, tal cual, con la misma estructura. Es una copia generada: NO se edita.
// engine/BUILD.json y engine/build.js guardan la huella del motor copiado; el árbitro la anota en cada veredicto.
//
// Uso (desde la raíz del juego):
//   node tools/pvp/arbiter/build.mjs            copia el motor (antes de `npx supabase@latest functions deploy pvp-arbiter --no-verify-jwt --use-api`)
//   node tools/pvp/arbiter/build.mjs --check    sale con código 1 si la copia no es la del juego actual
//
// Regla: cada cambio en las reglas del combate → build + deploy del árbitro (si no, el árbitro y los jugadores
// podrían ver partidas distintas).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ENTRY = ['src/tactics/sim/PvpArbiter.js'];
const OUT = path.join(ROOT, 'supabase/functions/pvp-arbiter/engine');
const check = process.argv.includes('--check');

const seen = new Set();
function walk(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const src = fs.readFileSync(file, 'utf8');
  const re = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const spec = m[1] || m[2] || m[3];
    if (!spec.startsWith('.')) throw new Error(`${path.relative(ROOT, file)} importa «${spec}»: el motor del árbitro no puede depender de paquetes`);
    walk(path.resolve(path.dirname(file), spec));
  }
}
for (const e of ENTRY) walk(path.join(ROOT, e));
const files = [...seen].map((f) => path.relative(ROOT, f).split(path.sep).join('/')).sort();
const hash = crypto.createHash('sha256');
for (const f of files) { hash.update(f); hash.update('\0'); hash.update(fs.readFileSync(path.join(ROOT, f)).toString('utf8').replace(/\r\n/g, '\n')); }
const engine = hash.digest('hex').slice(0, 16);

if (check) {
  let built = null;
  try { built = JSON.parse(fs.readFileSync(path.join(OUT, 'BUILD.json'), 'utf8')); } catch { /* sin copia */ }
  if (built?.engine === engine) { console.log(`✓ motor del árbitro al día (${engine}, ${files.length} archivos)`); process.exit(0); }
  console.log(`✗ el motor del árbitro no es el del juego (copia ${built?.engine || 'ninguna'}, juego ${engine}): node tools/pvp/arbiter/build.mjs`);
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
for (const f of files) {
  const dst = path.join(OUT, f);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(ROOT, f), dst);
}
fs.writeFileSync(path.join(OUT, 'BUILD.json'), JSON.stringify({ engine, files: files.length, entry: ENTRY, note: 'Copia generada por tools/pvp/arbiter/build.mjs: no editar.' }, null, 2) + '\n');
fs.writeFileSync(path.join(OUT, 'build.js'), `// Generado por tools/pvp/arbiter/build.mjs: no editar.\nexport const BUILD = ${JSON.stringify({ engine, files: files.length })};\n`);
console.log(`✓ motor del árbitro copiado: ${files.length} archivos → supabase/functions/pvp-arbiter/engine (huella ${engine})`);
