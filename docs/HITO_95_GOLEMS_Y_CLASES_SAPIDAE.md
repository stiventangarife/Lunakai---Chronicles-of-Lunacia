# Hito 95: Gólems de arcilla espiritual y las 4 clases del Sapidae según el lore

> **Estado:** en la versión de prueba (28-oct-2026), pendiente de probarlo en el juego.
> **Pedido:**
> 1. Cambiar las 4 clases del Sapidae y sus 24 habilidades (inventadas) para que encajen con su papel en el lore: Gólems Centinela de Vasija y Gólems Sombrero, Wind Bells, caracoles Gogo, petrasentido, la arcilla espiritual «para resistir, no para conquistar», la Luna de Sangre y «guiaban el combate sin darle órdenes».
> 2. Que las 4 clases invoquen un gólem, con una función distinta según la clase.
> 3. Gólems con primitivas por ahora; los modelos llegan después.

## 1. Las clases

Los ids internos no cambian (`crafter`, `shepard`, `lunalogist`, `stargazer`), así los guardados siguen valiendo. Las estadísticas base tampoco cambian.

| Id | Clase (es / en) | Gólem | Papel |
|---|---|---|---|
| `crafter` | Alfarero de Gólems / Golem Potter | Centinela de Vasija (`sentinel`) | Defensa: muralla, provocar y proteger |
| `shepard` | Comandante de Sombrero / Hat Commander | Gólem Sombrero (`hat`) | Órdenes y posición: PA/PM y movimiento de aliados |
| `lunalogist` | Guardián de Campanas / Bell Warden | Gólem Campanario (`bell`) | Avisos y curación: limpiar, curar, marcar |
| `stargazer` | Rastreador Gogo / Gogo Tracker | Gólem Caparazón (`shell`) | Terreno: petrasentido, tierra estable, grietas |

## 2. Los gólems (`src/tactics/combat/GolemSystem.js`)

- Es una `Unit` con `isGolem` dentro de `game.units`. **No tiene turno** (no entra en la cola de iniciativa) y actúa al final del turno de su dueño (pulso).
- No cuenta para la victoria ni la derrota (un gólem en pie no evita perder), ni para la XP ni para la vida que se guarda del escuadrón.
- Inmune a estados negativos y no se le puede empujar ni atraer. Se le puede curar, dar escudo y atacar; la IA lo tiene en cuenta como objetivo.
- **Uno por Sapidae:** invocar otro retira el anterior sin su efecto de rotura.
- Vida = % de la vida máxima del dueño. Al romperse (`Unit.onDeath`) hace su efecto final.

| Gólem | Vida | Pasiva / pulso | Al romperse |
|---|---|---|---|
| Centinela | 70 % | Provoca a los enemigos que tiene al lado; aliados a su lado reciben −25 % de daño (también en el pronóstico) | +30 de escudo a los aliados de al lado |
| Sombrero | 45 % | Repite órdenes: cartas con `relay` llegan a aliados a 2 casillas del gólem. Pulso: +1 PM a aliados al lado | +1 PA a los aliados de al lado |
| Campanario | 45 % | Pulso (radio 2): aliados +20 de vida y −1 estado negativo; enemigos Frágiles 25 % | Cura 40 en radio 2 |
| Caparazón | 50 % | Su casilla y las de alrededor son tierra estable: +1 PM, Arraigado 2 turnos y quita quemadura/veneno (1 vez por turno) | Tierra estable 3×3 durante 2 rondas |

Los números están en `GOLEM_DEFS`.

**Modelos (28-oct):** `assets/models/golem-<sentinel|hat|bell|shell>.glb` (estáticos, Draco + WebP, ~2.100 triángulos, texturas 1024, de pie sobre el origen y mirando a +Z). Se cargan por la caché compartida (`cloneGLTF`), con materiales propios por gólem (destello de daño), y se ajustan a `GOLEM_HEIGHT` = 1,5 m sin pasar del 110 % de media casilla (`GOLEM_SPILL`). Al empezar el combate se descarga el del Sapidae (`preloadGolemModel`). Si un GLB falta o falla, se usa el modelo de primitivas:

Modelo de primitivas (vasija de arcilla torneada, bandas de piedra, vetas minerales que brillan, cara serena) con un accesorio por tipo: losa-escudo, sombrero ancho, yugo con campana de bronce, caparazón en espiral con caracoles. Escala `GOLEM_SCALE` = 1,25. Geometrías compartidas; materiales clonados por gólem y liberados en `dispose`.

## 3. Las 24 habilidades

### Alfarero de Gólems (`crafter`)
| Id | Nombre | PA | AL | Efecto |
|---|---|:---:|:---:|---|
| `craft_clay_fist` | Puño de Arcilla | 3 | 1–2 línea | 42–55 de daño, empuja 1 |
| `craft_sentinel_golem` | Centinela de Vasija | 4 | 1–2 | Invoca el Centinela (1 vez por turno) |
| `craft_stone_veins` | Vetas de Piedra | 2 | 1–3 | +60 de escudo y Arraigado; sobre el gólem, +80 de vida |
| `craft_clay_wall` | Muralla de Arcilla | 2 | 1–3, sin LoS | Muro 2 rondas, +30 de escudo al lanzador |
| `craft_carry_wounded` | Llevar al Herido | 3 | 1–5, sin LoS | Cura 30–40 y trae al aliado junto al gólem (o junto a ti) |
| `craft_fortify` | Fortificar | 2 | 1–6, solo tu gólem | +100 de escudo y Espinas 20, 2 turnos (1 vez por turno) |

### Comandante de Sombrero (`shepard`)
| Id | Nombre | PA | AL | Efecto |
|---|---|:---:|:---:|---|
| `shepard_hat_headbutt` | Cabezazo del Sombrero | 3 | 1–2 línea | 40–52 de daño, −1 PA en su próximo turno |
| `shepard_hat_golem` | Gólem Sombrero | 4 | 1–2 | Invoca el Gólem Sombrero |
| `shepard_translate_warning` | Traducir el Aviso | 2 | 1–4 + gólem | +2 PM (1 vez por turno) |
| `shepard_shared_order` | Orden Compartida | 3 | 1–4 + gólem | Axie: +1 PA y +15 % de daño (1 vez por turno) |
| `shepard_guided_retreat` | Retirada Guiada | 2 | 1–4 + gólem | +30 de escudo, se aleja 2 casillas del enemigo más cercano |
| `shepard_relief` | Relevo | 2 | 1–4 | Intercambio con un aliado o el gólem, +25 de escudo a los dos |

### Guardián de Campanas (`lunalogist`)
| Id | Nombre | PA | AL | Efecto |
|---|---|:---:|:---:|---|
| `lunalogist_alarm_toll` | Tañido de Alarma | 3 | 1–3 | 35–45 de daño y Frágil 25 % |
| `lunalogist_bell_golem` | Gólem Campanario | 4 | 1–2 | Invoca el Gólem Campanario |
| `lunalogist_mourning_tone` | Tono de Duelo | 2 | 1–3 | Cura 40–55, quita veneno, sangrado y quemadura |
| `lunalogist_warning_whisper` | Susurro de Advertencia | 2 | 1–4 | +35 de escudo y Guarda (el atacante queda Debilitado 20 %) |
| `lunalogist_purify` | Purificar | 3 | 1–3 | 30–40 de daño y quita los efectos positivos |
| `lunalogist_blood_moon` | Resonancia de la Luna de Sangre | 4 | propio | Todos los aliados: regeneran 20 durante 2 turnos e Inmunes 1 turno |

### Rastreador Gogo (`stargazer`)
| Id | Nombre | PA | AL | Efecto |
|---|---|:---:|:---:|---|
| `stargazer_yielding_ground` | Suelo que Cede | 3 | 1–3 | 40–52 de daño, −1 PM |
| `stargazer_shell_golem` | Gólem Caparazón | 4 | 1–2 | Invoca el Gólem Caparazón |
| `stargazer_petrasense` | Petrasentido | 2 | 1–6, sin LoS | Frágil 25 % y −1 de alcance, 2 turnos |
| `stargazer_shell_march` | Marcha del Caparazón | 2 | 1–3 desde el gólem | Mueve el gólem; deja tierra estable 2 rondas (1 vez por turno) |
| `stargazer_corrupt_rift` | Grieta Corrupta | 2 | 1–4, 2×2 | Enemigos dentro: −2 PM, 2 rondas |
| `stargazer_dawn_spiral` | Espiral del Alba | 4 | 1–3, 3×3 | 45–58 solo a enemigos; aliados +25 y limpian quemadura/veneno |

Los ataques de la ranura 1 son de un solo objetivo (el tutorial sigue funcionando: el explorador está a 1 casilla de la casilla dorada).

## 4. Cambios en el motor

- **Datos nuevos de carta:** `rangeFrom: 'golem'` (el alcance se mide desde el gólem), `allyFilter` (`companion`, `living`, `otherLiving`, `golem`, `notSelf`), `relay` (también llega a los aliados cerca del Gólem Sombrero) y `selective` (el área no daña a los aliados).
- **Efectos nuevos** (`EffectResolver`): `summonGolem`, `golemMove`, `golemFetch`, `retreat`. Condiciones: `targetIsGolem`, `targetNotGolem`, `targetIsCaster`, `targetNotCaster`.
- `StatusSystem.apply` rechaza estados negativos en gólems (`status:resisted`). `BattlefieldObjects` llama a `onStableGround` en las zonas con `stable`. `TurnManager` deja los gólems fuera de la cola y del fin de combate.
- Provocar y el −25 % del Centinela pasan por `spellManager.isTauntingFor` y `_applyDamageModifiers` (la IA y el pronóstico ven lo mismo que el daño real).
- **Presentación:** calcas de zona en el suelo (tierra estable, grieta, pozo) con geometría y materiales compartidos; textos al invocar, al romperse y al sonar la campana. En la barra de cartas, las que necesitan gólem se apagan si no hay gólem.
- **VFX:** mientras no haya efectos propios, `SAPIDAE_VFX_ALIAS` (`VfxBridge.js`) reutiliza los de las habilidades antiguas. Las invocaciones y la Marcha no tienen VFX del motor (el gólem sale del suelo).
- **Guardados:** `SAPIDAE_LEGACY_SPELLS` (`SaveSlotManager.js`) pasa el nivel de cada habilidad antigua a la nueva de la misma ranura (`EquipmentManager`).
- **Textos:** `src/i18n/{es,en}/golems.js` nuevo; claves nuevas en `spells.js` y `heroes.js`; las antiguas del Sapidae se quitan.

## 5. Pendiente

- VFX propios (para quitar la tabla de alias) y sonidos de los gólems (invocar, pulso, romperse).
- Equilibrio: los números de `GOLEM_DEFS` y de las cartas son una primera versión.

## 5b. Arte añadido después (28–29 oct)

- **Emblemas de clase:** `assets/classes/class_<forjacubiles|susurrador|lunalogista|astromante>.webp`, 256×256 con fondo transparente. Sustituyen a los `.jpg` de 1024; los antiguos quedan como `*_old.jpg`.
  - **Dónde se usan:** `SaveSlotManager` (icon / iconImg), `StartScreenUI` (`CLASS_PORTRAITS`), `SquadHUD` y la presentación del héroe (`OverworldManager`).
  - **Encaje:** se ven enteros (`object-fit: contain`, sin recorte circular) en `.lk-crest`, `.lk-intro__cls` y `.lk-pt-cls.lk-is-sapi`.
  - **Colores de clase**, tomados de los emblemas: Alfarero terracota `#C8643B`, Comandante vino `#A83A44`, Guardián jade `#3FB89A`, Rastreador musgo `#8F9E3A`. Se aplican en `CC_COLORS` (creador), `SAPIDAE_CLASS_THEMES` (escuadrón) y en las tarjetas `.class-sapidae-*` de `styles.css`.
- **Iconos de las 24 habilidades:** propios de cada clase en `assets/skills/heroes/<crafter|shepard|lunalogist|stargazer>/1–6.webp`, en el **orden de las habilidades** (1 = ataque, 2 = gólem, … 6). Lo usan `Spells.js` (icon) y `SAPIDAE_CLASSES.spellPreviews` (`SaveSlotManager.js`). Antes, varias habilidades reutilizaban imágenes de otra clase o de otra ranura; corregido el 29-oct.
  - Si se cambia el orden de las habilidades de una clase, hay que renombrar sus imágenes, porque también decide qué se desbloquea a nivel 3, 7 y 10 (Hito 98).

## 6. Pruebas

- Banco automático en Chromium con los módulos reales: 123 de 123 comprobaciones (clases, textos, invocar y reemplazar, fuera de la cola, provocar, −25 % con pronóstico igual al daño, la IA ataca al gólem, inmunidad, sin empuje, roturas, derrota con gólem en pie, órdenes repetidas, pulsos, retirada, relevo, campana, Guarda, Luna de Sangre, tierra estable, marcha, 3×3 al romperse, espiral selectiva, petrasentido, Llevar al Herido, Vetas, Fortificar, caducidad de escudos y estados).
- El juego arranca sin errores y el creador de personaje muestra las 4 clases nuevas con sus tooltips.
- Consola: `await lkDebug.golem('bell')`, `lkDebug.golems()`; lista de cartas en `docs/PRUEBAS_HABILIDADES.md`.
