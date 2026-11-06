# Plan — Ajustes de interfaz: Koliseo, runas, Forja y apariencia

> Estado: **terminado** (5-nov-2026, v0.5.0) como **Hito 128** (`docs/HITO_128_AJUSTES_KOLISEO_RUNAS_FORJA_APARIENCIA.md`).
> Tamaño total: pequeño (una sesión). Sin cambios en el servidor ni en el árbitro PvP.

## 1. Koliseo: punto de «Nuevo» y recorrido al abrirlo por primera vez

**Qué pasa hoy**
- El Koliseo (tecla K) se desbloquea al graduarse (`isFeatureUnlocked('koliseo')`), pero nada lo anuncia.
- El panel ya tiene un botón «?» que lleva al Códice (capítulo Koliseo o Bruma).

**Qué se hace (igual que el Escuadrón, Hito 126)**
- **Punto dorado** en `#btn-open-koliseo` desde la graduación hasta la primera apertura.
  - El CSS de `lk-has-new` (hoy solo en `#btn-open-squad` y `#btn-open-codex`) pasa a una regla común: `.lk-ow-menu .lk-btn-circle-icon.lk-has-new`.
- **Recorrido de 3 tarjetas** la primera vez que se abre:
  1. **Arena PvP**, con foco en su pestaña: duelos 1 contra 1 igualados, temporada mensual y premios.
  2. **Desafío de la Bruma**, con foco en su pestaña: reto semanal de 5 combates, 2 intentos y top 3.
  3. **Clasificación**, con foco en su pestaña: dónde ver tu puesto y los premios; el botón «?» abre el Códice.
- **Componente reutilizable:** `SquadTour.js` pasa a `rpg/ui/PanelTour.js`, con los pasos como datos (`{ ref | selector, titleKey, textKey }`).
  - El Escuadrón y el Koliseo usan el mismo componente.
  - `SquadTour.js` queda como envoltorio de 5 líneas para no tocar `SquadModal`.
- **Guardado:** nuevo `flags.koliseoTour` (`pending` / `done`) en `TutorialDirector`, con la misma lógica que `squadTour`:
  - se lanza en `koliseoPanel.onOpen` si está pendiente;
  - si se cierra el panel a mitad, el recorrido se repite;
  - «Saltar» lo da por visto.
- **Partidas que ya existen:**
  - **graduadas:** ven el punto y el recorrido una vez (es información nueva para ellas);
  - **en mitad del tutorial:** lo ven al graduarse.
- **Textos:** `tutorialDirector.koliseoTour.*` en español e inglés.

## 2. La etiqueta «Nuevo» / «New» de las runas se ve enorme

**Causa encontrada**
- `RunesCharmsPanel.js` (línea ~200) pinta la etiqueta con un estilo en línea `font:700 .62rem/1.4 inherit`.
- Ese `inherit` dentro del atajo `font` no es válido, así que el navegador **descarta toda la declaración**.
- Resultado: la etiqueta hereda el tamaño grande del contenedor.

**Arreglo**
- Pasar la etiqueta a una clase `.lk-rc-new` en `lunakai-ui.css` (sin estilo en línea), con fuente de 10–11 px, `line-height` fijo, `white-space: nowrap` y la misma posición de esquina.
- Revisar con el mismo criterio las otras etiquetas «Nuevo» de la Mochila y de las bolsas de runas, por si alguna copia el mismo estilo en línea.

## 3. Forja durante el tutorial: la ficha del material se queda abierta encima de «Acelerar»

**Causa encontrada**
1. La ficha de un material (`.lk-mat-tip`, `z-index: 2050`, colgada del `body`) se abre al pasar el ratón (`mouseover`) por la bolsa de materiales o por el coste.
2. Al abrir la Forja, el ratón suele quedar encima de un material y la ficha se abre.
3. Justo después, la guía del tutorial pone su velo (`z-index` 2147483000).
4. El velo tapa la ficha, así que nunca llega el `mouseout` y la ficha **no se cierra**.
5. Como queda por encima del panel de la Forja, si cae sobre el hueco del foco (el botón «×4» de Acelerar) **tapa el botón** y no deja pulsarlo.

**Arreglo (en tres sitios, por seguridad)**
- **ForgePanel.js**
  - La ficha se cierra al abrir y cerrar la Forja, al repintar la lista, al hacer clic en cualquier sitio (`pointerdown`) y cuando el ratón sale de la ventana.
  - Se expone `forge.hideTip()`.
- **CSS:** `.lk-mat-tip { pointer-events: none }`. Una ficha no debe poder robar un clic nunca; hoy no tiene botones dentro.
- **TutorialDirector._spotlightOn:** al poner el velo, cierra cualquier ficha abierta (`.lk-mat-tip.lk-is-on`, `.lk-tooltip-float`).
  - Con eso, ninguna ficha de ningún panel puede quedar atrapada bajo la guía (Mochila, runas, Forja).
- **Prueba:**
  - abrir la Forja en el paso «Acelerar» con el ratón sobre un material;
  - cambiar de pestaña con el ratón quieto;
  - repetirlo en la Mochila durante «equipa la espada».

## 4. Panel de apariencia: quitar «Ema» y «Kai»

**Dónde salen**
- **Selector de base** (`StartScreenUI._ccRenderLookV2`, línea ~1210): `${b.label} · ${b.name}`, que muestra «Femenino · Ema» y «Masculino · Kai».
- **Descripciones de peinados** (`i18n/{es,en}/creator.js`):
  - «Melena corta y ondulada, el peinado de Ema»
  - «El pelo alborotado de Kai»
  - «Coletas Ema» / «Trenzas dobles tradicionales de Ema» (lista antigua)

**Arreglo**
- El selector muestra solo «Femenino» / «Masculino» (`b.label`).
- Las descripciones se reescriben sin nombres:
  - «Melena corta y ondulada»
  - «Pelo alborotado»
  - «Coletas con lazos»
- No se tocan los nombres internos: modelos `Sapidae_Ema.glb` / `Sapidae_Kai.glb`, `PIECE_SETS`, claves de guardado.
- Tampoco se toca la **Herbolaria Ema**, que es otro personaje (NPC de la misión del elixir).
- Se busca cualquier otro texto visible del creador con «Ema» o «Kai», en español e inglés, y se neutraliza igual.

## Fases y pruebas

1. **Runas** (#2) y **apariencia** (#4): cambios de texto y CSS. Se comprueban a ojo en es y en.
2. **Forja** (#3):
   - prueba en Chrome sin interfaz: abrir la Forja con el ratón encima de un material y comprobar que la ficha se cierra al poner la guía;
   - prueba manual en el tutorial.
3. **Koliseo** (#1):
   - `PanelTour.js`, el punto y la bandera;
   - pruebas en Node: desbloqueo al graduarse, que no se repite y que, si se corta, se repite; y que el Escuadrón sigue igual.
4. **Documentación:** se añade al Hito 126 (o Hito 127 si se prefiere separarlo), con README y `PROJECT_CONTEXT`.
