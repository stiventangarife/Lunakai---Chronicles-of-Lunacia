# Hito 59 — Dos idiomas (español / inglés): Fases 0 y 1

> **Estado:** en la versión de prueba (24-oct-2026), pendiente de la revisión del usuario.
> **Pedido:** separar los textos que salían mezclados en inglés y español y poder cambiar el idioma desde el juego. Solo cambian los textos que ve el jugador: no se tocan la lógica, los ids ni las variables.

## 1. Decisiones

| Tema | Decisión |
| --- | --- |
| Idioma de un jugador nuevo | **Inglés** (`DEFAULT_LANG = 'en'`) |
| Cambio de idioma | **Recarga guiada**: guarda la partida, muestra un aviso y recarga la página a los 0,9 s |
| Nombres de lugares | Se traducen (islas, zonas, sitios del mapa) |
| Nombres de personajes y cartas | Se quedan igual en los dos idiomas (Kawa, Kotaro, Pomodoro, Bing…) |
| Alcance de este hito | Fase 0 (base) + Fase 1 (interfaz) |

## 2. Base (Fase 0)

- `src/i18n/i18n.js`: `t(clave, params)` con `{marcadores}`, `lang()`, `LANGS`, `DEFAULT_LANG`, `pick({es, en})`, `num(n)` (formato de números del idioma) y `window.lkI18n` para depurar.
- El idioma se lee **una vez** al cargar, desde `localStorage.axie_lk_prefs.lang`. Si falta una clave se usa el otro idioma y, si tampoco está, la propia clave (nunca un texto vacío).
- Diccionarios por módulo en `src/i18n/es/*.js` y `src/i18n/en/*.js`; cada `index.js` los une. **1466 claves por idioma**, el mismo conjunto en los dos.
- Uso: `import * as i18n from '<ruta>/i18n/i18n.js'` y `i18n.t('modulo.clave')`.
- Revisor: `check_i18n.py` comprueba que cada clave usada existe en los dos idiomas, que los dos diccionarios tienen las mismas claves y lista cadenas literales que parecen texto visible sin traducir.

## 3. Interfaz traducida (Fase 1)

- **rpg/ui:** Opciones, pantalla de inicio y creador, Mochila, Escuadrón, HUD del escuadrón, Libro de misiones, fin de combate, minimapa, cartel de zona, cartel de combate, placas de enemigos, viaje en barca.
- **ui:** Forja, Tienda, Runas y charms, Cuidado del Axie, carta de recompensa, HUD de recolección, HUD de combate, temporizador de turno, botón de Ultimate, previsión, pantalla de carga, `lk.js`.
- **Otros:** chip de guardado, mapa del mundo y carta de islas, nombres de lugares de `MapRegistry` e islas de `IslandWorldLayout`, marco de los diálogos, HUD del mundo abierto, `main.js` e `index.html` (con su propio mapa `{es, en}`).
- **Opciones:** `PREF_DEFAULTS.lang = i18n.DEFAULT_LANG`; `_reloadForLanguage()` guarda, avisa y recarga. Restablecer Accesibilidad también vuelve al idioma predeterminado.
- **Inicio:** el selector ES/EN recarga al cambiar. Las ranuras muestran el nombre de la zona en el idioma actual (`zoneLabel` busca el `mapId` en `MAP_REGISTRY`), aunque la partida se guardara en el otro idioma.
- Números con `i18n.num` (separador decimal según el idioma).

## 4. Pendiente (fases siguientes)

| Fase | Contenido | Ejemplos que siguen sin traducir |
| --- | --- | --- |
| 2 — Historia | Diálogos de NPCs, misiones, tutorial | «Prove Your Ferocity», «Habla con Kawa en la playa» |
| 3 — Datos del juego | Objetos, rarezas, habilidades, cartas | «Común · Sabana» en inglés |
| 4 — Mensajes del sistema | Avisos, errores, red | Etiquetas `label` de `GrandIslandZone` |

Detalles menores conocidos: el cartel de zona recuerda las zonas vistas por nombre, así que puede salir una vez más tras cambiar de idioma; el HUD de combate muestra «×1,5» con coma también en inglés.

## 5. Pruebas

- Inglés: inicio, HUD, Mochila y Opciones en inglés.
- Español: cambiar en Opciones recarga en español (título de la pestaña «Lunakai: Crónicas de Lunacia»); ranuras, HUD, Mochila y Opciones en español.
- Consola sin errores. Composición antes/después: `i18n_fase1_es_en.jpg`.
