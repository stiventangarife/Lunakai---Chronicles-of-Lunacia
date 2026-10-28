# Hito 83: Sombras sin parpadeo al caminar

> **Estado:** en la versión de prueba (27-oct-2026), pendiente de la revisión del usuario en el juego.
> **Pedido:** al caminar, las sombras parpadeaban un poco; se notaba sobre todo en las rocas del Bosque, el puente y algunos árboles.
> **Alcance:** fases 0–3 del plan (herramienta de consola, sincronizar sol y mapa, profundidad estable, bias). Sin coste de rendimiento: el mapa de sombras se sigue recalculando uno de cada dos fotogramas (Hito 53).

## 1. Causas

**1. El mapa de sombras se leía con una posición del sol que no era la suya (la principal).**
- Desde el Hito 53 el mapa de sombras se recalcula uno de cada dos fotogramas (`EnvironmentSystem.render`).
- `GenshinTrees._cull()` llamaba en todos los fotogramas a `light.shadow.updateMatrices(light)` para saber qué árboles caen en la zona de sombras. Esa llamada cambia también la matriz con la que el juego **lee** las sombras.
- El sol sigue al jugador. En los fotogramas sin recálculo se leía el mapa del fotograma anterior con la matriz nueva: las sombras se corrían y la profundidad dejaba de coincidir. Cada dos fotogramas, las superficies que proyectan y reciben sombra a la vez (rocas, puente, troncos) pasaban de iluminadas a sombreadas.
- El orden en three r160 lo confirma: `scene.onBeforeRender` (árboles) → pase de sombras (se salta si no toca) → lectura de `shadow.matrix` para dibujar.

**2. Acné de sombras (las rayas diagonales de las rocas).**
- `LightingManager` usaba `bias = +0.00002`. En three el positivo favorece el acné; las demás luces del juego lo usan negativo.
- `normalBias = 0.025 m`: un tercio de celda (la celda mide 7,8 cm en el Bosque con 2048 px y 15,6 cm con 1024 px en calidad Media o Baja).
- three mete en el mapa la **cara trasera** de los objetos (`shadowSide = BackSide` para materiales `FrontSide`). En las caras casi paralelas al sol bajo (≈24° en el Bosque) esa cara queda a la misma profundidad que la delantera y salen rayas, por mucho bias que se ponga.

**3. La profundidad de la caja de sombras cambiaba al caminar.** El Hito 79 movía la caja en pasos de una celda en horizontal, pero en la dirección del sol avanzaba de forma continua.

## 2. Cambios

| Archivo | Cambio |
|---|---|
| `rpg/world/demo_scena/LightingManager.js` | `updateLightTarget` guarda el objetivo y el sol se mueve en `LightingManager.commitShadowTargets()`, que solo se llama en los fotogramas con recálculo. Se mueve al momento si aún no estaba colocado o tras un preset (y pide recalcular ya), y si nadie lo ha confirmado en 0,25 s (red de seguridad). Un salto de más de 20 m (cambio de isla) pide recalcular ese mismo fotograma. La caja avanza también en pasos de 2 m en la dirección del sol. `refreshShadowBias()`: bias −0.0002 y normalBias de 1,5 celdas, recalculado al cambiar la calidad o la caja. Registro de soles (`LightingManager.instances`) y `LightingManager.debug`. |
| `rpg/world/EnvironmentSystem.js` | Decide si el fotograma recalcula sombras (uno de cada dos, o ya si un sol lo pide) y entonces llama a `commitShadowTargets()`. `_prepareShadowCasters()` (cada ~2 s, junto a `_trimSmallShadows`): los objetos fijos del mundo meten en el mapa su cara delantera (`shadowSide = FrontSide`). Se salta los personajes (mallas con esqueleto), los materiales de dos caras y los que ya eligen su `shadowSide`. |
| `rpg/world/demo_scena/genshin/GenshinTrees.js` | `_shadowCullCamera(light)`: copia de la cámara de sombras colocada igual que la colocará el pase de sombras, sin tocar `light.shadow`. |
| `tactics/combat/CombatDebug.js` | `lkDebug.shadows()`. |

**Valores que salen:**

| Isla / calidad | Caja | Mapa | Celda | normalBias |
|---|---|---|---|---|
| Bosque, Alta | ±80 m | 2048 | 7,8 cm | 11,7 cm |
| Bosque, Media/Baja | ±80 m | 1024 | 15,6 cm | 23,4 cm |
| Sabana, Ártico, Mística, Génesis | ±130 m | 2048 | 12,7 cm | 19,0 cm |

**Sin cambios:** el combate (su escena y su luz son otras: `SceneManager`, bias −0.0004), la cadencia de sombras del Hito 53, el radio de la caja, el tamaño del mapa y el tipo de filtro.

## 3. Consola (F12)

| Comando | Qué hace |
|---|---|
| `lkDebug.shadows()` | Tabla de los soles: activo, mapa, caja, celda, bias y normalBias. |
| `lkDebug.shadows({ legacy: true })` | Vuelve al comportamiento anterior (sol en todos los fotogramas, árboles moviendo la matriz, bias y caras de antes) para comparar. |
| `lkDebug.shadows({ everyFrame: true })` | Recalcula el mapa en todos los fotogramas (quita la optimización del Hito 53). |
| `lkDebug.shadows({ freeze: true })` | El sol deja de seguir al jugador. |
| `lkDebug.shadows({ frontFaces: false })` | Deja la cara de sombra que pone three (tarda ~2 s en aplicarse). |
| `lkDebug.shadows({ bias: -0.0003, normalBiasTexels: 2, depthStep: 2 })` | Ajustes en vivo; `normalBias: 0.1` lo fija en metros. |
| `lkDebug.shadows({ reset: true })` | Valores por defecto. |

## 4. Comprobado

**Lógica (Node, three r160 del proyecto):**
- En 100 fotogramas caminando, el sol no se mueve nunca en un fotograma sin recálculo.
- La caja queda exactamente en la rejilla: celda en horizontal y 2 m en profundidad (error < 1e-12).
- La caja queda a menos de media celda del jugador en horizontal y a menos de 1 m en profundidad.
- Un salto de isla pide recalcular el mapa en ese fotograma.
- La cámara de la zona de sombras de los árboles es idéntica a la del pase de sombras (diferencia 0).

**Imagen (Chromium sin pantalla, WebGL):** escena de prueba con rocas de caras planas, un tablón y suelo. Se usa el `EnvironmentSystem` real (composer, bloom y salida) y el sol de la isla siguiendo a un jugador a 5 m/s, con la cámara quieta. Se mide cuántos píxeles cambian de golpe entre fotogramas.

| | Píxeles que cambian por fotograma | Diferencia media |
|---|---|---|
| Antes (Hito 82, `legacy`) | **14.852** | 3,79 |
| Ahora | **0** | 0 |

- Solo quitar la llamada de los árboles ya deja el parpadeo en 0 (prueba aparte).
- Acné: con la cara trasera las rocas seguían rayadas incluso con bias −0.0005 y 2,5 celdas. Con la cara delantera, bias −0.0002 y 1,5 celdas quedan limpias en Alta y en Media (1024).
- Con bias −0.0001 y 1 celda, el tablón aún se rayaba. Las sombras siguen pegadas a la base de los objetos.

**Rendimiento:**
- Ninguna operación nueva por fotograma salvo unas cuentas de vectores.
- La cámara de los árboles hace lo mismo que la llamada que reemplaza.
- `_prepareShadowCasters` recorre la escena cada ~2 s, igual que `_trimSmallShadows`.
- La primera vez que se usa la cara delantera, three compila una variante del material de profundidad (una vez, al cargar).

## 5. Pendiente

- Probar en el juego: caminar junto a las rocas del Bosque, el puente de los rápidos, el puente del pueblo, el muelle y los árboles, en calidad Alta y Media. Comparar con `lkDebug.shadows({ legacy: true })`.
- Revisar que ninguna casa o pieza de una sola cara deje pasar luz con la cara delantera. Si alguna lo hace, su material puede fijar `shadowSide` y se respeta.
- Fases 4–5: hechas en el [Hito 84](HITO_84_SOMBRAS_COPAS_Y_FILTRO.md) (sombra de las copas con viento; se mantiene PCFSoft).
