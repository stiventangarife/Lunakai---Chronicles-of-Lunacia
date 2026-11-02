# Hito 109: Versión de los assets en las rutas (caché del hosting)

> **Estado:** en la versión de prueba (31-oct-2026). Probado en Chromium con el three.js del juego (r160), sus cargadores y el cactus real; pendiente de probar el juego completo en local y en Hostinger.
> **Pedido:** que los jugadores reciban los assets cambiados (caso: el cactus de la Sabana optimizado) aunque su navegador tenga guardada la versión anterior, sin perder la caché y sin renombrar archivos.

## 1. Antes

- En Hostinger el `.htaccess` servía `.glb`, `.gltf`, `.png`, `.jpg`, `.webp`, `.svg`, `.mp3`, `.wav`, `.ogg`, `.wasm` y `.woff2` con `Cache-Control: max-age=31536000, immutable`: el navegador los guarda **un año sin volver a preguntar**. `_headers`, `netlify.toml` y `vercel.json` hacen lo mismo con `/assets/*` y `/vendor/*`.
- El código (`.js`, `.css`, `.json`) se revalida siempre y `index.html` no se guarda. Resultado: tras una subida, código nuevo con assets viejos.
- Caso real: `assets/savannah/cactus_forge3D.glb` se rehízo el 30-oct (2.166 → 667 triángulos, textura WebP 512). Quien ya había jugado seguía viendo y dibujando el cactus antiguo, con su coste completo.
- Ninguna URL llevaba versión; no hay service worker.

## 2. Solución

Cada petición de un asset lleva `?v=ASSET_VERSION`. Si la versión cambia, la URL es otra y el navegador descarga el archivo nuevo; mientras no cambie, la caché de un año sigue valiendo.

| Pieza | Qué hace | Archivos |
|---|---|---|
| Constante y `v(url)` | `ASSET_VERSION = '0.4.0'`. `v()` añade `?v=` (o `&v=`) antes del `#`. No toca `data:`, `blob:`, otros dominios ni URLs que ya llevan `v=`. Expone `window.lkAssetVersion`. | `src/render/AssetVersion.js` (nuevo) |
| three.js | Parchea `FileLoader`, `ImageLoader` e `ImageBitmapLoader.prototype.load` (y con ello `loadAsync`). Cubre GLTFLoader, TextureLoader, KTX2Loader, DRACOLoader con sus `.wasm` y transcodificadores, los `LoadingManager` propios (Sabana, DemoScena) y los modelos y texturas del mixer de Axies. Se importa al principio de `main.js`, antes de cualquier carga. | `AssetVersion.js`, `src/main.js` |
| Audio | La URL se envuelve con `withVersion()` (alias de `v`) en `fetch` / `new Audio`. | `MusicManager.js`, `AmbienceManager.js`, `SfxBank.js`, `SkillSfxBank.js` (solo los MP3: el `manifest.json` ya va con `cache: 'no-cache'`), `PrologueVoice.js` |
| Mixer de Axies | Opción `resolveAssetUrl: withVersion` en `createAxieMixer3D`: cubre también lo que el mixer pide con `fetch` (manifiesto, animaciones). | `src/rpg/AxieMixerService.js` |
| Hosting | Un año `immutable` para `glb`, `gltf`, `bin`, `ktx2`, `mp3`, `wav`, `ogg`, `wasm`, `woff2` (todos llevan versión). Imágenes (`png`, `jpg`, `jpeg`, `webp`, `svg`, `gif`) con `no-cache`: se guardan, pero se revalidan (304 sin descarga si no cambiaron). MIME de `.ktx2`. | `.htaccess` |

**La versión solo se añade en la petición.** Las rutas escritas en el código no cambian, así que siguen funcionando:

- las claves de `ModelCache` y de `Ktx2` (`_ktxCache`);
- `evictGLTF(path)`;
- las comprobaciones `.glb$` de `WanderingMonsters`;
- la carpeta base de los GLTF, que se calcula con la URL original.

## 3. Por qué no se versionaron las imágenes de la interfaz

Los `<img src>` de los paneles (unos 200 sitios en 26 archivos, más ~15 en `index.html`) se escriben directamente en el HTML y no hay un punto común. Cambiarlos uno a uno era mucho riesgo para la entrega del 7-nov. En su lugar, el `.htaccess` las sirve con `no-cache`: el navegador pregunta en cada carga si cambiaron y, si no, el servidor contesta 304 sin enviar el archivo.

**Limitación:** una imagen que un jugador ya guardó con la regla anterior (`immutable`) sigue siendo la vieja hasta que caduque. Si hace falta forzar una en concreto, se le pone la versión a mano (`withVersion(url)` o `asset()` + `v()`).

## 4. Pruebas (Chromium + Playwright, three r160 del juego)

| Prueba | Resultado |
|---|---|
| `v()`: ruta relativa, con query, con `#`, `data:`, `blob:`, otro dominio, mismo dominio absoluto, `v=` ya presente | `?v=0.4.0` / `&v=0.4.0` / antes del `#`; sin cambios en los 4 casos a ignorar |
| `GLTFLoader` sin manager y con `LoadingManager` propio | `cactus.glb?v=0.4.0`, `own-manager.glb?v=0.4.0` |
| `TextureLoader` normal y con `setPath` | `tex.webp?v=0.4.0`, `assets/p/pathed.png?v=0.4.0` |
| `FileLoader` | `data.bin?v=0.4.0` |
| `DRACOLoader` | `draco_wasm_wrapper.js?v=0.4.0`, `draco_decoder.wasm?v=0.4.0` |
| Cactus real (`cactus_forge3D.glb`, WebP incrustado) con manager propio | Carga: 667 triángulos, textura 512×512; la textura interna sale como `blob:` sin versión |
| `server.js` local | Ignora la query (`req.url.split('?')[0]`) |

## 5. Cómo se usa

1. Si cambiaste, reemplazaste u optimizaste algo en `assets/` o `vendor/`, sube la versión antes de subir el juego:
   ```js
   // src/render/AssetVersion.js
   export const ASSET_VERSION = '0.4.1';
   ```
   No hace falta si solo cambió código, textos o se añadieron archivos con nombre nuevo.
2. Sube el juego a Hostinger (`public_html`, incluido `.htaccess`). Si la CDN de Hostinger o LiteSpeed Cache están activas, púrgalas desde hPanel.
3. Comprueba en F12 → Red que los `.glb` / `.mp3` llevan la versión nueva. En la consola, `lkAssetVersion`.

**Primera subida con este hito:** no hace falta cambiar la versión. Antes las URLs no llevaban `?v=`, así que con `0.4.0` todas son nuevas y cada jugador descarga los archivos actuales una vez (incluido el cactus nuevo).

## 6. Para el futuro

- **Una carga nueva** que no pase por three.js (`fetch`, `new Audio`, `new Image`, `<img src>` de un asset que cambie a menudo) debe envolver la URL con `v()` / `withVersion()`.
- **Cambiar la versión** hace que cada jugador vuelva a descargar todo lo que cargue (una vez), también lo que no cambió: subirla solo cuando cambien assets.
- **Netlify / Vercel:** `_headers`, `netlify.toml` y `vercel.json` siguen con `immutable` en `/assets/*` y `/vendor/*`. Con la versión en las rutas funciona igual para modelos y audio; las imágenes de la interfaz no se revalidarían allí (solo el `.htaccess` lo hace).
- **`vendor/`** (three.js, mixer) se carga por el importmap de `index.html` sin versión. En Hostinger son `.js` y se revalidan. En Netlify/Vercel, si se actualiza three, habría que versionar el importmap.
- **DRACO:** si `vendor/draco/` falla, el respaldo de `gstatic.com` también recibe `?v=`. Es inofensivo, porque el CDN ignora la query.
