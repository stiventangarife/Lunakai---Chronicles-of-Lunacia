# Hito 84: Sombra de las copas con viento y revisión por objeto (fases 4 y 5 del plan de sombras)

> **Estado:** en la versión de prueba (27-oct-2026), pendiente de la revisión del usuario en el juego.
> **Sigue a:** [Hito 83](HITO_83_SOMBRAS_SIN_PARPADEO.md) (fases 0–3).
> **Alcance:** fase 4 (ajustes por objeto) y fase 5 (penumbra suave). Sin coste por fotograma.

## 1. Fase 4: ajustes por objeto

### 1.1 Copas de los árboles: la sombra no seguía al viento (cambio)
- **Qué pasaba:**
  - El follaje (`GenshinTrees._createFoliageMaterial`) se mueve con el viento en el shader visible.
  - El pase de sombras usaba el material de profundidad estándar de three, sin viento: `customDepthMaterial` solo se ponía con `LOD_ENABLED`, que está apagado.
  - Las hojas se veían moviéndose, pero su sombra seguía quieta. Como la copa recibe su propia sombra, las manchas de sombra cambiaban de sitio sobre las hojas en cada fotograma: la copa "hervía".
- **Arreglo:**
  - El código del viento vive una sola vez (`FOLIAGE_SWAY_PARS` / `FOLIAGE_SWAY_VERTEX`). Lo usan el material visible y un `MeshDepthMaterial` con el mismo `uTime` (`makeFoliageSwayDepth`).
  - `GenshinTrees.swayDepthFor(material)` devuelve ese material de profundidad.
  - Se asigna como `customDepthMaterial` en `GenshinTrees._makeLodPart` (Bosque) y en `IslandTrees` (Sabana, Ártico, Mística y Génesis; también los árboles de los tableros de combate, que heredan de `IslandTrees`).
  - three copia en cada uso el mapa, el `alphaTest` y la cara del material de follaje, así que el recorte de las hojas es el mismo.

### 1.2 Rocas, puentes, muelle y edificios (sin cambios: ya quedan bien)
- Todos los modelos revisados tienen materiales de **dos caras** (`doubleSided: true`): `bridge.glb`, `house.glb`, `dojo.glb`, `shop.glb`, `Rock_Medium_*.gltf` y `Bush_Common.gltf`.
- En un objeto cerrado de dos caras, el mapa de sombras guarda la superficie que mira al sol, que es lo que necesita el bias del Hito 83 para quitar el acné.
- Por eso `_prepareShadowCasters` (Hito 83, solo materiales de una cara) no los toca, y no hace falta.
- Comprobado con rocas y un tablón de dos caras: con los valores del Hito 82 salen rayas en los dos; con los del Hito 83 quedan limpios.

### 1.3 Vegetación de dos caras (sin cambios)
- Arbustos y helechos de `PropsManager` no tienen viento en el shader. Con el bias nuevo, las tarjetas de hojas de dos caras se ven limpias (prueba de la copa).
- Poner `shadowSide = FrontSide` en tarjetas de hojas haría perder la sombra de las que miran al lado contrario del sol, así que se deja como está.

## 2. Fase 5: penumbra suave (decisión: no cambiar)

`GenshinArtDirection` e `IslandArtLayer` ponen `shadow.radius = 3`, pero con `PCFSoftShadowMap` three r160 ignora `radius` (solo lo usan PCF y VSM). Se probó `PCFShadowMap` con radio 1, 2 y 3:

| Filtro | Resultado |
|---|---|
| PCFSoft (actual) | Penumbra suave de ~1,5 celdas, sin rayas. |
| PCF radio 1 | Casi igual, algo más dura. |
| PCF radio 2 | Penumbra más ancha, pero vuelven las rayas en el tablón y las rocas. |
| PCF radio 3 | Más ancha aún, rayas y bordes dobles en escalera. |

Además, cambiar de filtro:
- solo tiene efecto al recompilar **todos** los materiales (el tipo es un `#define` del shader);
- cambiaría también el combate, porque el renderer es el mismo (`main.js` pasa `sceneManager.renderer` al mundo abierto).

Se mantiene PCFSoft. `radius = 3` se deja tal cual: no hace nada y no cuesta nada.

## 3. Comprobado (Chromium sin pantalla, WebGL, `EnvironmentSystem` real)

**Sombra de las copas.** Copa con el material de follaje real de `GenshinTrees` (viento) y sol quieto. Cada fotograma se compara con una referencia exacta del mismo instante: mapa recalculado ese fotograma y con viento.

| | Píxeles mal sombreados por fotograma | Error medio |
|---|---|---|
| Antes (sombra de hojas quieta) | **597** | 0,299 |
| Ahora (sombra con viento) | **16** | 0,011 |
| Control: ahora + sombras en cada fotograma | 0 | 0 |

Los 16 píxeles que quedan se deben a recalcular el mapa uno de cada dos fotogramas (Hito 53), con hojas que se mueven milímetros entre fotogramas. No se notan.

**Rendimiento:**
- El material de profundidad con viento suma 4 operaciones de seno y coseno por vértice en el pase de sombras de las copas.
- Se compila una vez, la primera vez que se dibujan las sombras de los árboles.

## 4. Archivos

| Archivo | Cambio |
|---|---|
| `rpg/world/demo_scena/genshin/GenshinTrees.js` | Viento compartido, `makeFoliageSwayDepth`, `GenshinTrees.swayDepthFor`, asignación en `_makeLodPart`. |
| `rpg/world/islands/kit/IslandTrees.js` | `customDepthMaterial` con viento en las copas de las islas. |

## 5. Pendiente

- Probar en el juego: mirar de cerca una copa del Bosque (y una acacia de la Sabana) con el personaje quieto. Las manchas de sombra deben moverse con las hojas, no titilar.
- Si algún modelo nuevo tiene material de una sola cara y deja pasar luz por la sombra, su material puede fijar `shadowSide` (se respeta).
