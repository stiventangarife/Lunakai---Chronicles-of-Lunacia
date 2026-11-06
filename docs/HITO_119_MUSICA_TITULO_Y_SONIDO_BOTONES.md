# Hito 119: Música del título y sonido en todos los botones

> **Estado:** probado en una página de prueba con `TacticalAudio`, `MusicManager` y la pantalla de inicio reales (Chromium con la política de reproducción automática activada) el 3-nov-2026; pendiente de probar en el juego real.
> **Pedido:** música en el inicio de sesión y la selección/creación de personaje (primero con `CINEMATICA.mp3`; desde el 3-nov con `AVATAR_THEME_V1.mp3`) y sonido en los botones.

## 1. Diagnóstico

- No había música de título: la pantalla de inicio nunca pedía una pista y la música empezaba al entrar a la aventura.
- Los efectos (Web Audio) solo se encendían con `audio.init()` al empezar la aventura: los 32 sonidos que ya llamaba la pantalla de inicio eran **mudos en la primera visita**.
- Varias pantallas no tenían sonido en sus botones (menú del mundo, Runas, Cuidado del Axie, Minimapa, HUD de combate…) y la Mochila, la Escuadra y el Libro de misiones usaban el sonido de **paso** (`playStep`) o de casilla (`playTileSelect`) como clic.

## 2. Cambios

| Punto | Qué | Dónde |
|---|---|---|
| A | Los efectos se encienden con el **primer gesto** (clic, toque o tecla). Un solo detector que se quita cuando el contexto de audio ya está en marcha. | `main.js` |
| B | **Música del título**: `MusicManager.playTitle()` (pista `TITLE` = `AVATAR_THEME_V1.mp3`, −18,0 LUFS medidos con ffmpeg ebur128: se baja 2,5 dB hasta el nivel común) desde el constructor de `StartScreenUI` (al cargar el juego) y desde `show()` (al volver al título); sigue durante la creación de personaje, se apaga con fundido al empezar la aventura (el prólogo o la isla ponen la suya) y vuelve al regresar al título. | `MusicManager.js`, `TacticalAudio.js` (`playTitleMusic`), `StartScreenUI.js`, `main.js` |
| B | **Arreglo**: al reintentar una pista que el navegador había retenido hasta el primer gesto, el fundido la tomaba como «anterior» y la pausaba a los 1,5 s. Ahora, si es la misma pista, no hay anterior. | `MusicManager.playTrack` |
| B | **Arreglo**: el reintento de una pista retenida volvía a aplicar la igualación de nivel (Hito 91) y sonaba más baja (con `TITLE`, 2,5 dB menos). Ahora el reintento guarda el volumen sin igualar. | `MusicManager.playTrack` |
| C | **Clic común** para todo `button`, `[role="button"]` y `.lk-btn`: un detector en el documento. Cada método `play*` de `TacticalAudio` (salvo la música) anota cuándo sonó; si el botón ya tocó su sonido (confirmar, comprar, forjar…) en los últimos 80 ms, el clic común no se repite. `data-sfx="none"` deja un botón o un bloque sin él. Sin sonidos al pasar el ratón. | `audio/UiClickSfx.js` (nuevo), `main.js` |
| D | `playStep`/`playTileSelect` → `playClick` en los botones de la Mochila (casillas, cerrar, desequipar), la Escuadra (casillas, cerrar) y el Libro de misiones (pestañas, lista, interruptor, cerrar). | `InventoryModal.js`, `SquadModal.js`, `QuestBookModal.js` |

- Los efectos siguen el volumen «Efectos» de Opciones y la música el de «Música».
- **Rendimiento:** los sonidos de interfaz son sintetizados (sin archivos); un solo detector para todo el juego.

### Corrección (3-nov): la música no sonaba al cargar el juego

Al cargar, la pantalla de inicio aparece desde el constructor de `StartScreenUI`; `show()` solo se llama al volver al título desde la partida, así que la música del título nunca se pedía en el arranque. Ahora también se pide al final del constructor (queda retenida hasta el primer clic o tecla y entonces suena).

## 3. Prueba

- Antes del gesto: efectos apagados y la pista del título retenida. Tras el primer clic: efectos en marcha y música sonando (sigue sonando pasado el fundido).
- Botón sin sonido propio: 1 clic. Botón con sonido propio: solo el suyo. Dentro de `data-sfx="none"`: nada.
- Nivel: tras el primer gesto `TITLE` suena con volumen 0,319, a la par del tema del Bosque (0,325), con la música al 100 %.
- Empezar la aventura: el título se apaga y entra el tema del Bosque. Volver al título: vuelve la pista del título.

## 4. Pendiente

- Probar en el juego real.
- Si se cambia `AVATAR_THEME_V1.mp3` por otra versión, medir su sonoridad y actualizar `TRACK_LUFS.TITLE`. `CINEMATICA` sigue igual que antes (solo la usa el recorrido de cámara de respaldo).
