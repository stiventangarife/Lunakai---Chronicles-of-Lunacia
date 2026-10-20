# Hito 33 — Fase 6 (VFX), etapa 1: núcleo compartido

> **Estado:** completada. Los efectos del laboratorio viven ahora dentro del juego, en `src/vfx/`, y el laboratorio (`tools/vfx-lab/`) los carga desde ahí.
> **Plan:** pestaña «Fase 6 — VFX» del plan de implementación de habilidades.

## Qué cambió

| Antes | Ahora |
| --- | --- |
| Carpeta `vfx/` aparte, con three r147 desde un CDN | `src/vfx/` (código que usa el juego) + `tools/vfx-lab/` (interfaz del laboratorio), con el three r160 del proyecto y sin CDN |
| El motor estaba dentro de `index.html` y dependía de la página | `src/vfx/vfx-core.js`: `createVfxCore(THREE, { scene, camera, showDummies })`, sin DOM ni renderizador. El juego puede crear uno en su propia escena. |
| `draw()` mezclaba la pose de la habilidad con el render y la interfaz | `core.evaluate(ab, te)` hace la pose, el resplandor, la luz y el brillo del objetivo; el anfitrión decide cómo renderizar |
| 37 etiquetas `<script>` escritas a mano | `src/vfx/vfx-modules.js`: lista de módulos y `loadVfxModules(base, nombres)`, que permite cargar solo los que hagan falta |
| Rice registrado en Espalda y Beetroot en Orejas | Rice en «Bestia · Cola» y Beetroot en «Planta · Boca», como sus cartas; el código sigue en el mismo archivo |
| Sin relación entre efectos y cartas | `src/vfx/vfx-cards.js`: las 235 cartas de partes tienen su efecto (id de carta → clave + módulo) |

Los 36 módulos y `vfx-lib.js` no se tocaron, salvo las dos líneas de registro de Rice y Beetroot.

## Comprobaciones

- **En Node** (`node tools/vfx-lab/gen-cards.mjs`): las 240 habilidades (235 cartas + 5 base) se construyen y se evalúan de 0 a su duración, cada 0,1 s y en todas sus variantes, con three r160. Resultado: 0 errores. Las 235 cartas quedan emparejadas, sin efectos ni cartas sueltos.
- **En el navegador:** el laboratorio carga los 37 grupos y las 240 habilidades, con todas sus variantes, sin errores de JavaScript.
- **Colores:** el laboratorio desactiva la gestión de color de three r160 y usa las luces «legacy» para verse como con r147. No se pudo comparar al lado de la versión anterior porque el entorno de pruebas no accede al CDN de three. Conviene que lo revises tú abriendo los dos laboratorios.

## Cómo usarlo

Ver `tools/vfx-lab/README.md`.

## Siguiente: etapa 2

`src/vfx/VfxBridge.js` lleva los efectos al combate con 25 cartas de los Axies jugables: Shinji, Early Bird, Big Yak, Bing y Pomodoro. Se encarga de:

- el grupo raíz sobre la línea lanzador → objetivo;
- la cámara proxy;
- el color en el combate, que sí usa gestión de color y tonemapping;
- el movimiento visual de las mallas, con regreso a su casilla;
- el reproductor de tiempo.
