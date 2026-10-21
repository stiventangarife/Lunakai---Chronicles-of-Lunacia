# Hito 30: Axie Care — subir el vínculo con tu compañero

> **Estado:** completado. Antes el vínculo solo podía bajar (derrotas); ahora se sube jugando, fuera de combate, y al 100 % habilita la Duo Ultimate.
> **Actualización (21-oct-2026, Hito 48):** el tutorial enseña Axie Care (acariciar y dar de comer). Durante esos pasos la caricia no tiene recarga (`AxieCareService.cooldownFree`). Antes de esa fase, abrir el panel avisa de que llegará más adelante. Los valores del vínculo son los del Hito 39.

## Cómo se juega

Haz **clic sobre tu Axie compañero** en el mundo abierto (un clic, no arrastrar la cámara; al pasar el ratón por encima el cursor se convierte en una mano). Aparece un panel flotante anclado sobre él con:

- **Vínculo** actual y **estado de ánimo** del GDD: Desatendido (0-25), Neutral (26-50), Compañero fiel (51-75), Resonancia del alma (76-100).
- **Acariciar:** +5 % de vínculo. Recarga de 2 minutos (el botón muestra la cuenta atrás).
- **Dar de comer:** la comida del inventario, con su cantidad. Cada alimento se consume al dárselo.
- **Paseo juntos:** barra de progreso hacia los próximos +2 % (cada 500 m caminados).

Al acariciarlo o alimentarlo salen corazones, el Axie da un saltito y aparece «+X % vínculo». El panel se cierra con ✕, Esc, un clic fuera, si te alejas más de 9 m o si se abre otro menú o empieza un combate.

| Fuente | Vínculo | Detalle |
| --- | --- | --- |
| Acariciar | +5 % | Recarga de 2 min |
| Baya lunar 🫐 | +10 % | Común |
| Pastelito de arroz del dojo 🍙 | +15 % | Poco común |
| Festín de Lunacia 🍱 | +25 % | Raro |
| Caminar juntos | +2 % | Cada 500 m (a 6,8 m/s, unos 75 s andando) |

## De dónde sale la comida

- **Regalo de bienvenida:** 3 bayas lunares la primera vez que abres el panel en una partida.
- **Cada victoria en combate:** 1 baya lunar y un 25 % de probabilidad de un pastelito de arroz (aparecen en el botín de la pantalla de victoria). No en el tutorial.
- La comida también se puede dar desde la **mochila**: en su ficha el botón es «Dar a tu Axie» y muestra «Vínculo +10 %».
- El Festín de Lunacia aún no se consigue en el juego: queda para recompensas de misiones o tiendas.

## Reglas

- El cuidado va al **Axie principal** del escuadrón (el que decide la Ultimate).
- El vínculo y el estado de Axie Care (recarga de la caricia, metros caminados, regalo entregado) se guardan en la **ranura de guardado**, así que suben a la nube con la partida.
- El paseo solo cuenta explorando con el compañero visible; los teletransportes y cambios de zona (saltos de más de 3 m en un fotograma) no suman.
- En combate el vínculo no cambia (decisión del plan). Las derrotas siguen restando 8 %.

## Archivos

- `src/rpg/AxieCareService.js` — lógica: acariciar, alimentar, paseo, regalo, estados de ánimo. Expuesto como `window.lunakaiAxieCare`.
- `src/ui/AxieCarePanel.js` + `src/ui/lunakai-axie-care.css` — clic sobre el compañero, panel, efectos y medición del paseo.
- `src/tactics/ItemDatabase.js` — 3 alimentos nuevos (`category: 'food'`, `effect: { bond }`).
- `src/rpg/ui/InventoryModal.js` — la comida se da al Axie desde la mochila.
- `src/main.js` — engancha Axie Care y añade la comida al botín de victoria.

## Verificación

- **20 pruebas** en Node: valores de cada fuente, recarga de la caricia, regalo único, comida agrupada y consumida, tope de 100 %, paseo cada 500 m, guardado en la ranura y estados de ánimo.
- **En el navegador** (partida nueva): el clic sobre el compañero abre el panel y entrega las 3 bayas; acariciar 68 % → 73 %, una baya → 83 %; el paseo cuenta 12 m al mover al jugador e ignora un salto de 50 m; un clic fuera cierra el panel.
- Las pruebas del combate (fases 0 a 3) siguen pasando.

## Consola (F12)

`lunakaiAxieCare.status()` · `lunakaiAxieCare.pet()` · `lunakaiAxieCare.feed('food_berry')` · `lunakaiAxieCare.addWalk(500)` · `lkDebug.bond(100)`
