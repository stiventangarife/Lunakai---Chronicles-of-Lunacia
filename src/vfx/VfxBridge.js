// VfxBridge.js — Lleva los efectos del laboratorio (src/vfx) al combate. Fase 6, etapa 2.
//
// Cómo funciona:
//  · Un solo núcleo (createVfxCore) vive dentro de un grupo raíz del escenario. Cada lanzamiento coloca ese grupo para que
//    el espacio del laboratorio (lanzador en x = −3,7, objetivo en x = 3,4, cámara mirando desde +Z) caiga sobre la línea
//    lanzador → objetivo del tablero: traslación + giro + escala uniforme + estiramiento solo en el eje del viaje (con
//    límites) + espejo si hace falta para que el efecto mire a la cámara del juego.
//  · Los módulos leen VFX.camera: es una cámara proxy cuya matriz es la de la cámara real vista desde el grupo raíz, así
//    que los billboards y towardCam funcionan sin cambiar los módulos.
//  · Al lanzar una carta con efecto, marca ctx.vfx = { untilImpact }: castSpell espera hasta el impacto (ti) antes de
//    aplicar el daño, y SpellPresentation no dibuja su proyectil ni su impacto por defecto.
//  · Los muñecos del laboratorio son invisibles; su desplazamiento (embestidas, retrocesos) se aplica como movimiento
//    visual del grupo de la unidad, limitado a media casilla, y la unidad vuelve a su casilla al terminar.
//
// (19-oct) Todas las cartas de partes y de colección usan su efecto del motor (antes solo la lista piloto de 24).
// Consola (F12): lkDebug.vfx() estado · lkDebug.vfx(false|true) apagar/encender · lkDebug.vfxAll(false) solo la lista piloto
//                lkDebug.vfxPlay('part_bird_mouth_little_owl') reproduce sobre el objetivo más cercano.
//                lkDebug.vfxScale(1.6) tamaño de los efectos (por defecto 1,35; null = por defecto)
//  · Sapidae (craft_/shepard_/lunalogist_/stargazer_) y Ultimates de dúo usan sus módulos siempre (Hito 36).

import * as THREE from 'three';
import { createVfxCore } from './vfx-core.js';
import { loadVfxModules } from './vfx-modules.js';
import { CARD_VFX } from './vfx-cards.js';
import { PART_CARDS_LIST } from '../tactics/data/PartCards.js';
import { waitProgramsReady } from '../render/RenderWarmup.js';
import { access } from '../ui/AccessPrefs.js';

/** Habilidades del Sapidae (la clave del efecto es el id del hechizo) y Ultimates de dúo → [clave, módulo]. */
const SAPIDAE_MODULE = { craft: 'sapidae-forjacubiles', shepard: 'sapidae-susurrador', lunalogist: 'sapidae-lunalogista', stargazer: 'sapidae-astromante' };
export const ULTIMATE_VFX = {
  duo_destructiva: ['duo_embestida', 'duo-embestida'],
  duo_gaia: ['duo_gaia', 'duo-gaia'],
  duo_maelstrom: ['duo_maelstrom', 'duo-maelstrom'],
};
/** Cartas α de Bing y Pomodoro con efecto propio (la clave del efecto es el id de la carta). */
export const STARTER_VFX = {
  starter_bing_mouth: ['starter_bing_mouth', 'starter-bing'],
  starter_bing_horn: ['starter_bing_horn', 'starter-bing'],
  starter_bing_back: ['starter_bing_back', 'starter-bing'],
  starter_pomodoro_horn: ['starter_pomodoro_horn', 'starter-pomodoro'],
  starter_pomodoro_back: ['starter_pomodoro_back', 'starter-pomodoro'],
};
/** Habilidades de enemigos: la clave del efecto es el id del hechizo (instancias de los efectos básicos, mod-enemigos.js). */
export const ENEMY_VFX = new Set([
  'chimera_bite',
  'chimera_bellow',
  'chimera_spit',
  'chimera_heal',
  'chimera_frost_nova',
  'slime_strike',
  'slime_barrier',
  'slime_attack_spit',
  'slime_attack_goo',
  'slime_defense_slam',
  'slime_defense_barrier',
  'slime_support_pinch',
  'slime_support_heal',
  'slime_forest_a_swipe',
  'slime_forest_a_spit',
  'slime_forest_a_thorn',
  'slime_forest_b_slam',
  'slime_forest_b_spit',
  'slime_forest_b_heavy',
  'slime_fusion_burst',
  'wolf_aquatic_bite',
  'wolf_aquatic_alpha_splash',
  'wolf_aquatic_alpha_roar',
  'wolf_gray_bite',
  'wolf_gray_slash',
  'wolf_alpha_bite',
  'wolf_alpha_roar',
  'wolf_alpha_nova',
  'wolf_alpha_howl',
  'werewolf_crush',
  'werewolf_slam',
  'werewolf_roar',
  'werewolf_boss_bite',
  'werewolf_boss_roar',
  'werewolf_boss_cataclysm',
  'treant_flower_slam',
  'treant_flower_nova',
  'treant_fighter_punch',
  'treant_fighter_bash',
  'treant_fighter_bark',
  'treant_spore',
  'treant_entangle',
  'dryad_fighter_blade',
  'dryad_fighter_dance',
  'dryad_fighter_slash',
  'dryad_mage_spark',
  'dryad_mage_heal',
  'dryad_mage_burst',
  'dryad_mage_orb',
  'dryad_mage_blast',
  'dryad_mage_barrier',
  'dryad_range_arrow',
  'dryad_range_snipe',
  'dryad_range_root',
  'bear_mom_strike',
  'bear_mom_roar',
  'bear_mom_slam',
  'bear_dad_claw',
  'bear_dad_roar',
  'bear_dad_shield',
  'bear_dad_slam',
]);
/**
 * Hito 95: habilidades del Sapidae rediseñadas → efecto ya hecho que reutilizan (la clave del efecto es el id de la
 * habilidad antigua). null = sin efecto del motor: el gólem sale de la tierra con su propia animación (GolemSystem).
 * Cuando haya efectos propios, basta con quitar la entrada y registrar el efecto con el id nuevo en su módulo.
 */
export const SAPIDAE_VFX_ALIAS = {
  craft_clay_fist: 'craft_anvil', craft_sentinel_golem: null, craft_stone_veins: 'craft_reinforce',
  craft_clay_wall: 'craft_barricade', craft_carry_wounded: 'shepard_balsam', craft_fortify: 'craft_totem',
  shepard_hat_headbutt: 'shepard_astral_strike', shepard_hat_golem: null, shepard_translate_warning: 'shepard_attunement',
  shepard_shared_order: 'shepard_chimeric_awakening', shepard_guided_retreat: 'lunalogist_berry', shepard_relief: 'stargazer_transpose',
  lunalogist_alarm_toll: 'lunalogist_bramble', lunalogist_bell_golem: null, lunalogist_mourning_tone: 'shepard_balsam',
  lunalogist_warning_whisper: 'lunalogist_berry', lunalogist_purify: 'lunalogist_seed', lunalogist_blood_moon: 'shepard_pack_howl',
  stargazer_yielding_ground: 'stargazer_vortex', stargazer_shell_golem: null, stargazer_petrasense: 'stargazer_nova',
  stargazer_shell_march: null, stargazer_corrupt_rift: 'stargazer_gravity_well', stargazer_dawn_spiral: 'lunalogist_spores',
};
/**
 * Piloto del estilo nuevo (29-oct, mod-estilizado-piloto.js): con lkDebug.vfxEstilo(true) estos efectos sustituyen a
 * los actuales para compararlos en combate. La clave es el id de la carta, del hechizo o del efecto que se reemplaza.
 */
const STYLE_PILOT_MODULE = 'estilizado-piloto';
const STYLE_PILOT = {
  part_plant_horn_watermelon: 'sty_sandia',
  lunalogist_spores: 'sty_esporas',          // también la Espiral del Alba (alias en SAPIDAE_VFX_ALIAS)
};
// Los 61 ataques de enemigos: misma tabla con las fábricas estilizadas, clave sty__<id> (mod-estilizado-enemigos.js)
const STYLE_ENEMY_MODULE = 'estilizado-enemigos';
// Las 24 habilidades del Sapidae (Hito 95) y los pulsos y roturas de los gólems, con efecto propio estilizado:
// clave sty_<id de la habilidad> / golem_pulse_<tipo> / golem_break_<tipo>, un módulo por clase.
const STYLE_SAPIDAE_MODULE = { craft: 'estilizado-sapidae-alfarero', shepard: 'estilizado-sapidae-comandante', lunalogist: 'estilizado-sapidae-guardian', stargazer: 'estilizado-sapidae-rastreador' };
export const GOLEM_KIND_MODULE = { sentinel: 'estilizado-sapidae-alfarero', hat: 'estilizado-sapidae-comandante', bell: 'estilizado-sapidae-guardian', shell: 'estilizado-sapidae-rastreador' };
const GOLEM_KIND_OF_CLASS = { crafter: 'sentinel', shepard: 'hat', lunalogist: 'bell', stargazer: 'shell' };
const STYLE_KEY = 'lunakai_vfx_estilo';
/** Hito 101: módulos de cartas que ya tienen versión estilizada (estilizado-<módulo>, claves sty_<clave original>).
 *  Se añaden a medida que se terminan; los demás siguen con su efecto actual. */
const styCardFx = (k) => { if (!/^sty_/.test(k)) return null; const e = [...Object.values(CARD_VFX), ...Object.values(STARTER_VFX), ...Object.values(ULTIMATE_VFX)].find((v) => `sty_${v[0]}` === k); return e ? [k, `estilizado-${e[1]}`] : null; };
/** Hito 102: cartas α cuyo objetivo no es el de su carta base (la base va sobre sí mismo y la α sobre un aliado o
 *  un enemigo): con el estilo nuevo tienen efecto propio en vez del de la carta base. */
export const STYLE_STARTER_EXTRA = {
  starter_bing_eyes: ['sty_starter_bing_eyes', 'estilizado-starter-bing'],
  starter_bing_ears: ['sty_starter_bing_ears', 'estilizado-starter-bing'],
  starter_pomodoro_eyes: ['sty_starter_pomodoro_eyes', 'estilizado-starter-pomodoro'],
  starter_pomodoro_ears: ['sty_starter_pomodoro_ears', 'estilizado-starter-pomodoro'],
};
export const STYLE_CARD_READY = new Set([
  'planta-cuernos', 'planta-boca', 'planta-orejas', 'planta-ojos', 'planta-espalda', 'planta-cola',
  'pajaro-cuernos', 'pajaro-boca', 'pajaro-orejas', 'pajaro-ojos', 'pajaro-espalda', 'pajaro-cola',
  'reptil-cuernos', 'reptil-boca', 'reptil-orejas', 'reptil-ojos', 'reptil-espalda', 'reptil-cola',
  'bestia-cuernos', 'bestia-boca', 'bestia-orejas', 'bestia-ojos', 'bestia-espalda', 'bestia-cola',
  'bicho-cuernos', 'bicho-boca', 'bicho-orejas', 'bicho-ojos', 'bicho-espalda', 'bicho-cola',
  'acuatico-cuernos', 'acuatico-boca', 'acuatico-orejas', 'acuatico-ojos', 'acuatico-espalda', 'acuatico-cola',
  'starter-bing', 'starter-pomodoro',
  'duo-embestida', 'duo-gaia', 'duo-maelstrom',
]);

function specialVfx(id) {
  if (ULTIMATE_VFX[id]) return ULTIMATE_VFX[id];
  if (id in SAPIDAE_VFX_ALIAS) {
    const key = SAPIDAE_VFX_ALIAS[id];
    const mm = key && /^(craft|shepard|lunalogist|stargazer)_/.exec(key);
    return mm ? [key, SAPIDAE_MODULE[mm[1]]] : null;
  }
  if (ENEMY_VFX.has(id)) return [id, 'enemigos'];
  if (STARTER_VFX[id]) return STARTER_VFX[id];
  const m = /^(craft|shepard|lunalogist|stargazer)_/.exec(id || '');
  return m ? [id, SAPIDAE_MODULE[m[1]]] : null;
}

/** Etapa 2 (lista piloto): cartas de Shinji, Early Bird, Big Yak, Bing y Pomodoro. Desde el 19-oct se usan TODAS las cartas;
 *  esta lista solo se aplica si se desactiva con lkDebug.vfxAll(false) (para comparar o aislar un problema). */
export const VFX_PILOT_CARDS = [
  // Shinji #10455
  'part_aquatic_eyes_gero', 'part_beast_ears_nyan', 'part_reptile_mouth_tiny_turtle', 'part_bird_horn_trump', 'part_reptile_back_green_thorns', 'part_reptile_tail_tiny_dino',
  // Early Bird #3797905
  'part_beast_eyes_puppy', 'part_bird_ears_early_bird', 'part_bird_mouth_little_owl', 'part_reptile_horn_scaly_spoon', 'part_bird_back_cupid', 'part_bird_tail_the_last_one',
  // Big Yak #10830416
  'part_plant_eyes_blossom', 'part_plant_ears_hollow', 'part_plant_mouth_zigzag', 'part_plant_horn_cactus', 'part_plant_back_bidens', 'part_reptile_tail_iguana',
  // Bing y Pomodoro (sus cartas α usan el efecto de la carta base)
  'part_beast_ears_puppy', 'part_beast_tail_shiba', 'part_bird_eyes_passion', 'part_bug_ears_leaf_bug', 'part_bug_tail_leaf_bug', 'part_beast_mouth_platypus',
];

const LAB_CASTER = new THREE.Vector3(-3.7, 0, 0);
const LAB_TARGET = new THREE.Vector3(3.4, 0, 0);
const LAB_DUMMY_HEIGHT = 1.87;      // cabeza del muñeco del laboratorio
const GAME_UNIT_HEIGHT = 1.15;      // altura aproximada de un Axie en el tablero
const VFX_SCALE_DEFAULT = 1.35;     // los efectos se ven un 35 % más grandes que a la altura exacta del Axie
const SCALE_KEY = 'lunakai_vfx_scale';
// Distancia: en vez de estirar todo el efecto, se comprime o alarga solo el «pasillo» entre lanzador y objetivo.
// La zona del lanzador (boca, aura de lanzamiento) y la del objetivo (impacto, anillos) conservan su forma.
const ZONE_CASTER = 1.3;            // unidades del laboratorio alrededor del lanzador que no se deforman
const ZONE_TARGET = 1.6;            // ídem alrededor del objetivo
const ZONE_TARGET_RADIUS = 2.6;     // Hito 104: radio del círculo rígido alrededor del objetivo (≈ 1,3 casillas del laboratorio)
const ZONE_CASTER_RADIUS = 1.8;     // ídem alrededor del lanzador
const RADIUS_BLEND = 1.4;           // ancho de la transición entre el círculo rígido y el pasillo
// Hito 105: una casilla del tablero en unidades del laboratorio (GridManager.TILE_SIZE = 1,6 con el tamaño de VFX por defecto)
const LAB_TILE = 1.6 / ((GAME_UNIT_HEIGHT / LAB_DUMMY_HEIGHT) * VFX_SCALE_DEFAULT);
/** Radio (laboratorio) del área de una habilidad alrededor del objetivo; 0 si no es de área. */
function areaLabRadius(spell) {
  const a = spell?.areaType; if (!a || a === 'single') return 0;
  const m = /^(cross|circle)(\d)$/.exec(a);
  if (m) return (Number(m[2]) + 0.6) * LAB_TILE;
  const bx = /^box(\d)x\d$/.exec(a);                 // cuadrado N×N: hasta la esquina
  if (bx) return ((Number(bx[1]) - 1) * 0.71 + 0.9) * LAB_TILE;
  return 0;
}
const MIN_CORRIDOR = 0.15;          // fracción mínima de la distancia que queda para el pasillo (para que se vea el viaje)
const RIGID_MAX = 0.95;             // radio máximo (unidades del laboratorio) de una malla que se mueve entera
const MAX_RECOIL = 0.25;            // Hito 82b: retroceso máximo del objetivo, siempre alejándose del lanzador
const IMPACT_TIMEOUT = 2600;        // ms: tope de seguridad para no bloquear nunca el turno
const PREF_KEY = 'lunakai_vfx';
const DIM_ALPHA = 0.42;            // oscurecimiento del tablero mientras dura el efecto
const WHITE_GAIN = 0.5;            // o.white de los módulos: el tablero ya es claro y el bloom suma, así que se aplica a la mitad

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Deformación del pasillo, en el espacio del laboratorio (dentro del grupo raíz). Se añade al final de cada vertex shader:
// se recupera la posición en el mundo desde gl_Position, se pasa al espacio del laboratorio, se deforma a lo largo del eje
// lanzador → objetivo y se vuelve a proyectar. Así funciona con cualquier shader de los módulos sin tocarlos.
// Hito 104: además de las franjas rígidas a lo largo del eje, un CÍRCULO rígido a ras de suelo alrededor del objetivo y
// del lanzador (uVfxR: radios interior/exterior; uVfxD: distancia lanzador → objetivo en el laboratorio). Las auras, el
// humo y las marcas del suelo que asoman hacia el otro extremo se mueven con su extremo sin estirarse; cada punto va con
// el extremo más cercano y la transición es suave, así los surcos que cruzan el camino no se cortan. Lo que está por
// encima del suelo (proyectiles, estelas en el aire) sigue el pasillo como siempre.
const WARP_DECL = `uniform mat4 uVfxRoot;uniform mat4 uVfxRootInv;uniform vec3 uVfxC;uniform vec3 uVfxU;uniform vec4 uVfxK;uniform vec3 uVfxS;uniform float uVfxRigid;uniform vec4 uVfxR;uniform float uVfxD;uniform vec2 uVfxA;float vfxSc;
vec3 vfxWarp(vec3 p){float t=dot(p-uVfxC,uVfxU);float n;
 if(t<=uVfxK.x)n=uVfxK.z+(t-uVfxK.x)*uVfxS.x;else if(t>=uVfxK.y)n=uVfxK.w+(t-uVfxK.y)*uVfxS.z;else n=uVfxK.z+(t-uVfxK.x)*uVfxS.y;
 vec3 lat=p-uVfxC-uVfxU*t;
 vec2 lt=vec2(lat.x,lat.z);
 float rC=length(vec2(t,length(lt))),rT=length(vec2(t-uVfxD,length(lt)));
 float g=1.-smoothstep(.5,1.4,p.y);
 float ar=step(.5,uVfxA.y);float gt=mix(g,1.-smoothstep(1.4,3.,p.y),ar);float G=mix(uVfxS.z,uVfxA.x,ar);
 float wc=(1.-smoothstep(uVfxR.z,uVfxR.w,rC))*smoothstep(-.8,.8,rT-rC)*g;
 float wt=(1.-smoothstep(uVfxR.x,uVfxR.y,rT))*smoothstep(-.8,.8,rC-rT)*gt;
 float Dt=uVfxK.w+(uVfxD-uVfxK.y)*uVfxS.z;
 n=mix(n,uVfxK.z+(t-uVfxK.x)*uVfxS.x,wc);
 n=mix(n,Dt+(t-uVfxD)*G,wt);
 vfxSc=mix(uVfxS.x,G,wt);
 return uVfxC+uVfxU*n+lat*vfxSc;}
`;
// Objetos rígidos (sandía, hojas, garras…): se desplazan enteros según dónde cae su centro y solo se escalan de forma
// uniforme, así que nunca se aplastan. Rayos, estelas, planos de suelo y partículas se deforman vértice a vértice.
const WARP_MAIN = `
 {mat4 vfxVP=projectionMatrix*viewMatrix;vec4 vfxW=inverse(vfxVP)*gl_Position;vfxW/=vfxW.w;
  vec3 vfxL=(uVfxRootInv*vec4(vfxW.xyz,1.)).xyz;vec3 vfxP;
  if(uVfxRigid>.5){vec3 vfxO=(uVfxRootInv*modelMatrix*vec4(0.,0.,0.,1.)).xyz;vfxP=vfxWarp(vfxO)+(vfxL-vfxO)*vfxSc;}
  else vfxP=vfxWarp(vfxL);
  gl_Position=vfxVP*uVfxRoot*vec4(vfxP,1.);}
`;

export class VfxBridge {
  constructor(game) {
    this.game = game;
    this.sm = game.sceneManager;
    this.enabled = this._readPref();
    this.scale = this._readScale();
    this.allCards = true; // todas las cartas con efecto (lkDebug.vfxAll(false) = solo la lista piloto)
    this.stylePilot = this._readStyle(); // piloto del estilo nuevo (lkDebug.vfxEstilo)
    this.pilot = new Set(VFX_PILOT_CARDS);
    this.core = null;
    this._coreReady = null;
    this.current = null;     // reproducción en curso
    this._offs = [];
    this._v = new THREE.Vector3();
    this._m = new THREE.Matrix4();
    this._mi = new THREE.Matrix4();
    this.warpU = {
      uVfxRoot: { value: new THREE.Matrix4() }, uVfxRootInv: { value: new THREE.Matrix4() },
      uVfxC: { value: LAB_CASTER.clone() }, uVfxU: { value: new THREE.Vector3(1, 0, 0) },
      uVfxK: { value: new THREE.Vector4(-1e6, 1e6, -1e6, 1e6) }, uVfxS: { value: new THREE.Vector3(1, 1, 1) },
      uVfxR: { value: new THREE.Vector4(0, 0, 0, 0) }, uVfxD: { value: 0 },
      // Hito 105: áreas (cruz, círculo) a tamaño de casilla real alrededor del objetivo: x = escala, y = 1 si es un área
      uVfxA: { value: new THREE.Vector2(1, 0) },
    };
  }

  /** Añade la deformación del pasillo a los materiales de un efecto (una sola vez por material). */
  _patchWarp(obj) {
    if (!this.sm.renderer?.capabilities?.isWebGL2) return; // inverse() necesita WebGL2
    // ¿qué materiales son rígidos? Los de mallas compactas cuyo origen está dentro de la propia malla (si el material
    // lo comparten mallas rígidas y elásticas, gana elástico)
    const rigid = new Map();
    obj.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      if (!mats.length) return;
      let r = false;
      if (o.isMesh && !o.isInstancedMesh && o.geometry) {
        const g = o.geometry;
        if (!g.boundingSphere) g.computeBoundingSphere();
        const bs = g.boundingSphere, k = Math.max(Math.abs(o.scale.x), Math.abs(o.scale.y), Math.abs(o.scale.z));
        r = bs && bs.radius * k < RIGID_MAX && bs.center.length() <= bs.radius;
        // Hito 104: marcas planas del suelo (manchas, anillos, flores, charcos) de forma más o menos redonda o cuadrada:
        // se mueven enteras desde su centro aunque sean grandes, así no se estiran hacia el lanzador. Las franjas largas
        // (surcos, raíces, estelas en el suelo) siguen deformándose para llegar de un extremo al otro.
        if (!r && bs && !o.isPoints) {
          if (!g.boundingBox) g.computeBoundingBox();
          const sz = g.boundingBox.getSize(new THREE.Vector3()).multiply(o.scale).applyQuaternion(o.quaternion);
          const ax = Math.abs(sz.x), ay = Math.abs(sz.y), az = Math.abs(sz.z), big = Math.max(ax, az), small = Math.min(ax, az);
          r = ay < 0.12 * big && small > 0.55 * big && big * k < 9 && bs.center.length() <= bs.radius;
        }
      }
      for (const m of mats) if (m) rigid.set(m, (rigid.has(m) ? rigid.get(m) : true) && r);
    });
    for (const [m, r] of rigid) {
      if (!m.isShaderMaterial || m.userData.vfxWarp) continue;
      const vs = m.vertexShader || '';
      const end = vs.lastIndexOf('}');
      if (end < 0 || !/gl_Position/.test(vs)) continue;
      m.vertexShader = WARP_DECL + vs.slice(0, end) + WARP_MAIN + vs.slice(end);
      Object.assign(m.uniforms, this.warpU, { uVfxRigid: { value: r ? 1 : 0 } });
      m.userData.vfxWarp = true;
      m.userData.vfxRigid = r;
      m.needsUpdate = true;
    }
  }

  /** La misma deformación en JS (para la luz y los muñecos). */
  _warpPoint(p) {
    const U = this.warpU, u = U.uVfxU.value, C = U.uVfxC.value, K = U.uVfxK.value, S = U.uVfxS.value;
    const t = (p.x - C.x) * u.x + (p.y - C.y) * u.y + (p.z - C.z) * u.z;
    let n = t <= K.x ? K.z + (t - K.x) * S.x : t >= K.y ? K.w + (t - K.y) * S.z : K.z + (t - K.x) * S.y;
    // círculos rígidos (igual que en el shader)
    const R = U.uVfxR.value, D = U.uVfxD.value;
    const lx = p.x - C.x - u.x * t, lz = p.z - C.z - u.z * t, l = Math.hypot(lx, lz);
    const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / Math.max(1e-6, b - a))); return k * k * (3 - 2 * k); };
    const A = U.uVfxA.value, ar = A.y > 0.5;
    const rC = Math.hypot(t, l), rT = Math.hypot(t - D, l), g = 1 - sm(0.5, 1.4, p.y), gt = ar ? 1 - sm(1.4, 3, p.y) : g, G = ar ? A.x : S.z;
    const wc = (1 - sm(R.z, R.w, rC)) * sm(-0.8, 0.8, rT - rC) * g, wt = (1 - sm(R.x, R.y, rT)) * sm(-0.8, 0.8, rC - rT) * gt;
    const Dt = K.w + (D - K.y) * S.z;
    n += (K.z + (t - K.x) * S.x - n) * wc;
    n += (Dt + (t - D) * G - n) * wt;
    // eje: n; resto (lateral y altura): la escala de la zona (en las áreas, la del objetivo)
    const sc = S.x + (G - S.x) * wt;
    return p.addScaledVector(u, -t).sub(C).multiplyScalar(sc).add(C).addScaledVector(u, n);
  }

  // ------------------------------------------------------------ instalación
  install(events, turnManager) {
    this._offs.push(events.on('spell:cast', (ctx) => { try { this._onCast(ctx); } catch (e) { console.warn('[vfx]', e); } }));
    this._offs.push(events.on('ultimate:ready', ({ spell } = {}) => { if (spell) this.prepare([{ spellIds: [] }]).catch(() => {}); }));
    // gólems (Hito 95): pulso al final del turno de su dueño y efecto final al romperse
    this._offs.push(events.on('golem:pulse', ({ golem, kind } = {}) => { try { this._onGolemFx('pulse', golem, kind); } catch (e) { console.warn('[vfx]', e); } }));
    this._offs.push(events.on('golem:broken', ({ golem, kind } = {}) => { try { this._onGolemFx('break', golem, kind); } catch (e) { console.warn('[vfx]', e); } }));
    if (turnManager) {
      const orig = turnManager.onCombatStart;
      turnManager.onCombatStart = (...a) => {
        // Si main._prewarmBattle() ya lo preparó detrás del velo, no se repite (evita otra ronda de compilación)
        if (this._prewarm) this._prewarm = null;
        else this.prepare(turnManager.units || this.game.units || []).catch((e) => console.warn('[vfx] prepare', e));
        return orig?.apply(turnManager, a);
      };
    }
    // actualización por fotograma, después de mover la cámara y antes de renderizar
    const prev = this.sm.onBeforeRender;
    this.sm.onBeforeRender = (dt) => { prev?.(dt); this.update(dt); };
    return this;
  }

  _readScale() { try { const v = parseFloat(localStorage.getItem(SCALE_KEY)); return v >= 0.5 && v <= 3 ? v : VFX_SCALE_DEFAULT; } catch { return VFX_SCALE_DEFAULT; } }
  setScale(v) {
    const n = Number(v);
    this.scale = n >= 0.5 && n <= 3 ? n : VFX_SCALE_DEFAULT;
    try { if (v == null) localStorage.removeItem(SCALE_KEY); else localStorage.setItem(SCALE_KEY, String(this.scale)); } catch { /* sin almacenamiento */ }
    return this.scale;
  }
  _readPref() { try { return localStorage.getItem(PREF_KEY) !== 'off'; } catch { return true; } }
  setEnabled(on) { this.enabled = !!on; try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off'); } catch { /* sin almacenamiento */ } if (!on) this.stop(); return this.enabled; }

  // ------------------------------------------------------------ qué efecto tiene una carta
  /** Clave de carta de partes para un hechizo (las cartas α y de colección usan la de su carta base). */
  cardIdFor(spell) {
    if (!spell) return null;
    if (CARD_VFX[spell.id]) return spell.id;
    if (spell.baseCardId && CARD_VFX[spell.baseCardId]) return spell.baseCardId;
    if (spell.isPartCard && spell.class && spell.part) {
      const base = PART_CARDS_LIST.find((c) => c.class === spell.class && c.part === spell.part && norm(c.name) === norm(spell.name));
      if (base && CARD_VFX[base.id]) return base.id;
    }
    return null;
  }

  effectFor(spell) {
    const fx = this._effectFor(spell);
    // piloto del estilo nuevo: sustituye por id de carta/hechizo o por la clave del efecto
    // habilidades del Sapidae (antes que el piloto: la Espiral del Alba tiene efecto propio)
    if (this.stylePilot && spell && spell.id in SAPIDAE_VFX_ALIAS) {
      const m = /^(craft|shepard|lunalogist|stargazer)_/.exec(spell.id);
      if (m) return { id: spell.id, key: `sty_${spell.id}`, module: STYLE_SAPIDAE_MODULE[m[1]] };
    }
    if (this.stylePilot && spell && STYLE_STARTER_EXTRA[spell.id]) {
      const [key, module] = STYLE_STARTER_EXTRA[spell.id];
      return { id: spell.id, key, module };
    }
    if (fx && this.stylePilot) {
      const sty = STYLE_PILOT[fx.id] || STYLE_PILOT[fx.key];
      if (sty) return { id: fx.id, key: sty, module: STYLE_PILOT_MODULE };
      if (fx.module === 'enemigos' && ENEMY_VFX.has(fx.key)) return { id: fx.id, key: `sty__${fx.key}`, module: STYLE_ENEMY_MODULE };
      if (STYLE_CARD_READY.has(fx.module)) return { id: fx.id, key: `sty_${fx.key}`, module: `estilizado-${fx.module}` };
    }
    return fx;
  }

  _effectFor(spell) {
    // Sapidae, Ultimates, cartas α propias de los iniciales y enemigos: siempre (ya están en el motor)
    const sp = spell && specialVfx(spell.id);
    if (sp) return { id: spell.id, key: sp[0], module: sp[1] };
    const id = this.cardIdFor(spell);
    if (!id || (!this.allCards && !this.pilot.has(id))) return null;
    const [key, module] = CARD_VFX[id];
    return { id, key, module };
  }

  // Hito 101: el estilo nuevo va encendido por defecto; lkDebug.vfxEstilo(false) lo apaga (se recuerda en el navegador)
  _readStyle() { try { return localStorage.getItem(STYLE_KEY) !== 'off'; } catch { return true; } }
  setStylePilot(on) {
    this.stylePilot = !!on;
    try { localStorage.setItem(STYLE_KEY, on ? 'on' : 'off'); } catch { /* sin almacenamiento */ }
    return this.stylePilot;
  }

  /** Luz del tablero para el kit estilizado: dirección y color del sol, color de la sombra (cielo). */
  _syncStyleLight() {
    const sty = typeof window !== 'undefined' && window.VFX?.sty;
    if (!sty) return;
    let sun = null, hemi = null;
    this.sm.scene.traverse((o) => {
      if (o.isDirectionalLight && o.visible && (!sun || o.intensity > sun.intensity)) sun = o;
      else if (o.isHemisphereLight && !hemi) hemi = o;
    });
    if (!sun) return;
    const p = sun.getWorldPosition(new THREE.Vector3());
    const t = sun.target ? sun.target.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
    sty.setLight(p.sub(t), sun.color, hemi ? hemi.color : null);
  }

  // ------------------------------------------------------------ núcleo y carga
  _ensureCore() {
    if (this._coreReady) return this._coreReady;
    this.root = new THREE.Group();
    this.root.name = 'vfx-root';
    this.root.matrixAutoUpdate = false;
    this.sm.scene.add(this.root);
    this.proxy = new THREE.PerspectiveCamera();
    this.proxy.matrixAutoUpdate = false;
    this.core = createVfxCore(THREE, { scene: this.root, camera: this.proxy, showDummies: false });
    this.core.hudOrbNDC = (i, out) => out.set(-0.8, -0.85);
    window.VFX = this.core;
    for (const ab of Object.values(this.core.ABS)) ab.root.visible = false;
    this.core.glow.visible = false;
    this.core.glow.renderOrder = 1001;
    this._patchWarp(this.core.glow);
    // velo oscuro de pantalla completa: los efectos (aditivos, pensados para fondo oscuro) se leen sobre el cielo de día
    this.dim = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 } },
      vertexShader: 'void main(){gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: 'uniform float uA;void main(){gl_FragColor=vec4(.015,.02,.06,uA);}',
      transparent: true, depthTest: false, depthWrite: false,
    }));
    this.dim.frustumCulled = false;
    this.dim.renderOrder = 900;
    this.dim.visible = false;
    this.sm.scene.add(this.dim);
    // destello blanco a pantalla completa (o.white de los módulos: Nova, Ultimates…), por encima de los efectos
    this.white = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 } },
      vertexShader: 'void main(){gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: 'uniform float uA;void main(){gl_FragColor=vec4(1.,.98,.94,uA);}',
      transparent: true, depthTest: false, depthWrite: false,
    }));
    this.white.frustumCulled = false;
    this.white.renderOrder = 1100;
    this.white.visible = false;
    this.sm.scene.add(this.white);
    this._coreReady = Promise.resolve(this.core);
    return this._coreReady;
  }

  _base() { return new URL('./', import.meta.url).href; }

  /**
   * Carga y construye los efectos de las cartas de estas unidades (y precompila sus shaders).
   * Las llamadas se encadenan (nunca dos a la vez) y los efectos ya preparados en un combate
   * anterior se saltan: antes se repetía todo (≈5 s) en cada combate, y a veces dos veces seguidas.
   */
  prepare(units) {
    // tope por eslabón: una preparación colgada (p. ej. un módulo que no responde) no bloquea las siguientes
    const run = () => Promise.race([this._prepareImpl(units), new Promise((r) => setTimeout(() => r(0), 8000))]);
    this._prepareChain = (this._prepareChain || Promise.resolve()).then(run, run);
    return this._prepareChain;
  }

  /** Efectos que necesitan estas unidades (más la Ultimate activa, si la hay). */
  _wantedFor(units) {
    const wanted = new Map();
    for (const u of units || []) for (const sid of u.spellIds || []) {
      const fx = this.effectFor(this.game.spellManager?.getSpell(sid));
      if (fx) wanted.set(fx.key, fx);
    }
    const ult = this.effectFor(this.game.spellManager?.ultimates?.spell);
    if (ult) wanted.set(ult.key, ult);
    if (this.stylePilot) for (const u of units || []) {
      const kind = GOLEM_KIND_OF_CLASS[u?.config?.sapidaeClass];
      if (!kind) continue;
      for (const ev of ['pulse', 'break']) { const key = `golem_${ev}_${kind}`; wanted.set(key, { id: key, key, module: GOLEM_KIND_MODULE[kind] }); }
    }
    return wanted;
  }

  /**
   * Prepara en segundo plano, mientras se explora, los efectos de estas unidades (el escuadrón):
   * uno por rato libre del navegador (requestIdleCallback), en la misma cola que prepare(), así que
   * nunca se solapa con la preparación de un combate. Si empieza un combate a medias, lo que falte
   * se hace sin esperar a ratos libres (el combate lo necesita igualmente).
   */
  prepareInBackground(units) {
    if (!this.enabled) return Promise.resolve(0);
    // 29-oct (Hito 103): sin compilación de shaders en paralelo (KHR_parallel_shader_compile), _precompile tiene que
    // forzar el enlazado de cada shader en el hilo principal, y en algunos equipos cada uno tarda 0,5–3 s: daría
    // tirones mientras se explora. En ese caso no se prepara nada aquí; el combate lo prepara detrás de su velo
    // (_prewarmBattle), como siempre. Con la extensión (Chrome/Edge en Windows) se mantiene: medido, ~65 ms en total.
    const r = this.sm && this.sm.renderer;
    if (!(r && r.extensions && typeof r.extensions.has === 'function' && r.extensions.has('KHR_parallel_shader_compile'))) {
      return Promise.resolve(0);
    }
    if (!this._preparedKeys) this._preparedKeys = new Set();
    // Combate en marcha: sin esperar (lo necesita ya). Explorando: en un rato libre. Cargando una
    // zona, cinemática, etc.: esperar a que se vuelva a explorar, para no competir con la carga.
    const idle = () => new Promise((r) => {
      const tick = () => {
        const st = this.game.gameState;
        if (st === 'BATTLE') return r();
        const exploring = st === 'OVERWORLD' && this.game.overworldManager?.state === 'EXPLORING' && !this.game.overworldManager?.isLoadingZone;
        if (!exploring) { setTimeout(tick, 500); return; }
        if (typeof requestIdleCallback === 'function') requestIdleCallback(() => r(), { timeout: 3000 });
        else setTimeout(r, 60);
      };
      tick();
    });
    let n = 0;
    for (const fx of this._wantedFor(units).values()) {
      if (this._preparedKeys.has(fx.key)) continue;
      const one = new Map([[fx.key, fx]]);
      // background: true → no compila la escena de combate (estaría vacía) ni gasta su precalentado único
      const run = () => idle().then(() => Promise.race([this._prepareImpl(null, one, { background: true }), new Promise((r) => setTimeout(() => r(0), 8000))]));
      this._prepareChain = (this._prepareChain || Promise.resolve()).then(run, run);
      n++;
    }
    return (this._prepareChain || Promise.resolve()).then(() => n);
  }

  async _prepareImpl(units, presetWanted = null, { background = false } = {}) {
    if (!this.enabled) return 0;
    if (!this._preparedKeys) this._preparedKeys = new Set();
    const wanted = presetWanted ? new Map(presetWanted) : this._wantedFor(units);
    // ya construidos y precompilados antes: no hace falta repetirlos
    for (const k of [...wanted.keys()]) if (this._preparedKeys.has(k) && this.core?.ABS[k]?.built) wanted.delete(k);
    if (!wanted.size) return 0;
    await this._ensureCore();
    await loadVfxModules(this._base(), [...new Set([...wanted.values()].map((f) => f.module))]);
    for (const { key } of wanted.values()) {
      const ab = this.core.ABS[key];
      if (!ab) continue;
      this.core.ensureBuilt(ab);
      this._patchWarp(ab.root);
      ab.root.visible = false;
    }
    try {
      await this._precompile([...wanted.values()].map(({ key }) => this.core.ABS[key]).filter(Boolean), { includeScene: !background });
      for (const { key } of wanted.values()) if (this.core.ABS[key]?.built) this._preparedKeys.add(key);
    } catch { /* compilar por adelantado es opcional */ }
    return wanted.size;
  }

  /**
   * Precompila los shaders de estos efectos con las MISMAS condiciones del render real (19-oct), para que el primer
   * lanzamiento no compile nada (el «tirón»). Antes se compilaba contra el grupo de VFX y sin render target, así que
   * la clave de programa de three no coincidía con la del combate (luces de la escena, niebla, sombras y el render
   * target del EffectComposer → sin tone mapping y espacio lineal) y cada efecto volvía a compilar 6–17 shaders al lanzarse.
   */
  async _precompile(abs, { includeScene = true } = {}) {
    const r = this.sm.renderer, scene = this.sm.scene, cam = this.sm.camera;
    if (!r || !scene || !cam || !abs.length) return;
    const rt = this.sm.composer?.readBuffer || null; // la RenderPass dibuja la escena en este render target
    const prevRT = r.getRenderTarget();
    const objs = [...abs.map((ab) => ab.root), this.core.glow, this.dim, this.white].filter(Boolean);
    // la primera vez, también la escena: la luz del núcleo de VFX cambia el número de luces y three recompila sus materiales
    if (includeScene && !this._sceneWarm) { this._sceneWarm = true; objs.unshift(scene); }
    const compiled = new Set();
    // Con compilación en paralelo se espera a que los programas estén listos (waitProgramsReady), no con
    // renderer.compileAsync: si un material se destruye mientras tanto, compileAsync no termina nunca y
    // sigue preguntando por un programa borrado cada 10 ms (avisos «glGetProgramiv» en la consola).
    const par = !!r.extensions?.has?.('KHR_parallel_shader_compile');
    r.setRenderTarget(rt);
    try {
      // compile() recorre todo el objeto (también lo oculto) y toma luces y niebla de la escena real (targetScene)
      for (const o of objs) { const mats = r.compile(o, cam, scene); if (mats) for (const m of mats) compiled.add(m); }
    } finally {
      r.setRenderTarget(prevRT);
    }
    // texturas de los efectos subidas a la GPU antes de usarlas
    if (r.initTexture) {
      const seen = new Set();
      for (const o of objs) o.traverse((m) => {
        for (const mat of [].concat(m.material || [])) {
          const texs = [mat.map, mat.alphaMap, ...Object.values(mat.uniforms || {}).map((u) => u && u.value)];
          // las que su dueño liberó a propósito (variantes ocultas del Sapidae) no se suben
          for (const t of texs) if (t && t.isTexture && !t.isRenderTargetTexture && !t.userData?.lkNoPrewarm && !seen.has(t)) { seen.add(t); try { r.initTexture(t); } catch { /* opcional */ } }
        }
      });
    }
    // Con KHR_parallel_shader_compile basta con esperar a que el driver termine (sin bloquear).
    if (par) { await waitProgramsReady(r, compiled, 8000); return; }
    // sin KHR_parallel_shader_compile el enlazado real del shader ocurre en su primer uso: se fuerza aquí, un objeto por
    // fotograma, para que no caiga en el fotograma del lanzamiento
    for (const o of objs) {
      o.traverse((m) => { for (const mat of [].concat(m.material || [])) { try { r.properties.get(mat).currentProgram?.getUniforms(); } catch { /* opcional */ } } });
      await new Promise((res) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => res()) : setTimeout(res, 0)));
    }
  }

  /**
   * Anclas de diseño de un efecto (29-oct): dónde están el lanzador y el objetivo del laboratorio en reposo.
   * Antes el puente suponía siempre −3,7 → 3,4 (7,1 u.), pero los efectos cuerpo a cuerpo (Tajo, VFX.basic.MORDISCO,
   * ZARPAZO…) ponen los muñecos juntos (p. ej. −0,6 → 1,2): el golpe caía a mitad de camino y encogido al 57 %.
   * Un módulo puede declararlas (`anchors: { caster: x, target: x }`); si no, se miden evaluando la pose en t = 0.
   */
  _anchorsOf(ab) {
    if (ab._lkAnchors) return ab._lkAnchors;
    let c = LAB_CASTER.clone(), t = LAB_TARGET.clone();
    const core = this.core;
    if (ab.anchors) {
      if (Number.isFinite(ab.anchors.caster)) c.x = ab.anchors.caster;
      if (Number.isFinite(ab.anchors.target)) t.x = ab.anchors.target;
    } else if (core) {
      try {
        core.evaluate(ab, 0);
        c.set(core.caster.position.x, 0, core.caster.position.z);
        t.set(core.target.position.x, 0, core.target.position.z);
      } catch { /* sin pose medible: anclas por defecto */ }
      for (const d of [core.caster, core.target, ...(core.allies || []), ...(core.enemies || [])]) d.visible = false;
    }
    // solo anclas sensatas sobre el eje del laboratorio; si no, las de siempre
    if (!(t.x - c.x >= 0.8) || Math.abs(c.z) > 0.05 || Math.abs(t.z) > 0.05) { c = LAB_CASTER.clone(); t = LAB_TARGET.clone(); }
    ab._lkAnchors = { c, t };
    return ab._lkAnchors;
  }

  /**
   * Pulso o rotura de un gólem con su efecto estilizado (solo con el estilo nuevo encendido; si no, el anillo de siempre).
   * No interrumpe un efecto en curso: el pulso llega al final del turno, cuando ya no hay hechizos reproduciéndose.
   */
  _onGolemFx(ev, golem, kind) {
    if (!this.enabled || !this.stylePilot || !golem || this.current) return;
    kind = kind || golem.golemKind;
    const key = `golem_${ev}_${kind}`, module = GOLEM_KIND_MODULE[kind];
    if (!module) return;
    const ab = this.core?.ABS[key];
    if (!ab || !ab.built) { this.prepare([{ spellIds: [], config: golem.owner?.config }]).catch(() => {}); return; }
    // roto: ya no tiene malla; el efecto sale de su casilla
    const unit = ev === 'break' || golem.isDead ? { gridX: golem.gridX, gridZ: golem.gridZ, team: golem.team, group: null, isDead: true } : golem;
    this.play(ab, unit, { x: golem.gridX, z: golem.gridZ }, { spell: { id: key, targetType: 'self', effects: [] }, targetUnit: unit });
  }

  // ------------------------------------------------------------ lanzamiento
  _onCast(ctx) {
    if (!this.enabled || !ctx || !ctx.spell || !ctx.caster) return;
    if (this.game?.gridManager?.fastForward) return; // Arena PvP: puesta al día sin efectos
    const fx = this.effectFor(ctx.spell);
    if (!fx) return;
    const ab = this.core?.ABS[fx.key];
    if (!ab || !ab.built) {
      // no estaba preparado: se carga para la próxima vez y este lanzamiento usa los VFX actuales
      this.prepare([{ spellIds: [ctx.spell.id] }]).catch(() => {});
      return;
    }
    const targetUnit = this._unitAt(ctx.targetCell) || null;
    ctx.vfx = this.play(ab, ctx.caster, ctx.targetCell, { spell: ctx.spell, targetUnit });
  }

  _unitAt(cell) {
    if (!cell) return null;
    const t = this.game.gridManager?.getTile(cell.x, cell.z);
    return t?.unit && !t.unit.isDead ? t.unit : null;
  }

  _groundAt(cell) {
    const p = this.game.gridManager.gridToWorld(cell.x, cell.z);
    return new THREE.Vector3(p.x, p.y ?? 0, p.z);
  }

  /** Reproduce una habilidad del motor entre un lanzador y una casilla. Devuelve { untilImpact, done, stop }. */
  play(ab, caster, targetCell, { spell = null, targetUnit = null } = {}) {
    this.stop();
    const core = this.core;
    const A = caster.group ? caster.group.position.clone() : this._groundAt({ x: caster.gridX, z: caster.gridZ });
    const B = targetUnit?.group ? targetUnit.group.position.clone() : this._groundAt(targetCell);
    // ancla en el laboratorio: un aliado (efectos con aliados) o el objetivo
    const allyTarget = spell && (spell.targetType === 'ally' || spell.targetType === 'self') && targetUnit && targetUnit !== caster;
    const useAlly = allyTarget && (typeof ab.allies === 'function' ? ab.allies() : ab.allies) > 0;
    const anc = this._anchorsOf(ab);
    // con aliado del laboratorio, el lanzador vuelve a su sitio de siempre (ALLY_POS está pensado desde −3,7)
    let labC = useAlly ? LAB_CASTER.clone() : anc.c.clone();
    let labB = useAlly ? core.ALLY_POS[0].clone() : anc.t.clone();
    // «sobre sí mismo» solo si la casilla objetivo es la del lanzador. Una carta de área lanzada sobre una casilla vacía
    // (Green Thorns, Hollow…) apunta a esa casilla, no al lanzador: antes se tomaba como propia y el efecto salía hacia la
    // derecha de la cámara, así que cambiaba de dirección según desde dónde se mirara el tablero.
    const onOwnCell = !targetCell || (targetCell.x === caster.gridX && targetCell.z === caster.gridZ);
    const self = targetUnit === caster || onOwnCell || A.distanceTo(B) < 0.01;
    // sobre sí mismo: el eje del efecto mira al enemigo vivo más cercano (no depende de la cámara)
    // Hito 101: carta de aliado lanzada sobre sí mismo (alcance 0). Si el efecto tiene variante «propio», se usa esa;
    // si no, el punto del laboratorio donde el efecto dibuja al receptor (ab.receiver: 'target' | 'ally'; por defecto el
    // aliado si el efecto tiene aliados) se lleva a la casilla del lanzador, que se mueve como ese muñeco.
    let selfRecv = null;
    const hasPropio = !!ab.variants?.some((v) => v[0] === 'propio');
    if (self && !hasPropio && spell?.targetType === 'ally') {
      const nAl = typeof ab.allies === 'function' ? ab.allies() : ab.allies;
      // sin receptor declarado: el objetivo (antes se quedaba en la casilla de delante; Hito 102)
      const rc = ab.receiver || (nAl > 0 ? 'ally' : 'target');
      if (rc === 'caster') { /* el efecto ya dibuja al receptor en el lanzador (Hito 113): sin remapeo */ }
      else if (rc === 'ally' && core.ALLY_POS?.[0] && core.allies?.[0]) selfRecv = { lab: core.ALLY_POS[0].clone(), dummy: core.allies[0] };
      else if (rc === 'target') selfRecv = { lab: anc.t.clone(), dummy: core.target };
      if (selfRecv) { const ax = anc.t.clone().sub(anc.c).setY(0).normalize(); labC = selfRecv.lab.clone(); labB = selfRecv.lab.clone().addScaledVector(ax, 7.1); }
    }
    let dirHint = null;
    if (self) {
      const foe = (this.game.units || []).filter((u) => !u.isDead && u.team !== caster.team && u.group)
        .sort((a, b) => a.group.position.distanceToSquared(A) - b.group.position.distanceToSquared(A))[0];
      if (foe) dirHint = foe.group.position.clone().sub(A);
    }
    // áreas que dibuja el propio efecto aunque la carta sea de un solo objetivo (Ráfaga de la Espesura): def.areaCells = radio en casillas
    this._areaLabRadius = areaLabRadius(spell) || (ab.areaCells > 0 ? (ab.areaCells + 0.6) * LAB_TILE : 0);
    this._placeRoot(A, B, labB, self, dirHint, labC, ab);
    try { this._syncUnitsForFx(caster, B); } catch (e) { this.core.foes = []; this.core.friends = []; }

    // variante: Esporas cura si apunta a un aliado y daña si apunta a un enemigo; los dúos usan el efecto completo
    if (ab.variants && ab.setVariant) {
      const names = ab.variants.map((v) => v[0]);
      let v = names.includes('full') ? 'full' : names[0];
      if (self && hasPropio) v = 'propio';
      if (names.includes('cura') && names.includes('dano')) v = targetUnit && targetUnit.team === caster.team ? 'cura' : 'dano';
      if (ab.v !== v) ab.setVariant(v);
    }

    // paleta y visibilidad (el efecto se dibuja después del velo oscuro)
    for (const other of Object.values(core.ABS)) other.root.visible = other === ab;
    if (!ab._vfxOrdered) { ab.root.traverse((o) => { o.renderOrder = 1000; }); ab._vfxOrdered = true; }
    const pal = core.palOf(ab);
    core.setPalette(pal && core.PALETTES[pal] ? pal : 'Arcano');
    if (ab.stylized) this._syncStyleLight();
    core.glow.visible = true;
    core.light.visible = true;

    // movimiento visual de las mallas (no si la carta mueve unidades de verdad)
    const movesUnits = Array.isArray(spell?.effects) && spell.effects.some((e) => /push|pull|teleport|swap|jump|dash|knock/i.test(e.type || ''));
    const visuals = [];
    if (!movesUnits) {
      if (caster.group && !caster.isMoving) visuals.push({ unit: caster, dummy: selfRecv ? selfRecv.dummy : core.caster, lab: labC, base: caster.group.position.clone(), gx: caster.gridX, gz: caster.gridZ });
      if (targetUnit?.group && targetUnit !== caster && !targetUnit.isMoving && !useAlly) visuals.push({ unit: targetUnit, dummy: core.target, lab: anc.t, base: targetUnit.group.position.clone(), gx: targetUnit.gridX, gz: targetUnit.gridZ });
      // compañero: el aliado objetivo (cartas sobre aliados) o el Axie principal en las Ultimates de dúo
      const partner = useAlly ? targetUnit : (spell?.isUltimate ? this.game.spellManager?.ultimates?.axie : null);
      if (partner?.group && partner !== caster && !partner.isDead && !partner.isMoving && core.allies?.[0]) visuals.push({ unit: partner, dummy: core.allies[0], lab: core.ALLY_POS[0], base: partner.group.position.clone(), gx: partner.gridX, gz: partner.gridZ });
    }

    let resolveImpact, resolveDone;
    const untilImpact = new Promise((r) => { resolveImpact = r; });
    const done = new Promise((r) => { resolveDone = r; });
    const timer = setTimeout(() => resolveImpact(), Math.min(IMPACT_TIMEOUT, (ab.ti || 0.8) * 1000 + 600));
    const pb = {
      ab, te: 0, hold: 0, visuals, caster, casterBase: A.clone(), impacted: false, resolveImpact: () => { clearTimeout(timer); resolveImpact(); }, resolveDone,
      bloomBase: this.sm.bloomPass ? { s: this.sm.bloomPass.strength, t: this.sm.bloomPass.threshold } : null,
    };
    this.current = pb;
    this.update(0);
    // Fase 3 de audio: ti (s hasta el impacto) para que el sonido cuerpo a cuerpo caiga en el golpe del efecto
    return { untilImpact, done, stop: () => this.stop(), ti: ab.ti || 0.8 };
  }

  /**
   * Hito 104: posición en el laboratorio (antes de la deformación del pasillo) de un punto del tablero. Sirve para que un
   * efecto dibuje algo exactamente sobre otra unidad real (VFX.foes / VFX.friends). Se invierte el grupo raíz y luego la
   * deformación a lo largo del eje, buscando por bisección la posición que cae en ese punto.
   */
  _labOfWorld(world) {
    // Hito 105: la escala lateral ya no es la misma en todo el pasillo (áreas), así que se invierte con Newton en 3D
    const q = world.clone().applyMatrix4(this._mi.copy(this.root.matrixWorld).invert());
    const U = this.warpU, u = U.uVfxU.value, C = U.uVfxC.value, S = U.uVfxS.value;
    const h = 1e-3, J = new THREE.Matrix3(), e = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    const newton = (p) => {
      for (let i = 0; i < 40; i++) {
        const w = this._warpPoint(p.clone()), r = q.clone().sub(w);
        if (r.lengthSq() < 1e-10) break;
        const c = e.map((d) => this._warpPoint(p.clone().addScaledVector(d, h)).sub(w).multiplyScalar(1 / h));
        J.set(c[0].x, c[1].x, c[2].x, c[0].y, c[1].y, c[2].y, c[0].z, c[1].z, c[2].z);
        if (Math.abs(J.determinant()) < 1e-9) break;
        const step = r.applyMatrix3(J.clone().invert());
        if (step.length() > 1) step.setLength(1);
        p.add(step);
      }
      return p;
    };
    const err = (p) => this._warpPoint(p.clone()).distanceToSquared(q);
    // salidas: el punto tal cual, el extremo del objetivo (escala de la zona) y la bisección a lo largo del eje
    const tq = (q.x - C.x) * u.x + (q.y - C.y) * u.y + (q.z - C.z) * u.z;
    const lat = q.clone().sub(C).addScaledVector(u, -tq).multiplyScalar(1 / Math.max(1e-4, S.x));
    const at = (t) => { const p = C.clone().addScaledVector(u, t).add(lat); const w = this._warpPoint(p.clone()); return [(w.x - C.x) * u.x + (w.y - C.y) * u.y + (w.z - C.z) * u.z, p]; };
    let lo = -60, hi = 60;
    for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (at(mid)[0] < tq) lo = mid; else hi = mid; }
    let best = null, be = Infinity;
    for (const s0 of [at((lo + hi) / 2)[1], q.clone()]) { const p = newton(s0); const ev = err(p); if (ev < be) { be = ev; best = p; } if (be < 1e-8) break; }
    return best;
  }

  /** VFX.foes / VFX.friends: posiciones (laboratorio) de los rivales y aliados vivos del lanzador, el más cercano al objetivo primero. */
  _syncUnitsForFx(caster, B) {
    const core = this.core; if (!core) return;
    const units = (this.game.units || []).filter((u) => !u.isDead && u.group && u !== caster);
    const near = (a, b) => a.group.position.distanceToSquared(B) - b.group.position.distanceToSquared(B);
    // shield: si la unidad tiene escudo ahora mismo (Village Hero α suma daño por aliado con escudo)
    const lab = (u) => { const p = this._labOfWorld(u.group.position.clone()); return { x: p.x, z: p.z, shield: (u.shield || 0) > 0 }; };
    core.foes = units.filter((u) => u.team !== caster.team && !u._testDummyHidden).sort(near).slice(0, 8).map(lab);
    core.friends = units.filter((u) => u.team === caster.team).sort(near).slice(0, 8).map(lab);
  }

  /** Coloca el grupo raíz: espacio del laboratorio → línea lanzador (A) → objetivo (B) del tablero. */
  _placeRoot(A, B, labB, self, dirHint = null, labC = LAB_CASTER, ab = null) {
    const s = (GAME_UNIT_HEIGHT / LAB_DUMMY_HEIGHT) * this.scale;
    const uL = labB.clone().sub(labC); uL.y = 0;
    const labDist = uL.length() || 1; uL.divideScalar(labDist);
    let dW = B.clone().sub(A); dW.y = 0;
    let worldDist = dW.length();
    if (self || worldDist < 0.01) {
      // sobre sí mismo: hacia el enemigo más cercano; si no hay, hacia la derecha de la cámara
      const cam = this.sm.camera; const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion); right.y = 0;
      const hint = dirHint ? dirHint.clone().setY(0) : null;
      dW = hint && hint.lengthSq() > 1e-6 ? hint.normalize() : (right.lengthSq() > 1e-6 ? right.normalize() : new THREE.Vector3(1, 0, 0));
      worldDist = labDist * s;
    } else dW.divideScalar(worldDist);
    const alpha = Math.atan2(uL.z, uL.x) - Math.atan2(dW.z, dW.x);

    // pasillo: el objetivo del laboratorio (a labDist del lanzador) debe caer a worldDist / s
    this._setWarp(uL, labDist, self ? labDist : worldDist / s, labC, ab);

    const M = new THREE.Matrix4();
    const tmp = new THREE.Matrix4();
    M.makeTranslation(A.x, A.y, A.z)
      .multiply(tmp.makeRotationY(alpha))
      .multiply(new THREE.Matrix4().makeScale(s, s, s))
      .multiply(new THREE.Matrix4().makeTranslation(-labC.x, -labC.y, -labC.z));

    // espejo para que el «frente» del efecto (el +Z del laboratorio, hacia su cámara) mire a la cámara del juego
    const front = new THREE.Vector3(0, 0, 1).transformDirection(M);
    const mid = A.clone().add(B).multiplyScalar(0.5);
    const toCam = this.sm.camera.position.clone().sub(mid); toCam.y = 0;
    if (front.x * toCam.x + front.z * toCam.z < 0) {
      // reflejo respecto al plano vertical que contiene el eje del viaje (en el laboratorio: n = uL × Y)
      const n = new THREE.Vector3(-uL.z, 0, uL.x);
      const Rf = new THREE.Matrix4().set(
        1 - 2 * n.x * n.x, 0, -2 * n.x * n.z, 0,
        0, 1, 0, 0,
        -2 * n.z * n.x, 0, 1 - 2 * n.z * n.z, 0,
        0, 0, 0, 1);
      const Tl = new THREE.Matrix4().makeTranslation(labC.x, labC.y, labC.z);
      const Tli = new THREE.Matrix4().makeTranslation(-labC.x, -labC.y, -labC.z);
      M.multiply(Tl).multiply(Rf).multiply(Tli);
    }
    this.root.matrix.copy(M);
    this.root.matrixWorldNeedsUpdate = true;
    this.root.updateMatrixWorld(true);
    this._scale = s;

    // Hito 104: áreas alineadas con la cuadrícula. El efecto gira para mirar del lanzador al objetivo; en diagonal, una
    // cruz o un cuadrado girarían con él y saldrían de las casillas. VFX.gridSnap = ángulo (en el laboratorio) que hay que
    // girar las piezas de área alrededor del objetivo para que vuelvan a la cuadrícula del tablero (0 si el lanzamiento va
    // en línea recta). Los efectos con gridArea:'root' (todo ocurre en el objetivo) giran enteros; los demás alinean solo
    // sus piezas de área con VFX.sty.gridAlign(objeto, x, z).
    const thW = Math.atan2(dW.z, dW.x), thG = Math.round(thW / (Math.PI / 2)) * (Math.PI / 2);
    const gL = new THREE.Vector3(Math.cos(thG), 0, Math.sin(thG)).transformDirection(new THREE.Matrix4().copy(M).invert());
    let psi = Math.atan2(gL.z, gL.x) - Math.atan2(uL.z, uL.x);
    psi = Math.atan2(Math.sin(psi), Math.cos(psi));
    if (Math.abs(psi) < 1e-3) psi = 0;
    this.gridSnap = psi;
    if (this.core) this.core.gridSnap = psi;
    if (ab?.root) {
      const ga = ab.gridArea === 'root' ? psi : 0, P = labB;
      const c = Math.cos(-ga), sn = Math.sin(-ga);
      ab.root.rotation.set(0, -ga, 0);
      // giro alrededor del objetivo del laboratorio: posición = P − R·P
      ab.root.position.set(P.x - (c * P.x + sn * P.z), 0, P.z - (-sn * P.x + c * P.z));
      ab.root.updateMatrixWorld(true);
    }
  }

  /**
   * Prepara la deformación del pasillo. D = distancia lanzador → objetivo en el laboratorio; D2 = la que debe tener.
   * Zonas rígidas alrededor de cada extremo; si no caben (cuerpo a cuerpo), se comprimen un poco las dos por igual.
   */
  _setWarp(u, D, D2, labC = LAB_CASTER, ab = null) {
    const U = this.warpU;
    U.uVfxU.value.set(u.x, 0, u.z);
    U.uVfxC.value.copy(labC);
    // un efecto puede pedir zonas rígidas mayores (áreas en cruz: zoneTarget = la cruz entera, que no se deforme)
    const zc = ab?.zoneCaster || ZONE_CASTER, zt = ab?.zoneTarget || ZONE_TARGET;
    const rc = Math.min(zc, D * 0.4), rt = Math.min(zt, D * 0.45);
    const t0 = rc, t1 = D - rt;
    // círculos rígidos (Hito 104): alrededor del objetivo, el aura de una casilla y media; alrededor del lanzador, algo menos.
    // No pueden pasar de la mitad del camino del laboratorio (si no, se pisarían).
    // Cada punto se asigna al extremo que tenga más cerca, así que el círculo del objetivo puede ser grande aunque el
    // aliado del laboratorio esté cerca del lanzador (efectos sobre aliados: ALLY_POS a ~2,9 del lanzador).
    // Solo a ras de suelo (auras, marcas, polvo; lo que vuela sigue el pasillo) y cada punto con el extremo más cercano.
    // El del lanzador no pasa de un tercio del camino (con aliados, ALLY_POS está a ~2,9 y lo invadiría).
    const tR0 = Math.max(zt, ZONE_TARGET_RADIUS), cR0 = Math.min(Math.max(zc, ZONE_CASTER_RADIUS), D * 0.3);
    U.uVfxR.value.set(tR0, tR0 + RADIUS_BLEND, cR0, Math.min(cR0 + RADIUS_BLEND, D * 0.45));
    U.uVfxD.value = D;
    // Hito 105: habilidad de área (cruz, círculo): alrededor del objetivo, escala exacta de la casilla del tablero (aunque
    // el resto del efecto se encoja a 1–2 casillas o el jugador cambie el tamaño de los VFX) y radio que cubre el área.
    const aR = this._areaLabRadius;
    if (aR > 0) {
      const tA = Math.max(tR0, aR);
      U.uVfxR.value.x = tA; U.uVfxR.value.y = tA + RADIUS_BLEND;
      U.uVfxA.value.set(VFX_SCALE_DEFAULT / this.scale, 1);
    } else U.uVfxA.value.set(1, 0);
    if (Math.abs(D2 - D) < 1e-3) { U.uVfxK.value.set(t0, t1, t0, t1); U.uVfxS.value.set(1, 1, 1); return; }
    // Las zonas conservan su tamaño mientras quede pasillo suficiente. Si no (1–2 casillas), las zonas y todo el efecto
    // se encogen por igual en las tres direcciones (sin óvalos) y el pasillo guarda al menos MIN_CORRIDOR de la distancia,
    // para que lo que viaja recorra algo de camino en lugar de saltar.
    const f = Math.min(1, (D2 * (1 - MIN_CORRIDOR)) / (rc + rt));
    const a0 = rc * f, a1 = D2 - rt * f;
    U.uVfxK.value.set(t0, t1, a0, a1);
    U.uVfxS.value.set(f, (a1 - a0) / Math.max(1e-4, t1 - t0), f);
  }

  _syncProxy() {
    const cam = this.sm.camera;
    cam.updateMatrixWorld();
    this.root.updateMatrixWorld(true);
    this._mi.copy(this.root.matrixWorld).invert();
    this.warpU.uVfxRoot.value.copy(this.root.matrixWorld);
    this.warpU.uVfxRootInv.value.copy(this._mi);
    const p = this.proxy;
    p.matrixWorld.multiplyMatrices(this._mi, cam.matrixWorld);
    p.matrixWorldInverse.copy(p.matrixWorld).invert();
    p.matrixWorld.decompose(p.position, p.quaternion, p.scale);
    p.projectionMatrix.copy(cam.projectionMatrix);
    p.projectionMatrixInverse.copy(cam.projectionMatrixInverse);
    p.fov = cam.fov; p.aspect = cam.aspect; p.near = cam.near; p.far = cam.far;
    // tamaño de las partículas: píxeles por unidad a 1 m, en unidades del laboratorio
    const h = this.sm.renderer.domElement.height || 1;
    this.core.U.uPx.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) * this._scale;
  }

  // ------------------------------------------------------------ por fotograma
  update(dt) {
    const pb = this.current;
    if (!pb || !this.core) return;
    const ab = pb.ab;
    // tiempo con hit-stop en el impacto (congela el fotograma del golpe)
    if (pb.hold > 0) pb.hold -= dt;
    else {
      const next = pb.te + dt;
      const tier = this.core.TIER[this.core.tierOfAbility(ab)];
      if (!pb.impacted && pb.te < ab.ti && next >= ab.ti) {
        pb.te = ab.ti + 0.012; pb.hold = 0.07 * tier.hs; pb.impacted = true;
        pb.resolveImpact();
        if (tier.shake > 0) this.sm.shake?.(0.22 * tier.shake);
      } else pb.te = next;
    }
    this._syncProxy();
    // Muñecos del laboratorio: el módulo puede ocultar al lanzador, al objetivo o al aliado (saltos, transposiciones).
    // Se parte de «visible», se evalúa, se lee qué quiere el módulo y los muñecos vuelven a quedar siempre ocultos:
    // en el juego no se dibujan nunca; lo que se oculta es la unidad real.
    const core = this.core, dummies = [core.caster, core.target, ...(core.allies || []), ...(core.enemies || [])];
    for (const d of dummies) d.visible = true;
    const TT = core.evaluate(ab, Math.min(pb.te, ab.dur));
    const hidden = new Set(dummies.filter((d) => !d.visible));
    for (const d of dummies) d.visible = false;
    const O = core.O || {};
    // velo: entra en 0,15 s y sale en los últimos 0,35 s; o.dark del módulo lo oscurece más
    if (this.dim) {
      const a = Math.min(1, pb.te / 0.15) * Math.min(1, Math.max(0, (ab.dur - pb.te) / 0.35));
      // los efectos estilizados se leen sobre el tablero iluminado: sin velo (solo el o.dark que pida el módulo)
      const v = Math.max(ab.stylized ? 0 : DIM_ALPHA * a, Math.min(0.9, O.dark || 0));
      this.dim.material.uniforms.uA.value = v;
      this.dim.visible = v > 0.001;
    }
    if (this.white) {
      const w = Math.min(1, Math.max(0, O.white || 0)) * WHITE_GAIN * access.flashScale; // Hito 85: Reducir movimiento
      this.white.material.uniforms.uA.value = w;
      this.white.visible = w > 0.001;
    }
    // el combate usa luces físicas (r160): más intensidad para el mismo brillo. Los estilizados ya traen su brillo
    // pintado: con ×2,2 la luz lavaba el suelo de blanco bajo el impacto
    this.core.light.intensity *= ab.stylized ? 0.8 : 2.2;
    this._warpPoint(this.core.light.position);

    // bloom un poco más fuerte mientras dura el efecto
    // (con «Reducir movimiento» no hay pico de brillo: el bloom se queda como estaba)
    if (pb.bloomBase && this.sm.bloomPass && !access.reduceMotion && !ab.stylized) {
      this.sm.bloomPass.strength = Math.max(pb.bloomBase.s, 0.55 * TT.bloom);
      this.sm.bloomPass.threshold = Math.min(pb.bloomBase.t, 0.72);
    }

    // movimiento visual de las unidades
    const lin = new THREE.Matrix3().setFromMatrix4(this.root.matrixWorld);
    for (const v of pb.visuals) {
      const off = this._v.copy(v.dummy.position).sub(v.lab).applyMatrix3(lin);
      off.y = Math.max(0, off.y);
      if (v.unit === pb.caster) {
        // Hito 82b: el lanzador ataca en el sitio (solo su animación); nunca se desliza hacia la casilla del objetivo
        off.x = 0; off.z = 0;
      } else {
        // los demás solo retroceden un poco, en la dirección contraria al lanzador
        const ax = v.base.x - pb.casterBase.x, az = v.base.z - pb.casterBase.z, al = Math.hypot(ax, az);
        const back = al > 1e-3 ? THREE.MathUtils.clamp((off.x * ax + off.z * az) / al, 0, MAX_RECOIL) : 0;
        off.x = al > 1e-3 ? (ax / al) * back : 0; off.z = al > 1e-3 ? (az / al) * back : 0;
      }
      if (!v.unit.isMoving && !v.unit.isDead && v.gx === v.unit.gridX && v.gz === v.unit.gridZ) v.unit.group.position.copy(v.base).add(off);
      const hide = hidden.has(v.dummy) && !v.unit.isDead;
      if (hide !== Boolean(v.hidden)) { v.unit.group.visible = !hide; v.hidden = hide; }
    }

    if (pb.te >= ab.dur) this.stop();
  }

  stop() {
    const pb = this.current;
    if (!pb) return;
    this.current = null;
    for (const v of pb.visuals) {
      // Hito 82: vuelve al centro de la casilla en la que está AHORA (si un empujón la cambió, `base` ya no vale)
      if (!v.unit.isMoving) {
        if (v.gx === v.unit.gridX && v.gz === v.unit.gridZ) v.unit.group.position.copy(v.base);
        else v.unit.settleToTile?.();
      }
      if (v.hidden) { v.unit.group.visible = true; v.hidden = false; }
    }
    if (pb.bloomBase && this.sm.bloomPass) { this.sm.bloomPass.strength = pb.bloomBase.s; this.sm.bloomPass.threshold = pb.bloomBase.t; }
    pb.ab.root.visible = false;
    if (this.core) { this.core.glow.visible = false; this.core.light.intensity = 0; }
    if (this.dim) { this.dim.visible = false; this.dim.material.uniforms.uA.value = 0; }
    if (this.white) { this.white.visible = false; this.white.material.uniforms.uA.value = 0; }
    pb.resolveImpact();
    pb.resolveDone();
  }

  // ------------------------------------------------------------ consola
  extendDebug() {
    if (typeof window === 'undefined') return;
    const d = (window.lkDebug ||= {});
    d.vfx = (on) => {
      if (on === undefined) {
        const info = { activo: this.enabled, todasLasCartas: this.allCards, piloto: this.pilot.size, construidos: this.core ? Object.values(this.core.ABS).filter((a) => a.built).length : 0, reproduciendo: this.current?.ab.key || null };
        console.table(info); return info;
      }
      return this.setEnabled(on);
    };
    d.vfxScale = (v) => (v === undefined ? this.scale : this.setScale(v)); // lkDebug.vfxScale(1.6) · lkDebug.vfxScale(null) = por defecto
    d.vfxAll = (on = true) => { this.allCards = !!on; return this.prepare(this.game.units || []); };
    // piloto del estilo nuevo: lkDebug.vfxEstilo(true) · lkDebug.vfxEstilo(false) · lkDebug.vfxEstilo() = estado
    d.vfxEstilo = (on) => {
      if (on === undefined) { const info = { estilo: this.stylePilot, efectos: [...Object.keys(STYLE_PILOT), `${ENEMY_VFX.size} ataques de enemigos`] }; console.table(info.efectos); return info; }
      this.setStylePilot(on);
      return this.prepare(this.game.units || []).then(() => this.stylePilot);
    };
    d.vfxPlay = async (cardId, from = null, to = null, spellOverride = null) => {
      // Hito 102: getSpell devuelve el Mordisco de quimera si no conoce el id (Ultimates, gólems, claves sty_…)
      const known = this.game.spellManager.getSpell(cardId);
      const spell = spellOverride || (known && known.id === cardId ? known : { id: cardId });
      const eff = this.effectFor(spell);
      const fx = eff ? [eff.key, eff.module] : (CARD_VFX[this.cardIdFor(spell) || cardId] || (/^golem_(pulse|break)_/.test(cardId) ? [cardId, GOLEM_KIND_MODULE[cardId.split('_')[2]]] : /^sty_(craft|shepard|lunalogist|stargazer)_/.test(cardId) ? [cardId, STYLE_SAPIDAE_MODULE[cardId.split('_')[1]]] : /^sty__/.test(cardId) ? [cardId, STYLE_ENEMY_MODULE] : /^sty_basic_/.test(cardId) ? [cardId, `estilizado-${/^sty_basic_(mordisco|zarpazo|golpe|embestida|estocada|golpe_sismico|giro_empuje)$/.test(cardId) ? 'cuerpo' : /^sty_basic_(escupitajo|baba_pegajosa|flecha|proyectil_magico|rafaga|nova_cruz|cataclismo)$/.test(cardId) ? 'distancia' : 'apoyo'}`] : styCardFx(cardId) || (/^sty_/.test(cardId) ? [cardId, STYLE_PILOT_MODULE] : null)));
      if (!fx) throw new Error(`[vfx] ${cardId} no tiene efecto`);
      await this._ensureCore();
      await loadVfxModules(this._base(), [fx[1]]);
      const ab = this.core.ABS[fx[0]]; this.core.ensureBuilt(ab); this._patchWarp(ab.root);
      const units = (this.game.units || []).filter((u) => !u.isDead);
      const caster = from || this.game.activeUnit || units.find((u) => u.team === 'player');
      const target = to || units.filter((u) => u.team !== caster.team).sort((a, b) => Math.hypot(a.gridX - caster.gridX, a.gridZ - caster.gridZ) - Math.hypot(b.gridX - caster.gridX, b.gridZ - caster.gridZ))[0] || caster;
      return this.play(ab, caster, { x: target.gridX, z: target.gridZ }, { spell, targetUnit: target }).done;
    };
  }
}
