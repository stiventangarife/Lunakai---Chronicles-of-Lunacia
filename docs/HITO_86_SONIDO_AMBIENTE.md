# Hito 86: Sonido ambiente — fases 0 y 1

> **Estado:** en la versión de prueba (27-oct-2026), pendiente de que el usuario lo escuche en el juego.
> **Pedido:** revisar el sonido ambiente y el *game feel*. Enfoque mixto: viento, agua, fuego, interfaz y voces sintetizados; pájaros, animales, pasos e impactos con archivos (lista en [`AUDIO_ARCHIVOS_A_CONSEGUIR.md`](AUDIO_ARCHIVOS_A_CONSEGUIR.md)). Este hito cubre las fases 0 y 1.

## 1. Fase 0: lo que estaba roto

**5 sonidos de interfaz que no existían.**
- `playClick`, `playSelect`, `playConfirm`, `playImpact` y `playSfx(name)` se llamaban en unos 26 sitios (menús, mochila, tienda, misiones, combate), pero no estaban definidos. Unos callaban y otros dependían de `?.`.
- Ahora están en `TacticalAudio`:
  - clic corto;
  - selección de dos tonos;
  - confirmación con campanas Mi–Sol#–Si;
  - golpe grave con ruido.
- `playSfx` acepta `menu_confirm`, `menu_select`, `menu_open`, `menu_close`, `error`, `coin` e `impact`. Cualquier otro nombre suena como un clic.

**Volumen «Ambiente» sin efecto.** El control de Opciones no estaba conectado a nada. Ahora:
- `TacticalAudio.ambGain` es un bus propio que va al altavoz, separado de `masterGain`, que es el de los efectos;
- `SettingsModal._applyAudio` llama a `setAmbientVolume(general × ambiente × atenuación)`;
- silenciar también lo apaga.

## 2. Fase 1: `src/audio/AmbienceManager.js` (nuevo)

Es todo Web Audio, sin archivos. Lee el estado del juego cada 0,1 s (`window.game` y `window.overworldManager`), así que el bucle no tiene que llamarlo. Arranca con `TacticalAudio.init()`, que es el primer clic o la primera tecla.

| Estado | Ambiente |
|---|---|
| Mundo abierto explorando | Completo |
| Combate | Solo la base de la isla, al 45 % y con menos sonidos sueltos (la música manda) |
| Diálogo abierto | ×0,6 |
| Opciones, mochila, equipo, misiones o mapa | ×0,55 |
| Cinemática, presentación, carga de zona, pantalla de inicio | Apagado (fundido de ~1 s y se liberan los nodos) |

### Por isla
| Isla | Base | Sonidos sueltos | Fuentes con posición |
|---|---|---|---|
| **Bosque** | Viento con ráfagas (las hojas se quitaron a petición del usuario) | Pájaro cantor, trino, paloma, carpintero | Río (sigue la curva real del cauce), rápidos del puente, campanillas del dojo, yunque de la Forja |
| **Sabana** | Viento seco (las cigarras se quitaron a petición del usuario) | Pájaros exóticos, halcón | Hoguera de Bing, oasis |
| **Ártico** | Viento fuerte, silbido helado en las ráfagas | Crujido de hielo, pájaro de invierno, aullido lejano | 3 hogueras (Pomodoro, Chef, Ermitaño), estofado burbujeando |
| **Mística** | Ninguna (viento, zumbido de acorde y aire brillante quitados a petición del usuario) | Campanitas de cristal, luciérnagas, búho | Pantano (agua, ranas, burbujas), zumbido del Observatorio |
| **Génesis** | Brisa suave como la del Bosque (coro quitado a petición del usuario) | Pájaros del jardín, campana lejana | Llama de Atia, cantera de cristal, campanillas del Jardín Real, velo de la Puerta |

**Mar (todas las islas).** Cada 0,5 s se mide el terreno en 36 puntos alrededor del jugador (a 10, 24 y 44 m). Los puntos por debajo del nivel del mar cuentan como agua. Con eso:
- las olas (rompiente y espuma) suben al acercarse a la orilla;
- suenan hacia el lado donde está el agua, según la cámara;
- en Bosque, Sabana y Génesis aparecen gaviotas.

No hay que colocar nada a mano: funciona en cualquier costa.

**Fuentes.** Cada fuente existe solo dentro de su radio (de 12 a 46 m) y se libera al salir de 1,25 × radio. Su volumen sube con la cercanía (al cuadrado) y se panea según la cámara. Una fuente nueva se añade con una línea en `AMBIENCE_PROFILES`: `{ kind, x, z, r, level }`.

### Coste
- 2 a 6 capas continuas por isla, más las fuentes cercanas (normalmente 0 a 2), más los sonidos sueltos de unos segundos.
- Los ruidos se generan una sola vez: 3 búferes de 4 s y una reverberación de 2,4 s.
- Nada toca la escena 3D ni el bucle de render.

## 2b. Corrección del Bosque: sonaba a «interferencia de televisor»

Al escuchar el juego, el Bosque sonaba a la estática de un televisor. Se grabó cada capa por separado y se midió dónde está su energía:

| Capa | Antes | Después |
|---|---|---|
| **Hojas** | Ruido blanco continuo entre 2,6 y 7,5 kHz (centro en 5,7 kHz). Era siseo puro, la estática. | Roces sueltos de ruido rosa entre 1 y 3 kHz, solo con las ráfagas. Con el aire en calma, casi nada. Centro en 2,1 kHz. |
| **Río** | Ruido blanco por encima de 3 kHz (18 % por encima de 8 kHz) y el volumen saltando 10 veces por segundo, lo que hacía crepitar. | Fondo de ruido rosa por debajo de 1,5 kHz y un borboteo hecho de unas 26 burbujas por segundo, que son tonos cortos que suben, como el agua real. Centro en 0,64 kHz y 0 % por encima de 8 kHz. |
| **Rápidos** | Lo mismo, con un 32 % de la energía por encima de 8 kHz. | El mismo sistema, más fuerte y con unas 45 burbujas por segundo. Centro en 0,84 kHz. |
| **Espuma del mar** | Ruido blanco por encima de 1,8 kHz. | Ruido rosa entre 0,9 y 4,5 kHz. |
| **Ruidos de base** | Bucle de 4 s que bajaba a cero en cada vuelta, un pequeño «bache» cada 4 s. | Bucle de 6 s con fundido cruzado, sin bache. |

Con esto, la mezcla del recorrido por el Bosque baja de 3,8 a 0,74 kHz de centro, sin nada por encima de 8 kHz.

**Segunda corrección: todo sonaba con «olas de fondo».** El ruido grave y ancho, por debajo de 400 Hz, es justo el timbre del mar. Era el 42 % de la energía en el viento y el 35 % en el río.
- **Viento:**
  - un soplo suave por encima de 260 Hz;
  - dos silbidos de banda estrecha cuyo tono sube con la ráfaga y deriva un poco;
  - un aleteo rápido e irregular.
- **Ráfagas:** ya no son un vaivén regular. Cambian cada 1,5–6 s, suben rápido y bajan despacio, y a veces llega un golpe de aire.
- **Agua:** el cuerpo pasa a estar por encima de 280–380 Hz y el borboteo, más agudo (500–1900 Hz), es el que manda.

| Recorrido del Bosque | Graves (<400 Hz) | Banda media (1–4 kHz) | Muy agudo (>6 kHz) |
|---|---|---|---|
| Versión con estática | — | — | Mucho (centro en 3,8 kHz) |
| Primera corrección | 39 % | 19 % | 0 % |
| Ahora | 3 % | 69 % | 0,3 % |

**Grabaciones opcionales.** Para el agua, una grabación suena más natural que cualquier síntesis. Por eso el juego busca estos archivos en `assets/sounds/ambience/`:
- `river_loop.mp3`
- `rapids_loop.mp3`
- `sea_waves_loop.mp3`
- `campfire_loop.mp3`

Cuando existe un archivo, lo usa en lugar de la versión sintetizada. Si falta, sigue sonando la sintetizada (en la consola aparece un 404 por cada archivo que falta, una sola vez). `lkDebug.audio()` muestra qué grabaciones se han cargado. Se probó con archivos de prueba: el río y el mar pasan a ser la grabación.

**Viento del Bosque convertido en brisa.** El usuario lo oía como una ventisca. La capa de viento admite ahora dos ajustes por isla: `whistle`, cuánto silba, y `gust`, cuánto pegan las ráfagas. El Bosque queda así:
- volumen 0,12 (antes 0,16);
- silbidos al 12 %;
- ráfagas al 55 %;
- aleteo más suave.

En la prueba bajó de −32,6 a −43 dB y la banda de silbidos (1–4 kHz) pasó del 71 % al 13 %. El Ártico mantiene el viento fuerte.

**Génesis y mar de todas las islas.** Tras escuchar los sonidos por separado, el usuario pidió:
- **Génesis:**
  - quitar el coro;
  - un viento como la brisa del Bosque, con los mismos ajustes y un poco más bajo (0,09);
  - en la prueba, −45,7 dB.
- **Mar más suave en todas las islas** (`SEA_SOFT = 0.5`):
  - volumen a la mitad (−6 dB);
  - la ola sube menos (60–100 % en vez de 45–100 %), se abre menos (hasta 960 Hz en vez de 1480 Hz) y lleva menos espuma (×0,2 en vez de ×0,5);
  - en la prueba, de −28,3 a −33,9 dB, con un vaivén más tranquilo.

**Fondo de la Mística quitado.** Tras escuchar cada sonido por separado, el usuario pidió quitar el viento, el zumbido de acorde y el aire brillante. La Mística se queda sin fondo continuo: suenan las campanitas de cristal, las luciérnagas y el búho, además del pantano, el Observatorio y la costa cuando estás cerca. En combate solo queda algún cristal, luciérnaga o búho suelto, menos frecuente, bajo la música. El código de `drone` y `air` se conserva; el coro de Génesis usa el mismo código que el zumbido.

**Cigarras quitadas (Sabana).** Tras escuchar cada sonido de la Sabana por separado, el usuario pidió quitar las cigarras. Se eliminó la capa del perfil; el código (`cicada`) se conserva.

**Hojas quitadas.** Tras escuchar cada sonido por separado, el usuario pidió quitar las hojas del Bosque. Se eliminó la capa del perfil y también el fondo grabado opcional `forest_day_loop.mp3`, que la sustituía. El código del roce de hojas (`leaves`) se conserva por si otra isla lo usa.

## 3. Archivos

| Archivo | Cambio |
|---|---|
| `src/audio/AmbienceManager.js` | Nuevo (ver §2). |
| `src/tactics/TacticalAudio.js` | Bus `ambGain`, `setAmbientVolume`, silencio del ambiente, `AmbienceManager`, y los 5 sonidos de interfaz. |
| `src/rpg/ui/SettingsModal.js` | El volumen «Ambiente» llega al bus. |
| `src/tactics/combat/CombatDebug.js` | `lkDebug.audio()`. |
| `docs/AUDIO_ARCHIVOS_A_CONSEGUIR.md` | Lista de grabaciones para las fases siguientes. |

## 4. Consola

| Comando | Qué hace |
|---|---|
| `lkDebug.audio()` | Isla, modo, volumen de la escena, cantidad de mar y fuentes cercanas con su % |
| `lkDebug.audio({ island: 'arctic' })` | Fuerza una isla (para escucharlas todas sin viajar) |
| `lkDebug.audio({ off: true })` | Quita el forzado |

## 5. Comprobado (Chromium, audio grabado de la salida real)

Los recorridos se simularon moviendo al jugador. Hay 7 muestras en MP3 entregadas al usuario.

- **Bosque:** la Forja (yunque al 64 %), luego el dojo (campanillas al 50 %), luego el río (15 → 100 %) y los rápidos (49 %).
- **Costa:** el mar sube de 0 a 0,31 a 10 m del agua.
- **Sabana:** hoguera al 96 % y después oasis al 85 %.
- **Ártico:** hoguera, después hoguera del Chef y estofado.
- **Mística:** pantano de 3 a 71 %.
- **Génesis:** de las campanillas del Jardín Real a la llama de Atia.
- **Combate:** volumen 0,45, sin fuentes ni mar.
- **Niveles con «Ambiente» al 60 %:** media de −30 a −35 dB en el mundo y de −36 dB en combate; picos máximos de −12 dB. No satura.
- Ningún error de página.
- Los 5 sonidos de interfaz y los 8 nombres de `playSfx` suenan sin error.
- `setAmbientVolume(0.3)` deja el bus en 0,30, y silenciar lo baja a 0.

## 6. Pendiente

- **Escucharlo en el juego.** Puntos a revisar:
  - el nivel junto a la música (lo fija `MIX_GAIN`, ajuste fino en la fase 6);
  - las posiciones de hogueras y fuentes con las islas reales.
- **Fase 2:**
  - pasos según el suelo, voces de Axies y NPC, monstruos y recolección;
  - **reto de pesca** (aprobado);
  - los pájaros y animales grabados sustituirán o completarán a los sintetizados cuando lleguen los archivos.
- **Fase 3:** sonido de combate por clase y nivel.
- **Fases 4 y 5:** *game feel* (sacudida por trauma, pausa al golpear, barra de vida fantasma, números de daño por tamaño, aceleración al moverse, cámara que se adelanta).
- **Fase 6:** mezcla final.
