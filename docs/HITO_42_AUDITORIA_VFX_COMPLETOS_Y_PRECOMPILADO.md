# Hito 42 — Auditoría del core loop, todos los VFX en combate y sin tirón en el primer lanzamiento

> **Estado:** completado (19 y 20-oct-2026).
> **Resumen:** auditoría de VFX y 10 pruebas automáticas del core loop; ahora tienen efecto todas las cartas, Bing, Pomodoro y los 61 ataques de enemigos; se arregló el tirón del primer lanzamiento y el error de los retratos; se cambió la Beaked Alpha Chimera; el orden de turnos se fija al empezar el combate. Se probó un estilo «toon» para los VFX y se descartó.
> **Actualización (Hito 49, 22-oct):** el precompilado de los VFX ya no usa `renderer.compileAsync` (con un material destruido no terminaba nunca y llenaba la consola de avisos «glGetProgramiv»); ahora espera con `waitProgramsReady` de `src/render/RenderWarmup.js`. Además, `src/render/ProgramKeepAlive.js` conserva los shaders de los materiales que los efectos destruyen al terminar, y `_prewarmBattle` dibuja un fotograma completo detrás del velo. Ver `HITO_49_OPTIMIZACION_DE_RENDIMIENTO.md`.

## 1. Auditoría (19-oct)

### 1.1 VFX de todas las habilidades

Prueba automática (`_test/vfxaudit.html`): carga todos los módulos, construye cada efecto y lo dibuja en tres instantes.

| Grupo | Antes de la auditoría | Ahora |
| --- | --- | --- |
| Cartas de partes | 235 con efecto, pero en combate solo las 24 de la lista piloto | **235/235** |
| Cartas de colección (Japan/Xmas) | 30 con efecto, solo la lista piloto en combate | **30/30** |
| Sapidae | 24/24 | 24/24 |
| Ultimates de dúo | 3/3 | 3/3 |
| Cartas de Bing y Pomodoro | 7/12 | **12/12** |
| Enemigos | 0/61 | **61/61** |
| Lista antigua (héroes/tutorial) | 0/25 | 0/25 (ver Pendiente) |

**Resultado final:** 328 efectos probados, 0 fallos de construcción o de dibujo, 49 módulos.

### 1.2 Core loop: 10 pruebas automáticas

En el juego real (navegador integrado, `http://localhost:8082`):

- 6 victorias, 3 derrotas (2 de ellas naturales, sin forzar) y una recarga en mitad del juego.
- La recarga restaura la vida guardada: exactamente 50 HP recuperados por la regeneración del mundo abierto.
- **Sin errores críticos.**
- **Falsas alarmas descartadas:**
  - las unidades que parecían apiladas solo estaban atravesando la casilla de un aliado mientras caminaban (`isMoving`); nunca se quedan apiladas al pararse;
  - los fallos que aparecieron eran del propio script de prueba, no del juego.

## 2. VFX: todas las cartas en combate

- **Antes:** `VfxBridge` solo reproducía las 24 cartas de la lista piloto (Hito 34). El resto de cartas de partes y de colección tenía efecto, pero no se veía en combate.
- **Ahora:** `this.allCards = true` por defecto.
- `lkDebug.vfxAll(false)` vuelve a la lista piloto (`VFX_PILOT_CARDS`); solo sirve para comparar o aislar un problema.
- Comprobado en combate real con Anemone (`qeAnemone`), sin errores.
- Archivo: `src/vfx/VfxBridge.js`.

## 3. VFX nuevos: Bing, Pomodoro y enemigos (equipo de arte)

Hechos a partir de la lista [`VFX_PENDIENTES_BING_POMODORO_ENEMIGOS.md`](VFX_PENDIENTES_BING_POMODORO_ENEMIGOS.md).

### 3.1 Archivos de módulos

| Módulo | Contenido |
| --- | --- |
| `mod-starter-bing.js`, `mod-starter-pomodoro.js` | Efectos propios de Puppy (boca), Toy Ball, Cone Shell, Lost Dream y Village Hero |
| `mod-basicos-cuerpo.js` | 7 fábricas reutilizables `VFX.basic.*` de cuerpo a cuerpo: MORDISCO, ZARPAZO, GOLPE, EMBESTIDA, ESTOCADA, GOLPE_SISMICO, GIRO_EMPUJE |
| `mod-basicos-distancia.js` | 7 fábricas a distancia: ESCUPITAJO, BABA_PEGAJOSA, FLECHA, PROYECTIL_MAGICO, RAFAGA, NOVA_CRUZ, CATACLISMO |
| `mod-basicos-apoyo.js` | 7 fábricas de apoyo y control: ESPINAS, ENREDO, NUBE_ESPORAS, RUGIDO, AUTOBUFF, ESCUDO, CURA |
| `mod-enemigos.js` | Las 61 habilidades de enemigos como instancias de esas fábricas: id, tipo, paleta y opciones |

### 3.2 Cambios en el resto del motor

- **Paletas nuevas** en `vfx-lib.js`: Salvaje, Tierra, Hielo, Baba, Agua, Naturaleza, Polen, Esporas, Madera y Roca.
- **`vfx-modules.js`:**
  - los módulos nuevos van en la lista de carga;
  - `enemigos` carga antes, por sí solo, los tres `basicos-*` (`VFX_MODULE_DEPS`).
- **`VfxBridge.js`:**
  - `STARTER_VFX` lleva las 5 cartas α;
  - `ENEMY_VFX` lleva los 61 ids de enemigos;
  - `specialVfx` los resuelve siempre, igual que el Sapidae y las ultimates.
- **Revisado:** las 61 de `ENEMY_VFX` coinciden exactamente con las de `mod-enemigos.js`, sin repetidas ni sobrantes.

## 4. Sin tirón en el primer lanzamiento (precompilado de shaders)

- **Síntoma:** la primera vez que se lanzaba cada habilidad, el juego se congelaba un instante.
- **Causa:** `prepare()` ya precompilaba los shaders al empezar el combate, pero en condiciones distintas a las del render real:
  - contra el grupo de VFX en vez de la escena, sin sus luces, sin niebla y sin sombras;
  - sin el render target del `EffectComposer`, así que con tone mapping y en sRGB, cuando el render real va sin tone mapping y en espacio lineal.
  
  La clave de programa de three no coincidía y cada efecto volvía a compilar de 6 a 17 shaders al lanzarse.
- **Ahora** (`VfxBridge._precompile`):
  - compila cada efecto con la escena real como `targetScene`, con `composer.readBuffer` como render target;
  - incluye el brillo, el velo oscuro y el destello blanco;
  - la primera vez recompila también la escena, porque la luz del núcleo de VFX cambia el número de luces;
  - sube las texturas a la GPU (`initTexture`);
  - fuerza el enlazado de cada programa, un objeto por fotograma, para que no caiga en el fotograma del lanzamiento;
  - usa `compileAsync` solo si existe `KHR_parallel_shader_compile`, para no llenar la consola de avisos.
- **Medido** (`_test/vfxwarm.html`, renderizado por software):

  | | Antes | Ahora |
  | --- | --- | --- |
  | Shaders compilados en el primer lanzamiento | 6–17 | 0 |
  | Peor fotograma del primer lanzamiento | 260–1076 ms | 1–12 ms (igual que el segundo) |

- **Coste:** el combate puede tardar un poco más en arrancar, porque el trabajo pasa a la preparación.

## 5. Error de los retratos en el HUD

- **Síntoma:** errores en consola con Axies cargados por ID.
- **Causa:** el selector `.lk-party-med[data-hero-id="…"]` se construía con el id sin escapar.
- **Ahora:** se escapa con `CSS.escape` y, si no existe, escapando comillas y barras.
- Comprobado en el juego: 0 errores de retrato.
- Archivo: `src/rpg/ui/SquadHUD.js` (`_boundPortraitListener`).

## 6. Beaked Alpha Chimera (sub-jefe de la sabana)

- **Antes:** en combate salía como una primitiva. Usaba el tipo `bird-early`, que es un Axie del jugador sin modelo de enemigo, y tres habilidades antiguas sin VFX (`bird_cupid`, `bird_owl`, `bird_aerial_jump`).
- **Ahora:** es el alfa de la manada de lobos acuáticos, con el modelo `wolf-aquatic-alpha` y el tinte ámbar. Usa Tidal Bite y Ancestral Roar, que ya tienen VFX.
- **Más fuerte, como corresponde a un sub-jefe:**

  | | Antes | Ahora |
  | --- | --- | --- |
  | Vida | 260 | 330 |
  | PA / PM | 6 / 4 | 7 / 4 |
  | Iniciativa | 80 | 85 |
  | Escudo inicial | 50 | 70 |
  | Daño extra | +6 | +10 |
  | Tamaño | 1,55 | 1,7 |
  | EXP | 140 | 180 |

- Queda por encima de la Armored Chimera y algo por debajo de la Arcane Sapidae Chimera.
- Archivo: `src/tactics/DynamicCombatFactory.js` (`mob_beaked_chimera`).
- **Sin cambiar:** el marcador del mapa abierto sigue siendo un lobo acuático en ámbar (`WanderingMonsters.js`).

## 7. Orden de turnos fijo durante el combate

Amplía el Hito 38, sección 2.

- El orden alternado (jugador, enemigo, jugador…) se calcula **una sola vez al empezar el combate** y se mantiene en todas las rondas.
- Quien cae solo sale de la lista: el resto no cambia de puesto.
- Las unidades que aparecen a mitad de combate van al final, con su propio orden.
- Archivo: `src/tactics/TurnManager.js`:
  - `_computeOrder(units)`;
  - `buildInitiativeQueue({ reset })` guarda `turnOrder` y solo lo recalcula con `reset: true`, en `setUnits` y `startCombat`.

## 8. Prueba de estilo «toon» para los VFX (descartada)

- **Qué se probó:** MORDISCO y ESCUDO con mezcla normal en vez de aditiva, color plano con contorno oscuro, formas de cómic, desaparición por erosión, congelado en el golpe y sin velo oscuro.
- **Decisión:** el equipo prefiere los VFX actuales. Se quitó del motor (`VfxBridge.js` y `vfx-modules.js` vuelven a su estado anterior, salvo el precompilado de la sección 4).
- **Queda por borrar a mano:** `src/vfx/modules/mod-toon-piloto.js`. Ya no se carga.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/vfx/VfxBridge.js` | Todas las cartas, `STARTER_VFX`/`ENEMY_VFX` (del equipo), `_precompile` |
| `src/vfx/vfx-modules.js`, `src/vfx/vfx-lib.js`, `src/vfx/modules/mod-starter-*.js`, `mod-basicos-*.js`, `mod-enemigos.js` | VFX nuevos (equipo de arte) |
| `src/rpg/ui/SquadHUD.js` | Selector de retrato escapado |
| `src/tactics/DynamicCombatFactory.js` | Beaked Alpha Chimera |
| `src/tactics/TurnManager.js` | Orden de turnos fijo |
| `docs/VFX_PENDIENTES_BING_POMODORO_ENEMIGOS.md` | Lista entregada al motor (ya completada) |

## Pendiente

- **Habilidades antiguas sin VFX que se siguen usando:**
  - `kibo_cataclysm`, en un nivel de `LevelsDatabase.js`;
  - las del Kotaro, el pájaro y la planta antiguos y las de Bing y Pomodoro antiguas, que siguen en `SaveSlotManager.js`, `InventoryModal.js` y `SpellPresentation.js`.
  
  Darles efecto o cambiarlas por habilidades que ya lo tienen.
- **Aullido Alfa** (`wolf_alpha_howl`, +1 PA y +1 PM): tiene VFX, pero ningún enemigo la usa. Hay que comprobar que la IA lanza bien este tipo de mejora antes de dársela a un sub-jefe.
- Comprobar en una PC con GPU real que el primer lanzamiento de cada habilidad ya no se traba.
- Borrar la aventura de prueba «Auditoria» del navegador integrado.
