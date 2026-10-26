# Hito 62 — Dos idiomas: Fase 4 (mensajes del sistema y restos)

> **Estado:** en la versión de prueba (24-oct-2026), pendiente de la revisión del usuario.
> **Pedido:** traducir los mensajes del sistema y los restos de las fases anteriores, sin tocar la lógica. Cierra el trabajo de idiomas (Hitos 59–62).

## 1. Qué se traduce

| Bloque | Archivos | Módulos (claves por idioma) |
| --- | --- | --- |
| Combate: texto flotante («CRITICAL!», «▲ EFFECTIVE», «💥 COLLISION!», «−2 AP»…), iniciativa por runas, PA/PM de la placa, notas de la previsión, ranuras del campamento | `SpellPresentation`, `RuneCharmEffects`, `Unit`, `Forecast`, `CombatHUD`, `main.js` | `combatFx` (36), `system` (5) |
| Avisos de juego: tienda y Forja («No tienes tantos», «Los yunques están ocupados»…), recolección («vuelve en», «No se pudo recolectar»…) | `ShopService`, `ForgeService`, `GatheringNodes`, `GatheringActors` | `notices` (25) |
| Cuenta, red y guardado: errores de inicio de sesión, avisos de la nube («La ranura N se cargó desde otro dispositivo»), proveedor «Correo/Email» | `AuthService`, `CloudSave`, `WorldMapManager`, `StartScreenUI` | `account` (18) |
| Restos: clase y nombre por defecto del jugador, roles base de Bing y Pomodoro, barquero Kawa, bases Femenina/Masculina del creador | `PlayerEntity`, `OverworldManager`, `DialogSystem`, `IslandWorldLayout`, `SapidaeModels`, `EquipmentManager` | `misc` (12) |

Total del juego: **3597 claves por idioma**, las mismas en los dos.

## 2. Arreglos

- **Cartel de zona:** recuerda las zonas vistas por id (`zone_2_2`…), no por nombre. Ya no vuelve a salir al cambiar de idioma. Las zonas vistas antes (guardadas por nombre en cualquier idioma) siguen contando. La clave `lk_zones_seen` no cambia.
- **Decimales según el idioma:** multiplicador del HUD de combate (`i18n.num`), vínculo («Bond 1.5%» / «Vínculo 1,5%», en `BondService.formatBond` y el Escuadrón).
- **Etiquetas del creador antiguo:** `shortLabel` recorta «Cuernos …» en español y «… Horns» en inglés.
- **Comparaciones de texto que siguen funcionando en los dos idiomas:**
  - «Puede esquivar» en la previsión.
  - La música del jefe final, que buscaba un texto que nunca aparecía.
  - El rol del Escuadrón, que se busca en el arquetipo inglés.

## 3. Barrido final: lo que queda sin traducir (a propósito)

- **Nombres propios y oficiales:** personajes y Axies, clases del Sapidae (Forjacubiles, Susurrador, Lunalogista, Astromante), cartas, runas y charms, «Ultimate», Lunakai, Lunacia, Atia, Sapidae, Genesis, AXP, SLP, bAXS, PP.
- **Valores de lógica:** `category: 'Principal'/'Secundaria'`, ids, `direction`/`levelRange` de las zonas (se traducen al mostrarse), «(x3)» de las manadas.
- **Textos de relleno** del HTML que se sustituyen al cargar, toasts de cambio de idioma (salen a propósito en el idioma nuevo) y «Demo 1 (Build V0.2.0)».
- **Solo de desarrollo:** paneles de depuración (escena de demostración, depuración de combate, arena de pruebas, telemetría), `console.*` y errores internos que no ve el jugador.
- **Datos que se guardan en la partida** (`playerName` por defecto, `zone.name`): la interfaz los vuelve a sacar en el idioma actual por id.
- El revisor `check_i18n.py` también lista los textos originales de las listas que traduce `applyText` (cartas, runas, habilidades, objetos), los SVG y los shaders: no son pendientes.

## 4. Pruebas

- **Combate en inglés y en español:**
  - texto flotante («CRITICAL! −42 / ▲ EFFECTIVE» y «¡CRÍTICO! −42 / ▲ EFICAZ»);
  - tooltip de carta («Tactical Anvil … Anvil blow…» y «Gero … 54–66 de daño. Aplica Frágil…»);
  - nombres de la línea de turnos («Slime Chi…» / «Quimera S…»).
- **Escuadrón en español:** «Apoyo moral», «Guardián escudo», «Vínculo 1,5%».
- La consola muestra 5 avisos 404 de recursos al cargar la página. No vienen de la traducción: todos los archivos de idioma cargan y los imports de los archivos tocados ya existían en los originales.
- Composición: `docs/images/i18n_fase4_sistema.jpg`.
