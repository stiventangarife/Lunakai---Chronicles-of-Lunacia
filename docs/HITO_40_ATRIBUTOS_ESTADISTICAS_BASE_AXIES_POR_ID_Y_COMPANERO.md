# Hito 40 — Atributos, estadísticas base por clase y rol, fichas de daño, Axies por ID y cambio de compañero

> **Nota (7-nov-2026):** las clases del Sapidae que se nombran aquí son las anteriores al Hito 95. Hoy son Alfarero de Gólems (`crafter`), Comandante de Sombrero (`shepard`), Guardián de Campanas (`lunalogist`) y Rastreador Gogo (`stargazer`); los ids internos no cambiaron. Ver `HITO_95_GOLEMS_Y_CLASES_SAPIDAE.md`.

> **Estado:** completado en la versión de prueba (19-oct-2026).
> **Pedido:** revisar y mejorar los puntos encontrados al jugar. Solo se cambió lo pedido.

## 1. Atributos en las habilidades

| Atributo | Axies | Sapidae Forjador y Pastor | Sapidae Lunalogista y Astromante |
| --- | --- | --- | --- |
| Vitalidad | +1 vida | +1 vida | +1 vida |
| Ferocidad | +1,5 daño a 1 casilla · +1 colisión | +1,5 daño a 1 casilla · +1 colisión | +1 colisión |
| Agilidad | +1,2 daño a 2+ casillas · +0,5 % crítico | +1,2 daño a 2+ casillas · +0,5 % crítico | +0,5 % crítico |
| Esencia | +2 % apoyo (curas y escudos) | +2 % apoyo | **+1,2 daño de sus hechizos** · +2 % apoyo |

**Errores corregidos:**
- **Crítico doble:** la ficha decía 20 % de base, pero el combate sumaba otro 20 % (40 % real). Ahora es 20 % + Agilidad. Las unidades sin dato, como los enemigos, siguen con el 20 %.
- **Crítico de la Agilidad:** se redondeaba hacia abajo y 1 punto daba 0 %. Ahora cada punto da +0,5 %.
- **Sapidae sin daño de atributos:** sus hechizos solo sumaban el daño del equipo. Ahora:
  - Forjador y Pastor usan la Ferocidad o la Agilidad según la distancia;
  - Lunalogista y Astromante usan la Esencia.
- **Apoyo del Sapidae:** era un 25 % fijo que tapaba la Esencia hasta los 13 puntos. Ahora es 25 % + 2 % por punto de Esencia.
- **La Mochila** explica cada atributo según el héroe y muestra el crítico con décimas (21,5 %).

Archivos: `EquipmentManager.js`, `Spells.js` (`_flatDamageBonus`), `EffectResolver.js`, `Forecast.js`, `main.js` e `InventoryModal.js`.

## 2. Estadísticas base por clase y rol

- **PA y PM iguales para todos** los héroes, Sapidaes incluidos: **6 PA y 3 PM**. El equipo puede sumar más.
  - Antes, Bing y Early Bird tenían 4 PM.
  - Los enemigos no cambian.
- **Axies:** la vida y la iniciativa salen de su **clase**, ajustadas por su **rol**. El rol se calcula a partir de sus 6 cartas de partes (`src/tactics/data/AxieBaseStats.js`).
- **Sapidaes:** siguen con la vida y la iniciativa de su clase.

| Clase | Vida | Iniciativa |
| --- | --- | --- |
| Bestia | 300 | 95 |
| Pájaro | 260 | 115 |
| Planta | 340 | 80 |
| Acuático | 280 | 105 |
| Reptil | 320 | 85 |
| Bicho | 290 | 95 |
| Mech | 310 | 90 |
| Dawn / Dusk | 290 | 100 |

| Rol | Cuándo | Vida | Iniciativa |
| --- | --- | --- | --- |
| Defensor | 2+ cartas de escudo | +40 | −10 |
| Apoyo | 2+ cartas de curación o sobre aliados | 0 | +5 |
| Tirador | cartas de daño con alcance medio ≥ 2,5 | −20 | +10 |
| Luchador | 3+ cartas de daño de corto alcance | +20 | 0 |
| Equilibrado | el resto | 0 | 0 |

- **Ejemplos:** Bing es Bestia y Apoyo (300 de vida, 100 de iniciativa); Pomodoro es Bicho y Defensor (330 y 85).
- **La Mochila** muestra el rol junto a la clase.
- **Mientras no se conocen sus cartas de partes**, el rol es «Equilibrado».

## 3. Comida con el vínculo al 100 %

- No se puede dar de comer con el vínculo al 100 %, ni desde la Mochila ni desde Axie Care: la comida no se gasta.
- En la Mochila, el botón cambia a «Vínculo al 100 %» y está apagado. Si se intenta, sale el aviso «guarda la comida para más adelante».
- El aviso de comida muestra el vínculo con decimales (63,5 %).
- Archivos: `AxieCareService.js` e `InventoryModal.js`.

## 4. Potenciado y fichas de daño

**Cómo funciona Potenciado:**
- Sube el daño final un X % y se suma con otros porcentajes, como Frágil del objetivo o Débil del lanzador.
- No se acumula: se queda el mayor valor.
- El orden del cálculo es:
  1. tirada × nivel de habilidad;
  2. + bonus del atributo y bonus de la carta;
  3. × 1,5 si es crítico;
  4. × (1 + % de estados);
  5. × ventaja de clase.

**Fichas de las cartas en combate:**
- **El número de la carta** muestra el daño real del lanzador: nivel de habilidad, bonus de su atributo y estados activos.
  - En verde si sube y en rojo si baja (Débil).
  - Las curas y escudos incluyen el poder de apoyo.
- **La ficha flotante** añade el desglose, por ejemplo: «Carta 58–72 · Nv 2 ×1,2 · +15 atributos · Potenciado +20 %».
- Archivo: `src/ui/CombatHUD.js` (`spellNumbers`).

## 5. Probar Axies por su ID (partidas como invitado)

- En la creación de personaje, **Mis axies** abre un panel con el campo **ID del Axie** y el botón **Cargar**. Enter también sirve.
- **Al cargar:**
  - consulta el Axie a Sky Mavis (nombre, clase, genes y partes);
  - calcula sus 6 cartas de partes, también las de colección (Japan, Xmas…), con su efecto especial;
  - le pone la vida y la iniciativa de su clase y rol;
  - lo muestra en el diorama y lo deja como compañero.
- **Si no existe** o no hay conexión, lo dice en el panel.
- Solo para partidas como invitado. Con la cuenta de Sky Mavis, el panel sigue siendo la lista de tus Axies.
- Archivo: `src/rpg/ui/StartScreenUI.js` (`_ccOpenIdPicker`, `_ccLoadAxieById`).

## 6. Cola de los peces

La cola era un cono con la punta hacia fuera. Ahora la punta toca el cuerpo y la aleta se abre hacia atrás.
- Peces del lago y del estanque helados: `ArcticIce.js`.
- Peces de la fogata de Pomodoro y del puesto del Chef Boreal: `ArcticLandmarks.js`.
- Peces del pantano místico: `MysticLife.js`.

## 7. Cambio de Axie principal con humo

- **Antes:** al cambiar el Axie principal en el Escuadrón (K), el compañero del mundo abierto no cambiaba.
- **Ahora:**
  - el anterior se encoge y desaparece en una nubecita de humo;
  - el nuevo aparece en el mismo sitio con otra nubecita y un pequeño salto;
  - al cargar la partida, el compañero ya es el Axie principal.
- Bing y Pomodoro, que no tienen ID de Axie, usan su modelo 3D con sus animaciones de reposo y carrera.
- Archivos:
  - `src/rpg/PuffEffect.js` (nuevo);
  - `PlayerEntity.swapCompanion()`;
  - `OverworldManager._syncCompanionToSquad()`.

## 8. Bing y Pomodoro, solo de apoyo (19-oct)

- No se pueden poner como compañero principal: en el Escuadrón no tienen el botón «Hacer principal», y si se intenta (también arrastrando) sale un aviso.
- Las partidas guardadas con uno de ellos de principal se corrigen solas: pasa a principal otro Axie del escuadrón o de la colección, y el de apoyo baja a un puesto de apoyo.
- El Astromante también queda en 3 PM (su clase seguía definida con 4).
- Archivos: `EquipmentManager.js` (`SUPPORT_ONLY_AXIES`, `canBeMainAxie`, `getSquad`), `SquadModal.js` y `SaveSlotManager.js`.
- **Consola:** `lkDebug.axieParts(585)` muestra, parte por parte, qué devuelve Sky Mavis, qué dicen los genes y qué carta se asigna (para revisar las partes de colección y de nivel 2).

## 9. Modelo 3D sin algunas partes (Axie #585)

- **Lo que pasaba:** al montar el Axie, la librería del Axie Mixer busca cada parte en su catálogo (`assets/axie/manifest.json`) con la clave `S{skin}_{Clase}{variante}_L{nivel}_{Tipo}`. Si esa combinación de skin y nivel no existe, **descarta la parte sin avisar**.
  - En Merlin faltaban justo las 4 partes de nivel 2.
  - Los archivos 3D sí están en `assets/axie`: el catálogo solo tiene niveles 1 y 2.
  - Algunas skins solo existen en un nivel; por ejemplo, la boca Nightmare `S12_Beast04` solo está en nivel 2.
- **Ahora** (`AxieMixerService.fitAxieDescriptor`): antes de montar el Axie se comprueba cada parte. Si no existe, se usa la más cercana, en este orden:
  1. el nivel 2;
  2. el nivel 1;
  3. la skin normal (0).
- **Nivel de las partes:** los genes no guardan bien el nivel de las partes evolucionadas: el decodificador da nivel 1 en las 6 partes de Merlin. En cambio, Sky Mavis marca las de nivel 2 con «-2» al final del id. Ahora el modelo 3D toma el nivel de Sky Mavis (`AxieMixerService.applyApiStages`), así que las orejas, la boca, la espalda y la cola de Merlin usan sus modelos de nivel 2. Sin conexión, se usa el nivel de los genes.
- **Afecta a todos los Axies:** compañero, diorama de creación y combate. En la consola queda un aviso con lo que se cambió.
- **`lkDebug.axieParts(ID)`** muestra además la tabla «Piezas 3D»: qué pieza pide cada parte (skin y nivel), si existe y cuál se dibuja.

## 10. Axie cargado por ID: cartas en el tutorial y retrato (19-oct)

- **Cartas en el tutorial:** el combate del tutorial usaba los hechizos de la lista antigua y no las cartas de partes del Axie. Ahora:
  - usa sus 6 cartas de partes, igual que el resto de combates, para cualquier Axie compañero;
  - pone en la ranura [1] un ataque que alcance a 1 casilla (de preferencia uno que llegue también a 2), porque el paso 6 pide usar la [1] contra la Quimera Guardián. En Merlin es Deadly Pogona;
  - si el Axie no tiene ningún ataque así, o sus cartas no se pueden resolver, sigue con los hechizos de siempre.
  - Archivo: `src/main.js` (`tutorialCardOrder`; las cartas se resuelven antes de cualquier combate).
- **Retrato:** el retrato del Axie se fotografía de su modelo 3D al cargarlo. Antes, si el héroe ya tenía un retrato fijo (el compañero usa «kotaro», que lo tiene), no se hacía la foto y el Axie cargado por ID se quedaba sin retrato. Ahora se mira solo el retrato del propio Axie, por su ID.
  - Archivo: `src/rpg/AxieMixerService.js`.

## 11. Partes Japan de nivel 2 con el modelo equivocado (19-oct)

- **Lo que pasaba:** en el catálogo de la librería del Axie Mixer, las 18 partes Japan (skin 3) de nivel 2 comparten solo 6 modelos, uno por tipo de parte («Japanese_04_lv2_*»). Tres partes distintas usan el mismo modelo, así que no se sabe a cuál pertenece de verdad. Por ejemplo:
  - la espalda de Bird 04 (alas de cristal) salía como una cuchilla, igual que Beast 08 y Plant 04;
  - la boca de Reptile 10 (labios de corazón) salía como una máscara redonda, igual que Aquatic 10 y Bug 08.
  - Los modelos de nivel 1 sí son distintos y correctos.
- **Ahora** (`AxieMixerService.fitAxieDescriptor`): si el modelo de nivel 2 de una parte lo comparten varias partes distintas del catálogo, se usa el modelo de nivel 1 de esa parte. La comprobación se hace con los datos del propio catálogo, así que vale para cualquier pieza con el mismo fallo. Las demás colecciones (Mystic, Nightmare, Summer, Xmas…) no se ven afectadas.
- **Las 18 piezas:**
  - espaldas: Beast 08, Bird 04 y Plant 04;
  - orejas: Bird 12, Bug 12 y Plant 08;
  - ojos: Aquatic 02, Reptile 08 y Reptile 10;
  - cuernos: Beast 04, Beast 08 y Plant 04;
  - bocas: Aquatic 10, Bug 08 y Reptile 10;
  - colas: Aquatic 02, Bird 10 y Bug 06.
- **Comprobado con:**
  - el Axie #235167: espalda y cola;
  - el Axie #197657: ojos y boca.
- **Pendiente:** estas partes salen con su forma de nivel 1. Para verlas evolucionadas haría falta el modelo de nivel 2 correcto de cada una.

## Pruebas

- **Atributos** (Ferocidad 10, Agilidad 3, Esencia 5):
  - el Sapidae Forjador queda con crítico 21,5 %, apoyo 35 %, +15 cuerpo a cuerpo, +3,6 a distancia y 0 de magia;
  - el Lunalogista, igual pero con +6 de magia;
  - Shinji con Esencia 5: 0 de magia y 10 % de apoyo;
  - todos con 6 PA y 3 PM.
- **Ficha de carta:** Arco (58–72) con nivel 2, +15 de atributos y Potenciado 20 % muestra 101–121 y su desglose.
- **Comida al 100 %:** se rechaza y la comida sigue en el inventario.
- **Carga por ID:** con la consulta simulada, el Axie Planta queda con 340 de vida, 80 de iniciativa y 6 PA. Un ID que no existe da el aviso.
- **Cambio de compañero:** Bing desaparece en humo y aparece Pomodoro con su nubecita, sin errores.
- **Combates de IA contra IA en los 15 mapas** (con el crítico corregido): todos terminan sin errores y sin fuego amigo de la IA.

## Pendiente

- Probar en partida real las cifras de clase y rol, y ajustarlas en `AxieBaseStats.js` si hace falta.
