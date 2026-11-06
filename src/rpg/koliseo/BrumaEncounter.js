// BrumaEncounter.js — Combates del Desafío de la Bruma (Koliseo, fase B2).
// Plan: docs/PLAN_DESAFIO_DE_LA_BRUMA.md. La configuración de cada combate la da el servidor (bruma_stage_begin):
//   { stage, map, rank: 'normal'|'strong'|'boss', mult, pick } + modificador, bioma y semilla de la semana.
// Con la misma semilla, todos los jugadores ven el mismo grupo de enemigos en el mismo tablero.
//
// · Grupo: arquetipos del bioma (BiomeEnemyCatalog) elegidos con un azar sembrado (Mulberry32).
//     normal → 2 o 3 enemigos · strong → 3 con un líder fuerte · boss → 3 con el jefe del bioma.
// · Dificultad: vida y escudo ×mult sobre los valores del bioma; daño ×mult con damageMult (Spells._applyDamageModifiers).
// · Modificadores aplicados aquí: mist_fury (+15 % daño), fog_armor (+40 escudo). thick_mist (−1 alcance) e
//   icy_wind (−1 PM en la ronda 1) los aplica el motor (Spells.battleMods, fijado por main desde config.koliseo).
// · Combate 5 (fase B3): el jefe es siempre el Slime Caballero con la mecánica Rastro de Miasma
//   (al final de su turno envenena las casillas de los héroes: quien termine su turno en ellas pierde vida).
// · Sin botín (rewardItems vacío), con experiencia; vida llena sin tocar la del mundo abierto (noPersistentHP).

import { generatePackForBiome, BIOME_SPAWN_POOLS } from '../world/BiomeEnemyCatalog.js';
import { DynamicCombatFactory } from '../../tactics/DynamicCombatFactory.js';
import * as i18n from '../../i18n/i18n.js';

/** Bioma del servidor → bioma del juego (Genesis es 'dungeon' en el código). */
export const SERVER_TO_GAME_BIOME = { forest: 'forest', savannah: 'savannah', arctic: 'arctic', mystic: 'mystic', genesis: 'dungeon' };

/** Jefe del combate 5 en todos los biomas (fase B3): el Slime Caballero (id histórico treant_flower). */
export const BRUMA_BOSS = 'treant_flower';

/**
 * Cuerpo de jefe del Slime Caballero sobre los valores del bioma (antes del ×mult del combate), a la altura del
 * jefe del tutorial (650 de vida, 6 PA, 3 PM). Genesis conserva su escala de bioma: sigue siendo la semana más dura.
 */
export const BRUMA_BOSS_BODY = { hpMult: 1.6, maxPA: 6, maxPM: 3, scale: 1.5, mechanic: 'miasma' };

/** Líder del combate de élite y jefe del combate 5 de cada bioma (ids de ENEMY_ARCHETYPES). */
export const BRUMA_LEADERS = {
  forest:   { strong: 'slime_attack',       boss: BRUMA_BOSS },
  savannah: { strong: 'wolf_aquatic',       boss: BRUMA_BOSS },
  arctic:   { strong: 'wolf_alpha',         boss: BRUMA_BOSS },
  mystic:   { strong: 'dryad_fighter',      boss: BRUMA_BOSS },
  dungeon:  { strong: 'bear_dad',           boss: BRUMA_BOSS },
};

/** Tamaño del grupo por rango: [mínimo, máximo]. */
const PACK_SIZE = { normal: [2, 3], strong: [3, 3], boss: [3, 3] };

/** Mulberry32: azar sembrado, rápido y con la misma secuencia en todos los navegadores. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semilla del combate: la de la semana mezclada con el combate y su número aleatorio. */
export function stageSeed(weekSeed, stage) {
  return ((Number(weekSeed) || 0) ^ Math.imul((Number(stage.pick) || 0) + 1, 0x9E3779B1) ^ Math.imul(Number(stage.stage) || 1, 0x85EBCA77)) >>> 0;
}

/**
 * Grupo de enemigos del combate (puro: sin escena ni DOM). Devuelve el pack con vida y escudo ya multiplicados.
 * @param {{ biome: string, seed: number, stage: object }} p
 */
export function buildBrumaPack({ biome, seed, stage }) {
  const gameBiome = SERVER_TO_GAME_BIOME[biome] || biome || 'forest';
  const rng = mulberry32(stageSeed(seed, stage));
  const rank = stage.rank || 'normal';
  const [lo, hi] = PACK_SIZE[rank] || PACK_SIZE.normal;
  const size = lo + Math.floor(rng() * (hi - lo + 1));
  const leader = rank === 'boss' ? BRUMA_LEADERS[gameBiome]?.boss : rank === 'strong' ? BRUMA_LEADERS[gameBiome]?.strong : null;
  const pack = generatePackForBiome(gameBiome, [0, 0], leader || null, { rng, size });
  // B5: en el combate 5 ningún escolta repite el modelo del jefe (el Ártico tiene al Slime Caballero en su lista)
  if (rank === 'boss') {
    const pool = (BIOME_SPAWN_POOLS[gameBiome] || []).filter((p) => p.archetypeId !== BRUMA_BOSS);
    pack.members = pack.members.map((m, i) => {
      if (i === 0 || m.archetypeId !== BRUMA_BOSS || !pool.length) return m;
      const pick = pool[Math.floor(rng() * pool.length) % pool.length].archetypeId;
      const one = generatePackForBiome(gameBiome, [0, 0], pick, { rng, size: 1 }).members[0];
      return { ...one, name: `${one.name} ${i + 1}` };
    });
  }
  const mult = Math.max(1, Number(stage.mult) || 1);
  pack.members = pack.members.map((m, i) => {
    const boss = rank === 'boss' && i === 0;
    const body = boss ? BRUMA_BOSS_BODY : null;
    return {
      ...m,
      id: `kol_s${stage.stage}_${i}_${m.archetypeId}`, // ids estables (el árbitro futuro repite el combate)
      maxHP: Math.round(m.maxHP * (body?.hpMult || 1) * mult),
      initialShield: Math.round((m.initialShield || 0) * mult),
      ...(body ? {
        maxPA: Math.max(m.maxPA || 0, body.maxPA),
        maxPM: Math.max(m.maxPM || 0, body.maxPM),
        scale: body.scale,
        mechanic: body.mechanic,
        isBrumaBoss: true,
      } : {}),
      possibleDrops: [],
    };
  });
  pack.leader = pack.members[0];
  pack.isBoss = rank === 'boss';
  pack.packId = `kol_bruma_${stage.stage}`;
  return { pack, gameBiome, mult, rank };
}

/**
 * Configuración completa del combate para main._startBattle (vía OverworldManager._handleMonsterEncounter).
 * @param {{ biome, seed, modifier, stage, week }} info  datos de bruma_stage_begin
 * @param {object} equipmentManager  escuadra del jugador (DynamicCombatFactory coloca a los héroes)
 */
export function buildBrumaEncounter(info, equipmentManager) {
  const { pack, gameBiome, mult, rank } = buildBrumaPack(info);
  const stage = info.stage;
  const base = DynamicCombatFactory.createEncounter({
    biome: gameBiome,
    packData: pack,
    monsterId: `kol_bruma_${stage.stage}`,
    battleMapId: stage.map,
    zoneKey: 'koliseo', // sin aliados temporales de misiones (Bing, Pomodoro)
  }, equipmentManager, null);

  const fury = info.modifier === 'mist_fury' ? 1.15 : 1;
  const armor = info.modifier === 'fog_armor' ? 40 : 0;
  const bossMember = pack.members.find((m) => m.isBrumaBoss) || null;
  const enemies = (base.enemies || []).map((e, i) => {
    // DynamicCombatFactory no copia la mecánica: el jefe es el primer miembro del grupo (el líder)
    const isBoss = bossMember && (e.id === bossMember.id || (i === 0 && e.type === bossMember.type));
    return {
      ...e,
      damageMult: Math.round(mult * fury * 100) / 100,
      initialShield: (e.initialShield || 0) + armor,
      ...(isBoss ? {
        mechanic: bossMember.mechanic,
        name: i18n.t('enemies.arch.treant_flower.name'),
        scale: bossMember.scale,
        maxPA: bossMember.maxPA,
        maxPM: bossMember.maxPM,
      } : {}),
    };
  });

  return {
    ...base,
    id: `kol_bruma_${stage.stage}`,
    title: i18n.t('koliseo.battle.title', { n: stage.stage }),
    enemies,
    rewardItems: [],
    rewardGold: 0,
    noPersistentHP: true,
    isBoss: rank === 'boss',
    koliseo: { mode: 'bruma', week: info.week || null, stage: stage.stage, rank, mult, modifier: info.modifier || null },
  };
}
