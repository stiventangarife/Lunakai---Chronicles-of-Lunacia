# Hito 85: Accesibilidad — lectura, visión y movimiento

> **Estado:** en la versión de prueba (27-oct-2026), pendiente de la revisión del usuario en el juego.
> **Pedido:** revisar «Opciones › Accesibilidad»: qué funcionaba de *Lectura* e implementar *Visión y movimiento*. Se añaden dos opciones nuevas: **modo daltonismo** y **avance automático de diálogos**.

## 1. Antes de este hito

| Opción | Estado |
|---|---|
| Velocidad del texto | Funcionaba a medias: no se aplicaba al arrancar hasta abrir Opciones; «Instantánea» seguía escribiendo letra a letra (1 ms). |
| Tamaño del texto | No hacía nada (nadie leía `data-lk-text`); además ~427 reglas de `styles.css` en px no habrían crecido. |
| Marcadores de alto contraste | No hacía nada (`lk-high-contrast` sin CSS). |
| Reducir movimiento | Solo el cartel de combate y la transición. Las ~15 reglas `@media (prefers-reduced-motion)` solo respondían a Windows. |
| Temblor de cámara | No hacía nada (`prefs.shake` no lo leía nadie). |

## 2. Arquitectura

**`src/ui/AccessPrefs.js` (nuevo):** fuente única de las preferencias de lectura, visión y movimiento.
- **Arranque:**
  - se lee al importar el módulo (es la primera importación de `main.js`), así todo arranca ya con las preferencias;
  - un `<script>` pequeño en `index.html` pone las marcas en `<html>` desde el primer fotograma;
  - la primera vez, «Reducir movimiento» y «Alto contraste» toman el valor del sistema operativo (`prefers-reduced-motion`, `prefers-contrast`).
- **Cambios:**
  - el menú guarda en `axie_lk_prefs` y emite `lk:settings`, y AccessPrefs escucha ese evento;
  - otros sistemas cambian valores con `access.set({...})`;
  - `access.onChange(fn)` avisa a quien lo necesite (diálogo, tablero, unidades, menú).
- **Valores para el juego:**
  - `textScale`, `textSpeedMs` y `autoDelay(chars)`;
  - `contrast`, `palette` (colores por modo), `reduceMotion`, `shakeScale` y `flashScale`.
- **Marcas en `<html>`:**
  - `data-lk-text` y `data-lk-cb`;
  - las clases `lk-high-contrast` y `lk-reduce-motion`;
  - la variable `--lk-text-scale`.
- **Hojas generadas al cargar** (y otra vez si un módulo inyecta un `<style>` después):
  - `#lk-access-scale`: cada `font-size` en px pasa a `calc(px × --lk-text-scale)`, incluido lo que hay dentro de `@media`;
  - `#lk-access-motion`: cada regla de `@media (prefers-reduced-motion: reduce)` se repite para `html.lk-reduce-motion`. No hay CSS copiado a mano.

**`src/ui/lunakai-access.css` (nuevo):** la raíz al 112,5 % o al 125 % (la interfaz nueva mide en rem), el alto contraste y las paletas de daltonismo.

## 3. Qué hace cada opción

### Lectura
| Opción | Valores | Efecto |
|---|---|---|
| **Tamaño del texto** | Normal / Grande / Muy grande (100 / 112,5 / 125 %) | Toda la interfaz: rem por la raíz, px por la hoja generada (números de daño, HUD antiguo, telón de carga). Los nombres en 3D de NPC y enemigos crecen igual (`access.trackWorldLabel`). |
| **Velocidad del texto** | Lenta / Normal / Instantánea (40 / 22 / 0 ms por letra) | Se aplica desde el arranque. «Instantánea» muestra la frase completa de golpe. |
| **Avance automático** *(nuevo)* | No / Normal / Lento | El diálogo pasa solo tras una espera según el largo de la línea: 1,1 s + 38 ms por letra, entre 1,6 y 7 s; «Lento» ×1,7. El botón **Auto** del diálogo es el mismo ajuste: lo enciende y apaga y el menú lo refleja. Sustituye a la clave antigua `axie_lk_dialog_auto`, que se respeta como valor inicial. |

### Visión
**Marcadores de alto contraste:**
- **Anillos de las unidades:** el aliado lleva un círculo más grueso y el enemigo un rombo, los dos con contorno negro.
- **Casillas:**
  - movimiento con puntos;
  - alcance y objetivos con rayas;
  - área con cuadrícula.
- **Orden de turnos:** aliados en círculo, enemigos en cuadrado con un rombo de marca.
- **Barras de vida:** la del enemigo lleva rayas.
- **Ficha de la unidad:** retrato cuadrado para el enemigo y marca «●» (aliado) o «◆» (enemigo).
- **Paneles:** más opacos, texto secundario más claro y foco más visible.
- **Números de daño:** contorno más grueso.

**Modo daltonismo** *(nuevo)*, con los colores de bandos, barras de vida, números de daño y casillas:

| Modo | Aliados | Enemigos | Movimiento | Alcance | Área |
|---|---|---|---|---|---|
| No | cian / verde | rojo | azul | rojo | naranja |
| Rojo-verde (protanopía/deuteranopía) | azul cielo | naranja | azul | bermellón | amarillo |
| Azul-amarillo (tritanopía) | turquesa | rosa rojizo | turquesa | rosa | gris claro |

### Movimiento
| Opción | Efecto |
|---|---|
| **Temblor de cámara** | Apagado: ningún temblor en el combate (`SceneManager.shake`, que usan efectos, golpes, muertes y Ultimates) ni en la cinemática del prólogo. Con «Reducir movimiento», la mitad. |
| **Reducir movimiento** | Todas las reglas `prefers-reduced-motion` del juego. En los efectos: el destello blanco de pantalla completa al 25 % y sin pico de *bloom*. Destello de daño de la unidad más suave, sin aplastamiento ni sacudida. Sin pulso en las casillas de objetivo. En la cinemática, fogonazos al 25 %. Sin brillo intermitente en los críticos. La lógica del combate no cambia. |

## 4. Archivos

| Archivo | Cambio |
|---|---|
| `src/ui/AccessPrefs.js` | Nuevo (ver §2). |
| `src/ui/lunakai-access.css` | Nuevo: tamaño, contraste, daltonismo y extras de movimiento. |
| `index.html` | Enlaza `lunakai-access.css` y un script que pone las marcas en `<html>` antes de pintar. |
| `src/main.js` | Importa `AccessPrefs` primero. |
| `src/rpg/ui/SettingsModal.js` | Opciones nuevas (avance automático y modo daltonismo); valores por defecto desde AccessPrefs; refleja los cambios hechos fuera del menú; ya no fija `typingSpeed` (lo hace AccessPrefs). |
| `src/rpg/DialogSystem.js` | Velocidad desde el arranque, instantánea real, avance automático con espera por línea y botón Auto unido a Opciones. |
| `src/tactics/GridManager.js` | Texturas con dibujo, colores por modo (`applyAccess`, sin recompilar) y sin pulso con «Reducir movimiento». |
| `src/tactics/Unit.js` | Anillo con forma y contorno por bando y colores por modo (`applyAccess`); destello de daño suave. |
| `src/tactics/SceneManager.js` | `shake()` multiplicado por `access.shakeScale`. |
| `src/vfx/VfxBridge.js` | Destello blanco × `flashScale`; sin pico de bloom con «Reducir movimiento». |
| `src/rpg/cinematic/PrologueCinematic.js` | Temblor × `shakeScale`; fogonazos × `flashScale` (uniforme `uFlashMul`). |
| `src/rpg/NPCManager.js`, `src/rpg/ui/EnemyNameplate.js` | Nombres en 3D con «Tamaño del texto». |
| `src/ui/CombatHUD.js` | Clase `lk-is-ally` / `lk-is-foe` en la ficha de la unidad. |
| `src/tactics/combat/CombatDebug.js` | `lkDebug.a11y()`. |
| `src/i18n/{es,en}/settings.js` | 7 claves nuevas y 2 descripciones actualizadas, en los dos idiomas. |

## 5. Consola

| Comando | Qué hace |
|---|---|
| `lkDebug.a11y()` | Preferencias activas, reglas generadas y **textos visibles que no crecen** con «Muy grande» (tabla con el elemento y si su tamaño viene escrito en línea). |
| `lkDebug.a11y({ textSize: 'xlarge', contrast: true, colorblind: 'rg', reduceMotion: true, shake: false, autoAdvance: 'slow' })` | Cambia y guarda (el menú se actualiza solo). |
| `lunakaiAccess` | El objeto AccessPrefs. |

## 6. Comprobado

**Navegador (Chromium) con los CSS reales del juego, `SettingsModal` y `DialogSystem` reales, y el tablero real (`GridManager`):**
- Con «reducir movimiento» en Windows y sin preferencias guardadas, la opción sale activada. Se generan 27 reglas espejo de movimiento.
- Pulsando en el menú:
  - la raíz pasa de 16 a 18 y 20 px;
  - los números de daño, en px en `styles.css`, de 40 a 45 y 50 px;
  - las filas del menú, de 14,4 a 18 px.
- `lkDebug.a11y()` no encuentra ningún texto visible sin escalar en la prueba.
- El menú con «Muy grande» a 1366×768 se ve bien y el panel se desplaza sin cortes.
- **Velocidad:** «Instantánea» muestra 74 de 74 letras a los 30 ms; «Normal» va por 14 de 74 a los 300 ms.
- **Avance automático:** pasa solo a la segunda línea en 1,7 s. Una línea de 75 letras espera 3,95 s en «Normal» y 6,7 s en «Lento». El botón Auto apaga la opción del menú y lo guarda.
- Tras recargar, se conservan tamaño, daltonismo y contraste.
- **Capturas:** orden de turnos, barras, números de daño y casillas en Normal, Contraste, Rojo-verde, Azul-amarillo y Contraste + Rojo-verde. Anillos de las unidades en Normal, Contraste y Contraste + Rojo-verde.

**Node:**
- `Unit.applyAccess`: 32 lados → círculo de 40 y rombo de 4 con contorno, colores por modo y vuelta al anillo original.
- `dispose` no libera las geometrías compartidas y se da de baja.
- `shakeScale` y `flashScale`: ×1, ×0,5 con «Reducir movimiento» y ×0 sin temblor; ×1 y ×0,25.

**Rendimiento:**
- Las opciones solo cambian clases, variables CSS, colores y texturas ya creadas, así que nada recompila.
- Las hojas se generan una vez al cargar.
- Las texturas con dibujo (3) y las geometrías de anillo (4) se crean una vez y se comparten.

## 7. Pendiente

- Probar en el juego:
  - un combate con alto contraste y los dos modos de daltonismo;
  - la cinemática con «Reducir movimiento»;
  - `lkDebug.a11y()` en el mundo abierto y en combate con «Muy grande», para ver si algún texto en línea se queda sin escalar.
- **Sin escalar a propósito:**
  - tres textos con `font-size` escrito en línea: `StartScreenUI` (22 px), mochila vacía en `main.js` (12 px) y un estilo de `CombatHUD`;
  - las etiquetas de canvas del minimapa.
- **Sin colores de daltonismo:** las placas de los enemigos del mundo abierto (rojo de alerta, que ya lleva el rombo «!»). Las marcas de misión no cambian.
- «Reducir movimiento» respeta siempre la opción de Windows. Si Windows la tiene activada, apagarla en el juego no la quita.
