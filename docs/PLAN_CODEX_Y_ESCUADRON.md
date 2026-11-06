# Plan — Códice de Lunacia y Escuadrón desbloqueado tras el tutorial

> Estado: **terminado** (5-nov-2026, v0.5.0) como **Hito 126** (`docs/HITO_126_ESCUADRON_Y_CODICE.md`). En el código del Escuadrón, «Hito 125» se renombró a 126 porque ese número es «Koliseo más claro».
> Decisiones: nombre **Códice**, tecla **C**, Bestiario con **silueta hasta vencer** a la quimera, **capturas a cargo del usuario** (lista en §B.3).
> Dos tareas:
> - **A.** Abrir el Escuadrón al graduarse, con una explicación al abrirlo por primera vez, y mantener el paso de Bing.
> - **B.** Un **Códice**: un libro ilustrado que explica todo el bucle del juego.
>
> Orden propuesto: primero A (pequeña, la necesitan los calificadores ya) y después B por fases.

---

## A. Escuadrón desbloqueado al graduarse

### A.1 Qué hay hoy

- `TutorialDirector.isFeatureUnlocked('squad')` solo devuelve true con `_squadReady()`, es decir, con **Bing reclutado** (Hito 75). Hasta la misión 3 el botón **T** está bloqueado (`LOCKED.squad`).
- El mini-tutorial del Escuadrón (`flags.squadIntro`) va `waiting → open → place → load → done`:
  1. abrir el Escuadrón;
  2. poner a Bing en un puesto de apoyo;
  3. pulsar «Cargar mis Axies» (los Axies de la cuenta de Sky Mavis).
  Muestra una franja y un foco sobre el panel (`_computeSquadGuide`, `_squadBanner`).
- Sin Bing, el Escuadrón ya tiene contenido: el Sapidae líder, el Axie principal, 2 puestos de apoyo vacíos y el botón «Cargar mis Axies». Eso es justo lo que un calificador con Axies en su cuenta quiere probar.

### A.2 Recomendación: las dos cosas a la vez, divididas

Lo mejor es **desbloquear al graduarse y explicar al abrir**, y **conservar el momento de Bing** como un paso corto aparte:

| Momento | Qué pasa |
|---|---|
| Graduación (o «Saltar tutorial») | El botón **T** se desbloquea con un punto de «Nuevo» (sin franja ni foco: no compite con la misión de Ochi). |
| **Primera vez que se abre** el Escuadrón | Recorrido corto de **3 tarjetas** dentro del panel, que se pasa con «Siguiente» y se puede saltar: ① Líder, Principal y Apoyo (quién entra en combate y por qué el Sapidae es fijo) · ② la colección (arrastrar o «Añadir al escuadrón»; las clases y el triángulo elemental) · ③ **Cargar mis Axies** (foco sobre el botón; con cuenta trae los Axies de Sky Mavis, que empiezan en nivel 1). Al final, «¿Más detalles? → Códice · Escuadrón». |
| Al reclutar a Bing (misión 3) | Se mantiene un **solo paso** de la franja actual: «Pon a Bing en un puesto de apoyo» (abrir → colocar). El paso de «Cargar mis Axies» ya se enseñó antes. Si el jugador nunca abrió el Escuadrón, ve las 3 tarjetas y después este paso. |

**Por qué así y no solo una de las dos:**
- Solo desbloquear (sin explicación): el calificador abre un panel complejo y no sabe qué es «Principal» o «Apoyo», ni que puede cargar sus Axies.
- Solo el tutorial al abrir: se pierde el momento de Bing, que es la primera vez que el jugador tiene un compañero que colocar.
- La explicación al abrir no alarga el tutorial ni interrumpe a quien no la busca, y sirve igual a calificadores y jugadores.

### A.3 Cambios

| Archivo | Cambio |
|---|---|
| `rpg/tutorial/TutorialDirector.js` | `isFeatureUnlocked('squad')` pasa a `this.done \|\| this._squadReady()` (el segundo, para partidas antiguas). `squadIntro` se divide en dos indicadores: **`squadTour`** (`pending → done`, las 3 tarjetas de la primera apertura) y **`squadBing`** (`waiting → open → place → done`, solo colocar a Bing). Los estados actuales `load` y `done` se convierten en `squadBing = 'done'`. |
| `rpg/ui/SquadModal.js` | `onOpen` → si `squadTour` está pendiente, `SquadTour.start(modal)`. El componente nuevo `rpg/ui/SquadTour.js` hace las tarjetas con foco (misma estética que la franja del tutorial: `tutorial-spotlight-target`, `lk-tut`). También un botón **«?»** en la cabecera, que vuelve a lanzar el recorrido o abre el Códice cuando exista. |
| `rpg/OverworldManager.js` | Punto «Nuevo» en `#btn-open-squad` hasta la primera apertura. |
| `i18n/{es,en}/tutorialDirector.js` | Textos de las 3 tarjetas. Los de Bing se acortan a abrir y colocar. |
| `TutorialScript.js` | `LOCKED.squad` se queda (solo se ve durante el entrenamiento). |

**Migración de partidas:**
- **Ya graduados y sin Bing:** botón desbloqueado y recorrido pendiente.
- **Con `squadIntro = 'done'`:** `squadTour = squadBing = 'done'` (no vuelven a ver nada).
- **Con `squadIntro` en `open`, `place` o `load`:** recorrido pendiente; `squadBing` sigue en `open` o `place`, o pasa a `done` si estaba en `load`.

**Pruebas:**
- partida nueva → graduación → abrir T (3 tarjetas, saltar a mitad, recargar) → Bing (solo colocarlo);
- «Saltar tutorial»;
- partida antigua en cada estado;
- jugador con cuenta y como invitado (la tarjeta 3 cambia el texto).

**Tamaño:** pequeño (1 sesión).

---

## B. Códice de Lunacia (enciclopedia ilustrada)

### B.1 Idea

Un libro que se abre desde el HUD (botón nuevo **«Códice»**, tecla **C**, que está libre en el mundo abierto) con la misma estética que la Crónica de misiones: un carril de capítulos a la izquierda y una **doble página de marfil** a la derecha.

Cada página tiene:
- una **ilustración** grande;
- un **título**;
- **2–4 frases cortas** (nada de muros de texto);
- un recuadro **«Consejo»**;
- un botón que lleva al sitio del juego cuando tiene sentido: «Abrir la Forja», «Ver mis runas», «Ir al Koliseo».

Las páginas se pasan con flechas, rueda o ← →. Las páginas nuevas llevan un sello «Nuevo», y el capítulo un contador.

### B.2 Capítulos (las 11 secciones pedidas + 1 de bienvenida)

| # | Capítulo | Páginas (≈) | Contenido | Ilustración |
|---|---|---|---|---|
| 0 | **El bucle de Lunacia** | 2 | Mapa del bucle: explorar → combatir → botín y oro → Forja / Tienda / runas → más fuerte → Koliseo. Es la página que verán primero los calificadores. | Diagrama propio (SVG en el propio Códice). |
| 1 | **Equipamiento** | 3 | Las 7 ranuras, niveles T0–T5 y rareza, comparar antes de equipar y quién lleva qué. | Captura de la Mochila e iconos `assets/equippable`. |
| 2 | **Escuadrón** | 3 | Líder, Principal y Apoyo; clases y triángulo de clases (Asalto / Bastión / Torrente: +15 % de daño; también deciden la Ultimate); cargar los Axies de la cuenta; vínculo. | Captura del Escuadrón e iconos `assets/classes`. |
| 3 | **Economía** | 3 | Oro (combates, misiones, Tienda), SLP, AXS y bAXS (para qué sirve cada una), Tienda frente a Mercado entre jugadores, cartera con cuenta. | Iconos `assets/currency` y captura de la Tienda. |
| 4 | **Forja** | 3 | Recolectar (talar, minar), crear, evolucionar de T0 a T5, acelerar y recoger. | Captura de la Forja e iconos de materiales. |
| 5 | **Runas y charms** | 2 | Qué cambia cada una y dónde se consiguen (Mercado, premios). | `RuneCharmArt` y captura del panel. |
| 6 | **Koliseo · Arena PvP** | 2 | Duelos 1 contra 1 igualados, Elo, temporadas, premios y juego limpio (árbitro). | Captura de la Arena. |
| 7 | **Desafío de la Bruma** | 2 | Reto semanal, 5 combates, modificador, 2 intentos y premios al top 3. | Captura de la Bruma. |
| 8 | **Bestiario (quimeras)** | 1 por quimera (≈25) | **Se genera desde `ENEMY_ARCHETYPES`**: nombre, bioma, papel, vida, PA y PM, habilidades (`SPELLS_DB`) y botín (`possibleDrops`). Las quimeras que aún no has vencido salen como **silueta «???»** con su bioma, lo que da motivo para explorar. | Retrato generado con `CharacterPortraitService` (como el orden de turnos). |
| 9 | **Habilidades de los Axies** | 3 | Vienen de sus **6 partes del cuerpo** (ojos, orejas, cuerno, boca, lomo, cola). Cada parte es una carta (`PartCards`/`VariantCards`), la clase de la parte da su elemento, y los Axies iniciales tienen mazos propios (`StarterCards`). Ejemplo generado con el Axie principal del jugador. | Carta real del juego (`CollectionCards`) e iconos `assets/parts`. |
| 10 | **Sapidae: habilidades y Definitiva** | 3 | Las habilidades del Sapidae vienen de su **clase** (elegida al crearlo) y del arma equipada. La **Definitiva** (Duo Ultimate) requiere **vínculo al 100 %** con el Axie principal, cuesta 6 PA, se usa desde la ronda 2 y una vez por combate; la tríada depende de la clase del Axie principal. | Iconos `assets/skills` y captura de la Ultimate. |
| 11 | **Terrenos** | 2 | Suelo y sendero, puente, **agua** (no se pasa pero no tapa la visión), **obstáculos** (árbol, roca o especial: tapan paso y visión), **grieta** (no hay suelo), salidas P y E; línea de visión y alcance (**AL**). | Diagrama de casillas propio (SVG) más una captura de un tablero. |

> Antes de escribir los textos de los capítulos 9 y 10, el autor confirma las reglas exactas en el código, porque el Códice tiene que coincidir con lo que pasa en el juego.

### B.3 Ilustraciones: de dónde salen

1. **Lo que ya existe** (sin trabajo de arte): iconos de clases, monedas, partes, equipo, materiales, consumibles, habilidades, retratos de NPC y cartas de Axie.
2. **Retratos generados en vivo**: quimeras y Axies con `CharacterPortraitService`. Ya se usa en el orden de turnos y las imágenes quedan guardadas, así que no hay que pintarlas.
3. **Capturas del juego** (≈15) para los paneles: Mochila, Escuadrón, Tienda, Forja, Runas, Koliseo, Bruma y un tablero.
   - Se guardan en `assets/codex/*.webp` (unos 60–90 KB cada una, a 960×540).
   - Las puede sacar el usuario con una lista exacta de qué capturar, o con una página de ayuda (`tools/codex/capture.html`) que abre cada panel y guarda la imagen.
4. **Diagramas propios en SVG** (bucle y terrenos), dibujados en el propio Códice con los colores del sistema de diseño. Pesan poco y se pueden traducir.

> El Códice **solo carga las imágenes de la página abierta**: no añade nada a la carga inicial, que ya preocupa (30–35 s).

### B.4 Arquitectura

| Archivo | Qué es |
|---|---|
| `src/rpg/codex/CodexData.js` | Capítulos y páginas (claves i18n, imagen, consejo, acción, condición de «visible» y de «nuevo»). |
| `src/rpg/codex/CodexGenerated.js` | Páginas generadas: Bestiario (de `ENEMY_ARCHETYPES`, `BIOME_SPAWN_POOLS`, `SPELLS_DB`), ejemplo de partes del Axie principal y tabla de terrenos (`CELL`). |
| `src/rpg/ui/CodexModal.js` | El libro: carril, doble página, pasar páginas, búsqueda simple, sellos «Nuevo». API: `open(chapter?, page?)`, `close()`, `toggle()`, `isOpen`. |
| `src/rpg/codex/CodexProgress.js` | Qué páginas se han visto y qué quimeras se han vencido. Se guarda en la ranura (`slot.codex = { seen: [], beasts: { id: wins } }`). El aviso de quimera vencida sale de la misma ruta que el botín de fin de combate (`main.js`, junto a `LootService`). |
| `src/i18n/{es,en}/codex.js` | Todos los textos (≈200 claves por idioma). |
| `src/ui/lunakai-ui.css` | Estilos `lk-codex-*` (marfil, sello, vista estrecha en una sola página para pantallas pequeñas). |
| `rpg/OverworldManager.js` | Botón del HUD (entre Crónica y Mapa), tecla **C** y cierre con Esc. |
| Enlaces «?» | Botón «?» en Escuadrón, Forja, Runas, Tienda y Koliseo que abre el Códice en su capítulo (`om.codex.open('forge')`). |

**Desbloqueo:** el Códice se abre al graduarse.
- Durante el tutorial está bloqueado: el tutorial ya enseña lo básico, y así no compite con él.
- Al graduarse, todos los capítulos son legibles: los calificadores pueden verlo todo desde el principio.
- Solo el **Bestiario** se va revelando al combatir.

**Accesibilidad:**
- navegación con teclado (← → y Tab);
- textos de 15–16 px como mínimo;
- descripción alternativa en cada ilustración;
- respeta la opción de reducir animaciones (el paso de página no se anima).

### B.5 Fases

| Fase | Contenido | Tamaño |
|---|---|---|
| **C0** | Tarea A (Escuadrón). | Pequeña |
| **C1** | Esqueleto del Códice: modal, botón y tecla B, capítulos vacíos, guardado de lo visto, enlaces «?». | Media |
| **C2** | Textos (es y en) de los capítulos 0–7 y 11, con diagramas SVG del bucle y de los terrenos. | Media |
| **C3** | Páginas generadas: Bestiario con descubrimiento, partes del Axie, Sapidae y Definitiva (capítulos 8–10). | Media |
| **C4** | Ilustraciones: lista de capturas y página de ayuda, `assets/codex/*.webp` y retratos generados. | Media (depende de las capturas) |
| **C5** | Pruebas: carga diferida de imágenes, pantallas pequeñas, es y en, partidas antiguas sin `codex`. Documentación: Hito 125, README, `PROJECT_CONTEXT`. | Pequeña |

### B.6 Riesgos

| Riesgo | Mitigación |
|---|---|
| Textos que se quedan viejos al cambiar reglas | Lo que depende de datos (Bestiario, cartas, terrenos, precios) se **genera**. Los textos fijos describen conceptos, no números. |
| Peso de las imágenes | WebP de 960 px, carga diferida y solo la página abierta. |
| Información que estropea la historia | El Bestiario oculta las quimeras no vencidas; las zonas posteriores solo se nombran. |
| Choque con tutoriales y franjas | Bloqueado durante el entrenamiento. Al abrirse, oculta franjas y focos, como el resto de ventanas (`_squadGuideVisible` y `_updateGuide` ya lo comprueban con `isOpen`: hay que añadir `codexModal`). |

---

## Decisiones abiertas

1. **Nombre:** «Códice de Lunacia», «Enciclopedia» o «Grimorio del Sapidae». Propuesta: **Códice**.
2. **Bestiario:** ¿siluetas «???» hasta vencer a la quimera (motiva a explorar) o todo visible (más cómodo para los calificadores)? Propuesta: siluetas, con un ajuste en Opciones (o un modo de calificador) que lo muestra todo.
3. **Capturas:** ¿las sacas tú con una lista, o preparo la página de ayuda que las genera?
4. **Tecla:** **B** (de *book*). Alternativa: C.
