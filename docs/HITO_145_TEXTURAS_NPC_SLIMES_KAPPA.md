# Hito 145 · Menos memoria de texturas: NPC Sapidae, slimes y kappa

**Fecha:** 7-nov-2026 · **Cambia `assets/`:** `ASSET_VERSION` 0.4.2 → **0.4.3**. Sin cambios de código.

**Archivos:**
- Assets (`assets/models/`): `sapidae-f-a…e.glb`, `sapidae-m-a…e.glb`, `sapidae-female.glb`, `Sapidae_Ema.glb`, `kappa.glb`, `slime.glb`, `slime-attack.glb`, `slime-defese.glb`, `slime-forest-a.glb`, `slime-forest-b.glb`, `slime-fusion.glb`, `slime-support.glb`.
- `src/render/AssetVersion.js` (0.4.3).
- Herramienta nueva: `tools/resize_glb_textures.py`, que reescala imágenes PNG o WebP dentro de un GLB sin tocar la geometría, con Draco incluido.
- Respaldo de los originales: `backups/2026-11-07_hito145/`.

## Punto de partida

Revisión con `lkDebug.gpu` y `lkDebug.assets.audit()`, en una partida nueva en el Valle del Dojo:
- El juego reservaba ~450 MB en la tarjeta gráfica, de los que ~326 MB eran texturas.
- Lo que más ocupaba: los Sapidae de los aldeanos (~101 MB), los slimes (~48 MB), las mejillas y el pantalón de Ema (~16 MB) y el kappa (5,3 MB).

## 1 · Sapidae de los aldeanos a 512×512

- Se pasan a 512, en su mismo formato (WebP calidad 92 / PNG), todas las imágenes mayores de 512 de `sapidae-f-*`, `sapidae-m-*` y `sapidae-female`: cuerpo, cabeza, ojos, boca, pelo, camisa, pantalón, mejillas y sombrero.
- El alfa se reescala premultiplicado.
- `sapidae-female.glb` era idéntico a `sapidae-f-a.glb` y sigue siéndolo.
- Estas texturas no se recolorean leyendo píxeles. Si algún día se recolorean, el código del Sapidae acepta cualquier tamaño.
- Primer plano de la cara (Kai `m-a`, Ema `f-b`), antes y después: sin diferencia visible.

## 2 · Mejillas y pantalón de Ema (jugador) a 256×256

- `T_Char_Sapidae_Ema_Cheek_C` es un rubor difuminado y `T_Char_Sapidae_Ema_Pants_C` es casi un color plano (8 colores). Pasan de 1024 a 256.
- Primer plano antes y después: sin diferencia visible.

## 3 · Kappa y slimes a KTX2

- **Kappa:** el color pasa a UASTC.
- **Los 7 slimes:**
  - color y normal en UASTC;
  - rugosidad y metal en ETC1S, porque son mapas de poco detalle.
- Se usó `tools/ktx/ktx_convert.py` (`--rdo 1`), siguiendo lo que ya proponía la etapa 2 de `docs/PLAN_KTX2.md`. La textura del kappa ya llevaba los huecos rellenados (`pad_webp`), así que los mipmaps no oscurecen las costuras.

**Calidad (color del slime, PSNR frente al original):**

| Opción | PSNR | Tamaño de la textura |
|---|---|---|
| UASTC (la elegida) | ~46 dB | casi sin pérdida |
| Reescalar a 512 | 36,4 dB | |
| ETC1S | 35,6 dB | |

En la comparación de primer plano del slime y el kappa, antes y después, no se ve diferencia.

**Coste:** las descargas crecen.
- Cada slime pasa de ~0,15–0,25 MB a ~0,9–1,5 MB.
- El kappa pasa de 0,17 a 0,8 MB.
- En total, unos +8 MB de descarga. Solo se piden en el Bosque y en los combates que los usan.

## Resultado

| | Antes | Después |
|---|---|---|
| Texturas del contexto principal (`lkDebug.gpu`) | 325,7 MB | **191,7 MB (−134 MB)** |
| `lkDebug.assets.audit()`, total en escena | 319,1 MB | 185,2 MB |
| NPC Sapidae en escena (`f-a`, `m-a`, `m-d`) | ~101 MB | ~30 MB |
| Cada slime (3 texturas) | 16 MB | 3,9 MB |
| Kappa | 5,3 MB | 1,3 MB |
| Mejillas y pantalón de Ema | ~16 MB | <1 MB |

En consola no aparecen errores nuevos y todos los modelos cargan (200).

## Punto descartado: «texturas de suelo sin usar»

- `lkDebug.gpu` marcaba como «fuera de escena» `ground_07` (color, normal y altura), `grass_05`, `forest_ground` y `HandPaintedGouache` (hierba y tierra).
- **No es cierto:** el shader del terreno del Bosque las usa como uniforms (`uGrassTex`, `uForestTex`, `uV3GrassTex`, `uV3SoilTex`, `uDirtCol`, `uDirtNrm` y `uDirtHgt`). Todas aparecen como uniforms activos del programa.
- La herramienta solo mira las ranuras de los materiales (`map`, `normalMap`…), no los uniforms de `onBeforeCompile`. **Regla:** antes de liberar algo marcado «fuera de escena», comprobar los uniforms activos del programa (`renderer.properties.get(mat).currentProgram.getUniforms().map`).

**Para volver atrás:** copiar los GLB de `backups/2026-11-07_hito145/assets/models/` a `assets/models/` y subir `ASSET_VERSION`.

**Para repetir:**
```
python tools/resize_glb_textures.py entrada.glb salida.glb --max 512 [--name REGEX] [--size REGEX=256]
```
Necesita Pillow. Para KTX2: `KTX_BIN=…/ktx python tools/ktx/ktx_convert.py glb entrada.glb salida.glb --slot color=uastc --slot normal=uastc --slot mr=etc1s --rdo 1`, con KTX-Software 4.4 de `tools/`.
