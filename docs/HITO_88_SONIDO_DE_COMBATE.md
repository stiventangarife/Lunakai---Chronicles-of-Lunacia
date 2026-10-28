# Hito 88: Sonido de combate por clase y peso (fase 3 del plan de sonido)

> **Estado:** en la versión de prueba (27-oct-2026), pendiente de probarlo en un combate.
> **Pedido:** fase 3 del plan de sonido: que cada golpe suene según quién golpea (su clase) y cuánto pesa la carta (su coste en PA), y dar sonido a lo que no tenía: escudos, estados, caídas, Ultimate, reloj del turno y vida baja.

## 1. Antes

- Los golpes **no sonaban** al llegar: `unit:damaged` solo daba texto y sacudida de cámara.
- Al lanzar sonaba uno de 6 sonidos fijos (`playAttackMelee`, `playShootBow`…), igual para todas las clases.
- No sonaban los escudos, los estados (veneno, aturdir…) ni la Ultimate.
- Al moverse por el tablero sonaba un «bip».

## 2. Ahora (`src/audio/CombatSfx.js`, nuevo)

Escucha el bus `CombatEvents`. Lo instala `SpellPresentation`, así que con `lkDebug.presentation(false)` también se apaga.

**Peso de la carta:** 1 PA ligero · 2 PA medio · 3+ PA o Ultimate pesado. El peso cambia el volumen y el grave, y los pesados llevan además un golpe sordo (sin subgraves, desde 130 Hz).

| Momento | Sonido |
|---|---|
| Ataque cuerpo a cuerpo que sale | Barrido de aire ligero o pesado. El Axie suelta un grito corto (solo con grabación). |
| Golpe que llega | Por la clase de quien golpea (ver tabla siguiente). |
| Crítico | Remate con brillo metálico encima del golpe. |
| Escudo que para el golpe | «Tink» metálico. |
| Escudo que se rompe | Cristal que se quiebra. |
| Escudo nuevo | Subida suave con brillo. |
| Curación | Acorde ascendente. |
| Potenciar | El sonido de siempre o la grabación. |
| Debilitar | Dos notas que bajan. |
| Aturdir o dormir | Campanitas que giran. |
| Veneno o sangrado por turno | Burbujeo. |
| Quemadura por turno | Siseo. |
| Unidad que cae | Enemiga: quejido simpático. Aliada: dos notas tristes. |
| Ultimate lista | Subida mágica y arpegio. |
| Ultimate lanzada | Golpe grande con cola. |
| Aterrizaje de un salto | Golpe blando. |
| Últimos 5 s del turno | Un tic por segundo, más agudo en los 2 últimos. |
| Aliado por debajo del 25 % de vida | Latido suave hasta que se cure, caiga o acabe el combate. |
| Moverse por el tablero | Pasos con el suelo de la isla del combate (tus grabaciones). |

| Clase de quien golpea | Golpe sintetizado | Grabación |
|---|---|---|
| Bestia | Golpe sordo, carnoso | `combat/hit_beast_N` |
| Planta | Latigazo vegetal y crujido | `combat/hit_plant_N` |
| Acuático | Salpicadura con golpe | `combat/hit_aquatic_N` |
| Pájaro | Barrido rápido con toque | `combat/hit_bird_N` |
| Bicho (y Mech) | Chasquido quitinoso | `combat/hit_bug_N` |
| Reptil (y Dusk) | Mordisco con siseo | `combat/hit_reptile_N` |
| Sapidae | Impacto mágico | `combat/hit_magic_N` |

Las cartas a distancia, el empuje y la explosión siguen con su sonido de lanzamiento de siempre, y al llegar suenan por la clase. En golpes de área solo suena un golpe cada 50 ms, para no amontonar capas.

## 3. Archivos

| Archivo | Cambio |
|---|---|
| `src/audio/CombatSfx.js` | **Nuevo.** Golpes por clase y peso, efectos, latido, reloj y pasos del tablero. Consola `lunakaiCombatSfx`. |
| `src/tactics/TacticalAudio.js` | `this.combat = new CombatSfx(this)`. |
| `src/tactics/combat/SpellPresentation.js` | Instala `CombatSfx` en el bus; al lanzar usa `combat.cast` (si no aplica, el sonido de siempre). |
| `src/tactics/Unit.js` | Sonido de caída en `die()` y `dieCinematic()`; pasos del tablero con el suelo de la isla. |
| `src/ui/TurnTimerHUD.js` | Tic del reloj en los últimos 5 s. |
| `src/audio/SfxBank.js` | Familias de grabaciones del combate (`combat/…`, `steps/land_soft`, `creatures/axie_attack`, `creatures/axie_hurt`). |
| `src/tactics/combat/CombatDebug.js` | `lkDebug.sfx('golpes')` y `lkDebug.sfx('combate')`. |

## 4. Consola

| Comando | Qué hace |
|---|---|
| `lkDebug.sfx('golpes')` | Las 7 clases con sus 3 pesos (barrido + golpe) |
| `lkDebug.sfx('combate')` | Crítico, escudos, curación, estados, caídas, Ultimate, aterrizaje y reloj |

## 5. Comprobado

**Navegador (Chromium), con la salida grabada:**
- golpes y efectos suenan sin errores; las muestras se entregan al usuario;
- picos de −20 dBFS con «Efectos» al 100 %, al nivel de los sonidos de combate anteriores.

**Bus de eventos simulado:**
- daño con crítico › golpe; escudo que absorbe todo › bloqueo y rotura; daño de estado sin sonido de golpe;
- curación, escudo, aturdir, potenciar, veneno, Ultimate lista y usada, y aterrizaje suenan cada uno;
- el latido empieza con un aliado al 20 % de vida y se para al curarlo por encima del 25 %.

## 6. Pendiente

- Probarlo en combates con distintas clases, para escuchar la mezcla con la música y las Ultimate.
- Las grabaciones del combate (lista en `AUDIO_ARCHIVOS_A_CONSEGUIR.md`, apartado 3) sustituyen a la síntesis en cuanto estén en `assets/sounds/sfx/combat/`.
