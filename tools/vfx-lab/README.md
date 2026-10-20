# Laboratorio de VFX

Banco de pruebas de los efectos de las habilidades. Es la misma herramienta que `vfx/index.html`, pero ahora carga el núcleo y los módulos que usa el juego. Así, lo que ves aquí es lo que se verá en combate.

## Abrirlo

1. En la raíz del proyecto: `node server.js 8082`
2. Abre `http://localhost:8082/tools/vfx-lab/` (`#clave` o `#clave-variante` abre una habilidad concreta, p. ej. `#aura-quemadura`).

No hace falta subir `tools/` al hosting.

## Dónde está cada cosa

| Archivo | Qué es |
| --- | --- |
| `src/vfx/vfx-core.js` | Núcleo compartido: materiales, partículas, registro de habilidades, tiempos, resplandor y luz. Sin DOM: recibe `THREE`, la escena y la cámara. |
| `src/vfx/vfx-lib.js` | Shaders y piezas reutilizables (antes `vfx/vfx-lib.js`, sin cambios). |
| `src/vfx/modules/mod-<clase>-<parte>.js` | Los 36 módulos con los 235 efectos de las cartas (sin cambios, salvo dónde se registran Rice y Beetroot). |
| `src/vfx/vfx-modules.js` | Lista de módulos y carga en orden. |
| `src/vfx/vfx-cards.js` | Qué efecto corresponde a cada carta (generado). |
| `tools/vfx-lab/index.html` | Interfaz del laboratorio. |
| `tools/vfx-lab/orbit.js` | Control de cámara del laboratorio. |
| `tools/vfx-lab/gen-cards.mjs` | Comprueba los módulos sin navegador y regenera `vfx-cards.js`. |

## Añadir o cambiar un efecto

- **Cambiar uno existente:** edita su módulo en `src/vfx/modules/` y recarga el laboratorio.
- **Un módulo nuevo** (p. ej. Sapidae, Ultimates o enemigos):
  1. Crea `src/vfx/modules/mod-<nombre>.js` con el mismo contrato que los demás:
     - `{key, name, dur, ti, phases, pal}`;
     - `build(a)`, que crea las piezas en `a.L.mesh|part|trail|decal`;
     - `pose(te, o)`, sin estado;
     - al final, `VFX.module("Grupo · Nombre", [...])`.
  2. Añade `'<nombre>'` a `VFX_MODULES` en `src/vfx/vfx-modules.js`.
- **Después de tocar módulos:** ejecuta `node tools/vfx-lab/gen-cards.mjs`. Construye las 240 habilidades en Node, avisa de cualquier error y actualiza la tabla de cartas.
- **Las claves (`key`) deben ser únicas** entre todos los módulos.

## Módulos Sapidae y Dúo

- `mod-sapidae-forjacubiles|susurrador|lunalogista|astromante.js`: 6 habilidades por clase de Sapidae (claves `craft_*`, `shepard_*`, `lunalogist_*`, `stargazer_*`).
- `mod-duo-embestida|gaia|maelstrom.js`: habilidades combinadas Sapidae + Axie (`duo_embestida`, `duo_gaia`, `duo_maelstrom`) en el grupo «Sapidae · Dúo». Cada una tiene la variante «Completo» y una variante por pieza con su ID (`vfx_dest_*`, `vfx_gaia_*`, `vfx_mael_*`).
- No tienen carta en `PartCards.js`, así que `gen-cards.mjs` las lista como «sin carta»; es normal.

### Campos nuevos del objeto `o`

| Campo | Qué hace | Dónde se aplica |
| --- | --- | --- |
| `o.dark` (0..0.95) | Oscurece la escena (luces ambientales y fondo); los efectos aditivos siguen brillando. | Laboratorio. En el juego hay que conectarlo al velo `dim` de `VfxBridge.js`. |
| `o.white` (0..1) | Destello blanco a pantalla completa, breve. | Laboratorio (post-proceso). En el juego no se aplica todavía. |
| `o.ld` | Radio (`distance`) de la luz puntual; por defecto 14. | Núcleo (`vfx-core.js`): laboratorio y juego. |

## Diferencias con el laboratorio anterior

- Usa el `three.module.js` r160 del proyecto en lugar de three r147 desde un CDN. Para que los colores se vean igual que antes, el laboratorio desactiva la gestión de color de three y usa las luces «legacy».
- La cámara se mueve con un control propio (`orbit.js`): arrastrar para girar, rueda o pellizco para acercar.
- Las fuentes de la interfaz siguen viniendo de Google Fonts. Sin conexión, el laboratorio funciona con las fuentes del sistema.
- `vfx/` (la carpeta antigua) queda como copia de seguridad. Lo vigente es `src/vfx/` y `tools/vfx-lab/`.
