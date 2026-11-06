# Hito 135 · Contextos WebGL liberados de verdad y arreglos de la lista de ranuras

## 1. El contexto del juego ya no se pierde al abrir visores

**Fallo (reproducido):** `CharacterPreviewDiorama.dispose()` llamaba a `renderer.dispose()`, pero el contexto WebGL quedaba vivo hasta que el navegador lo recogía. Lo usan tres visores: el creador de personaje, el escenario del selector (Hito 131) y el visor de la Mochila. Chrome admite ~16 contextos vivos; al pasarse avisa «Too many active WebGL contexts. Oldest context will be lost» y **cierra el más antiguo, que es el del juego**, así que el mundo se quedaría en negro.

- Antes, con el creador solo, hacían falta unas 16 aperturas. Con el escenario del selector cada ciclo crea dos contextos, así que bastaban unas 8.
- Prueba: 20 ciclos «abrir creador → cerrar» → aviso y contexto del juego perdido.

**Arreglo:** `dispose()` llama además a `renderer.forceContextLoss()`, que cierra el contexto en el acto.

- Prueba: 40 ciclos → ningún aviso; el contexto del juego sigue vivo.

## 2. Lista de ranuras

- **El marco se salía al pasar el ratón:** la fila se desplazaba 0,2 rem a la izquierda y la columna (que recorta lo que sobresale) cortaba su brillo y el rombo de la ranura elegida. Ahora la fila no se mueve (solo se ilumina el borde) y la columna tiene margen interior para el brillo y el rombo, compensado con un margen negativo para que nada cambie de sitio.
- **Retratos descentrados:** el retrato de cuerpo entero se ampliaba ×1,65 desde arriba y la cabeza se salía del círculo. Ahora se recorta igual que el medallón de antes (`object-fit: cover; object-position: 50% 18%`, sin ampliar).

## Memoria: qué se libera y qué no

| Qué | ¿Se libera? |
|---|---|
| Visor 3D del selector (contexto, modelos, terrenos) | Sí, al jugar, abrir el creador o cerrar sesión. Ahora también el contexto en el acto. |
| GLB del Sapidae en `ModelCache` | No (a propósito): es la misma copia que usa el mundo. En el juego, el modelo base que no es el del jugador se suelta (`_evictOtherSapidaeBase`). |
| Props de los terrenos del selector | Se quedan en `ModelCache` (~100 KB en total). |
| Mundo al volver al título | **No se libera**, solo deja de actualizarse y dibujarse (Hito 131). Se construye una vez (`_initImpl`, `if (!this.stylizedEnv)`) y se reutiliza al entrar en otra partida. |
| Al viajar entre islas | Se liberan los estanques de otros biomas (`unloadSecondaryPonds`) y algunos GLB (`evictGLTF`, p. ej. el pueblo del Bosque). |

## Archivos

- `src/rpg/ui/CharacterPreviewDiorama.js` — `forceContextLoss()` en `dispose()`.
- `src/ui/lunakai-ui.css` — `.lk-srow:hover`, `.lk-srow__av img` y el margen de `.lk-sel-side`.
