// Ktx2.js — Texturas KTX2 (Basis ETC1S / UASTC) para todo el juego.
//
// Las texturas KTX2 llegan a la tarjeta gráfica ya comprimidas (BC1/BC7 en escritorio, ETC/ASTC en móvil): ocupan
// de 4 a 8 veces menos memoria que un PNG/WebP y se suben más rápido. Ver docs/PLAN_KTX2.md.
//
// - Un solo KTX2Loader (con su transcodificador Basis en un worker) para todos los GLTFLoader del juego: cada
//   GLTFLoader lo recibe solo, sin tocar los ~20 sitios que crean uno (se parchea GLTFLoader.prototype.parse).
// - loadTexture(url): como TextureLoader.load (devuelve la textura al momento y la rellena al llegar), pero acepta
//   .ktx2. Cada .ktx2 se carga una sola vez (caché por url): quien la pida recibe la misma textura, así que no se le
//   deben poner ajustes distintos (wrap / repeat) en cada sitio. Las texturas KTX2 no se voltean al subirlas (flipY no aplica a texturas comprimidas): quien las usa con
//   UV pensadas para PNG volteado debe invertir repeat.y (ver isKtx2Texture).
//
// Archivos necesarios en vendor/ (de three@0.160.0, la misma versión que vendor/three.module.js):
//   vendor/loaders/KTX2Loader.js        ← examples/jsm/loaders/KTX2Loader.js
//   vendor/utils/WorkerPool.js          ← examples/jsm/utils/WorkerPool.js
//   vendor/libs/ktx-parse.module.js     ← examples/jsm/libs/ktx-parse.module.js
//   vendor/libs/zstddec.module.js       ← examples/jsm/libs/zstddec.module.js
//   vendor/libs/basis/basis_transcoder.js y .wasm ← examples/jsm/libs/basis/
// Si faltan, el juego sigue con normalidad y los modelos con texturas KTX2 fallan al cargar (aviso en consola).

import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';

const TRANSCODER_PATH = './vendor/libs/basis/';

let ktx2 = null;       // KTX2Loader compartido
let readyPromise = null;
let failed = false;

/** Prepara el lector KTX2 con el renderer principal (decide a qué formato comprimido transcodificar). */
export function installKtx2(renderer) {
  if (readyPromise) return readyPromise;
  readyPromise = import('../../vendor/loaders/KTX2Loader.js')
    .then(({ KTX2Loader }) => {
      ktx2 = new KTX2Loader().setTranscoderPath(TRANSCODER_PATH).detectSupport(renderer);
      return ktx2;
    })
    .catch((err) => {
      failed = true;
      console.warn('[KTX2] Lector no disponible (¿faltan los archivos de three en vendor/?). Las texturas .ktx2 no cargarán.', err);
      return null;
    });
  // Todos los GLTFLoader usan el lector compartido. Si un modelo se lee antes de que esté listo, espera.
  const parse = GLTFLoader.prototype.parse;
  if (!parse.__lkKtx2) {
    const patched = function (data, path, onLoad, onError) {
      if (this.ktx2Loader || failed) return parse.call(this, data, path, onLoad, onError);
      if (ktx2) { this.setKTX2Loader(ktx2); return parse.call(this, data, path, onLoad, onError); }
      readyPromise.then(() => {
        if (ktx2 && !this.ktx2Loader) this.setKTX2Loader(ktx2);
        parse.call(this, data, path, onLoad, onError);
      });
      return undefined;
    };
    patched.__lkKtx2 = true;
    GLTFLoader.prototype.parse = patched;
  }
  return readyPromise;
}

export const ktx2Ready = () => readyPromise || Promise.resolve(null);
export const isKtx2Url = (url) => /\.ktx2(\?|#|$)/i.test(String(url || ''));
export const isKtx2Texture = (tex) => Boolean(tex && tex.userData && tex.userData.lkKtx2);

/**
 * Como new THREE.TextureLoader().load(url): devuelve la textura al momento (se puede configurar wrap, repeat,
 * colorSpace…) y la rellena cuando llega. Con .ktx2 devuelve una CompressedTexture que no se dibuja hasta tener datos.
 */
const _ktxCache = new Map(); // url → textura: la misma corteza se pedía una vez por isla y por tipo de árbol (11 copias de 3 archivos)

export function loadTexture(url, onLoad = null) {
  if (!isKtx2Url(url)) return new THREE.TextureLoader().load(url, onLoad || undefined);
  const cached = _ktxCache.get(url);
  if (cached) {
    if (onLoad) { if (cached.mipmaps.length) onLoad(cached); else cached.userData.lkWaiting.push(onLoad); }
    return cached;
  }
  const tex = new THREE.CompressedTexture([], 1, 1);
  tex.userData.lkWaiting = [];
  _ktxCache.set(url, tex);
  tex.userData.lkKtx2 = true;
  tex.flipY = false;
  tex.generateMipmaps = false;
  ktx2Ready().then((loader) => {
    if (!loader) return;
    loader.load(url, (t) => {
      tex.image = t.image;
      tex.mipmaps = t.mipmaps;
      tex.format = t.format;
      tex.type = t.type;
      tex.colorSpace = tex.colorSpace !== THREE.NoColorSpace ? tex.colorSpace : t.colorSpace;
      tex.minFilter = t.mipmaps && t.mipmaps.length > 1 ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.premultiplyAlpha = t.premultiplyAlpha;
      tex.unpackAlignment = t.unpackAlignment;
      tex.needsUpdate = true;
      t.dispose();
      if (onLoad) onLoad(tex);
      tex.userData.lkWaiting.splice(0).forEach((fn) => { try { fn(tex); } catch (e) { console.warn(e); } });
    }, undefined, (err) => console.warn('[KTX2] No se pudo cargar', url, err));
  });
  return tex;
}
