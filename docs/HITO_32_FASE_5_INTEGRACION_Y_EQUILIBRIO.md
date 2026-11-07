# Hito 32 — Fase 5: integración y equilibrio

> **Nota (7-nov-2026):** las clases del Sapidae que se nombran aquí son las anteriores al Hito 95. Hoy son Alfarero de Gólems (`crafter`), Comandante de Sombrero (`shepard`), Guardián de Campanas (`lunalogist`) y Rastreador Gogo (`stargazer`); los ids internos no cambiaron. Ver `HITO_95_GOLEMS_Y_CLASES_SAPIDAE.md`.

La Fase 5 conecta el motor nuevo (efectos por datos, estados y triángulo de clases) con todo lo que ve y hace el jugador: el pronóstico de daño, los enemigos, el tutorial y una primera pasada de equilibrio.

## 1. Pronóstico de daño

- **`src/tactics/combat/Forecast.js`**: `forecast(sm, caster, spell, cell)` calcula el resultado de una carta sobre una casilla **sin efectos secundarios**: no tira dados y no toca ninguna unidad. Usa las mismas reglas que el combate:
  - la tirada mínima y máxima;
  - el nivel de la habilidad y el bonus plano del lanzador;
  - los bonus condicionales de la carta;
  - el triángulo de clases (×1,15 / ×0,85);
  - los estados (Frágil, Débil, Potenciado, Protegido…);
  - la barrera, el escudo y el escudo roto.
- **`src/ui/ForecastPanel.js`**: dibuja el pronóstico en la tarjeta de pronóstico del HUD, con estas filas:
  - el rango de daño y el número de golpes;
  - la ventaja o desventaja de clase;
  - lo que absorben la barrera y el escudo;
  - la probabilidad de crítico y el daño máximo con crítico;
  - «💀 Golpe letal» o «Puede derrotarlo con un crítico»;
  - la curación, el escudo y los estados que aplica;
  - el resto de unidades del área y un aviso si golpea a aliados.
- Se comprobó con 280 tiradas (mínima y máxima de todas las cartas de daño): el pronóstico coincide con el daño real al punto.

## 2. Enemigos con estados e IA nueva

**`src/tactics/data/EnemySpellEffects.js`** pasa 19 hechizos enemigos al motor de efectos. El daño es el mismo que antes; a cada uno se le añade un estado temático:

| Estado | Hechizos |
| --- | --- |
| Veneno (8 × 2 turnos) | Escupitajos de quimera y slimes |
| Provocación al lanzador (2 turnos) | Rugidos y bramidos de lobos, quimera y jefe hombre lobo |
| Ralentizado | Nova glacial y baba |
| Sangrado (12) | Espinas, zarpazo de dríade y mordisco del jefe |
| Quemadura (20) | Cataclismos |
| Débil | Nova floral del treant |
| Frágil | Estallido de la dríade maga |
| Escudo y Protegido | Barrera del slime |
| Curación con limpieza de un perjuicio | Curación de chamanes y dríade maga |

**`TacticalAI.pickAttack`** elige la carta y el objetivo con el pronóstico. Puntúa así:

- daño medio a la vida;
- +60 si el golpe es letal;
- +12 por cada perjuicio nuevo;
- −30 por cada aliado propio alcanzado;
- un poco de eficiencia por PA y la prioridad del objetivo (herido, cercano o con provocación).

**`_trySupport`**: los enemigos con escudos o protecciones los usan sobre un aliado herido antes de atacar.

## 3. Correcciones de combate

- **PA infinitos**: las cartas de «tempo» se pueden usar **1 vez por turno**. Son 44, entre ellas Clear, Mavis y Pink Cheek. Cuentan como tempo las que dan PA o PM al propio equipo o aplican Energizado. El HUD las marca como «Ya la usaste este turno».
- **Unidades superpuestas**: dos unidades podían acabar en la misma casilla, lo que bloqueaba el combate hasta 60 rondas. La causa era un «fin de turno» que dejaba seguir dando órdenes durante la transición. Ahora:
  - `TurnManager.turnEnding` bloquea las órdenes mientras se pasa el turno;
  - el turno no pasa mientras la unidad sigue caminando;
  - `SpellManager.syncOccupancy()` repara las referencias de las casillas al empezar cada turno;
  - `Unit.moveAlongPath` nunca termina encima de otra unidad viva.

## 4. Tutorial

- El slime del tutorial pasa de 50 a 36 HP. Así cae siempre con la habilidad 1 de cualquiera de las 4 clases de Sapidae (golpe mínimo 38).
- La ayuda (botón ⓘ del HUD de combate) explica las habilidades 1–6, la Ultimate dúo (7), los estados, el triángulo de clases y el pronóstico.
- Se probó el tutorial completo en el navegador, sin errores.

## 5. Primera pasada de equilibrio

Un script de medición (`balance.mjs`, en el entorno de pruebas, fuera del repositorio) calcula el valor por PA de las 235 cartas: daño, curación, escudo y estados, con escenarios realistas. Se corrigieron las cartas que se salían de la curva:

| Cambio | Cartas |
| --- | --- |
| Coste 2 PA | Yam, Termite, Rosa, Cottontail, Rubber Duckling, Nimo (cola), Baby |
| Coste 1 PA | Lump, Cuckoo; Mavis, Brimstone y Mystery Seed (+2 PA) |
| Pink Cheek | +1 PM |
| Veneno 24 → 16 | Small Frill, Death Shroom |
| Ranchu | 36–44, Débil 1 turno |
| Teal Shell | Escudo 60 |

Tras la pasada, el valor por PA queda así: mediana 35, p10 21, p90 52.

### Campaña simulada

Un bot jugó la campaña en el navegador con héroes de nivel 1, 2 partidas por nivel. Elegía sus ataques con el pronóstico, curaba a los aliados por debajo del 45 % de vida y, si no podía atacar, avanzaba.

| Nivel | Resultado | Vida restante |
| --- | --- | --- |
| 2–4 | Victoria en 1–2 rondas | 80–100 % |
| 5–7 | Victoria en 2 rondas | 84–97 % |
| 8–9 | Victoria en 3 rondas | 85–93 % |
| 10 (jefe final) | Una derrota (8 rondas) y una victoria (6 rondas) | 0 % y 31 % |

En las primeras pruebas el nivel 5 parecía más difícil que el 6 y el 7. Era el error de turnos del apartado 3, no el nivel. El salto del jefe final se deja así a propósito, a la espera de partidas reales con héroes de más nivel.

### Primeras partidas reales (17-oct-2026)

Partida del dueño del proyecto: 12 combates, 11 victorias y 1 derrota, con la clase Stargazer. Hallazgos (las propuestas de dificultad y de Stargazer ya están aplicadas; ver «Segunda pasada» más abajo):

| Hallazgo | Datos | Propuesta pendiente |
| --- | --- | --- |
| Encuentros del mundo abierto demasiado fáciles y salto brusco en Genesis | 11 victorias en 1–2 rondas con 87–100 % de vida. Derrota en «Pack of bear-mom»: 4.116 de vida enemiga frente a 882 del combate anterior (Ártico). En `BiomeEnemyCatalog.js`, del Ártico a Genesis la vida pasa de ×2,1 a ×4,2 y el daño extra de +36 a +80 por golpe. | Mística ×2,6 / +45 y Genesis ×3,3 / +60. Subir un poco los «Feral Encounter» de las primeras islas. |
| El Axie principal hace casi todo el daño | Early Bird: entre el 51 % y el 100 % del daño en cada combate. Little Owl, Early Bird y The Last One rinden unos 50 por PA. | No tocarlo (es el Axie real del jugador); subir al Sapidae. |
| Stargazer se queda corto | Vórtice 19 por PA, Nova 18, Eclipse 31. En 5 de 12 combates no hizo daño. | +20–25 % de daño a Vórtice Gravitacional y Nova Estelar. |
| Shiba (cola de Bing) es la carta más fuerte | Unos 208 por uso y 69 por PA, pero solo 4 usos. | Vigilarla en las próximas partidas. |
| Sin datos de las otras clases | Solo se jugó Stargazer. | Jugar con Forjacubiles, Lunalogista y Astromante. |

### Segunda pasada (aplicada el 17-oct-2026)

| Cambio | Antes | Ahora | Archivo |
| --- | --- | --- | --- |
| Escala de la isla Mística | vida ×3,0, daño +55, escudo +110 | ×2,6, +45, +95 | `rpg/world/BiomeEnemyCatalog.js` |
| Escala de Genesis | vida ×4,2, daño +80, escudo +160 | ×3,3, +60, +125 | `rpg/world/BiomeEnemyCatalog.js` |
| Encuentros fijos de misión de las primeras islas (emboscada de Bing, bandidos del cartero, guardián de Rosalba, Quimera Picuda, combate de Pomodoro, quimera del oráculo) | — | vida ×1,25–1,35, escudo +10, daño +5–6 | `tactics/DynamicCombatFactory.js` |
| Vórtice Gravitacional (Stargazer) | 40–52 | 49–63 (+22 %) | `tactics/Spells.js`, `rpg/SaveSlotManager.js` |
| Nova Estelar (Stargazer) | 45–58 | 55–71 (+22 %) | `tactics/Spells.js`, `rpg/SaveSlotManager.js` |

Con la nueva escala, la manada de la osa que acabó con el equipo baja de 4.116 a unos 3.230 de vida total. El escudo de las islas altas también se rebajó en proporción, porque sumaba mucha vida efectiva. Pruebas: fases 2 y 5 en verde. La regresión solo cambia en los hechizos ajustados.

El registro contaba el daño sobrante del golpe que remata (la osa aparecía con 2.045 de daño recibido sobre 1.680 de vida). Ya está corregido: el golpe final solo cuenta la vida que le quedaba al objetivo.

### Registro de tus partidas (`src/tactics/combat/CombatTelemetry.js`)

Cada combate que juegas queda anotado en el navegador (últimos 60): resultado, rondas, vida restante y, por carta, usos, PA, daño, curación, escudo y estados. En la consola (F12):

| Comando | Qué hace |
| --- | --- |
| `lkDebug.balance()` | Tabla de tus cartas: usos, daño por uso y valor por PA |
| `lkDebug.balance('enemy')` | La misma tabla para las cartas de los enemigos |
| `lkDebug.balanceFights()` | Tabla de combates |
| `lkDebug.balanceExport()` | Descarga el registro en JSON para la siguiente pasada de equilibrio |
| `lkDebug.balanceReset()` | Borra el registro |

## Pruebas

- `phase5.mjs` (entorno de pruebas, fuera del repositorio): 30 comprobaciones que cubren:
  - el pronóstico frente al daño real, sin efectos secundarios;
  - los estados de los enemigos y la IA;
  - el límite de 1 uso por turno;
  - la ocupación de casillas y la transición de turno;
  - el tutorial, los ajustes de equilibrio y el registro de partidas.
- Fases 0–4 y Axie Care: todo OK.
- Regresión de 118 escenarios: 0 diferencias fuera de los 19 hechizos enemigos que cambian a propósito.
- Navegador:
  - tutorial completo;
  - tarjeta de pronóstico en combate;
  - campaña completa con el bot, sin unidades superpuestas ni errores de JavaScript.

## Notas para la versión de prueba

- **Id interno de la ranura del Axie principal:** `kotaro`, heredado del prototipo, cuando el héroe del jugador era un personaje fijo con ese nombre. En pantalla se ve el nombre real del Axie (por ejemplo, «Early Bird»), pero el registro de equilibrio y las partidas guardadas usan el id. No hay que confundirlo con el NPC Kotaro (guardián de la puerta del santuario de Genesis) ni con las cartas oficiales Kotaro (ojos Bug y boca Reptile). Se decidió no renombrarlo por ahora.
- **Siguiente fase del plan:** conectar el motor de VFX propio a los eventos de combate (`CombatEvents.js`); después, runas y amuletos.
