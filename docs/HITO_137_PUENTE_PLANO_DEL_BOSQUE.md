# Hito 137 · Puente plano en el Bosque

Los dos puentes del Bosque (rápidos y pueblo) y el muelle de la playa usan ahora el modelo `assets/environment/puente_plano.glb`: un tablero plano de tablones con postes. Antes usaban la pieza «SmallBridge» de `bridge.glb`.

## Textura

- El GLB nuevo traía su textura en **WebP** (1024 × 1024). En la tarjeta gráfica eso ocupa ~5,6 MB (RGBA sin comprimir, con mipmaps).
- Es exactamente el mismo atlas de madera que ya usaba el puente (`T_Env_Building_Bridge_WoodenBridge_01_C`), y `bridge.glb` lo tenía en **KTX2** (ETC1S, 1024 × 1024, 11 mipmaps, 73 KB). Se comprobó dibujando las dos una al lado de la otra: son idénticas.
- Por eso no hizo falta reconvertir ni reducir nada: en `puente_plano.glb` se cambió la imagen WebP por ese KTX2 (`KHR_texture_basisu` en lugar de `EXT_texture_webp`), como el resto de modelos del juego.
  - En la tarjeta gráfica: de ~5,6 MB a ~0,7 MB.
  - El archivo pasa de 64 KB a 99 KB (el KTX2 incluye sus mipmaps).
- La geometría no se tocó: 3 piezas y ~506 triángulos por módulo.

## Montaje (`ForestBridge`)

- **Piezas:** las del modelo (tablero y postes) se unen en una sola malla con un solo material, la madera con el sombreado toon de antes. El GLB guarda los atributos intercalados; se copian sin intercalar para poder unirlos.
- **Módulos:** se ponen tantos como quepan con las proporciones del propio modelo (a 4 m de ancho). Ya no se usa `modules` de la configuración.

  | | Largo | Módulos | Triángulos |
  |---|---|---|---|
  | Puente de los rápidos | 36,4 m | 5 | 2 530 |
  | Puente del pueblo | 29,3 m | 4 | 2 024 |
  | Muelle | 18 m | 3 | 1 518 |

- **Sin cambios:**
  - el arco suave;
  - los postes alargados hasta el agua;
  - la altura del tablero para caminar (se mide con rayos sobre el modelo);
  - las barandillas invisibles de colisión;
  - el tope del muelle.

## Notas

- `bridge.glb` ya no lo usa nadie; se deja en su sitio por si se quiere volver.
- `puente_plano.glb` es un archivo nuevo (su URL no estaba en caché de nadie): no hace falta subir `ASSET_VERSION`.

## Archivos

- `assets/environment/puente_plano.glb`: textura WebP → KTX2.
- `src/rpg/world/demo_scena/ForestBridge.js`: modelo nuevo, unión de piezas (`plainAttr` + `mergeGeometries`) y número de módulos según el modelo.
