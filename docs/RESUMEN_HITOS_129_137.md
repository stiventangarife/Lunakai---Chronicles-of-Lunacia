# Resumen de cambios · Hitos 129–137 (noviembre de 2026)

Vista rápida de todo lo hecho en esta tanda. El detalle de cada punto está en su documento.

| Hito | Qué | Documento |
|---|---|---|
| 129 | Recorridos de panel como «coach marks» (Escuadrón y Koliseo) | `HITO_129_RECORRIDOS_DE_PANEL_COACH_MARKS.md` |
| 130 | Avisos de «Nuevo» con un gestor común (Escuadrón, Koliseo; Códice con el número de páginas sin leer) | `HITO_130_AVISOS_DE_NUEVO.md` |
| 131 | Selector de aventura con escenario 3D (personaje de la ranura y su Axie) | `HITO_131_SELECTOR_DE_AVENTURA.md` |
| 132 | Isla por bioma y panel «Tu partida» (misión, escuadrón y fecha) | `HITO_132_SELECTOR_ISLA_Y_TU_PARTIDA.md` |
| 133 | Cielo del título e islas 3D por bioma en el selector | `HITO_133_SELECTOR_CIELO_E_ISLAS_3D.md` |
| 134 | Terreno cuadrado de casillas en lugar de la isla redonda | `HITO_134_SELECTOR_TERRENO_DE_CASILLAS.md` |
| 135 | Contextos WebGL liberados de verdad; lista de ranuras sin desplazarse y con retratos centrados | `HITO_135_CONTEXTOS_WEBGL_Y_LISTA_DE_RANURAS.md` |
| 136 | Guía por migas («Chispa guía») con mapa de rumbo; sin flecha flotante. Ajustes visuales (retratos de Axie, Mochila, runas, árboles) | `HITO_136_GUIA_MIGAS_Y_MAPA_DE_RUMBO.md` |
| 137 | Puente plano del Bosque (`puente_plano.glb`, textura en KTX2) | `HITO_137_PUENTE_PLANO_DEL_BOSQUE.md` |

## Rendimiento y memoria

- **Selector de aventura:**
  - un solo visor 3D, solo para la ranura elegida: 30 fps como máximo, resolución ×1,25 como máximo y sin sombras;
  - ~110 MB de texturas por modelo de Sapidae, ~220 MB como máximo con el Axie;
  - escena de ~11 200 triángulos (el terreno, 878) en 46 llamadas de dibujo;
  - se libera entero al jugar, al abrir el creador o al cerrar sesión. El juego de fondo no se actualiza ni se dibuja mientras tanto.
- **Contextos WebGL (Hito 135):** cada visor cierra su contexto al liberarse (`forceContextLoss`). Antes, unas 8 aperturas del creador hacían que Chrome cerrara el contexto del juego. Probado con 40 ciclos sin avisos.
- **Guía por migas (Hito 136):**
  - el camino se calcula una vez por objetivo, por partes (≈2 ms por fotograma; 61 ms en total en una isla de 320 m);
  - 484 KB reutilizados;
  - la estela se dibuja en 1 llamada sin texturas;
  - moverse por la zona no cuesta nada.
- **Puente (Hito 137):** textura de ~5,6 MB a ~0,7 MB de memoria de vídeo, a la misma resolución.

## Reglas nuevas para el proyecto

- Todo visor con su propio `WebGLRenderer` llama a `renderer.forceContextLoss()` al liberarse.
- Quien cambie las colisiones debe hacerlo con los métodos de `OverworldCollisions` (suben `version`, y el mapa de rumbo se rehace).
- Los medallones con un Axie llevan `lk-med--axie` (o `lk-pm-axie` en el HUD del grupo).
- Las ramas de los árboles procedurales nacen con `trunk.curve.getPointAt(t)`.
- Las texturas de los GLB nuevos van en KTX2 (`KHR_texture_basisu`), no en WebP o PNG.
- El arte de runas y charms vive en `assets/ui/runes-charms.json`, con el mismo encuadre (128 × 128).

## Pendiente

- **Guía por migas, fase 2 (cuándo aparece):**
  - al aceptar una misión o al terminar un diálogo;
  - con el jugador quieto;
  - si camina en dirección contraria;
  - y una tecla «¿por dónde voy?».
- **`bridge.glb`:** ya no lo usa nada. Se puede borrar si no se quiere volver al puente anterior.
