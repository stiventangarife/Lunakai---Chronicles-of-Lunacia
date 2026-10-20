// gen-cards.mjs — Comprueba los módulos de VFX sin navegador y regenera src/vfx/vfx-cards.js.
// Uso (desde la raíz del proyecto):  node tools/vfx-lab/gen-cards.mjs
// 1) Construye y evalúa en Node las 240 habilidades (235 cartas + 5 base) con el three r160 del proyecto.
// 2) Empareja cada efecto con su carta de PartCards.js (clase + parte + nombre) y escribe la tabla.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = (p) => pathToFileURL(path.join(ROOT, p)).href;
const T = await import(R('vendor/three.module.js'));
const { createVfxCore } = await import(R('src/vfx/vfx-core.js'));
const { VFX_MODULES } = await import(R('src/vfx/vfx-modules.js'));
globalThis.window = globalThis;
globalThis.localStorage = { getItem(){return null}, setItem(){} };
const scene = new T.Scene(), camera = new T.PerspectiveCamera(40, 1.6, 0.1, 100); camera.position.set(0,2.8,9.5); camera.updateMatrixWorld();
const core = createVfxCore(T, { scene, camera }); window.VFX = core;
const run = (f) => (0, eval)(fs.readFileSync(f, 'utf8'));
run(path.join(ROOT, 'src/vfx/vfx-lib.js'));
for (const n of VFX_MODULES) run(path.join(ROOT, `src/vfx/modules/mod-${n}.js`));
const errs = []; let n = 0;
for (const ab of Object.values(core.ABS)) {
  try { core.ensureBuilt(ab); const vs = ab.variants ? ab.variants.map(v => v[0]) : [null];
    for (const v of vs) { if (v && ab.setVariant) ab.setVariant(v); for (let t = 0; t <= ab.dur; t += 0.1) core.evaluate(ab, t); }
    n++; } catch (e) { errs.push(ab.key + ': ' + e.message); }
}
const mods = core.MODS.map(m => `${m.name}:${m.list.length}`);
console.log('habilidades', n, 'errores', errs.length, errs.slice(0, 5));
console.log(mods.join(' | '));
if (errs.length) { console.error('Hay módulos con errores: no se regenera la tabla.'); process.exit(1); }
// ---- tabla carta → efecto
const { PART_CARDS_LIST } = await import(R('src/tactics/data/PartCards.js'));
const CL = { 'Bestia':'beast','Planta':'plant','Acuático':'aquatic','Pájaro':'bird','Bicho':'bug','Reptil':'reptile' };
const PT = { 'Boca':'mouth','Cola':'tail','Cuernos':'horn','Espalda':'back','Ojos':'eyes','Orejas':'ears' };
const FILE = { 'Bestia':'bestia','Planta':'planta','Acuático':'acuatico','Pájaro':'pajaro','Bicho':'bicho','Reptil':'reptil' };
const FP = { 'Boca':'boca','Cola':'cola','Cuernos':'cuernos','Espalda':'espalda','Ojos':'ojos','Orejas':'orejas' };
const norm = s => s.toLowerCase().replace(/\s*\((tail|ears?|eyes|horn|back|mouth)\)/, '').replace(/[^a-z0-9]/g, '');
const rows = []; const miss = [];
for (const m of core.MODS) {
  if (m.name === 'Base') continue;
  const [c, p] = m.name.split(' · ');
  for (const ab of m.list) {
    const card = PART_CARDS_LIST.find(x => x.class === CL[c] && x.part === PT[p] && norm(x.name) === norm(ab.name));
    if (!card) { miss.push(m.name + '/' + ab.name); continue; }
    // archivo real donde está el código (Rice y Beetroot se registran desde otro módulo)
    const src = ab.key === 'rice' ? 'bestia-espalda' : ab.key === 'poBeetroot' ? 'planta-orejas' : `${FILE[c]}-${FP[p]}`;
    rows.push([card.id, ab.key, src]);
  }
}
const missingCards = PART_CARDS_LIST.filter(c => !rows.some(r => r[0] === c.id)).map(c => c.id);
console.log('cartas con efecto', rows.length, 'sin carta', miss, 'cartas sin efecto', missingCards);
rows.sort((a, b) => a[0].localeCompare(b[0]));
const body = rows.map(([id, key, file]) => `  ${id}: ['${key}', '${file}'],`).join('\n');
fs.writeFileSync(path.join(ROOT, 'src/vfx/vfx-cards.js'), `// vfx-cards.js — Qué efecto del motor de VFX corresponde a cada carta de partes (generado desde los módulos).
// id de carta → [clave del efecto, archivo del módulo (src/vfx/modules/mod-<archivo>.js)]
// Rice y Beetroot viven en mod-bestia-espalda y mod-planta-orejas, pero se registran como cola y boca.

export const CARD_VFX = {
${body}
};

/** Efecto de una carta (o null si todavía no tiene). */
export const vfxForCard = (cardId) => {
  const e = CARD_VFX[cardId];
  return e ? { key: e[0], module: e[1] } : null;
};
`);
