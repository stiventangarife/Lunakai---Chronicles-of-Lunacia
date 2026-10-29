# Hito 97: Recarga de habilidades y usos por objetivo

> **Estado:** en la versión de prueba (28-oct-2026), pendiente de probarlo en el juego.
> **Pedido:** ninguna habilidad tenía recarga: se podía usar varias veces en un turno y en todos los turnos seguidos. Añadir turnos de recarga a ciertas habilidades y, al estilo Dofus, usos por objetivo y turno.
> **Decisiones del usuario:** «recarga 2» = no se puede en tus 2 turnos siguientes y vuelve en el tercero · reglas automáticas por tipo para las cartas de Axie (y las de mucho daño: 1 vez por turno y recarga 2) · los enemigos, solo en sus habilidades fuertes · incluir usos por objetivo y turno.

## 1. Reglas (`src/tactics/Spells.js`)

| Campo | Significado |
|---|---|
| `cooldown: N` | Tras usarla, no se puede en los N turnos siguientes de quien la lanzó; vuelve en el N+1. |
| `initialCooldown: N` | Al empezar el combate no se puede hasta el turno N+1 de la unidad. |
| `castsPerTurn: N` | Usos por turno (ya existía, Fase 5). |
| `castsPerTarget: N` | Usos por turno sobre la misma unidad (el objetivo principal). |

- Se cuentan los **turnos propios** (`unit._turnNo`), también los perdidos por aturdir o dormir, igual que los estados.
- Las recargas duran solo el combate (`resetCooldowns` al empezar) y no se guardan en la partida.
- Ejemplo: recarga 2, usada en el turno 3 → bloqueada en los turnos 4 y 5 → lista en el 6. La carta muestra «2» justo después de usarla, «2» en el turno 4, «1» en el 5.
- La Definitiva no usa este sistema (sigue con el vínculo).

**API del motor:**
- `canCastNow(unidad, carta)`: la respuesta única para la interfaz, la IA y el tutorial (PA, usos, recarga, gólem).
- `cooldownLeft`, `isOnCooldown`, `cooldownOf` (con el gancho `runeCharms.cooldownOf` para futuras runas o charms que cambien la recarga), `castBlockReason` (`'spent'` | `'cooldown'`), `targetLimitReached`, `resetCooldowns`.
- **Eventos:** `spell:cooldown` (`{ unit, spell, turns }`) al usarla; `spell:ready` (`{ unit, spellId }`) al empezar el turno en que vuelve.
- `getRangeCells` y `getValidTargetCells` no dan casillas a una carta en recarga. Las casillas de una unidad que ya agotó los usos por objetivo tampoco son válidas, y `castSpell` lo comprueba antes de cobrar.

## 2. Interfaz

- **Barra de cartas** (`main.js`, `lunakai-ui.css`): la carta en recarga se apaga y muestra en grande los turnos que faltan (`.lk-cd-badge`, atributo `data-cd`). Las cartas sin usos este turno también se apagan. Al volver, destella (`.lk-cd-ready`, sin animación con «Reducir movimiento»).
- **Ficha de la carta en combate** (`CombatHUD.js`): líneas «Recarga», «Espera inicial» y «Usos» (por turno · por objetivo), y el aviso «En recarga: lista en N turnos.».
- **Fuera del combate:** las mismas líneas en el creador de personaje y en el panel de runas y charms (`spellLimitStats` en `ui/lk.js`).
- **Textos:** `game.spellCooldown1/N` y `combatHud.cooldown`, `initialCd`, `uses`, `perTurnN`, `perTargetN`, `readyIn1/N` y `spentTip`, en español e inglés.

## 3. IA (`TacticalAI.js`)

Los enemigos solo eligen cartas con `canCastNow` (antes solo miraban los PA y no veían el límite por turno). Si su golpe fuerte está en recarga, usan el siguiente mejor.

## 4. Valores

### Sapidae (`SPELL_USE_LIMITS` en `Spells.js`)

| Clase | Carta | Recarga | Otros |
|---|---|:-:|---|
| Alfarero | Centinela de Vasija | 3 | 1 por turno |
| Alfarero | Vetas de Piedra | — | 1 por objetivo |
| Alfarero | Muralla de Arcilla | 2 | |
| Alfarero | Llevar al Herido | 2 | |
| Alfarero | Fortificar | 2 | 1 por turno |
| Comandante | Gólem Sombrero | 3 | 1 por turno |
| Comandante | Traducir el Aviso | 1 | 1 por turno |
| Comandante | Orden Compartida | 1 | 1 por turno |
| Comandante | Retirada Guiada | — | 1 por objetivo |
| Comandante | Relevo | 2 | |
| Guardián | Gólem Campanario | 3 | 1 por turno |
| Guardián | Tono de Duelo | — | 1 por objetivo |
| Guardián | Susurro de Advertencia | — | 1 por objetivo |
| Guardián | Purificar | 1 | |
| Guardián | Resonancia de la Luna de Sangre | 4 | espera inicial 1 |
| Rastreador | Gólem Caparazón | 3 | 1 por turno |
| Rastreador | Petrasentido | 1 | 1 por objetivo |
| Rastreador | Marcha del Caparazón | — | 1 por turno |
| Rastreador | Grieta Corrupta | 2 | |
| Rastreador | Espiral del Alba | 2 | |

Los cuatro ataques básicos (ranura 1) no tienen recarga.

### Cartas de Axie (`applyUseLimits` en `tactics/data/PartCards.js`)

Reglas automáticas. Solo rellenan lo que la carta no traiga; una carta puede fijar `cooldown: 0` para no tener recarga.

| Tipo de carta | Límite |
|---|---|
| Aturdir, dormir o miedo al enemigo | recarga 2 y 1 por objetivo |
| Daño alto para su coste (`USE_LIMITS.HIGH_DAMAGE`: 1 PA ≥ 32, 2 PA ≥ 80, 3 PA ≥ 140; ≈ el 20 % con más daño) | 1 por turno y recarga 2 |
| Daño en área | recarga 1 |
| Da PA o PM a tu equipo | 1 por turno (Fase 5) y recarga 1 |
| Curación ≥ 45 | recarga 1 |
| Curar o proteger a un aliado | 1 por objetivo |
| Ataque de 1 PA | 2 por objetivo |
| Escudo en área o a todos los aliados (añadido después: Platypus, Mint, Lost Dream) | 1 por turno |

- Las partes de nivel 2 (+20 %) se miden con su daño base: mejorar una parte no le pone recarga.
- Las de colección, las variantes y las iniciales pasan por las mismas reglas.
- **Resultado:** 106 de 235 cartas tienen algún límite (79 con recarga); 129 quedan libres.

### Enemigos (`SPELL_USE_LIMITS`)

Recarga 2 en los golpes fuertes, las áreas, las provocaciones, las curas y las barreras:
- **Jefes:** lobo jefe (Rugido), Aplastar del werewolf, Golpes de los osos, Rugidos, Escudo de oso.
- **Dríades:** maga (Explosión, Estallido, Cura, Barrera) y Raíz de la arquera.
- **Áreas:** novas (lobo alfa, quimera, treant) y Estallido del slime de fusión.
- **Provocaciones:** rugidos de lobos y Bramido de la quimera.
- **Curas y barreras:** curas y barreras de los slimes.

El Cataclismo del jefe lobo tiene recarga 3 y espera inicial 1. Los ataques básicos no tienen recarga.

## 5. Pruebas

- **Banco nuevo** (`_test/cooldown-test.js`, módulos reales): 31 de 31 (con la regla de escudos en área).
  - recarga 2 (turnos 1 a 4, el turno aturdido cuenta, eventos);
  - espera inicial y recarga 4 de la Luna de Sangre;
  - usos por objetivo (casillas, `castSpell` y el turno siguiente);
  - reglas de las cartas de Axie;
  - 1 por turno en una carta de daño alto;
  - la IA del jefe: con Cataclismo en recarga solo ve y usa el mordisco;
  - recargas a cero en un combate nuevo.
- **Bancos anteriores:** gólems 123 de 123 y equipo del Hito 96 10 de 10.
- **Juego real** (arena de pruebas): la carta en recarga sale apagada con su número y la ficha muestra «Cooldown 1 turn · Recharging: ready in 1 turn».
- **Consola:** `lkDebug.recargas()` (tabla por unidad) y `lkDebug.sinRecargas("active")`. En la arena (`lkDebug.probar`) la carta probada siempre está lista.

## Anexo: cartas de Axie con límites

| Carta | Clase | PA | Recarga | Por turno | Por objetivo | Motivo |
|---|---|:-:|:-:|:-:|:-:|---|
| Boomerang | beast | 1 | 1 | 1 | 2 | da PA/PM, 1 PA |
| Cottontail | beast | 2 | 1 | 1 | 1 | da PA/PM, apoyo |
| Foxy | beast | 2 | 2 | 1 | — | daño alto |
| Furball | beast | 2 | 2 | 1 | — | daño alto |
| Hare | beast | 2 | 1 | 1 | — | da PA/PM |
| Hero | beast | 2 | 1 | 1 | — | da PA/PM |
| Imp | beast | 2 | 1 | 1 | — | da PA/PM |
| Innocent Lamb | beast | 2 | 1 | 1 | — | da PA/PM |
| Lump | beast | 1 | 1 | 1 | — | da PA/PM |
| Merry | beast | 2 | — | — | 1 | apoyo |
| Platypus | beast | 2 | 1 | 1 | — | área |
| Puppy | beast | 1 | 1 | 1 | — | da PA/PM |
| Rice | beast | 2 | 1 | 1 | — | da PA/PM |
| Risky Beast | beast | 2 | 2 | 1 | — | daño alto |
| Shiba | beast | 3 | 2 | 1 | — | daño alto |
| Sobby | beast | 1 | — | — | 2 | 1 PA |
| Sparky | beast | 2 | 1 | 1 | — | da PA/PM |
| Timber | beast | 2 | — | — | 1 | apoyo |
| Zeal | beast | 1 | 1 | 1 | — | da PA/PM |
| Zen | beast | 2 | 1 | 1 | — | da PA/PM, cura grande |
| Beetroot | plant | 2 | 1 | 1 | — | da PA/PM |
| Blossom | plant | 1 | 1 | 1 | — | da PA/PM |
| Carrot | plant | 2 | 1 | 1 | — | da PA/PM |
| Clover | plant | 2 | 1 | 1 | 1 | da PA/PM, apoyo |
| Cucumber Slice | plant | 3 | 1 | — | — | cura grande |
| Death Shroom | plant | 2 | 1 | — | — | área |
| Forest Hero | plant | 3 | 2 | 1 | — | daño alto |
| Hatsune | plant | 2 | — | — | 1 | apoyo |
| Leafy | plant | 1 | 2 | 1 | 2 | daño alto, 1 PA |
| Lotus | plant | 2 | — | — | 1 | apoyo |
| Mandarine | plant | 2 | 1 | 1 | — | da PA/PM |
| Mint | plant | 2 | — | 1 | — |  |
| Mystery Seed | plant | 1 | 1 | 1 | — | da PA/PM |
| Papi | plant | 2 | 1 | — | 1 | cura grande, apoyo |
| Pumpkin | plant | 2 | — | — | 1 | apoyo |
| Risky Trunk | plant | 3 | 1 | — | — | cura grande |
| Rosa | plant | 2 | 2 | — | 1 | control |
| Rose Bud | plant | 2 | 1 | — | 1 | cura grande, apoyo |
| Serious | plant | 2 | 2 | 1 | — | daño alto |
| Shiitake | plant | 2 | 1 | — | — | área |
| Silence Whisper | plant | 2 | 1 | — | 1 | cura grande, apoyo |
| Sprout | plant | 2 | — | — | 1 | apoyo |
| Strawberry Shortcake | plant | 3 | 1 | — | 1 | cura grande, apoyo |
| Tropical Guardian | plant | 2 | — | — | 1 | apoyo |
| Watering Can | plant | 2 | — | — | 1 | apoyo |
| Blue Moon | aquatic | 2 | 1 | 1 | — | da PA/PM |
| Bubblemaker | aquatic | 2 | — | — | 1 | apoyo |
| Clear | aquatic | 1 | 1 | 1 | — | da PA/PM |
| Goldfish | aquatic | 2 | 1 | 1 | — | da PA/PM |
| Little Crab | aquatic | 2 | 2 | 1 | — | daño alto |
| Navaga | aquatic | 2 | 2 | 1 | — | daño alto |
| Nimo | aquatic | 1 | 1 | 1 | — | da PA/PM |
| Nimo | aquatic | 2 | 1 | 1 | — | da PA/PM |
| Risky Fish | aquatic | 2 | 2 | 1 | — | daño alto |
| Sponge | aquatic | 2 | — | — | 1 | apoyo |
| Teal Shell | aquatic | 2 | — | — | 1 | apoyo |
| Tiny Fan | aquatic | 1 | 1 | 1 | — | da PA/PM |
| Balloon | bird | 2 | 2 | — | 1 | control |
| Big Sister | bird | 1 | 1 | 1 | — | da PA/PM |
| Doubletalk | bird | 2 | 2 | — | 1 | control |
| Early Bird | bird | 2 | 1 | 1 | — | da PA/PM |
| Eggshell | bird | 2 | 2 | 1 | — | daño alto |
| Feather Dagger | bird | 1 | 2 | 1 | 2 | daño alto, 1 PA |
| Granma's Fan | bird | 2 | 1 | — | — | área |
| Lil Bro | bird | 2 | 1 | 1 | — | da PA/PM |
| Lucas | bird | 1 | 1 | 1 | — | da PA/PM |
| Mavis | bird | 1 | 1 | 1 | — | da PA/PM |
| Passion | bird | 1 | 1 | 1 | — | da PA/PM |
| Pink Cheek | bird | 1 | 1 | 1 | — | da PA/PM |
| Post Fight | bird | 2 | 2 | 1 | — | daño alto |
| Risky Bird | bird | 2 | 2 | 1 | — | daño alto |
| Rubber Duckling | bird | 2 | 1 | 1 | 1 | da PA/PM, apoyo |
| Swallow | bird | 2 | 2 | 1 | — | daño alto |
| Tri Feather | bird | 2 | 1 | — | — | área |
| Antenna | bug | 1 | 1 | 1 | — | da PA/PM |
| Bookworm | bug | 1 | 1 | 1 | — | da PA/PM |
| Brimstone | bug | 1 | 1 | 1 | — | da PA/PM |
| Buzz Buzz | bug | 2 | 1 | — | — | área |
| Caterpillars | bug | 2 | 2 | — | 1 | control |
| Centipede | bug | 1 | — | — | 2 | 1 PA |
| Cute Bunny | bug | 2 | 2 | — | 1 | control |
| Earwing | bug | 2 | 1 | — | — | área |
| Fish Snack | bug | 2 | — | — | 1 | apoyo |
| Gravel Ant | bug | 2 | — | — | 1 | apoyo |
| Ladybug Goggles | bug | 3 | 1 | 1 | — | da PA/PM |
| Larva | bug | 1 | 1 | 1 | — | da PA/PM |
| Leaf Bug | bug | 2 | 1 | 1 | — | da PA/PM |
| Leaf Bug | bug | 2 | 1 | — | 1 | cura grande, apoyo |
| Nerdy | bug | 1 | 1 | 1 | — | da PA/PM |
| Pacu | bug | 1 | — | — | 2 | 1 PA |
| Pupae | bug | 2 | — | — | 1 | apoyo |
| Sandal | bug | 3 | 2 | — | 1 | control |
| Snail Shell | bug | 2 | — | — | 1 | apoyo |
| Square Teeth | bug | 1 | — | — | 2 | 1 PA |
| Bone Sail | reptile | 2 | — | — | 1 | apoyo |
| Croc | reptile | 2 | — | — | 1 | apoyo |
| Curved Spine | reptile | 2 | — | — | 1 | apoyo |
| Green Thorns | reptile | 2 | 1 | — | — | área |
| Indian Star | reptile | 2 | — | — | 1 | apoyo |
| Red Ear | reptile | 2 | — | — | 1 | apoyo |
| Scaly Spoon | reptile | 2 | — | — | 1 | apoyo |
| Scar | reptile | 1 | 1 | 1 | — | da PA/PM |
| Tiny Dino | reptile | 2 | 1 | — | 1 | cura grande, apoyo |
| Tiny Turtle | reptile | 2 | 2 | — | 1 | control |
| Tri Spikes | reptile | 2 | 2 | 1 | — | daño alto |
| Tricky | reptile | 2 | — | — | 1 | apoyo |

