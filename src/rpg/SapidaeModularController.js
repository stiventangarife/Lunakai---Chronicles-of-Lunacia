// SapidaeModularController.js - Modular Equipment & Customization Controller for Sapidae
import * as THREE from '../../vendor/three.module.js';
import { ITEMS_DB } from '../tactics/ItemDatabase.js';

export const HORN_STYLES = [
  { id: 'base', name: 'Cuernos Base Sapidae', icon: '🦬', desc: 'Cuernos curvados originales de Sapidae a los costados de la cabeza' },
  { id: 'beast', name: 'Cuernos de Bestia', icon: '⚡', desc: 'Cuernos curvados feroces arqueados hacia arriba y atrás' },
  { id: 'spiral', name: 'Cornamenta de Carnero', icon: '🌀', desc: 'Cuernos espirales curvos protectores de Lunacia' },
  { id: 'dragon', name: 'Cuernos Dracónicos', icon: '🐉', desc: 'Cuernos afilados de dragón ascendentes' },
  { id: 'astral', name: 'Cristales Astrales', icon: '✨', desc: 'Astas cristalinas con brillo etéreo lunar' },
  { id: 'deer', name: 'Astas Silvanas', icon: '🦌', desc: 'Astas ramificadas del bosque lunar' }
];

export const HORN_COLORS = [
  { name: 'Original Base', hex: 'original', sample: '#f59e0b' },
  { name: 'Dorado Solar', hex: '#f59e0b', sample: '#f59e0b' },
  { name: 'Hueso Astral', hex: '#f8fafc', sample: '#f8fafc' },
  { name: 'Obsidiana Lunar', hex: '#0f172a', sample: '#0f172a' },
  { name: 'Carmesí Ferviente', hex: '#dc2626', sample: '#dc2626' },
  { name: 'Verde Jade', hex: '#10b981', sample: '#10b981' },
  { name: 'Cian Místico', hex: '#06b6d4', sample: '#06b6d4' },
  { name: 'Púrpura Sombrío', hex: '#7c3aed', sample: '#7c3aed' },
  { name: 'Bronce Ancestral', hex: '#92400e', sample: '#92400e' }
];

export const EYE_SHAPES = [
  { id: 'round', name: 'Redondeados', icon: '👀', desc: 'Ojos grandes y expresivos de anime clásico' },
  { id: 'medium', name: 'Medianos', icon: '👁️', desc: 'Ojos proporcionados y serenos' },
  { id: 'almond', name: 'Rasgados', icon: '🐱', desc: 'Ojos almendrados y estilizados tipo orientales / felinos' }
];
export const EYE_TRAITS = EYE_SHAPES; // backwards compatibility

export const PUPIL_COLORS = [
  { name: 'Carmesí Original', hex: 'original', sample: '#dc2626' },
  { name: 'Azul Zafiro', hex: '#0284c7', sample: '#0284c7' },
  { name: 'Verde Esmeralda', hex: '#10b981', sample: '#10b981' },
  { name: 'Ámbar Místico', hex: '#d97706', sample: '#d97706' },
  { name: 'Púrpura Arcano', hex: '#8b5cf6', sample: '#8b5cf6' },
  { name: 'Obsidiana Oscuro', hex: '#0f172a', sample: '#0f172a' },
  { name: 'Rosa Magenta', hex: '#ec4899', sample: '#ec4899' },
  { name: 'Cian Eléctrico', hex: '#06b6d4', sample: '#06b6d4' },
  { name: 'Dorado Solar', hex: '#eab308', sample: '#eab308' }
];

export const HAIR_STYLES = [
  { id: 'braids', name: 'Coletas Ema', icon: '🎀', desc: 'Trenzas dobles tradicionales de Ema con lazos' },
  { id: 'short', name: 'Corte Bob Corto', icon: '✂️', desc: 'Cabello corto ágil para el combate veloz' },
  { id: 'bun', name: 'Moño Samurai', icon: '🍙', desc: 'Recogido alto estilizado de disciplina marcial' },
  { id: 'long', name: 'Melena Larga', icon: '✨', desc: 'Cabello largo suelto que ondea en la batalla' }
];

export const HAIR_COLORS = [
  { name: 'Carmesí Original', hex: 'original', sample: '#b91c1c' },
  { name: 'Negro Azabache', hex: '#1e293b', sample: '#1e293b' },
  { name: 'Castaño Roble', hex: '#451a03', sample: '#451a03' },
  { name: 'Rubio Dorado', hex: '#eab308', sample: '#eab308' },
  { name: 'Blanco Plateado', hex: '#f8fafc', sample: '#f8fafc' },
  { name: 'Cian Astral', hex: '#0284c7', sample: '#0284c7' },
  { name: 'Rosa Sakura', hex: '#f472b6', sample: '#f472b6' },
  { name: 'Verde Jade', hex: '#059669', sample: '#059669' },
  { name: 'Carmesí Ferviente', hex: '#dc2626', sample: '#dc2626' },
  { name: 'Púrpura Arcano', hex: '#7c3aed', sample: '#7c3aed' },
  { name: 'Naranja Fuego', hex: '#ea580c', sample: '#ea580c' }
];

export const SUIT_COLORS = [
  { name: 'Rojo Carmesí Original', hex: 'original', sample: '#b91c1c' },
  { name: 'Azul Cobalto', hex: '#1d4ed8', sample: '#1d4ed8' },
  { name: 'Verde Esmeralda', hex: '#15803d', sample: '#15803d' },
  { name: 'Púrpura Real', hex: '#7e22ce', sample: '#7e22ce' },
  { name: 'Negro Obsidiana', hex: '#1e293b', sample: '#1e293b' },
  { name: 'Dorado Solar', hex: '#d97706', sample: '#d97706' },
  { name: 'Cian Astral', hex: '#0284c7', sample: '#0284c7' },
  { name: 'Blanco Níveo', hex: '#f1f5f9', sample: '#f1f5f9' },
  { name: 'Escarlata Pasión', hex: '#e11d48', sample: '#e11d48' },
  { name: 'Ámbar Cálido', hex: '#b45309', sample: '#b45309' }
];

// ---------------------------------------------------------------------------------------------------------
// Modelos nuevos Ema / Kai (21-oct): piezas reales intercambiables y expresiones por atlas.
// Ojos y boca usan una textura 2 × 2: cada expresión es un desplazamiento de UV (u, v) de 0 o 0,5.
export const V2_EYE_EXPRESSIONS = [
  { id: 'normal', name: 'Normal', desc: 'Mirada tranquila', uv: [0, 0] },
  { id: 'happy', name: 'Alegre', desc: 'Ojos cerrados de felicidad', uv: [0.5, 0] },
  { id: 'angry', name: 'Enfadada', desc: 'Ceño fruncido, lista para pelear', uv: [0.5, 0.5] },
];
export const V2_MOUTH_EXPRESSIONS = [
  { id: 'smile', name: 'Sonrisa', desc: 'Sonrisa suave', uv: [0, 0] },
  { id: 'open', name: 'Risa', desc: 'Boca abierta', uv: [0.5, 0] },
  { id: 'cat', name: 'Gatuna', desc: 'Boquita en «w»', uv: [0, 0.5] },
  { id: 'o', name: 'Sorpresa', desc: 'Boquita en «o»', uv: [0.5, 0.5] },
];
/** Peinados por base (f = Ema, m = Kai). El id «braids» es el de siempre, así las partidas viejas siguen igual. */
export const V2_HAIR_STYLES = {
  f: [
    { id: 'braids', name: 'Melena corta', desc: 'Melena corta y ondulada, el peinado de Ema', img: 'hair_ema_a' },
    { id: 'long', name: 'Coleta alta', desc: 'Coleta alta con lazo turquesa', img: 'hair_ema_b' },
  ],
  m: [{ id: 'braids', name: 'Despeinado', desc: 'El pelo alborotado de Kai', img: 'hair_kai_a' }],
};
export const V2_OUTFITS = {
  f: [
    { id: 'a', name: 'Kimono', desc: 'Kimono rojo y botas', img: 'outfit_ema_a' },
    { id: 'b', name: 'Viajera', desc: 'Chaqueta amarilla y pantalón azul', img: 'outfit_ema_b' },
  ],
  m: [{ id: 'a', name: 'Chaqueta', desc: 'Chaqueta turquesa y pantalón azul', img: 'outfit_kai_a' }],
};
// Kai (modelo del 21-oct, 2.ª versión): piezas A–E separadas. Cada peinado tiene su cabeza (el pelo pintado en la
// frente y las cejas es del mismo color), los ojos y la boca son mallas con su propia textura y hay 5 camisas.
const KAI_PART_RE = /^(Kai|Ema)_(body|pants|eyes|hair|head|mouth|shirt|horns|cheek|hat)(?:_([A-E]))?(_in)?$/; // también Ema (21-oct, 2.ª versión)
export const KAI_HAIR_STYLES = [
  { id: 'a', name: 'Rubio', desc: 'Pelo rubio en punta', img: 'hair_kai_a' },
  { id: 'b', name: 'Moño', desc: 'Moño alto cobrizo', img: 'hair_kai_b' },
  { id: 'c', name: 'Plateado', desc: 'Pelo blanco recogido', img: 'hair_kai_c' },
  { id: 'd', name: 'Castaño', desc: 'Pelo castaño corto', img: 'hair_kai_d' },
  { id: 'e', name: 'Ceniza', desc: 'Pelo gris azulado en punta', img: 'hair_kai_e' },
];
export const KAI_EYE_EXPRESSIONS = [
  { id: 'a', name: 'Normal', img: 'eyes_kai_a' },
  { id: 'b', name: 'Sorprendido', img: 'eyes_kai_b' },
  { id: 'c', name: 'Alegre', img: 'eyes_kai_c' },
  { id: 'd', name: 'Confiado', img: 'eyes_kai_d' },
  { id: 'e', name: 'Enfadado', img: 'eyes_kai_e' },
];
export const KAI_MOUTH_EXPRESSIONS = [
  { id: 'a', name: 'Sonrisa', img: 'mouth_kai_a' },
  { id: 'b', name: 'Gatuna', img: 'mouth_kai_b' },
  { id: 'e', name: 'Molesto', img: 'mouth_kai_e' },
];
export const KAI_SHIRTS = [
  { id: 'a', name: 'Verde', img: 'outfit_kai_a' },
  { id: 'b', name: 'Turquesa', img: 'outfit_kai_b' },
  { id: 'c', name: 'Azul', img: 'outfit_kai_c' },
  { id: 'd', name: 'Naranja', img: 'outfit_kai_d' },
  { id: 'e', name: 'Morada', img: 'outfit_kai_e' },
];
export const KAI_DEFAULTS = { hairStyle: 'a', eyeExpr: 'a', mouthExpr: 'a', outfit: 'd' };
// Ema (2.ª versión, 21-oct): misma estructura que Kai; por defecto la camisa B.
export const EMA_HAIR_STYLES = [
  { id: 'a', name: 'Trenza', desc: 'Melena rubia con trenza', img: 'hair_ema2_a' },
  { id: 'b', name: 'Rizos', desc: 'Rizos cobrizos', img: 'hair_ema2_b' },
  { id: 'c', name: 'Larga', desc: 'Melena larga platino', img: 'hair_ema2_c' },
  { id: 'd', name: 'Despeinada', desc: 'Media melena castaña', img: 'hair_ema2_d' },
  { id: 'e', name: 'Moño', desc: 'Moño gris azulado', img: 'hair_ema2_e' },
];
export const EMA_EYE_EXPRESSIONS = [
  { id: 'a', name: 'Normal', img: 'eyes_ema2_a' },
  { id: 'b', name: 'Coqueta', img: 'eyes_ema2_b' },
  { id: 'c', name: 'Decidida', img: 'eyes_ema2_c' },
  { id: 'd', name: 'Tranquila', img: 'eyes_ema2_d' },
  { id: 'e', name: 'Ilusionada', img: 'eyes_ema2_e' },
];
export const EMA_MOUTH_EXPRESSIONS = [
  { id: 'a', name: 'Pequeña', img: 'mouth_ema2_a' },
  { id: 'b', name: 'Gatuna', img: 'mouth_ema2_b' },
  { id: 'c', name: 'Enfadada', img: 'mouth_ema2_c' },
  { id: 'd', name: 'Sorpresa', img: 'mouth_ema2_d' },
  { id: 'e', name: 'Sonrisa', img: 'mouth_ema2_e' },
];
export const EMA_DEFAULTS = { hairStyle: 'b', eyeExpr: 'a', mouthExpr: 'e', outfit: 'b' };
/** Expresiones genéricas del combate (las de Ema) → ojos / boca de Kai. */
const KAI_EYE_ALIAS = { normal: 'a', happy: 'c', sly: 'd', angry: 'e' };
const KAI_MOUTH_ALIAS = { smile: 'a', open: 'b', cat: 'b', o: 'e', c: 'a', d: 'a' }; // c / d: bocas retiradas
const EMA2_EYE_ALIAS = { normal: 'a', happy: 'd', sly: 'b', angry: 'c' }; // combate: atacar → Decidida; daño → Tranquila
const EMA2_MOUTH_ALIAS = { smile: 'e', open: 'c', cat: 'b', o: 'd' }; // atacar → Enfadada; daño → Sorpresa
/** Listas y valores por defecto de cada base de piezas A–E. */
export const PIECE_SETS = {
  m: { hair: KAI_HAIR_STYLES, eyes: KAI_EYE_EXPRESSIONS, mouth: KAI_MOUTH_EXPRESSIONS, defaults: KAI_DEFAULTS, eyeAlias: KAI_EYE_ALIAS, mouthAlias: KAI_MOUTH_ALIAS },
  f: { hair: EMA_HAIR_STYLES, eyes: EMA_EYE_EXPRESSIONS, mouth: EMA_MOUTH_EXPRESSIONS, defaults: EMA_DEFAULTS, eyeAlias: EMA2_EYE_ALIAS, mouthAlias: EMA2_MOUTH_ALIAS },
};
const kaiId = (v, list, alias, def) => (list.some((x) => x.id === v) ? v : (alias[v] || def));
const V2_PART_RE = /^(?:Ema|Kai)_(face_blush|face_eyes|face_mouth|hair|hair_B|hat|head|horns_A|horns_B|horns_C|legs|legs_B|top|top_B)$/;
/** Tela que se recolorea en cada atuendo: «red» = regla de siempre (kimono rojo); si no, el tono dominante (grados). */
const V2_CLOTH = { Ema_top: { red: true }, Ema_top_B: { hue: 44, tol: 16, minSat: 0.45 }, Kai_top: { hue: 192, tol: 18, minSat: 0.3 },
  Kai_shirt_A: { hue: 110, tol: 14, minSat: 0.3 }, Kai_shirt_B: { hue: 180, tol: 12, minSat: 0.3 }, Kai_shirt_C: { hue: 205, tol: 12, minSat: 0.3 },
  Kai_shirt_D: { hue: 7, tol: 10, minSat: 0.4 }, Kai_shirt_E: { hue: 285, tol: 14, minSat: 0.3 },
  Ema_shirt_A: { hue: 110, tol: 14, minSat: 0.3 }, Ema_shirt_B: { hue: 180, tol: 12, minSat: 0.3 }, Ema_shirt_C: { hue: 205, tol: 12, minSat: 0.3 },
  Ema_shirt_D: { hue: 7, tol: 10, minSat: 0.4 }, Ema_shirt_E: { hue: 285, tol: 14, minSat: 0.3 } };

// Preset themes for equipped hats in the MMO / Tactics
export const HAT_THEMES = {
  straw_hat: { color: 0xd97706, roughness: 0.85, metalness: 0.05, name: 'Sombrero de Paja' },
  apprentice_hat: { color: 0x312e81, roughness: 0.5, metalness: 0.15, name: 'Gorro de Aprendiz' },
  feather_hood: { color: 0x166534, roughness: 0.7, metalness: 0.1, name: 'Capucha de Plumas' },
  beast_helmet: { color: 0x991b1b, roughness: 0.45, metalness: 0.4, name: 'Yelmo Bestial' },
  crown_of_lunacia: { color: 0xfbbf24, roughness: 0.25, metalness: 0.8, emissive: 0xb45309, name: 'Corona de Lunacia' },
  champion_crown: { color: 0xeab308, roughness: 0.2, metalness: 0.85, emissive: 0x78350f, name: 'Corona de Campeón' },
  atia_crown: { color: 0x38bdf8, roughness: 0.2, metalness: 0.75, emissive: 0x0284c7, name: 'Corona de Atia' },
  nomad_turban: { color: 0xb45309, roughness: 0.9, metalness: 0.05, name: 'Turbante Nómada' },
  desert_turban: { color: 0xd97706, roughness: 0.9, metalness: 0.05, name: 'Turbante del Desierto' }
};

// Preset themes for equipped body armors / robes
export const BODY_THEMES = {
  traveler_cloak: { color: 0x1e3a8a, roughness: 0.8, metalness: 0.05 },
  leather_armor: { color: 0x78350f, roughness: 0.75, metalness: 0.1 },
  bronze_armor: { color: 0xb45309, roughness: 0.4, metalness: 0.6 },
  iron_armor: { color: 0x475569, roughness: 0.35, metalness: 0.7 },
  chitin_armor: { color: 0x065f46, roughness: 0.5, metalness: 0.3 },
  obsidian_plate: { color: 0x09090b, roughness: 0.25, metalness: 0.85 },
  astral_robe: { color: 0x1e1b4b, emissive: 0x0369a1, roughness: 0.4, metalness: 0.2 },
  titan_mail: { color: 0x334155, roughness: 0.3, metalness: 0.8 }
};

// ---------------------------------------------------------------------------------------------------------
// Pelo blanco (18-oct): versión en escala de grises de la textura del pelo, normalizada para que sus zonas
// más claras sean blancas. Multiplicada por el color elegido da ese color con las sombras del dibujo original.
// Se calcula una vez por textura (caché por uuid) y conserva su orientación, repetición y espacio de color.
const _whiteHairCache = new Map();
function whiteHairTexture(src) {
  if (!src || !src.image) return null;
  if (_whiteHairCache.has(src.uuid)) return _whiteHairCache.get(src.uuid);
  const img = src.image;
  const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
  if (!w || !h || typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  try { ctx.drawImage(img, 0, 0, w, h); } catch { return null; }
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  // Luminancia de cada píxel y el «blanco» de referencia (percentil 98 de los píxeles visibles)
  const lum = new Float32Array(w * h);
  const hist = new Uint32Array(256);
  let count = 0;
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    lum[j] = l;
    if (px[i + 3] > 8 && l > 4) { hist[Math.min(255, l | 0)]++; count++; }
  }
  let ref = 255;
  for (let acc = 0, k = 255; k >= 0; k--) { acc += hist[k]; if (acc >= count * 0.02) { ref = Math.max(24, k); break; } }
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const v = Math.min(255, Math.round(255 * Math.pow(Math.min(1, lum[j] / ref), 0.85)));
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  ['flipY', 'wrapS', 'wrapT', 'magFilter', 'minFilter', 'anisotropy', 'colorSpace', 'channel', 'generateMipmaps'].forEach((k) => { if (src[k] !== undefined) tex[k] = src[k]; });
  tex.repeat.copy(src.repeat); tex.offset.copy(src.offset); tex.center.copy(src.center); tex.rotation = src.rotation;
  tex.name = `${src.name || 'hair'}_white`;
  tex.needsUpdate = true;
  _whiteHairCache.set(src.uuid, tex);
  return tex;
}

export class SapidaeModularController {
  constructor() {
    this._hornsCache = new Map();
    this._textureCache = new Map();
  }

  /**
   * Scans a loaded Sapidae model and collects its modular submeshes and anchor bones.
   */
  getModularParts(model) {
    if (!model) return null;

    const v2 = this._getV2Parts(model);
    if (v2) return v2;

    const parts = {
      hat: null,
      top: null,
      legs: null,
      hair: null,
      eyes: null,
      head: null,
      cheek: null,
      mouth: null,
      headBone: null,
      chestBone: null,
      weaponBoneR: null,
      weaponBoneL: null
    };

    model.traverse(child => {
      const lower = (child.name || '').toLowerCase();
      if (child.userData?.isOutlineMesh || lower.includes(':toonoutline') || lower.includes(':axieoutline') || lower.includes('outline')) {
        return;
      }
      if (child.isMesh || child.isSkinnedMesh) {
        if (lower.includes('hat')) parts.hat = child;
        else if (lower.includes('top') || lower.includes('shirt')) parts.top = child;
        else if (lower.includes('legs') || lower.includes('pants')) parts.legs = child;
        else if (lower.includes('hair')) parts.hair = child;
        else if (lower.includes('eyes') || lower.includes('eye')) parts.eyes = child;
        else if (lower.includes('head')) parts.head = child;
        else if (lower.includes('cheek')) parts.cheek = child;
        else if (lower.includes('mouth')) parts.mouth = child;
      }

      if (child.isBone || child.type === 'Bone') {
        if (child.name === 'Head_M' || lower.includes('head_m')) parts.headBone = child;
        if (child.name === 'Spine1_M' || child.name === 'Spine_M' || lower.includes('spine')) parts.chestBone = child;
        if (child.name === 'Weapon_R' || lower.includes('weapon_r')) parts.weaponBoneR = child;
        if (child.name === 'Weapon_L' || lower.includes('weapon_l')) parts.weaponBoneL = child;
      }
    });

    // Fallbacks if bones have different casing
    if (!parts.headBone) {
      parts.headBone = model.getObjectByName('Head_M') || model.getObjectByName('head') || parts.head;
    }
    if (!parts.chestBone) {
      parts.chestBone = model.getObjectByName('Spine1_M') || model.getObjectByName('Spine_M') || parts.headBone?.parent;
    }
    if (!parts.weaponBoneR) {
      parts.weaponBoneR = model.getObjectByName('Weapon_R') || model.getObjectByName('Wrist_R') || model.getObjectByName('lower_arm.R');
    }
    if (!parts.weaponBoneL) {
      parts.weaponBoneL = model.getObjectByName('Weapon_L') || model.getObjectByName('Wrist_L') || model.getObjectByName('lower_arm.L');
    }

    return parts;
  }

  // ------------------------------------------------------------------ modelos Ema / Kai (21-oct)
  /** Piezas del modelo nuevo (o null si es un modelo antiguo). La variante activa sale de model.userData.sapiLook. */
  /** Piezas de Kai (A–E). Devuelve null si el modelo no es este Kai. */
  _getKaiParts(model) {
    const g = {};
    model.traverse((c) => {
      if (!(c.isMesh || c.isSkinnedMesh) || c.userData?.isOutlineMesh || /outline/i.test(c.name || '')) return;
      const m = KAI_PART_RE.exec(c.name || '');
      if (!m) return;
      g.prefix ||= m[1];
      if (m[4]) { (g[`${m[2]}In`] ||= {})[(m[3] || '').toLowerCase()] = c; return; } // Ema_mouth_C_in: siempre oculta
      if (m[3]) { (g[m[2]] ||= {})[m[3].toLowerCase()] = c; } else g[m[2]] = c;
    });
    if (!g.eyes || !g.hair || !g.head || !g.eyes.a) return null;
    const gender = g.prefix === 'Ema' ? 'f' : 'm', D = PIECE_SETS[gender].defaults;
    const look = model.userData.sapiLook || {};
    const pick = (grp, id, def) => grp?.[id] || grp?.[def] || Object.values(grp || {})[0] || null;
    const bone = (n) => model.getObjectByName(n);
    const hairId = look.hair || D.hairStyle;
    return {
      v2: true, kai: true, gender, groups: g, found: {},
      hat: g.hat || null, cheek: g.cheek || null,
      top: pick(g.shirt, look.outfit || D.outfit, D.outfit),
      legs: g.pants || null,
      hair: pick(g.hair, hairId, 'a'),
      head: pick(g.head, hairId, 'a'),
      eyes: pick(g.eyes, look.eyes || D.eyeExpr, 'a'),
      mouth: pick(g.mouth, look.mouth || D.mouthExpr, 'a'),
      horns: { a: g.horns?.a, b: g.horns?.b, c: g.horns?.c },
      headBone: bone('Head_M') || g.head.a,
      chestBone: bone('Spine1_M') || bone('Chest_M'),
      weaponBoneR: bone('Weapon_R') || bone('Wrist_R'),
      weaponBoneL: bone('Weapon_L') || bone('Wrist_L'),
    };
  }

  /** Muestra solo la pieza elegida de cada grupo de Kai. */
  _showKaiGroup(model, grp, id) {
    Object.entries(grp || {}).forEach(([k, mesh]) => this._setPartVisible(model, mesh, k === id));
  }

  /** Personalización de Kai: peinado (con su cabeza), ojos, boca, camisa; color de ojos y de cuernos. */
  _applyCustomizationKai(model, c = {}) {
    const P = PIECE_SETS[this._getKaiParts(model).gender], D = P.defaults;
    const look = {
      hair: kaiId(c.hairStyle, P.hair, {}, D.hairStyle),
      outfit: D.outfit, // siempre su camisa (Kai D, Ema B); se personaliza su color (suitColor)
      eyes: kaiId(c.eyeExpr, P.eyes, P.eyeAlias, D.eyeExpr),
      mouth: kaiId(c.mouthExpr, P.mouth, P.mouthAlias, D.mouthExpr),
      horns: 'a',
    };
    model.userData.sapiLook = look;
    const parts = this._getKaiParts(model), g = parts.groups;
    if (g.hat) this._setPartVisible(model, g.hat, false); // sin sombrero
    if (g.cheek) this._tintMesh(g.cheek, '#ffffff');
    this._hideHeadHorns(parts.head, g.horns?.a);
    this._showKaiGroup(model, g.hair, look.hair);
    this._showKaiGroup(model, g.head, look.hair);
    this._showKaiGroup(model, g.shirt, look.outfit);
    this._showKaiGroup(model, g.eyes, look.eyes);
    this._showKaiGroup(model, g.mouth, look.mouth);
    this._showKaiGroup(model, g.mouthIn, null); // Ema_mouth_C_in sobra: la boca C ya trae su dibujo
    this._showKaiGroup(model, g.horns, 'a');
    // Color de ojos: el iris de las 5 texturas de ojos
    Object.values(g.eyes).forEach((mesh) => {
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!mat) return;
      if (!mat.userData.origMap && mat.map) mat.userData.origMap = mat.map;
      const img = mat.userData.origMap?.image;
      const rec = c.eyes && c.eyes !== 'original' && img ? this._recolorPupilTexture(img, c.eyes) : null;
      mat.map = rec || mat.userData.origMap || mat.map;
      mat.color.setHex(0xffffff);
      mat.needsUpdate = true;
    });
    this._applyV2HornColor(parts, c.hornColor || 'original');
    [parts.top, parts.legs, g.body].forEach((mesh) => mesh && this._tintMesh(mesh, '#ffffff'));
    // Camisa: color de la tela (la D por defecto)
    Object.values(g.shirt || {}).forEach((mesh) => this._recolorClothV2(mesh, c.suitColor || 'original'));
    // Pelo y cabeza del mismo color: el pelo con su versión blanca teñida; la cabeza solo en la zona pintada de pelo
    const hairColor = c.hair && c.hair !== 'original' ? c.hair : null;
    const hairMesh = g.hair[look.hair], headMesh = g.head[look.hair];
    Object.values(g.hair).forEach((mesh) => { this._setHairWhiteMap(mesh, Boolean(hairColor) && mesh === hairMesh); this._tintMesh(mesh, hairColor && mesh === hairMesh ? hairColor : '#ffffff'); });
    Object.values(g.head).forEach((mesh) => {
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!mat) return;
      if (!mat.userData.origMap && mat.map) mat.userData.origMap = mat.map;
      const tinted = hairColor && mesh === headMesh ? this._kaiTintedHead(g.head, mesh, hairColor) : null;
      const next = tinted || mat.userData.origMap || mat.map;
      if (mat.map !== next) { mat.map = next; mat.needsUpdate = true; }
    });
    model.userData.sapiExpression = { eyes: look.eyes, mouth: look.mouth };
    this._releaseUnusedVariantTextures(model, [g.hair, g.head, g.shirt, g.hat ? { hat: g.hat } : null]);
    return parts;
  }

  /**
   * Memoria: las variantes de peinado, cabeza, camisa y el sombrero que no se ven no ocupan la tarjeta
   * gráfica. Sus texturas se liberan de la GPU (siguen en memoria: el recoloreado las necesita) y se marcan
   * para que el precalentado no las vuelva a subir. Si una variante se vuelve a mostrar, three.js la sube
   * sola al dibujarla. Los ojos y bocas no se tocan: son expresiones que cambian durante el juego.
   */
  _releaseUnusedVariantTextures(model, groups) {
    const texOf = (mesh) => {
      const out = new Set();
      for (const mat of [].concat(mesh.material || [])) {
        if (!mat) continue;
        if (mat.map) out.add(mat.map);
        if (mat.userData && mat.userData.origMap) out.add(mat.userData.origMap);
      }
      return out;
    };
    const keep = new Set(), drop = new Set();
    for (const grp of groups) {
      if (!grp) continue;
      for (const mesh of Object.values(grp)) {
        if (!mesh) continue;
        const target = mesh.visible ? keep : drop;
        texOf(mesh).forEach((t) => target.add(t));
      }
    }
    keep.forEach((t) => { if (t.userData) t.userData.lkNoPrewarm = false; });
    drop.forEach((t) => {
      if (keep.has(t)) return;
      if (!t.userData) t.userData = {};
      if (t.userData.lkNoPrewarm) return; // ya liberada
      t.userData.lkNoPrewarm = true;
      t.dispose(); // libera la copia de la GPU; la imagen se conserva
    });
  }

  /** Zona de pelo de las cabezas de Kai: los píxeles en los que las 5 cabezas no coinciden (frente y cejas pintadas
   *  del color de cada peinado). 0–1 por píxel, con borde suave. Se calcula una vez por juego de texturas. */
  _kaiHairMask(heads) {
    const imgs = ['a', 'b', 'c', 'd', 'e'].map((k) => { const m = heads[k]?.material; const mm = Array.isArray(m) ? m[0] : m; return (mm?.userData.origMap || mm?.map)?.image; });
    if (imgs.some((i) => !i) || typeof document === 'undefined') return null;
    this._kaiMasks ||= new WeakMap();
    if (this._kaiMasks.has(imgs[0])) return this._kaiMasks.get(imgs[0]);
    const w = imgs[0].width, h = imgs[0].height;
    const read = (img) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, w, h); return ctx.getImageData(0, 0, w, h).data; };
    const data = imgs.map(read), base = data[0], mask = new Float32Array(w * h);
    for (let i = 0, j = 0; i < base.length; i += 4, j++) {
      let d = 0;
      for (let k = 1; k < data.length; k++) { const o = data[k]; d = Math.max(d, Math.abs(o[i] - base[i]) + Math.abs(o[i + 1] - base[i + 1]) + Math.abs(o[i + 2] - base[i + 2])); }
      mask[j] = Math.min(1, Math.max(0, (d - 12) / 70));
    }
    const out = { mask, w, h };
    this._kaiMasks.set(imgs[0], out);
    return out;
  }

  /** Cabeza de Kai con la zona de pelo teñida del color elegido (mismo método que el pelo: gris normalizado × color). */
  _kaiTintedHead(heads, mesh, colorHex) {
    const m = this._kaiHairMask(heads); if (!m) return null;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const src = mat.userData.origMap || mat.map; const img = src?.image; if (!img) return null;
    const key = `kaihead_${colorHex}_${this._imgKey(img)}`;
    if (this._textureCache.has(key)) return this._textureCache.get(key);
    const { w, h, mask } = m;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, w, h);
    const id = ctx.getImageData(0, 0, w, h), px = id.data;
    // Blanco de referencia: percentil 98 de la luminancia dentro de la zona de pelo
    const hist = new Uint32Array(256); let n = 0;
    for (let i = 0, j = 0; i < px.length; i += 4, j++) if (mask[j] > 0.5) { hist[Math.min(255, (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) | 0)]++; n++; }
    let ref = 255; for (let acc = 0, k = 255; k >= 0; k--) { acc += hist[k]; if (acc >= n * 0.02) { ref = Math.max(24, k); break; } }
    const t = new THREE.Color(colorHex); const tr = Math.round(t.r * 255), tg = Math.round(t.g * 255), tb = Math.round(t.b * 255);
    for (let i = 0, j = 0; i < px.length; i += 4, j++) {
      const a = mask[j]; if (!a) continue;
      const l = Math.pow(Math.min(1, (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / ref), 0.85);
      px[i] = Math.round(px[i] * (1 - a) + tr * l * a); px[i + 1] = Math.round(px[i + 1] * (1 - a) + tg * l * a); px[i + 2] = Math.round(px[i + 2] * (1 - a) + tb * l * a);
    }
    ctx.putImageData(id, 0, 0);
    const tex = new THREE.CanvasTexture(cv);
    ['flipY', 'wrapS', 'wrapT', 'magFilter', 'minFilter', 'anisotropy', 'colorSpace', 'channel', 'generateMipmaps'].forEach((k) => { if (src[k] !== undefined) tex[k] = src[k]; });
    tex.needsUpdate = true;
    this._textureCache.set(key, tex);
    return tex;
  }

  _getV2Parts(model) {
    const kai = this._getKaiParts(model);
    if (kai) return kai;
    const found = {};
    model.traverse((c) => {
      if (!(c.isMesh || c.isSkinnedMesh) || c.userData?.isOutlineMesh || /outline/i.test(c.name || '')) return;
      const m = V2_PART_RE.exec(c.name || '');
      if (m && !found[m[1]]) found[m[1]] = c;
    });
    if (!found.face_eyes || !found.head) return null;
    const look = model.userData.sapiLook || {};
    const bone = (n) => model.getObjectByName(n);
    const hair = look.hair === 'b' && found.hair_B ? found.hair_B : found.hair;
    const outfitB = look.outfit === 'b' && found.top_B;
    return {
      v2: true,
      gender: /^Ema_/.test(found.head.name) ? 'f' : 'm',
      found,
      hat: found.hat || null,
      top: outfitB ? found.top_B : found.top,
      legs: outfitB && found.legs_B ? found.legs_B : found.legs,
      hair,
      eyes: found.face_eyes,
      mouth: found.face_mouth || null,
      cheek: found.face_blush || null,
      head: found.head,
      horns: { a: found.horns_A, b: found.horns_B, c: found.horns_C },
      headBone: bone('Head_M') || found.head,
      chestBone: bone('Spine1_M') || bone('Chest_M'),
      weaponBoneR: bone('Weapon_R') || bone('Wrist_R'),
      weaponBoneL: bone('Weapon_L') || bone('Wrist_L'),
    };
  }

  /** Variantes elegidas (peinado, atuendo, cuernos) en model.userData.sapiLook + visibilidad de cada pieza. */
  _applyV2Variants(model, customization = {}) {
    if (this._getKaiParts(model)) return this._applyCustomizationKai(model, customization);
    const look = {
      hair: customization.hairStyle === 'long' ? 'b' : 'a',
      outfit: customization.outfit === 'b' ? 'b' : 'a',
      horns: 'a', // 21-oct: siempre los cuernos de serie (solo se cambia su color); «horns_B/C» quedan ocultos
    };
    model.userData.sapiLook = look;
    const parts = this._getV2Parts(model);
    const f = parts.found;
    const show = (mesh, on) => { if (mesh) this._setPartVisible(model, mesh, on); };
    show(f.hair, !f.hair_B || look.hair === 'a'); show(f.hair_B, look.hair === 'b');
    const outB = look.outfit === 'b' && f.top_B;
    show(f.top, !outB); show(f.top_B, Boolean(outB));
    show(f.legs, !(outB && f.legs_B)); show(f.legs_B, Boolean(outB && f.legs_B));
    show(f.horns_A, look.horns === 'a'); show(f.horns_B, look.horns === 'b'); show(f.horns_C, look.horns === 'c');
    this._hideHeadHorns(f.head, f.horns_A);
    return parts;
  }

  /** La cabeza de Ema / Kai trae también los cuernos cortos (iguales a «horns_A»). Se pliegan esos vértices de la
   *  cabeza para que se vea solo la pieza de cuernos elegida (y su color, sin parpadeos por estar dos veces). */
  _hideHeadHorns(head, hornsA) {
    const g = head?.geometry, ga = hornsA?.geometry;
    if (!g || !ga || g.userData.hornsFolded) return;
    const key = (x, y, z) => `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    const pa = ga.attributes.position, set = new Set();
    for (let i = 0; i < pa.count; i++) set.add(key(pa.getX(i), pa.getY(i), pa.getZ(i)));
    const p = g.attributes.position, hit = [];
    for (let i = 0; i < p.count; i++) if (set.has(key(p.getX(i), p.getY(i), p.getZ(i)))) hit.push(i);
    if (!hit.length) { g.userData.hornsFolded = true; return; }
    // Un punto por lado (izquierda / derecha): todos los triángulos del cuerno quedan sin área
    const side = { l: [0, 0, 0, 0], r: [0, 0, 0, 0] };
    hit.forEach((i) => { const s2 = p.getX(i) < 0 ? side.l : side.r; s2[0] += p.getX(i); s2[1] += p.getY(i); s2[2] += p.getZ(i); s2[3]++; });
    hit.forEach((i) => { const s2 = p.getX(i) < 0 ? side.l : side.r; p.setXYZ(i, s2[0] / s2[3], s2[1] / s2[3], s2[2] / s2[3]); });
    p.needsUpdate = true;
    g.userData.hornsFolded = true;
    g.computeBoundingSphere();
  }

  /** Textura propia de una pieza (para cambiarle el desplazamiento sin tocar las demás copias del modelo). */
  _ownMap(mesh) {
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!mat?.map) return null;
    const base = mat.map;
    if (mat.userData.exprTex && mat.map === mat.userData.exprTex) return mat.userData.exprTex;
    if (mat.userData.exprTex && mat.userData.exprBase === base) {
      mat.map = mat.userData.exprTex; mat.needsUpdate = true;
      return mat.userData.exprTex;
    }
    const own = base.clone();
    own.needsUpdate = true;
    mat.userData.exprBase = base;
    mat.userData.exprTex = own;
    mat.map = own;
    mat.needsUpdate = true;
    return own;
  }

  /** Expresión de la cara (ojos y boca) en un modelo Ema / Kai. Sirve también en combate: setExpression(model, 'angry', 'o'). */
  setExpression(model, eyes = 'normal', mouth = 'smile') {
    const parts = model && this._getV2Parts(model);
    if (!parts) return false;
    if (parts.kai) { // Ema / Kai por piezas: se muestra la malla de ojos / boca que toca
      const P = PIECE_SETS[parts.gender];
      const e = kaiId(eyes, P.eyes, P.eyeAlias, P.defaults.eyeExpr);
      const m = kaiId(mouth, P.mouth, P.mouthAlias, P.defaults.mouthExpr);
      this._showKaiGroup(model, parts.groups.eyes, e);
      this._showKaiGroup(model, parts.groups.mouth, m);
      this._showKaiGroup(model, parts.groups.mouthIn, null);
      model.userData.sapiLook = { ...(model.userData.sapiLook || {}), eyes: e, mouth: m };
      model.userData.sapiExpression = { eyes: e, mouth: m };
      return true;
    }
    const e = V2_EYE_EXPRESSIONS.find((x) => x.id === eyes) || V2_EYE_EXPRESSIONS[0];
    const m = V2_MOUTH_EXPRESSIONS.find((x) => x.id === mouth) || V2_MOUTH_EXPRESSIONS[0];
    [[parts.eyes, e.uv], [parts.mouth, m.uv]].forEach(([mesh, uv]) => {
      if (!mesh) return;
      const tex = this._ownMap(mesh);
      if (tex) { tex.offset.set(uv[0], uv[1]); tex.needsUpdate = false; }
    });
    model.userData.sapiExpression = { eyes: e.id, mouth: m.id };
    return true;
  }

  /** Color de cuernos (Ema / Kai): versión blanca de su textura multiplicada por el color. Los cortos comparten
   *  material con la cabeza, así que primero se les da un material propio. */
  _applyV2HornColor(parts, colorHex) {
    Object.values(parts.horns).forEach((mesh) => {
      if (!mesh) return;
      const headMat = parts.head?.material;
      if (mesh.material === headMat && !mesh.userData.ownHornMat) {
        const ud = headMat.userData; headMat.userData = {}; // clone() copia userData por JSON y aquí guardamos texturas
        mesh.material = headMat.clone();
        headMat.userData = ud;
        mesh.userData.ownHornMat = true;
      }
      const custom = colorHex && colorHex !== 'original';
      this._setHairWhiteMap(mesh, custom);
      this._tintMesh(mesh, custom ? colorHex : '#ffffff');
    });
  }

  /** Recolorea la tela de un atuendo de Ema / Kai (o devuelve null si es «original»). */
  _recolorClothV2(mesh, colorHex) {
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!mat) return;
    if (!mat.userData.origMap && mat.map) mat.userData.origMap = mat.map;
    const spec = V2_CLOTH[mesh.name] || null;
    const img = mat.userData.origMap?.image;
    let tex = null;
    if (spec && img && colorHex && colorHex !== 'original') {
      tex = spec.red ? this._recolorSuitTexture(img, colorHex) : this._recolorHueTexture(img, spec, colorHex);
    }
    mat.map = tex || mat.userData.origMap || mat.map;
    mat.color.setHex(0xffffff);
    mat.needsUpdate = true;
  }

  /** Clave de caché única por imagen (las de los GLB son ImageBitmap sin src ni nombre). */
  _imgKey(image) {
    if (!this._imgIds) { this._imgIds = new WeakMap(); this._imgSeq = 0; }
    if (!this._imgIds.has(image)) this._imgIds.set(image, `img${++this._imgSeq}`);
    return this._imgIds.get(image);
  }

  /** Cambia el tono dominante de una tela (hue ± tol) al color elegido, conservando luces y sombras. */
  _recolorHueTexture(image, spec, colorHex) {
    if (typeof document === 'undefined' || !image) return null;
    const key = `hue_${colorHex}_${this._imgKey(image)}`;
    if (this._textureCache.has(key)) return this._textureCache.get(key);
    try {
      const w = image.width || image.naturalWidth || 1024, h = image.height || image.naturalHeight || 1024;
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, w, h); const px = data.data;
      const target = new THREE.Color(colorHex); const tHsl = {}; target.getHSL(tHsl);
      const hueOf = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return [0, 0, mx / 255]; let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; if (hh < 0) hh += 360; const l = (mx + mn) / 510; return [hh, d / 255 / (1 - Math.abs(2 * l - 1) || 1), l]; };
      // Luminosidad de referencia de la tela (media de los píxeles que cambian)
      let sumL = 0, n = 0;
      const hit = new Uint8Array(w * h);
      for (let i = 0, j = 0; i < px.length; i += 4, j++) {
        const [hh, sat, l] = hueOf(px[i], px[i + 1], px[i + 2]);
        const dh = Math.min(Math.abs(hh - spec.hue), 360 - Math.abs(hh - spec.hue));
        if (dh <= spec.tol && sat >= (spec.minSat || 0.3) && l > 0.08) { hit[j] = 1; sumL += l; n++; }
      }
      if (!n) return null;
      const refL = sumL / n; const out = new THREE.Color();
      for (let i = 0, j = 0; i < px.length; i += 4, j++) {
        if (!hit[j]) continue;
        const l = hueOf(px[i], px[i + 1], px[i + 2])[2];
        out.setHSL(tHsl.h, tHsl.s, Math.max(0, Math.min(1, tHsl.l * (l / refL))));
        px[i] = Math.round(out.r * 255); px[i + 1] = Math.round(out.g * 255); px[i + 2] = Math.round(out.b * 255);
      }
      ctx.putImageData(data, 0, 0);
      const tex = new THREE.CanvasTexture(canvas);
      tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
      this._textureCache.set(key, tex);
      return tex;
    } catch (e) {
      console.warn('[SapidaeModularController] Hue recolor failed:', e);
      return null;
    }
  }

  /** Personalización completa de Ema / Kai. */
  _applyCustomizationV2(model, customization = {}) {
    if (this._getKaiParts(model)) { this._applyCustomizationKai(model, customization); return; }
    const parts = this._applyV2Variants(model, customization);
    const { hair = 'original', eyes = 'original', suitColor = 'original', hornColor = 'original' } = customization;
    if (parts.hat) this._setPartVisible(model, parts.hat, false); // Ema empieza sin sombrero (los sombreros llegan con el equipo)
    [parts.found.hair, parts.found.hair_B].forEach((mesh) => {
      if (!mesh) return;
      const custom = hair && hair !== 'original';
      this._setHairWhiteMap(mesh, custom);
      this._tintMesh(mesh, custom ? hair : '#ffffff');
    });
    // Ojos: color del iris (sobre el atlas completo) y luego la expresión
    const eyeMat = Array.isArray(parts.eyes.material) ? parts.eyes.material[0] : parts.eyes.material;
    if (eyeMat) {
      if (!eyeMat.userData.origMap && eyeMat.map) eyeMat.userData.origMap = eyeMat.map;
      const img = eyeMat.userData.origMap?.image;
      const rec = eyes && eyes !== 'original' && img ? this._recolorPupilTexture(img, eyes) : null;
      eyeMat.map = rec || eyeMat.userData.origMap || eyeMat.map;
      eyeMat.color.setHex(0xffffff);
      eyeMat.needsUpdate = true;
    }
    this.setExpression(model, customization.eyeExpr || 'normal', customization.mouthExpr || 'smile');
    [parts.found.top, parts.found.top_B].forEach((mesh) => mesh && this._recolorClothV2(mesh, suitColor));
    [parts.found.legs, parts.found.legs_B].forEach((mesh) => { if (mesh) this._recolorClothV2(mesh, 'original'); });
    this._applyV2HornColor(parts, hornColor);
    [parts.head, parts.cheek, parts.mouth].forEach((mesh) => mesh && this._tintMesh(mesh, '#ffffff'));
  }

  /**
   * Recolor red fabric in the suit texture via HTML5 canvas, preserving white sleeves,
   * gold buckles, belts, and shading details.
   */
  _recolorSuitTexture(image, colorHex) {
    if (typeof document === 'undefined') return null;
    if (!image) return null;
    if (!colorHex || colorHex === 'original' || colorHex === '#b91c1c') {
      return null;
    }

    const cacheKey = `suit_${colorHex}_${image.src || image.name || this._imgKey(image)}`;
    if (this._textureCache.has(cacheKey)) {
      return this._textureCache.get(cacheKey);
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.width || image.naturalWidth || 1024;
      canvas.height = image.height || image.naturalHeight || 1024;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      const tr = parseInt(colorHex.slice(1, 3), 16);
      const tg = parseInt(colorHex.slice(3, 5), 16);
      const tb = parseInt(colorHex.slice(5, 7), 16);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Red cloth in Ema suit: high red, lower green & blue
        if (a > 20 && r > 65 && r > g * 1.25 && r > b * 1.25) {
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 115;
          data[i] = Math.min(255, Math.max(0, Math.round(tr * lum)));
          data[i + 1] = Math.min(255, Math.max(0, Math.round(tg * lum)));
          data[i + 2] = Math.min(255, Math.max(0, Math.round(tb * lum)));
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const tex = new THREE.CanvasTexture(canvas);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      this._textureCache.set(cacheKey, tex);
      return tex;
    } catch (e) {
      console.warn('[SapidaeModularController] Suit recolor failed:', e);
      return null;
    }
  }

  /**
   * Recolor pupil/iris in the eyes texture via HTML5 canvas, preserving sclera,
   * black eyelashes, and specular reflections.
   */
  _recolorPupilTexture(image, colorHex) {
    if (typeof document === 'undefined') return null;
    if (!image) return null;
    if (!colorHex || colorHex === 'original' || colorHex === '#c2410c') {
      return null;
    }

    const cacheKey = `pupil_${colorHex}_${image.src || image.name || this._imgKey(image)}`;
    if (this._textureCache.has(cacheKey)) {
      return this._textureCache.get(cacheKey);
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.width || image.naturalWidth || 1024;
      canvas.height = image.height || image.naturalHeight || 1024;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      const tr = parseInt(colorHex.slice(1, 3), 16);
      const tg = parseInt(colorHex.slice(3, 5), 16);
      const tb = parseInt(colorHex.slice(5, 7), 16);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = (maxC - minC) / (maxC || 1);

        // Iris pixels have saturation and are not white highlights or pure black lashes
        if (a > 30 && sat > 0.18 && r > 45 && !(r > 230 && g > 230 && b > 230)) {
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 105;
          data[i] = Math.min(255, Math.max(0, Math.round(tr * lum)));
          data[i + 1] = Math.min(255, Math.max(0, Math.round(tg * lum)));
          data[i + 2] = Math.min(255, Math.max(0, Math.round(tb * lum)));
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const tex = new THREE.CanvasTexture(canvas);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      this._textureCache.set(cacheKey, tex);
      return tex;
    } catch (e) {
      console.warn('[SapidaeModularController] Pupil recolor failed:', e);
      return null;
    }
  }

  /**
   * Applies the suit fabric recolor (or restores original).
   * Only the tunic (parts.top) red fabric changes color; the rest of the suit
   * (white sleeves, gold buckles, and legs/boots) retains its original base textures.
   */
  _applySuitColor(parts, suitColor) {
    // 1. Tunic (parts.top): recolor ONLY the red cloth via canvas, never tinting with mat.color
    if (parts.top) {
      const mat = Array.isArray(parts.top.material) ? parts.top.material[0] : parts.top.material;
      if (mat) {
        if (!mat.userData.origMap && mat.map) {
          mat.userData.origMap = mat.map;
        }
        const baseImg = mat.userData.origMap?.image;

        if (!suitColor || suitColor === 'original' || suitColor === '#b91c1c') {
          if (mat.userData.origMap) {
            mat.map = mat.userData.origMap;
          }
          mat.color.setHex(0xffffff);
        } else if (baseImg) {
          const recoloredTex = this._recolorSuitTexture(baseImg, suitColor);
          if (recoloredTex) {
            mat.map = recoloredTex;
            mat.color.setHex(0xffffff);
          } else if (mat.userData.origMap) {
            mat.map = mat.userData.origMap;
            mat.color.setHex(0xffffff);
          }
        }
        mat.needsUpdate = true;
      }
    }

    // 2. Legs / Boots (parts.legs): ALWAYS retain authentic base texture
    if (parts.legs) {
      const legMat = Array.isArray(parts.legs.material) ? parts.legs.material[0] : parts.legs.material;
      if (legMat) {
        if (!legMat.userData.origMap && legMat.map) {
          legMat.userData.origMap = legMat.map;
        }
        if (legMat.userData.origMap) {
          legMat.map = legMat.userData.origMap;
        }
        legMat.color.setHex(0xffffff);
        legMat.needsUpdate = true;
      }
    }
  }

  /**
   * Applies pupil color and shape to eyes.
   */
  _applyEyesCustomization(parts, pupilColor, eyeShape) {
    if (!parts.eyes) return;
    const mesh = parts.eyes;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!mat) return;

    if (!mat.userData.origMap && mat.map) {
      mat.userData.origMap = mat.map;
    }
    const baseImg = mat.userData.origMap?.image;

    // 1. Pupil Color
    if (!pupilColor || pupilColor === 'original' || pupilColor === '#c2410c') {
      if (mat.userData.origMap) {
        mat.map = mat.userData.origMap;
      }
      mat.color.setHex(0xffffff);
    } else if (baseImg) {
      const recoloredPupil = this._recolorPupilTexture(baseImg, pupilColor);
      if (recoloredPupil) {
        mat.map = recoloredPupil;
        mat.color.setHex(0xffffff);
      } else {
        mat.color.copy(new THREE.Color(pupilColor));
      }
    } else {
      mat.color.copy(new THREE.Color(pupilColor));
    }
    mat.needsUpdate = true;

    // 2. Eye Shape (Round, Medium, Almond/Rasgados)
    if (eyeShape === 'almond') {
      mesh.scale.set(1.15, 0.65, 1.0);
      mesh.rotation.z = 0.04;
    } else if (eyeShape === 'medium') {
      mesh.scale.set(1.0, 0.88, 1.0);
      mesh.rotation.z = 0;
    } else {
      // Round (Anime clásicos)
      mesh.scale.set(1.0, 1.05, 1.0);
      mesh.rotation.z = 0;
    }
  }

  /**
   * Applies customization (hair, eyes, horns, suit color, hat toggle) to a model.
   */
  applyCustomization(model, customization = {}) {
    if (!model) return;
    if (this._getV2Parts(model)) { this._applyCustomizationV2(model, customization); return; }
    const parts = this.getModularParts(model);
    if (!parts) return;

    const {
      hair = 'original',
      hairStyle = 'braids',
      eyes = 'original',
      eyeShape = 'round',
      suitColor = 'original',
      horns = 'none',
      hornColor = '#f59e0b',
      hasHat = false // starts WITHOUT hat by default!
    } = customization;

    // 1. Hat visibility toggle (default false)
    if (parts.hat) {
      this._setPartVisible(model, parts.hat, Boolean(hasHat));
      this._tintMesh(parts.hat, '#ffffff');
    }

    // 2. Hair: style & color
    if (parts.hair) {
      if (hairStyle === 'short') {
        parts.hair.scale.set(0.92, 0.72, 0.92);
      } else if (hairStyle === 'bun') {
        parts.hair.scale.set(0.96, 0.85, 0.96);
      } else if (hairStyle === 'long') {
        parts.hair.scale.set(1.04, 1.15, 1.04);
      } else {
        parts.hair.scale.set(1.0, 1.0, 1.0);
      }

      // Color personalizado: el pelo usa una versión blanca de su propia textura (conserva sombras y mechones),
      // así el color elegido se ve tal cual y no mezclado con el tono pintado del modelo. «Original» la devuelve.
      if (hair && hair !== 'original') {
        this._setHairWhiteMap(parts.hair, true);
        this._tintMesh(parts.hair, hair);
      } else {
        this._setHairWhiteMap(parts.hair, false);
        this._tintMesh(parts.hair, '#ffffff');
      }
    }

    // 3. Eyes: pupil color & eye shape (round, medium, almond)
    this._applyEyesCustomization(parts, eyes, eyeShape);

    // 4. Suit: recolor red cloth to chosen suit color (preserves sleeves, buckles, belts)
    this._applySuitColor(parts, suitColor);

    // 5. Head / Skin / Face neutral white
    [parts.head, parts.cheek, parts.mouth].forEach(mesh => {
      if (!mesh) return;
      this._tintMesh(mesh, '#ffffff');
    });

    // 6. Cachos / Horns: apply directly to authentic Sapidae head mesh (Ema_head)
    this.updateHorns(parts, horns || 'base', hornColor || 'original');
  }

  /**
   * Updates the horns directly on the Sapidae head mesh (Ema_head).
   * By default ('base' / 'original'), the authentic curved Sapidae horns on the sides of the head
   * are preserved in their original geometry without any distortion or extra props.
   * If other styles are chosen, the 82 horn vertices (296..336 left, 633..673 right) are
   * morphed directly at their anatomical side sockets.
   * No procedural props are attached to the top of the skull.
   */
  updateHorns(parts, style = 'base', colorHex = 'original') {
    if (!parts) return;

    // Clean up any previously attached side horns group on headBone
    if (parts.headBone) {
      const existingHorns = parts.headBone.getObjectByName('Sapidae_Side_Horns_Group') || parts.headBone.getObjectByName('Sapidae_Horns_Group');
      if (existingHorns) {
        parts.headBone.remove(existingHorns);
      }
    }

    const headMesh = parts.head;
    if (headMesh && headMesh.geometry) {
      const geom = headMesh.geometry;
      const posAttr = geom.attributes.position;
      if (posAttr) {
        // Cache original vertex positions on first encounter
        if (!geom.userData.origHornPositions) {
          geom.userData.origHornPositions = new Float32Array(posAttr.array);
        }
        if (!geom.userData.origNormals && geom.attributes.normal) {
          geom.userData.origNormals = new Float32Array(geom.attributes.normal.array);
        }

        const origPos = geom.userData.origHornPositions;
        const origNorm = geom.userData.origNormals;
        const currentPos = posAttr.array;
        const currentNorm = geom.attributes.normal?.array;

        if (style === 'base' || style === 'original') {
          // RESTORE authentic Sapidae base horns intact and restore smooth authored normals!
          for (let i = 0; i < currentPos.length; i++) {
            currentPos[i] = origPos[i];
          }
          if (origNorm && currentNorm) {
            for (let i = 0; i < currentNorm.length; i++) {
              currentNorm[i] = origNorm[i];
            }
            geom.attributes.normal.needsUpdate = true;
          }
        } else {
          // ANY OTHER STYLE OR 'NONE': RETRACT default base horns completely inside the skull volume!
          // Left Horn (296..336) and Right Horn (633..673)
          for (let idx = 296; idx <= 336; idx++) {
            currentPos[idx * 3] = origPos[idx * 3] * 0.65;
            currentPos[idx * 3 + 1] = origPos[idx * 3 + 1] - 0.12;
            currentPos[idx * 3 + 2] = origPos[idx * 3 + 2] * 0.65;
          }
          for (let idx = 633; idx <= 673; idx++) {
            currentPos[idx * 3] = origPos[idx * 3] * 0.65;
            currentPos[idx * 3 + 1] = origPos[idx * 3 + 1] - 0.12;
            currentPos[idx * 3 + 2] = origPos[idx * 3 + 2] * 0.65;
          }
          if (origNorm && currentNorm) {
            for (let i = 0; i < currentNorm.length; i++) {
              currentNorm[i] = origNorm[i];
            }
            geom.attributes.normal.needsUpdate = true;
          }
        }

        posAttr.needsUpdate = true;

        // Optional texture tint for base horns if style is base
        if (style === 'base' || style === 'original') {
          const mat = Array.isArray(headMesh.material) ? headMesh.material[0] : headMesh.material;
          if (mat) {
            if (!mat.userData.origMap && mat.map) {
              mat.userData.origMap = mat.map;
            }
            const baseImg = mat.userData.origMap?.image;
            if (colorHex && colorHex !== 'original' && baseImg) {
              const recoloredTex = this._recolorHornTexture(baseImg, colorHex);
              if (recoloredTex) {
                mat.map = recoloredTex;
                mat.needsUpdate = true;
              }
            } else if (mat.userData.origMap) {
              mat.map = mat.userData.origMap;
              mat.needsUpdate = true;
            }
          }
        }
      }
    }

    // If style is a custom 3D model (beast, spiral, dragon, astral, deer), build & attach to headBone at side sockets
    if (style && style !== 'base' && style !== 'original' && style !== 'none' && parts.headBone) {
      const customHorns = this._buildSideHornMesh(style, colorHex);
      if (customHorns) {
        customHorns.name = 'Sapidae_Side_Horns_Group';
        parts.headBone.add(customHorns);
      }
    }
  }

  /**
   * Generates a canvas texture recoloring only the horn region of Ema_head.
   * Horn UVs: U in [0.75, 1.0], V in [0.50, 0.85].
   */
  _recolorHornTexture(image, colorHex) {
    if (!image || !colorHex || colorHex === 'original') return null;
    const cacheKey = `horn_${colorHex}_${image.src || image.name || 'head'}`;
    if (this._textureCache.has(cacheKey)) {
      return this._textureCache.get(cacheKey);
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.width || image.naturalWidth || 1024;
      canvas.height = image.height || image.naturalHeight || 1024;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      const tr = parseInt(colorHex.slice(1, 3), 16);
      const tg = parseInt(colorHex.slice(3, 5), 16);
      const tb = parseInt(colorHex.slice(5, 7), 16);

      const minX = Math.floor(canvas.width * 0.74);
      const maxX = canvas.width;
      const minY = Math.floor(canvas.height * 0.14);
      const maxY = Math.floor(canvas.height * 0.52);

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x < maxX; x++) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a > 20) {
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 128;
            data[i] = Math.min(255, Math.max(0, Math.round(tr * lum)));
            data[i + 1] = Math.min(255, Math.max(0, Math.round(tg * lum)));
            data[i + 2] = Math.min(255, Math.max(0, Math.round(tb * lum)));
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const tex = new THREE.CanvasTexture(canvas);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      this._textureCache.set(cacheKey, tex);
      return tex;
    } catch (e) {
      console.warn('[SapidaeModularController] Horn recolor failed:', e);
      return null;
    }
  }

  /**
   * Applies equipment (Dofus-style) to the character model.
   * If an item is equipped in a slot, it visibly equips and overrides customization.
   * If unequipped, it falls back to customization.
   */
  applyEquipment(model, equipped = {}, fallbackCustomization = {}) {
    if (!model) return;
    if (this._getV2Parts(model) && !model.userData.sapiLook) this._applyV2Variants(model, fallbackCustomization);
    const parts = this.getModularParts(model);
    if (!parts) return;

    // --- HAT SLOT ---
    const hatItem = equipped.hat ? (ITEMS_DB[equipped.hat] || null) : null;

    // Remove any previously mounted 3D hat prop
    if (parts.headBone) {
      const existingHatProp = parts.headBone.getObjectByName('Sapidae_Equipped_Hat');
      if (existingHatProp) {
        parts.headBone.remove(existingHatProp);
      }
    }

    if (hatItem) {
      const hatProp = this._buildHatProp(hatItem);
      if (hatProp && parts.headBone) {
        hatProp.name = 'Sapidae_Equipped_Hat';
        parts.headBone.add(hatProp);
        if (parts.hat) this._setPartVisible(model, parts.hat, false);
      } else if (parts.hat) {
        // Fallback to stylized Ema hat mesh with item theme
        this._setPartVisible(model, parts.hat, true);
        const theme = HAT_THEMES[hatItem.id];
        if (theme) {
          this._tintMesh(parts.hat, theme.color, theme.roughness, theme.metalness, theme.emissive);
        } else {
          const color = hatItem.rarity === 'legendary' ? 0xfbbf24 :
                        hatItem.rarity === 'epic' ? 0xa855f7 :
                        hatItem.rarity === 'rare' ? 0x38bdf8 : 0x64748b;
          this._tintMesh(parts.hat, color, 0.45, 0.3);
        }
      }
    } else {
      // No hat item equipped: use player's customization preference (default false: sin sombrero)
      const showHat = !parts.v2 && (fallbackCustomization.hasHat !== undefined ? Boolean(fallbackCustomization.hasHat) : false); // Ema / Kai: sin sombrero
      if (parts.hat) {
        this._setPartVisible(model, parts.hat, showHat);
        if (showHat && fallbackCustomization.hatColor) {
          this._tintMesh(parts.hat, fallbackCustomization.hatColor);
        }
      }
    }

    // --- BODY / TRAJE / ARMADURA SLOT ---
    const bodyItem = equipped.body ? (ITEMS_DB[equipped.body] || null) : null;

    // Remove any existing 3D armor attachments
    if (parts.chestBone) {
      const existingArmor = parts.chestBone.getObjectByName('Sapidae_Armor_Props');
      if (existingArmor) {
        parts.chestBone.remove(existingArmor);
      }
    }

    if (bodyItem) {
      // 1. Build and attach 3D armor pauldrons and chestplate insignia
      const armorProps = this._buildArmorProps(bodyItem);
      if (armorProps && parts.chestBone) {
        armorProps.name = 'Sapidae_Armor_Props';
        parts.chestBone.add(armorProps);
      }

      // 2. Tint top and legs to match armor style
      const theme = BODY_THEMES[bodyItem.id];
      if (parts.top) {
        if (theme) {
          this._tintMesh(parts.top, theme.color, theme.roughness, theme.metalness, theme.emissive);
        } else {
          const color = bodyItem.rarity === 'legendary' ? 0x09090b :
                        bodyItem.rarity === 'epic' ? 0x1e1b4b :
                        bodyItem.rarity === 'rare' ? 0x1e3a8a : 0x78350f;
          this._tintMesh(parts.top, color, 0.5, 0.2);
        }
      }
    } else {
      // No armor equipped: restore player's base suit recolor!
      if (parts.v2) { if (parts.top) { this._tintMesh(parts.top, '#ffffff'); this._recolorClothV2(parts.top, fallbackCustomization.suitColor); } }
      else this._applySuitColor(parts, fallbackCustomization.suitColor);
    }

    // --- BOOTS / LEGS SLOT ---
    const bootsItem = equipped.boots ? (ITEMS_DB[equipped.boots] || null) : null;
    if (bootsItem && parts.legs) {
      const color = bootsItem.rarity === 'legendary' ? 0xd97706 :
                    bootsItem.rarity === 'epic' ? 0x047857 :
                    bootsItem.rarity === 'rare' ? 0x1d4ed8 : 0x0f172a;
      this._tintMesh(parts.legs, color, 0.6, 0.2);
    } else if (parts.legs) {
      if (fallbackCustomization.pants && fallbackCustomization.pants !== 'original') {
        this._tintMesh(parts.legs, fallbackCustomization.pants);
      } else if (parts.v2) {
        this._tintMesh(parts.legs, '#ffffff');
        this._recolorClothV2(parts.legs, 'original');
      } else {
        this._applySuitColor(parts, fallbackCustomization.suitColor);
      }
    }

    // --- WEAPON SLOT ---
    this._updateWeaponProp(parts.weaponBoneR, equipped.weapon);
  }

  /**
   * Mounts a 3D weapon prop to the weapon bone.
   */
  _updateWeaponProp(weaponBone, weaponId) {
    if (!weaponBone) return;

    let existingProp = weaponBone.getObjectByName('Sapidae_Equipped_Weapon');
    if (existingProp) {
      weaponBone.remove(existingProp);
    }

    if (!weaponId) return;

    const item = ITEMS_DB[weaponId];
    if (!item) return;

    const weaponGroup = this._buildWeaponProp(item);
    if (weaponGroup) {
      weaponGroup.name = 'Sapidae_Equipped_Weapon';
      weaponBone.add(weaponGroup);
    }
  }

  /**
   * Constructs custom 3D horns for Sapidae anchored at the authentic side sockets above the ears.
   * In Head_M space: X = -0.16 (temple height), Y = -0.04 (side of head), Z = +/- 0.38 (above ears).
   */
  _buildSideHornMesh(style, colorHex) {
    if (!style || style === 'none' || style === 'base' || style === 'original') return null;
    const group = new THREE.Group();
    const hex = (colorHex && colorHex !== 'original') ? colorHex : '#f59e0b';
    const color = new THREE.Color(hex);

    const hornMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.35,
      metalness: style === 'astral' ? 0.7 : 0.25,
      emissive: style === 'astral' ? color.clone().multiplyScalar(0.45) : 0x000000,
      side: THREE.DoubleSide
    });

    for (const side of [-1, 1]) {
      const horn = new THREE.Group();

      if (style === 'beast') {
        // Curved beast horn: curves upward (+X), slightly back (-Y), and flares outward (side * +Z)
        const segCount = 7;
        for (let i = 0; i < segCount; i++) {
          const t = i / (segCount - 1);
          const radius = 0.046 * (1.0 - t * 0.72);
          const segGeo = new THREE.CylinderGeometry(radius * 0.82, radius, 0.045, 8);
          const seg = new THREE.Mesh(segGeo, hornMat);
          seg.castShadow = true;
          seg.receiveShadow = true;

          // Trajectory in Head_M space (+X is UP, +Y is FWD, side*+Z is OUTWARD)
          const px = Math.pow(t, 1.1) * 0.24;
          const py = -Math.pow(t, 1.25) * 0.12;
          const pz = side * Math.pow(t, 0.9) * 0.16;

          seg.position.set(px, py, pz);
          seg.rotation.z = side * (-0.45 - t * 0.35);
          seg.rotation.x = -t * 0.45;
          horn.add(seg);
        }
      } else if (style === 'spiral') {
        // Ram cornamenta: spirals outward and coils gracefully
        const segCount = 8;
        for (let i = 0; i < segCount; i++) {
          const t = i / (segCount - 1);
          const radius = 0.05 * (1.0 - t * 0.65);
          const segGeo = new THREE.CylinderGeometry(radius * 0.85, radius, 0.042, 8);
          const seg = new THREE.Mesh(segGeo, hornMat);
          seg.castShadow = true;
          seg.receiveShadow = true;

          const angle = t * Math.PI * 0.95;
          const px = Math.sin(angle) * 0.14;
          const py = -Math.cos(angle) * 0.12 + 0.12;
          const pz = side * (0.04 + Math.sin(t * Math.PI) * 0.12);

          seg.position.set(px, py, pz);
          seg.rotation.z = side * (-0.3 - angle * 0.6);
          seg.rotation.y = side * 0.3;
          seg.rotation.x = -angle * 0.4;
          horn.add(seg);
        }
      } else if (style === 'dragon') {
        // Draconic horn: sharp blade-like main horn pointing upward and outward with back spines
        const mainCone = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.28, 6), hornMat);
        mainCone.castShadow = true;
        mainCone.receiveShadow = true;
        mainCone.position.set(0.12, -0.04, side * 0.09);
        mainCone.rotation.z = side * -0.55;
        mainCone.rotation.x = -0.35;
        horn.add(mainCone);

        const subSpike = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.14, 5), hornMat);
        subSpike.castShadow = true;
        subSpike.receiveShadow = true;
        subSpike.position.set(0.07, -0.07, side * 0.06);
        subSpike.rotation.z = side * -0.85;
        subSpike.rotation.x = -0.6;
        horn.add(subSpike);
      } else if (style === 'astral') {
        // Astral crystal clusters: glowing multifaceted crystals protruding outward
        const c1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), hornMat);
        c1.castShadow = true;
        c1.receiveShadow = true;
        c1.scale.set(1.2, 2.2, 1.2);
        c1.position.set(0.10, -0.02, side * 0.08);
        c1.rotation.z = side * -0.5;
        c1.rotation.y = side * 0.3;
        horn.add(c1);

        const c2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 0), hornMat);
        c2.castShadow = true;
        c2.receiveShadow = true;
        c2.scale.set(1.1, 1.8, 1.1);
        c2.position.set(0.18, -0.04, side * 0.14);
        c2.rotation.z = side * -0.65;
        c2.rotation.x = -0.3;
        horn.add(c2);

        const c3 = new THREE.Mesh(new THREE.OctahedronGeometry(0.028, 0), hornMat);
        c3.castShadow = true;
        c3.scale.set(1.0, 1.5, 1.0);
        c3.position.set(0.06, 0.03, side * 0.07);
        c3.rotation.z = side * -0.3;
        horn.add(c3);
      } else if (style === 'deer') {
        // Sylvan antlers: main antler beam with tines reaching majestically upward and outward
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.03, 0.26, 6), hornMat);
        beam.castShadow = true;
        beam.receiveShadow = true;
        beam.position.set(0.12, -0.03, side * 0.08);
        beam.rotation.z = side * -0.52;
        beam.rotation.x = -0.22;
        horn.add(beam);

        const tine1 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.018, 0.12, 5), hornMat);
        tine1.castShadow = true;
        tine1.receiveShadow = true;
        tine1.position.set(0.14, 0.02, side * 0.07);
        tine1.rotation.z = side * -0.2;
        tine1.rotation.x = 0.4;
        horn.add(tine1);

        const tine2 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, 0.10, 5), hornMat);
        tine2.castShadow = true;
        tine2.receiveShadow = true;
        tine2.position.set(0.22, -0.02, side * 0.14);
        tine2.rotation.z = side * -0.7;
        tine2.rotation.x = -0.3;
        horn.add(tine2);
      }

      // Anchored directly at the authentic temple sockets of Ema_head (above ears)
      // Head_M bone space: X = 0.08 (temple level), Y = 0.03 (front-depth), Z = ±0.44 (lateral ear width)
      horn.position.set(0.08, 0.03, side * 0.44);
      group.add(horn);
    }

    return group;
  }

  /**
   * Constructs stylized 3D hat props to attach to Head_M for distinct gear items.
   * Aligned with Head_M bone axes: +X is UP, -Y is BACK, +/-Z is LATERAL.
   */
  _buildHatProp(item) {
    if (!item) return null;
    const group = new THREE.Group();
    const id = item.id || '';

    if (id.includes('crown') || id.includes('tiara') || id.includes('amulet') || id.includes('ring')) {
      // Royal Crown / Mystic Tiara: sits at X = 0.44 on skull crown
      const goldMat = new THREE.MeshStandardMaterial({
        color: id.includes('atia') ? 0x38bdf8 : (id.includes('diamond') || id.includes('champion')) ? 0xf8fafc : 0xfbbf24,
        metalness: 0.85,
        roughness: 0.2
      });
      // Circlet band in Y-Z plane
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 8, 24), goldMat);
      band.rotation.y = Math.PI / 2;
      band.position.set(0.44, -0.02, 0);
      group.add(band);

      // Spikes
      const spikeCount = 5;
      for (let i = 0; i < spikeCount; i++) {
        const angle = (i / spikeCount) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 4), goldMat);
        spike.position.set(0.47, -0.02 + Math.cos(angle) * 0.23, Math.sin(angle) * 0.23);
        spike.rotation.z = -Math.PI / 2;
        group.add(spike);
      }

      // Astral Center Gem
      const gemColor = id.includes('ember') || id.includes('fury') ? 0xef4444 : id.includes('atia') ? 0x06b6d4 : 0x8b5cf6;
      const gemMat = new THREE.MeshStandardMaterial({
        color: gemColor,
        metalness: 0.4,
        roughness: 0.1,
        emissive: gemColor,
        emissiveIntensity: 0.6
      });
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.038), gemMat);
      gem.position.set(0.46, 0.21, 0);
      group.add(gem);

      return group;
    }

    if (id === 'straw_hat') {
      // Wide conical straw hat
      const strawMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.85,
        metalness: 0.05
      });
      const brim = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.14, 18, 1, true), strawMat);
      brim.position.set(0.44, -0.02, 0);
      brim.rotation.z = -Math.PI / 2;
      group.add(brim);

      const center = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.14, 16), strawMat);
      center.position.set(0.48, -0.02, 0);
      center.rotation.z = -Math.PI / 2;
      group.add(center);

      return group;
    }

    if (id.includes('helmet') || id.includes('helm') || id === 'beast_helmet' || id === 'feather_hood' || id === 'precision_scope') {
      // Knight Helm / Beast Helmet
      const isBeast = id.includes('beast') || id.includes('pumpkin');
      const helmMat = new THREE.MeshStandardMaterial({
        color: isBeast ? 0x991b1b : id.includes('iron') ? 0x64748b : 0xb45309,
        roughness: isBeast ? 0.6 : 0.35,
        metalness: isBeast ? 0.3 : 0.75
      });

      // Dome
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), helmMat);
      dome.position.set(0.42, -0.02, 0);
      dome.rotation.z = -Math.PI / 2;
      group.add(dome);

      // Visor / Forehead plate
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.26), helmMat);
      visor.position.set(0.40, 0.18, 0);
      group.add(visor);

      // Crest
      const crestMat = new THREE.MeshStandardMaterial({ color: isBeast ? 0xf59e0b : 0xef4444, roughness: 0.4 });
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.30, 0.04), crestMat);
      crest.position.set(0.52, -0.02, 0);
      group.add(crest);

      return group;
    }

    return null;
  }

  /**
   * Constructs stylized 3D armor pauldrons and chestplate props to attach to Spine1_M.
   */
  _buildArmorProps(item) {
    if (!item) return null;
    const group = new THREE.Group();
    const id = item.id || '';

    const isLeather = id.includes('leather');
    const isGold = id.includes('golden') || id.includes('bronze');
    const isChitin = id.includes('chitin');
    const isObsidian = id.includes('obsidian');
    const isCloak = id.includes('cloak');

    const armorColor = isLeather ? 0x78350f :
                       isGold ? 0xd97706 :
                       isChitin ? 0x059669 :
                       isObsidian ? 0x18181b :
                       isCloak ? 0x1e3a8a : 0x64748b;

    const armorMat = new THREE.MeshStandardMaterial({
      color: armorColor,
      roughness: (isLeather || isCloak) ? 0.75 : 0.3,
      metalness: (isLeather || isCloak) ? 0.08 : (isGold || isObsidian) ? 0.85 : 0.7,
      emissive: isObsidian ? 0x3f3f46 : (isChitin ? 0x064e3b : 0x000000)
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: isGold ? 0xfef08a : (isObsidian ? 0xef4444 : 0xf59e0b),
      roughness: 0.25,
      metalness: 0.8
    });

    // Left and Right Pauldrons (Hombreras)
    for (const side of [-1, 1]) {
      const pauldron = new THREE.Group();

      // Curved shoulder plate
      const plate = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), armorMat);
      plate.scale.set(1.1, 0.75, 1.25);
      plate.rotation.z = -side * 0.4;
      pauldron.add(plate);

      // Gold / metallic trim
      const trim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.016, 6, 12, Math.PI), trimMat);
      trim.rotation.x = Math.PI / 2;
      trim.rotation.y = -side * 0.4;
      trim.position.y = -0.02;
      pauldron.add(trim);

      if (isObsidian || isChitin) {
        // Spiked horn on shoulder plate
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 5), trimMat);
        spike.position.set(0, 0.08, 0);
        spike.rotation.z = -side * 0.5;
        pauldron.add(spike);
      }

      pauldron.position.set(side * 0.28, 0.02, 0);
      group.add(pauldron);
    }

    // Chest emblem / Gorget plate
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.035), armorMat);
    chestPlate.position.set(0, -0.04, 0.14);
    group.add(chestPlate);

    const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), trimMat);
    emblem.position.set(0, -0.04, 0.165);
    group.add(emblem);

    return group;
  }

  /**
   * Constructs a stylized 3D weapon prop to attach to the right hand (swords, bows, staves, daggers).
   */
  _buildWeaponProp(item) {
    const group = new THREE.Group();
    const id = item.id || '';

    if (id.includes('bow')) {
      // --- BOW ---
      const bowMat = new THREE.MeshStandardMaterial({
        color: id.includes('bird') ? 0x0284c7 : 0x78350f,
        roughness: 0.65,
        metalness: id.includes('bird') ? 0.35 : 0.1
      });

      const limb = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.02, 8, 20, Math.PI * 0.75), bowMat);
      limb.rotation.z = -Math.PI * 0.375;
      limb.position.set(0, 0.1, 0);
      group.add(limb);

      const stringMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.58, 4), stringMat);
      string.position.set(-0.24, 0.1, 0);
      group.add(string);

      const gripMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.12, 8), gripMat);
      grip.position.set(0.05, 0.1, 0);
      group.add(grip);

      group.rotation.x = Math.PI / 2;
      group.rotation.y = Math.PI / 2;
      group.scale.set(1.15, 1.15, 1.15);
      return group;
    }

    if (id.includes('staff') || id.includes('wand') || id.includes('orb')) {
      // --- STAFF / WAND ---
      const shaftMat = new THREE.MeshStandardMaterial({
        color: id.includes('frost') ? 0x0f172a : 0x451a03,
        roughness: 0.75
      });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.9, 8), shaftMat);
      shaft.position.y = 0.25;
      group.add(shaft);

      const headMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.8,
        roughness: 0.25
      });
      const crown = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 12), headMat);
      crown.position.y = 0.72;
      group.add(crown);

      const crystalColor = id.includes('frost') ? 0x38bdf8 :
                            id.includes('plant') ? 0x10b981 : 0xa855f7;
      const crystalMat = new THREE.MeshStandardMaterial({
        color: crystalColor,
        roughness: 0.2,
        metalness: 0.5,
        emissive: crystalColor,
        emissiveIntensity: 0.75
      });
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), crystalMat);
      crystal.position.y = 0.72;
      group.add(crystal);

      group.rotation.x = Math.PI / 2;
      group.rotation.z = Math.PI;
      group.scale.set(1.1, 1.1, 1.1);
      return group;
    }

    if (id.includes('dagger')) {
      // --- DAGGER ---
      const hiltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8), hiltMat);
      hilt.position.y = -0.04;
      group.add(hilt);

      const guardMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.3 });
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.03), guardMat);
      guard.position.y = 0.02;
      group.add(guard);

      const bladeColor = id.includes('obsidian') ? 0x09090b : 0xe2e8f0;
      const bladeMat = new THREE.MeshStandardMaterial({
        color: bladeColor,
        roughness: 0.2,
        metalness: 0.85
      });
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.32, 0.012), bladeMat);
      blade.position.y = 0.18;
      group.add(blade);

      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 4), bladeMat);
      tip.position.y = 0.37;
      tip.rotation.y = Math.PI / 4;
      group.add(tip);

      group.rotation.x = Math.PI / 2;
      group.rotation.z = Math.PI;
      group.scale.set(1.1, 1.1, 1.1);
      return group;
    }

    // --- SWORD / DEFAULT MELEE BLADE ---
    const hiltMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), hiltMat);
    hilt.position.y = -0.06;
    group.add(hilt);

    const guardMat = new THREE.MeshStandardMaterial({
      color: id.includes('dragon') ? 0xef4444 : 0xf59e0b,
      roughness: 0.3,
      metalness: 0.8
    });
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.04), guardMat);
    guard.position.y = 0.02;
    group.add(guard);

    const bladeColor = id.includes('frost') ? 0x38bdf8 :
                       id.includes('dragon') ? 0xb91c1c :
                       id.includes('iron') ? 0x94a3b8 :
                       id.includes('wood') ? 0xa16207 : 0xe2e8f0;
    const bladeMat = new THREE.MeshStandardMaterial({
      color: bladeColor,
      roughness: 0.25,
      metalness: 0.75,
      emissive: id.includes('frost') ? 0x0284c7 : (id.includes('dragon') ? 0x7f1d1d : 0x000000)
    });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.55, 0.015), bladeMat);
    blade.position.y = 0.31;
    group.add(blade);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.08, 4), bladeMat);
    tip.position.y = 0.62;
    tip.rotation.y = Math.PI / 4;
    group.add(tip);

    group.rotation.x = Math.PI / 2;
    group.rotation.z = Math.PI;
    group.scale.set(1.2, 1.2, 1.2);
    return group;
  }

  /**
   * Helper to tint an object's material(s).
   */
  /** Cambia la textura del pelo por su versión blanca (useWhite) o devuelve la original. */
  _setHairWhiteMap(obj, useWhite) {
    if (!obj) return;
    obj.traverse((m) => {
      if (!m.isMesh || !m.material || m.userData?.isOutlineMesh || /outline/i.test(m.name || '')) return;
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => {
        // Algunos modelos (masculino A) también pintan el pelo con colores de vértice: se apagan con color propio
        if (mat.userData.hairOrigVC === undefined) mat.userData.hairOrigVC = Boolean(mat.vertexColors);
        const vc = useWhite ? false : mat.userData.hairOrigVC;
        if (Boolean(mat.vertexColors) !== vc) { mat.vertexColors = vc; mat.needsUpdate = true; }
        if (!mat.userData.hairOrigMap && mat.map) mat.userData.hairOrigMap = mat.map;
        const orig = mat.userData.hairOrigMap;
        if (!orig) return;
        const next = useWhite ? whiteHairTexture(orig) : orig;
        if (next && mat.map !== next) { mat.map = next; mat.needsUpdate = true; }
      });
    });
  }

  _tintMesh(mesh, colorHex, roughness = 0.65, metalness = 0.05, emissiveHex = null) {
    if (!mesh || !mesh.material) return;
    if (mesh.userData?.isOutlineMesh || mesh.name?.includes(':ToonOutline') || mesh.name?.includes(':AxieOutline')) {
      return;
    }
    if (colorHex === 'original' || !colorHex) {
      colorHex = '#ffffff';
    }
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const newColor = new THREE.Color(colorHex);

    mats.forEach(mat => {
      mat.color.copy(newColor);
      if (roughness !== undefined) mat.roughness = roughness;
      if (metalness !== undefined) mat.metalness = metalness;
      if (emissiveHex !== null && emissiveHex !== undefined) {
        mat.emissive = new THREE.Color(emissiveHex);
        mat.emissiveIntensity = 0.5;
      } else if (mat.emissive) {
        mat.emissive.setHex(0x000000);
      }
      mat.needsUpdate = true;
    });
  }

  /**
   * Helper to set a mesh part visible/hidden AND sync any attached outline meshes
   */
  _setPartVisible(model, mesh, visible) {
    if (!mesh) return;
    mesh.visible = Boolean(visible);
    if (model) {
      model.traverse(child => {
        if (child.userData?.isOutlineMesh && child.userData?.sourceMesh === mesh) {
          child.visible = Boolean(visible);
        }
      });
      const outlineName = `${mesh.name || mesh.uuid}:ToonOutline`;
      const outlineObj = model.getObjectByName(outlineName);
      if (outlineObj) {
        outlineObj.visible = Boolean(visible);
      }
    }
  }
}

export const sapidaeModularController = new SapidaeModularController();
