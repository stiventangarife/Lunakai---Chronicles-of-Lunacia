# Hito 144 · Cambiar la calidad sin congelar y texturas del Sapidae a 512×512

**Fecha:** 7-nov-2026 · **Cambia `assets/`:** `ASSET_VERSION` 0.4.1 → **0.4.2**.

**Archivos:**
- Cambiados: `src/rpg/ui/SettingsModal.js`, `src/rpg/OverworldManager.js`, `src/render/RenderWarmup.js`, `src/render/AssetVersion.js`, `src/i18n/{es,en}/settings.js`.
- Assets: `assets/models/Sapidae_Ema.glb`, `assets/models/Sapidae_Kai.glb`.
- Herramienta: `tools/resize_sapidae_variants.py`.
- Respaldo: `backups/2026-11-07_hito144/` (los dos GLB originales y los archivos de código anteriores).

## 1 · Congelamiento al pasar de Alta a Baja

**Causa (medida en el panel del navegador, RTX 4060):**
- La primera vez que se pasaba de Alta a Baja había un fotograma de **5.946 ms**.
- Baja apaga las sombras: `shadowMap.enabled = false` y `needsUpdate` en todos los materiales.
- Eso obliga a una versión nueva del shader de cada material. Three.js la compilaba de forma síncrona al dibujar el primer fotograma: 53 programas, y 5.699 ms esperando en `gl.getProgramParameter`.
- Las veces siguientes los programas ya estaban guardados (119 ms y 33 ms).
- La hierba y el cielo de los presets no tienen efecto en el juego: nadie escucha `lk:settings`. No se tocaron.

**Cambio:**
- `SettingsModal` acepta `onShadowsChanged` y lo llama después de cambiar las sombras.
- `OverworldManager.prewarmAfterGraphicsChange()`:
  - suspende el dibujo del mundo (`_renderSuspended`, el mismo mecanismo de los viajes entre islas). El canvas conserva la última imagen detrás del panel de Opciones;
  - compila con `warmupRender` (por porciones y en paralelo con `KHR_parallel_shader_compile`), con el destino del composer y sin las islas inactivas;
  - después reanuda el dibujo. Varios cambios seguidos se encadenan.
- No usa el «fotograma completo» del precalentado de viaje: en los cambios siguientes no hay programas nuevos y ese fotograma solo añadía ~130 ms.

**Medido después (recarga, Alta → Baja la primera vez):**

| Cambio | Antes: peor fotograma | Después: peor fotograma | Precalentado |
|---|---|---|---|
| Alta → Baja (1.ª vez) | 5.946 ms | **32 ms** | 149 ms, 76 programas |
| Baja → Alta | 33 ms | 31 ms | 18 ms |
| Alta → Baja (2.ª vez) | 119 ms | 22 ms | 19 ms |
| Baja → Media / Media → Alta | — | 28 / 22 ms | 14 / 4 ms |

Ningún programa nuevo se compila después del precalentado. El juego siguió a 60 fps durante las pruebas.

**Corrección (pantalla vacía en Baja, informada por el usuario):**
- **Qué pasaba:** en su partida (nivel 18), al pasar a Baja el mundo se quedó en negro y solo se veía la interfaz.
- **Causa:** Baja también baja la resolución al 70 %. Redimensionar el canvas lo borra, y mientras durara el precalentado el mundo no se dibujaba. Además, el precalentado podía esperar hasta 20 s a un programa que no terminara.
- **Cambio en `SettingsModal`:** cuando cambian las sombras, la resolución se aplica al terminar el precalentado. Así se sigue viendo la última imagen.
- **Cambio en `OverworldManager`:** el precalentado tiene un tope (`deadline`). Pasado ese tiempo se vuelve a dibujar aunque quede algo por compilar.
  - Primero el tope era de 3 s. En la partida del usuario llegó a ese límite (73 programas, 3.009 ms), así que se subió a **8 s**.
  - El tope de 3 s era corto para un navegador que no tiene esos shaders en su caché de disco. El panel del navegador sí los tenía de pruebas anteriores, por eso allí tardaba unos 200 ms.
- **Consola:** se escribe `[OverworldManager] Cambio de calidad: N programas nuevos, X ms (texturas · compilar · esperar · paralelo · sin terminar · cortado)`.
  - `warmupRender` devuelve ese desglose: `texMs`, `compileMs`, `waitMs`, `parallel`, `pendingLeft` y `cut`.
  - `waitProgramsReady` devuelve cuántos programas quedaron sin terminar. A quien ya lo llamaba no le cambia nada.
- **Medido en el Chrome del usuario:**
  - Primer cambio: 82 programas, ~7,9 s, casi todo esperando al navegador. Los cambios siguientes: 8–20 ms.
  - Al recargar la página vuelve a tardar ~7,9 s: ese Chrome no guarda estos shaders entre sesiones.
- **Solución elegida (más simple):**
  - Cartel «Aplicando calidad gráfica… / Puede tardar unos segundos» (`settings.applyingGfx` y `settings.applyingGfxDesc`, en es y en). Lo pinta `OverworldManager._showGfxNotice`, con el estilo de `lk-toast`, debajo de los avisos normales y por encima del menú de Opciones.
  - Aparece si el precalentado tarda más de 250 ms y se quita al terminar.
  - El tope sube a **20 s**.
  - El aviso se ocultaba a medias: la animación de `lk-toast` sube el aviso un 160 % de su alto, pensado para avisos pegados arriba. Este va más abajo y con dos líneas, así que asomaba por el borde. Ahora se oculta con `translate(-50%, calc(-100% - 110px))` y queda fuera de la pantalla.
- **Archivos tocados en estas correcciones:** `SettingsModal.js`, `OverworldManager.js`, `RenderWarmup.js` e `i18n/{es,en}/settings.js`. Las versiones anteriores están en `backups/2026-11-07_hito144/`.
- **Descartado por ahora:** compilar en segundo plano, al cargar, la versión de sombras que no se usa. Sería un cambio instantáneo, pero también un cambio mayor.
- **Medido en el panel:** 76 programas en 179 ms; la última imagen sigue visible y luego se aplica el 70 %.

## 2 · Texturas de variantes del Sapidae a 512×512 (opción 2 del Hito 143)

- **Se reescalan** (Lanczos con alfa premultiplicado, PNG optimizado): pelo, cabeza, camisa, ojos y boca A–E de Ema y Kai. Son 26 imágenes en Ema (incluida `Kai_ShirtA` que lleva dentro) y 25 en Kai.
- **No se tocan:** el cuerpo (2048), las mejillas, los pantalones, los cuernos B/C (256), el interior de la boca, el sombrero y las piezas de equipo en WebP.
- El código del recoloreado, la máscara de pelo de Kai y los cuernos usan el tamaño real de la imagen, así que no hubo que cambiar nada.

**Resultado:**

| | Antes | Después |
|---|---|---|
| `Sapidae_Ema.glb` | 9,8 MB | 7,1 MB |
| `Sapidae_Kai.glb` | 8,5 MB | 6,4 MB |
| RAM de imágenes del Sapidae del jugador (Ema) | 165 MB | **87 MB** |
| GPU del Sapidae del jugador | 64 MB | **40 MB** |

**Comprobado:**
- Primer plano de la cara de Ema a 700×700 px, mucho más cerca que cualquier vista del juego: ojos, boca y pelo nítidos.
- Recoloreado de pelo, ojos y camisa correcto.
- Sin errores nuevos en consola. Los 2 errores 404 que salen ya existían.
- Kai no se pudo ver en pantalla (la ranura de prueba cargó Ema). Sus texturas se reescalan con el mismo proceso y el código no depende del tamaño.

**Para volver atrás:** copiar los GLB de `backups/2026-11-07_hito144/` a `assets/models/` y subir `ASSET_VERSION`.

**Para repetir con otro GLB:**
```
python tools/resize_sapidae_variants.py entrada.glb salida.glb
```
Necesita Pillow.
