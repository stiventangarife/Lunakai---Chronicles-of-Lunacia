// AssetAudit.js — Diagnóstico de texturas y props en consola (F12): lkDebug.assets
//
// Responde dos preguntas con datos del juego real (no del disco):
//   1. ¿Qué texturas se pueden pasar a KTX2 y con qué modo (ETC1S o UASTC)? ¿Cuáles deben seguir en PNG?
//   2. ¿Qué props conviene simplificar? (triángulos por copia × copias, tamaño en el mundo, sombras)
//
// Uso (en el mundo abierto):
//   lkDebug.assets.audit()    analiza la escena actual y lo suma a lo ya visto en esta sesión
//                            (recorre las islas: Bosque, Sabana, Ártico… y llama a audit() en cada una)
//   lkDebug.assets.export()   descarga el JSON con todo lo acumulado (texturas, props y recomendaciones)
//   lkDebug.assets.reset()    borra lo acumulado
//
// Mientras está instalado anota, con un coste mínimo: la ruta de cada GLB y de cada textura cargada, y qué
// imágenes se dibujan en un canvas (= el juego lee sus píxeles: teñido del Sapidae, máscaras…). Una textura
// así no se puede comprimir: la GPU no devuelve los píxeles de una textura KTX2.

import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import * as THREE from 'three';

const srcOfTexture = new WeakMap(); // textura → ruta (GLB o archivo)
const srcOfImage = new WeakMap();   // imagen → ruta
const drawnImages = new WeakSet();  // imágenes leídas en la CPU (dibujadas en un canvas)

const short = (u) => String(u || '').replace(/^https?:\/\/[^/]+\//, '').replace(/^\.\//, '').replace(/\?.*$/, '');

const MAP_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap',
  'displacementMap', 'specularMap', 'lightMap', 'gradientMap', 'matcap', 'clearcoatMap', 'clearcoatNormalMap', 'sheenColorMap', 'transmissionMap'];

function texturesOf(material) {
  const out = [];
  if (!material) return out;
  for (const k of MAP_KEYS) { const t = material[k]; if (t && t.isTexture) out.push([k, t]); }
  if (material.uniforms) for (const k in material.uniforms) { const v = material.uniforms[k] && material.uniforms[k].value; if (v && v.isTexture) out.push([`uniform:${k}`, v]); }
  for (const k of ['origMap', 'baseMap', 'srcMap']) { const t = material.userData && material.userData[k]; if (t && t.isTexture) out.push([`userData:${k}`, t]); }
  return out;
}

function tagGLTF(gltf, url) {
  const src = short(url);
  if (!gltf || !gltf.scene || src.startsWith('blob:')) return;
  gltf.scene.userData.lkSrc = src;
  gltf.scene.traverse((o) => {
    const mats = o.material ? [].concat(o.material) : [];
    for (const m of mats) for (const [, t] of texturesOf(m)) {
      if (!srcOfTexture.has(t)) srcOfTexture.set(t, `${src} › ${t.name || 'textura'}`);
      // también la imagen: las copias de la textura (texture.clone()) la comparten
      if (t.image && typeof t.image === 'object' && !srcOfImage.has(t.image)) srcOfImage.set(t.image, `${src} › ${t.name || 'textura'}`);
    }
  });
}

let installed = false;
function installHooks() {
  if (installed) return;
  installed = true;
  // GLB: ruta del modelo en su escena y en sus texturas (las copias comparten texturas y copian userData)
  const load = GLTFLoader.prototype.load;
  GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    return load.call(this, url, (g) => { try { tagGLTF(g, url); } catch (_) { /* opcional */ } if (onLoad) onLoad(g); }, onProgress, onError);
  };
  // Texturas sueltas (caminos, terreno…)
  const tl = THREE.TextureLoader.prototype.load;
  THREE.TextureLoader.prototype.load = function (url, ...rest) {
    const t = tl.call(this, url, ...rest);
    try { if (t && !String(url).startsWith('blob:')) srcOfTexture.set(t, short(url)); } catch (_) { /* opcional */ }
    return t;
  };
  const il = THREE.ImageBitmapLoader.prototype.load;
  THREE.ImageBitmapLoader.prototype.load = function (url, onLoad, ...rest) {
    return il.call(this, url, (img) => { try { if (!String(url).startsWith('blob:')) srcOfImage.set(img, short(url)); } catch (_) { /* opcional */ } if (onLoad) onLoad(img); }, ...rest);
  };
  // Imágenes cuyos píxeles lee el juego (drawImage en un canvas 2D)
  if (typeof CanvasRenderingContext2D !== 'undefined') {
    const di = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (img, ...rest) {
      try { if (img && typeof img === 'object') drawnImages.add(img); } catch (_) { /* opcional */ }
      return di.call(this, img, ...rest);
    };
  }
  if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
    const di2 = OffscreenCanvasRenderingContext2D.prototype.drawImage;
    OffscreenCanvasRenderingContext2D.prototype.drawImage = function (img, ...rest) {
      try { if (img && typeof img === 'object') drawnImages.add(img); } catch (_) { /* opcional */ }
      return di2.call(this, img, ...rest);
    };
  }
}

function triCount(geo, mesh) {
  if (!geo) return 0;
  const n = geo.index ? geo.index.count : (geo.attributes.position ? geo.attributes.position.count : 0);
  const dr = geo.drawRange && Number.isFinite(geo.drawRange.count) ? Math.min(n, geo.drawRange.count) : n;
  const per = mesh && (mesh.isLine || mesh.isPoints) ? 0 : dr / 3;
  return per * (mesh && mesh.isInstancedMesh ? mesh.count : 1);
}

function isVisibleChain(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }

function zoneOf(o, scene) {
  let p = o;
  while (p.parent && p.parent !== scene) p = p.parent;
  return p.name || p.type;
}

const pow2 = (n) => n > 0 && (n & (n - 1)) === 0;
const MB = (b) => Math.round((b / 1048576) * 10) / 10;

// ---------------------------------------------------------------- acumulado de la sesión
const ACC = { textures: new Map(), props: new Map(), visits: [] };

function texKey(t, src) { return src ? `${src}|${t.image?.width}x${t.image?.height}` : `uuid:${t.uuid}`; }

function sapidaeAncestor(o) {
  for (let p = o; p; p = p.parent) {
    if (p.userData && (p.userData.sapiLook || p.userData.sapiEquip)) return true;
    if (/sapidae/i.test(p.name || '') || /sapidae/i.test(p.userData?.lkSrc || '')) return true;
  }
  return false;
}

function audit(game) {
  const scene = game.overworldManager && game.overworldManager.scene;
  if (!scene) { console.warn('[assets] Abre el mundo abierto antes de llamar a audit().'); return null; }
  const zoneName = game.overworldManager?.worldMapManager?.currentMapDef?.name || game.overworldManager?.worldMapManager?.currentMapId || '?';
  ACC.visits.push({ zona: zoneName, t: new Date().toISOString() });
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const size = new THREE.Vector3();

  // ---- props: la raíz más externa con lkSrc es una copia de ese GLB
  const seenRoots = new Set();
  scene.traverse((o) => {
    if (!o.userData || !o.userData.lkSrc || seenRoots.has(o)) return;
    for (let p = o.parent; p; p = p.parent) if (p.userData && p.userData.lkSrc && seenRoots.has(p)) return; // dentro de otra copia
    seenRoots.add(o);
    let tris = 0, meshes = 0, shadow = 0, shadowTris = 0;
    o.traverse((m) => {
      if (!m.isMesh) return;
      const t = triCount(m.geometry, m);
      meshes++; tris += t;
      if (m.castShadow) { shadow++; shadowTris += t; }
    });
    if (!meshes) return;
    box.setFromObject(o);
    const dim = box.isEmpty() ? 0 : Math.max(...box.getSize(size).toArray());
    const key = o.userData.lkSrc;
    const isSapi = sapidaeAncestor(o);
    let r = ACC.props.get(key);
    if (!r) { r = { modelo: key, copias: 0, copiasVisibles: 0, trisPorCopia: 0, mallasPorCopia: 0, mallasConSombra: 0, trisSombraPorCopia: 0, tamM: 0, zonas: new Set(), personaje: isSapi, _seen: new Set() }; ACC.props.set(key, r); }
    if (r._seen.has(o.uuid)) return;
    r._seen.add(o.uuid);
    r.copias++;
    if (isVisibleChain(o)) r.copiasVisibles++;
    r.trisPorCopia = Math.max(r.trisPorCopia, Math.round(tris));
    r.mallasPorCopia = Math.max(r.mallasPorCopia, meshes);
    r.mallasConSombra = Math.max(r.mallasConSombra, shadow);
    r.trisSombraPorCopia = Math.max(r.trisSombraPorCopia, Math.round(shadowTris));
    r.tamM = Math.max(r.tamM, Math.round(dim * 10) / 10);
    r.zonas.add(zoneOf(o, scene));
  });

  // ---- mallas sin GLB de origen (hechas por código, fusionadas, instanciadas…): por zona y nombre
  scene.traverse((m) => {
    if (!m.isMesh) return;
    for (let p = m; p; p = p.parent) if (p.userData && p.userData.lkSrc) return;
    const t = triCount(m.geometry, m);
    if (t < 500) return;
    const key = `(código) ${zoneOf(m, scene)} › ${m.name || m.geometry?.type || 'malla'}`;
    let r = ACC.props.get(key);
    if (!r) { r = { modelo: key, copias: 0, copiasVisibles: 0, trisPorCopia: 0, mallasPorCopia: 1, mallasConSombra: 0, trisSombraPorCopia: 0, tamM: 0, zonas: new Set(), personaje: false, instanciada: false, _seen: new Set() }; ACC.props.set(key, r); }
    if (r._seen.has(m.uuid)) return;
    r._seen.add(m.uuid);
    const inst = m.isInstancedMesh ? m.count : 1;
    r.instanciada = r.instanciada || Boolean(m.isInstancedMesh);
    r.copias += inst;
    if (isVisibleChain(m)) r.copiasVisibles += inst;
    r.trisPorCopia = Math.max(r.trisPorCopia, Math.round(t / inst));
    if (m.castShadow) { r.mallasConSombra = 1; r.trisSombraPorCopia = Math.max(r.trisSombraPorCopia, Math.round(t / inst)); }
    if (m.geometry) { if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere(); r.tamM = Math.max(r.tamM, Math.round((m.geometry.boundingSphere?.radius || 0) * 2 * m.getWorldScale(size).x * 10) / 10); }
    r.zonas.add(zoneOf(m, scene));
  });

  // ---- texturas
  scene.traverse((o) => {
    const mats = o.material ? [].concat(o.material) : [];
    if (!mats.length) return;
    const sapi = sapidaeAncestor(o);
    let objSize = null;
    for (const mat of mats) {
      for (const [role, t] of texturesOf(mat)) {
        const img = t.image;
        const src = srcOfTexture.get(t) || (img && srcOfImage.get(img)) || (img && img.currentSrc ? short(img.currentSrc) : '') || (img && img.src && !String(img.src).startsWith('data:') && !String(img.src).startsWith('blob:') ? short(img.src) : '');
        const key = texKey(t, src);
        let r = ACC.textures.get(key);
        if (!r) {
          const w = (img && (img.width || img.videoWidth)) || (t.isCompressedTexture && t.mipmaps?.[0]?.width) || 0;
          const h = (img && (img.height || img.videoHeight)) || (t.isCompressedTexture && t.mipmaps?.[0]?.height) || 0;
          r = {
            origen: src || `(sin ruta) ${t.name || t.constructor.name}`,
            ancho: w, alto: h,
            tipo: t.isCompressedTexture ? 'comprimida' : t.isCanvasTexture || (img && typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement) ? 'canvas' : t.isDataTexture || t.isData3DTexture || t.isDataArrayTexture ? 'datos' : t.isRenderTargetTexture ? 'render' : t.isVideoTexture ? 'video' : 'imagen',
            mipmaps: Boolean(t.isCompressedTexture ? (t.mipmaps && t.mipmaps.length > 1) : (t.generateMipmaps && pow2(w) && pow2(h))),
            formato: t.format,
            // Las texturas de un GLB vienen en RepeatWrapping por defecto (estándar glTF) aunque no se repitan: solo cuentan las sueltas
            repetida: !(src && src.includes(' › ')) && (t.wrapS === THREE.RepeatWrapping || t.wrapT === THREE.RepeatWrapping),
            usos: new Set(), mallas: 0, modelos: new Set(), zonas: new Set(),
            alphaTest: false, transparente: false, sprite: false, personaje: false, leidaCPU: false, tamMaxObjetoM: 0, _seen: new Set(),
          };
          ACC.textures.set(key, r);
        }
        r.usos.add(role.startsWith('userData:') ? 'origen del teñido' : role);
        if (role.startsWith('userData:')) r.leidaCPU = true;
        if (img && drawnImages.has(img)) r.leidaCPU = true;
        if (sapi) r.personaje = true;
        if (mat.alphaTest > 0 && role === 'map') r.alphaTest = true;
        if (mat.transparent && role === 'map') r.transparente = true;
        if (mat.isSpriteMaterial) r.sprite = true;
        if (!r._seen.has(o.uuid)) {
          r._seen.add(o.uuid);
          r.mallas++;
          let p = o; let lk = '';
          for (; p; p = p.parent) if (p.userData && p.userData.lkSrc) lk = p.userData.lkSrc;
          if (lk) r.modelos.add(lk);
          r.zonas.add(zoneOf(o, scene));
          if (o.isMesh && o.geometry && !r.repetida) {
            if (objSize === null) {
              if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
              objSize = (o.geometry.boundingSphere?.radius || 0) * 2 * o.getWorldScale(size).x;
            }
            r.tamMaxObjetoM = Math.max(r.tamMaxObjetoM, Math.round(objSize * 10) / 10);
          }
        }
      }
    }
  });

  const rep = buildReport();
  console.log(`[assets] ${zoneName}: ${rep.resumen.texturas} texturas (${rep.resumen.mbAhora} MB en GPU → ${rep.resumen.mbConKTX2} MB con las recomendaciones), ${rep.props.length} modelos.`);
  console.table(rep.texturas.slice(0, 25).map((t) => ({ origen: t.origen, tam: t.tam, mb: t.mbAhora, rec: t.recomendacion, motivo: t.motivo })));
  console.table(rep.props.slice(0, 25).map((p) => ({ modelo: p.modelo, copias: p.copias, tris: p.trisPorCopia, total: p.trisTotal, tamM: p.tamM, rec: p.recomendacion })));
  console.log('[assets] Recorre las demás islas y llama a audit() en cada una; luego lkDebug.assets.export().');
  return rep;
}

// ---------------------------------------------------------------- recomendaciones
function recommendTexture(r) {
  const px = r.ancho * r.alto;
  const mip = r.mipmaps ? 4 / 3 : 1;
  // Comprimidas: BC1/ETC1/ETC2 RGB = 0,5 B/px; el resto (BC3, BC7, ETC2 RGBA, ASTC 4x4) = 1 B/px
  const HALF = new Set([33776, 33777, 36196, 37492, 35840, 35841, 35842, 35843]);
  const now = px * (r.tipo === 'comprimida' ? (HALF.has(r.formato) ? 0.5 : 1) : 4) * mip;
  const roles = [...r.usos];
  const normal = roles.some((u) => /normal/i.test(u));
  const alpha = r.alphaTest || r.transparente || roles.includes('alphaMap');
  let rec, why, bpp = 4;
  if (r.tipo === 'comprimida') { rec = 'Ya comprimida'; why = 'ya es KTX2/DDS'; bpp = HALF.has(r.formato) ? 0.5 : 1; }
  else if (r.tipo !== 'imagen') { rec = 'Mantener'; why = `se genera en el juego (${r.tipo})`; }
  else if (r.leidaCPU || r.personaje) { rec = 'Mantener PNG'; why = r.personaje ? 'textura del Sapidae: se tiñe leyendo sus píxeles' : 'el juego lee sus píxeles (canvas)'; }
  else if (r.sprite) { rec = 'Mantener PNG'; why = 'sprite / interfaz'; }
  else if (px < 256 * 256) { rec = 'Mantener PNG'; why = 'pequeña: no compensa'; }
  else if (normal) { rec = 'UASTC'; why = 'mapa de normales (ETC1S lo estropea)'; bpp = 1; }
  else if (alpha) { rec = 'UASTC'; why = 'con recorte/transparencia (hojas, pasto): bordes limpios'; bpp = 1; }
  else if (roles.some((u) => /rough|metal|ao|specular|emissive/i.test(u))) { rec = 'ETC1S'; why = 'mapa de material (rugosidad/oclusión)'; bpp = 0.5; }
  else { rec = 'ETC1S'; why = r.repetida ? 'color repetido (suelo, corteza, roca)' : 'color opaco'; bpp = 0.5; }
  // Tamaño: objetos pequeños que no repiten la textura no necesitan 1024
  let tam = '';
  let scale = 1;
  if (rec !== 'Mantener' && rec !== 'Mantener PNG' && !r.repetida && Math.max(r.ancho, r.alto) >= 1024 && r.tamMaxObjetoM > 0 && r.tamMaxObjetoM < 2.5) { tam = 'bajar a 512'; scale = 0.25; }
  const after = rec === 'Mantener' || rec === 'Mantener PNG' ? now : px * scale * bpp * (4 / 3);
  return { rec, why, tam, now, after };
}

function recommendProp(p) {
  const total = p.trisPorCopia * p.copias;
  const small = p.tamM > 0 && p.tamM < 2.5;
  const medium = p.tamM >= 2.5 && p.tamM < 6;
  const notes = [];
  let rec = 'Mantener';
  if (p.personaje) return { rec: 'Mantener (personaje)', notes: [], total };
  if (small && p.trisPorCopia >= 2500) { rec = 'Simplificar'; notes.push(`pequeño (${p.tamM} m): ~1.000–2.000 tris`); }
  else if (medium && p.trisPorCopia >= 6000) { rec = 'Simplificar'; notes.push(`mediano (${p.tamM} m): ~3.000–4.000 tris o LOD`); }
  else if (p.trisPorCopia >= 15000) { rec = 'Revisar'; notes.push('muy denso: LOD para la distancia'); }
  if (p.copias >= 10 && p.trisPorCopia >= 2000) { if (rec === 'Mantener') rec = 'Revisar'; notes.push(`${p.copias} copias: LOD o instanciado`); }
  if (small && p.mallasConSombra > 0 && p.trisSombraPorCopia >= 1500) notes.push('sin sombra (castShadow = false) o sombra simplificada');
  return { rec, notes, total };
}

function buildReport() {
  const texturas = [...ACC.textures.values()].map((r) => {
    const x = recommendTexture(r);
    return {
      origen: r.origen, tam: `${r.ancho}×${r.alto}`, tipo: r.tipo, usos: [...r.usos].join(', '), mallas: r.mallas,
      modelos: [...r.modelos].slice(0, 6), zonas: [...r.zonas].slice(0, 6), alpha: r.alphaTest ? 'recorte' : r.transparente ? 'transparente' : 'no',
      repetida: r.repetida, tamMaxObjetoM: r.tamMaxObjetoM, leidaCPU: r.leidaCPU, personaje: r.personaje,
      mbAhora: MB(x.now), mbDespues: MB(x.after), recomendacion: x.rec + (x.tam ? ` + ${x.tam}` : ''), motivo: x.why,
    };
  }).sort((a, b) => b.mbAhora - a.mbAhora);
  const props = [...ACC.props.values()].map((p) => {
    const x = recommendProp(p);
    return {
      modelo: p.modelo, copias: p.copias, copiasVisibles: p.copiasVisibles, trisPorCopia: p.trisPorCopia, trisTotal: Math.round(x.total),
      mallasPorCopia: p.mallasPorCopia, mallasConSombra: p.mallasConSombra, trisSombraPorCopia: p.trisSombraPorCopia, tamM: p.tamM,
      instanciada: Boolean(p.instanciada), zonas: [...p.zonas].slice(0, 6), recomendacion: x.rec, notas: x.notes.join(' · '),
    };
  }).sort((a, b) => b.trisTotal - a.trisTotal);
  const sum = (arr, k) => Math.round(arr.reduce((a, b) => a + (b[k] || 0), 0) * 10) / 10;
  const byRec = {};
  for (const t of texturas) { const k = t.recomendacion.split(' + ')[0]; byRec[k] = byRec[k] || { texturas: 0, mbAhora: 0, mbDespues: 0 }; byRec[k].texturas++; byRec[k].mbAhora += t.mbAhora; byRec[k].mbDespues += t.mbDespues; }
  Object.values(byRec).forEach((v) => { v.mbAhora = Math.round(v.mbAhora * 10) / 10; v.mbDespues = Math.round(v.mbDespues * 10) / 10; });
  return {
    zonasVisitadas: ACC.visits,
    resumen: {
      texturas: texturas.length, mbAhora: sum(texturas, 'mbAhora'), mbConKTX2: sum(texturas, 'mbDespues'), porRecomendacion: byRec,
      modelos: props.length, propsASimplificar: props.filter((p) => p.recomendacion === 'Simplificar').length,
      nota: 'MB = memoria estimada en la tarjeta gráfica (RGBA8 con mipmaps; KTX2 en escritorio: ETC1S → BC1 0,5 B/px, UASTC → BC7 1 B/px).',
    },
    texturas, props,
  };
}

export function installAssetAudit(game) {
  if (typeof window === 'undefined') return null;
  installHooks();
  const api = {
    audit: () => audit(game),
    report: () => buildReport(),
    reset: () => { ACC.textures.clear(); ACC.props.clear(); ACC.visits.length = 0; },
    /** Ruta del GLB o archivo de una textura (la usa lkDebug.gpu para nombrar lo que ya no está en escena). */
    sourceOf(t) {
      if (!t || !t.isTexture) return '';
      const img = t.image;
      return srcOfTexture.get(t) || (img && typeof img === 'object' && srcOfImage.get(img)) || '';
    },
    export() {
      const rep = buildReport();
      const blob = new Blob([JSON.stringify(rep, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `lunakai-assets-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      return rep;
    },
    help() {
      console.log([
        'lkDebug.assets — diagnóstico de texturas (KTX2) y props (triángulos)',
        '  audit()   analiza la isla actual y lo suma a lo visto en la sesión',
        '  export()  descarga el JSON con todo lo acumulado',
        '  reset()   borra lo acumulado',
      ].join('\n'));
    },
  };
  (window.lkDebug ||= {}).assets = api;
  return api;
}

// Las rutas se anotan desde que se importa el módulo (antes de que se cargue ningún modelo)
try { if (typeof window !== 'undefined') installHooks(); } catch (_) { /* opcional */ }
