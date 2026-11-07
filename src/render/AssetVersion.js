// AssetVersion.js — Versión de los assets en las rutas (Hito 109).
//
// El hosting (Hostinger, .htaccess) guarda modelos, texturas y audio un año en el navegador sin volver a preguntar
// (Cache-Control immutable). Si un archivo cambia pero conserva el nombre, quien ya jugó seguiría viendo el viejo.
// Solución: cada petición de un asset lleva ?v=ASSET_VERSION. Al cambiar la versión, la URL es otra y el navegador
// descarga la nueva; mientras no cambie, la caché de un año sigue funcionando.
//
// REGLA: si cambias o reemplazas algo en assets/ (o vendor/), sube ASSET_VERSION antes de subir el juego.
//
// Cobertura:
//   · three.js: se parchean FileLoader / ImageLoader / ImageBitmapLoader.prototype.load. Cubre GLTFLoader, TextureLoader,
//     KTX2Loader, DRACOLoader (y sus .wasm/transcodificadores), los LoadingManager propios (Sabana, DemoScena) y el mixer
//     de Axies. La versión se añade solo en la petición: las rutas guardadas en el código (claves de ModelCache, Ktx2,
//     comprobaciones de extensión) no cambian.
//   · Audio con fetch / new Audio: llaman a v() (MusicManager, AmbienceManager, SfxBank, SkillSfxBank, PrologueVoice).
//   · Imágenes de la interfaz (<img src>): no llevan versión; el .htaccess las revalida (no-cache + ETag).
// No se tocan: data:, blob:, URLs de otros dominios ni URLs que ya llevan v=.

import { FileLoader, ImageLoader, ImageBitmapLoader } from 'three';

export const ASSET_VERSION = '0.4.3'; // Hito 145: NPC Sapidae a 512, mejillas/pantalón de Ema a 256, kappa y slimes en KTX2

const SKIP = /^(data:|blob:)/i;
const HAS_V = /[?&]v=/;
const ABSOLUTE = /^([a-z][a-z\d+.-]*:|\/\/)/i;

/** Añade ?v=ASSET_VERSION a una URL del propio juego. Devuelve la misma URL si no corresponde. */
export function v(url) {
  if (typeof url !== 'string' || !url || SKIP.test(url) || HAS_V.test(url)) return url;
  if (ABSOLUTE.test(url)) {
    try {
      if (typeof location === 'undefined' || new URL(url, location.href).origin !== location.origin) return url;
    } catch { return url; }
  }
  const hashAt = url.indexOf('#');
  const base = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const hash = hashAt >= 0 ? url.slice(hashAt) : '';
  return `${base}${base.includes('?') ? '&' : '?'}v=${ASSET_VERSION}${hash}`;
}

function patch(Loader) {
  const proto = Loader?.prototype;
  if (!proto || proto.__lkVersioned) return;
  const load = proto.load;
  proto.load = function (url, ...rest) { return load.call(this, v(url), ...rest); };
  proto.__lkVersioned = true;
}

// loadAsync de three llama a this.load, así que también queda cubierto.
patch(FileLoader);
patch(ImageLoader);
patch(ImageBitmapLoader);

if (typeof window !== 'undefined') window.lkAssetVersion = ASSET_VERSION;
