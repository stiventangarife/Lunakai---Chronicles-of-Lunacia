# Hito 87: Sonidos del mundo y reto de pesca (fase 2 del plan de sonido)

> **Estado:** en la versión de prueba (27-oct-2026), pendiente de que el usuario lo pruebe en el juego.
> **Pedido:** fase 2 del plan de sonido:
> - pasos según el suelo;
> - voz de los NPC;
> - Axie y monstruos;
> - recolección;
> - el **reto de pesca** (aprobado).
>
> Enfoque mixto, como en el Hito 86: todo suena ya sintetizado y cada sonido usará su grabación en cuanto exista (lista en [`AUDIO_ARCHIVOS_A_CONSEGUIR.md`](AUDIO_ARCHIVOS_A_CONSEGUIR.md)).

## 1. Pasos según el suelo

- **Antes:**
  - el Sapidae sonaba con un «bip» de tono cada 0,32 s, con un temporizador en `PlayerController`;
  - el Axie no sonaba.
- **Ahora:**
  - suena con cada zancada, a la vez que la huella (`FootstepEffectsManager` → `WorldSfx.onStride`);
  - el Sapidae, uno de cada dos pasos (~3,6 por segundo al correr);
  - el Axie, uno de cada tres, más agudo, más bajo y desde su lado.

| Suelo | Dónde | Cómo se detecta |
|---|---|---|
| Agua | Ríos, orillas, mar somero | Profundidad del agua > 3 cm (chapoteo del Hito 66) |
| Madera | Puentes y muelle | Se pisa una superficie por encima del terreno |
| Hielo | Lagos y ríos helados del Ártico | Igual que la madera, pero en el Ártico y a menos de 1,2 m sobre el fondo |
| Tierra | Caminos del Bosque y de las islas; todo el suelo de la Sabana | `roadManager.getRoadFactor` (Bosque) o `art.data._nearestPath` (islas) |
| Piedra | Caminos y plaza del Jardín Real de Génesis | Camino en Génesis o a menos de 16 m del centro |
| Arena | Playas | Suelo a menos de 0,8 m sobre el nivel del mar (en el Ártico, nieve) |
| Nieve | Ártico | Por isla |
| Hierba | Bosque, Mística, Génesis | Por isla |

**Grabaciones:** `sfx/steps/step_<suelo>_N.mp3`.

## 2. Voz de pitidos de los NPC

- Mientras el diálogo escribe, cada letra da un pitido corto, al estilo Animal Crossing:
  - no más de uno cada 55 ms;
  - sin sonido en signos ni espacios;
  - con «Instantánea», no suena (el texto sale de golpe).
- **Timbre:**
  - las vocales cambian el timbre, mediante dos filtros de formantes por vocal;
  - las consonantes suenan más cortas y bajas.
- **Cada personaje tiene su voz:**
  - fija, sacada de su `npcId` (la misma en español y en inglés) o de su nombre;
  - algunos tienen voz propia: Paladill grave, la Estatua o el Espíritu de Atia etérea con brillo, Bing, Pomodoro, Kappa, Kawa, el Chef y el Ermitaño;
  - el resto, con un tono de 150 a 380 Hz y una forma de onda que salen de su nombre.
- Un nodo de diálogo puede fijar la voz con `voice: 'paladill'`.

## 3. Criaturas

| Quién | Sonido | Cuándo |
|---|---|---|
| Slimes | «Boing» blandito | Al caer de cada salto: desde su posición, hasta 20 m y no más de uno cada 0,3 s |
| Slimes | «¡Boing!» doble agudo | Al detectarte (junto al «!») |
| Quimeras | Grito corto | Al detectarte (antes sonaba el choque genérico) |
| Quimeras | Gruñido ronroneado | La quimera más cercana que patrulla (menos de 22 m), cada 7–15 s |
| Axie compañero | Gorjeo alegre | Al acariciarlo, darle de comer o traerte el botín de la pesca o la tala |
| Axie compañero | «¿Mm?» curioso | Si te quedas quieto 25–45 s (sin diálogo ni menús) |

Cada Axie tiene su propio tono, que sale de su id.

**Grabaciones:** `sfx/creatures/…`.

## 4. Recolección

| Actividad | Durante | Al terminar |
|---|---|---|
| Tala (Axie) | Hachazo en cada golpe | Crujido y caída del árbol |
| Minería (Sapidae) | Pico contra roca, metálico | Roca que se parte |
| Flores (Sapidae) | — | Arrancar la planta |
| Pesca (Axie) | Ver §5 | Pez fuera del agua y campanitas |

**Grabaciones:** `sfx/world/…`.

## 5. Reto de pesca

Antes la pesca era esperar 6 s. Ahora es un minijuego corto. Se pulsa **E** o **Espacio**, o se toca el panel en pantallas táctiles:

1. **Lanzar:**
   - el Axie lanza la caña y el corcho cae;
   - suenan el silbido y el «plop»;
   - el clip `Whip.Skill` se casi congela con el sedal en el agua (timeScale 0,06), mientras dura el reto.
2. **Esperar:**
   - de 1,8 a 4,2 s, con 0–2 **mordisquitos** de engaño: el corcho se hunde un poco con un «plip»;
   - si pulsas antes de tiempo, el pez se asusta.
3. **Picada:**
   - el corcho se hunde, salpica y sale «¡Pica! ¡Pulsa E!»;
   - tienes **1,2 s**.
4. **Barra:**
   - un marcador va y viene (ida y vuelta en 1,6 s);
   - pulsa dentro de la zona verde (28 % de la barra);
   - en el centro dorado (8 %) sale **«¡Perfecto!»**: +1 unidad y el doble de probabilidad de koi dorado (20 % en vez de 10 %);
   - se permiten **2 fallos**, y tras cada uno el marcador va un 15 % más rápido y la zona cambia de sitio;
   - 7 s sin pulsar: el pez se va.
5. **Resultado:**
   - el clip sigue más rápido y recoge el sedal;
   - con el pez: «¡Lo tienes!» o «¡Perfecto! Botín extra», y el Axie trae el botín como antes;
   - si se escapa: «Demasiado pronto…», «El pez se escapó» o «Se soltó del anzuelo», y «Puedes volver a intentarlo». **El punto no se gasta.**

`Esc` sigue cancelando. Las constantes están en `FISH_CHALLENGE` (`GatheringActors.js`).

## 6. Grabaciones (`SfxBank`)

- Las grabaciones van en `assets/sounds/sfx/<carpeta>/<nombre>_N.mp3`.
- Para que el juego las busque tiene que existir **`assets/sounds/sfx/CREDITOS.txt`**, el archivo de créditos que pide la lista:
  - si no existe, no se pide nada más y todo suena sintetizado (un solo 404 por sesión);
  - si existe, cada familia de sonidos se carga la primera vez que se usa, y los archivos que falten se quedan sintetizados.
- Elige una variante al azar sin repetir la anterior y cambia un poco el tono.

## 7. Archivos

| Archivo | Cambio |
|---|---|
| `src/audio/SfxBank.js` | **Nuevo.** Grabaciones opcionales (familias, variantes y comprobación de `CREDITOS.txt`). |
| `src/audio/WorldSfx.js` | **Nuevo.** Pasos y detección del suelo, voz de pitidos, criaturas, recolección, pesca y bucle (Axie curioso, gruñidos). Consola `lunakaiWorldSfx`. |
| `src/tactics/TacticalAudio.js` | `this.world = new WorldSfx(this)`. |
| `src/audio/AmbienceManager.js` | Llama a `world.tick` 10 veces por segundo. |
| `src/rpg/world/demo_scena/FootstepEffectsManager.js` | `_emitStride` en cada zancada (Sapidae y Axie). |
| `src/rpg/PlayerController.js` | Se quita el «bip» por temporizador. |
| `src/rpg/DialogSystem.js` | Pitido por letra con la voz del personaje (`node.voice`, `npcId` o `speaker`). |
| `src/rpg/WanderingMonsters.js` | Grito de alerta por tipo (quimera o slime). |
| `src/rpg/world/demo_scena/SlimeCreaturesManager.js` | «Boing» al caer y al detectarte. |
| `src/rpg/GatheringActors.js` | Reto de pesca (`FISH_CHALLENGE`, `onAction`), golpes por herramienta y sonidos finales. |
| `src/rpg/GatheringService.js` | `roll`/`gather` aceptan `bonus` (`extra`, `rareMul`). |
| `src/ui/GatheringHUD.js` | Panel del reto (texto, barra, zona y marcador), E/Espacio/toque, `hud.sfx`, `hud.hit(kind)`, gorjeo al entregar el botín. |
| `src/ui/AxieCarePanel.js` | Gorjeo al acariciar y al dar de comer. |
| `src/ui/lunakai-ui.css` | Estilos `.lk-fish` (con su `prefers-reduced-motion`). |
| `src/i18n/{es,en}/notices.js` | 11 textos de la pesca. |
| `src/tactics/combat/CombatDebug.js` | `lkDebug.sfx()`. |

## 8. Consola

| Comando | Qué hace |
|---|---|
| `lkDebug.sfx()` | Si hay grabaciones, cuáles se cargaron y el último suelo pisado |
| `lkDebug.sfx('pasos')` · `'voz'` · `'criaturas'` · `'pesca'` · `'recoleccion'` | Toca la familia completa |
| `lunakaiGathering.start('fish_forest_1')` | Empieza a pescar (junto al punto) |

## 9. Comprobado

**Navegador (Chromium), con la salida grabada:**
- las cinco familias suenan sin errores; se entregan las muestras al usuario;
- picos de −22 a −27 dBFS con «Efectos» al 100 % (los pasos, un poco por encima del «bip» anterior).

**Node (con `three` real y módulos de apoyo simulados):**
- **Pesca, cinco casos:**
  - perfecto: espera › picada › barra › perfecto, y botín con `{extra: 1, rareMul: 2}`;
  - normal: captura sin bonus;
  - demasiado pronto: se escapa sin gastar el punto;
  - no pulsar al picar: se escapa;
  - dos fallos en la barra: se escapa.
- **Velocidades del clip:** 1 (reinicio) › 0,06 › 1,3.
- **Botín:** con el bonus, 3 › 4 unidades, y el koi sale con una tirada de 0,15.
- **Suelos:** 14 casos (hierba, camino, agua, puente sobre el río = madera, playa, nieve, hielo, puente del Ártico, plaza y senderos de Génesis, Sabana y su costa).
- **Voces:** fijas por nombre; Paladill 118 Hz con onda de sierra, Atia 300 Hz con onda senoidal.

**Captura** del panel de pesca en sus siete estados.

## 9b. Ajustes tras escucharlo

- **Pasos en hierba:** sonaban robóticos, porque eran siempre las mismas dos ráfagas y un tono grave. Ahora llevan un golpe sordo de ruido, sin tono, y 4–7 roces cortos de hierba con tono, duración y momento al azar, así que no hay dos pasos iguales.
- **Viento de la Sabana:** tapaba el resto de sonidos. Ahora es una brisa seca:
  - volumen 0,08 (antes 0,15);
  - silbidos al 15 %;
  - ráfagas al 50 %.

  En la prueba bajó de −42 a −51 dB de media y la banda de silbidos (1–4 kHz) pasó del 34 % al 20 %.

- **Mar en la playa:** molestaba en los oídos. Tenía el 41 % de su energía por debajo de 100 Hz (el 17 % por debajo de 40 Hz). Son subgraves que casi no se oyen pero presionan con auriculares. Ahora:
  - el ruido marrón se genera ya sin subgraves (paso alto a ~45 Hz), lo que también limpia hogueras y viento;
  - el mar lleva un paso alto doble a 120 Hz, y la grabación opcional uno a 80 Hz;
  - la hoguera lleva un paso alto a 100 Hz;
  - `SEA_SOFT` baja de 0,5 a 0,28.

  En la orilla, el mar pasó de −29,8 a −35,7 dB de media y lo que hay por debajo de 100 Hz pasó del 41 % al 1,6 %.

## 10. Pendiente

- **Probar en el juego:**
  - pasos en cada isla (sobre todo los puentes, el muelle y el hielo del Ártico);
  - voces en varios diálogos;
  - la pesca completa en los tres puntos del Bosque;
  - el volumen de los pasos frente al ambiente.
- Si los pitidos de voz cansan, se puede añadir una opción en Opciones para apagarlos.
- Fase 3: sonido de combate por clase y peso del golpe.
