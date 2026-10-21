# Hito 29: Motor de combate — Fase 3 (vínculo y Duo Ultimates)

> **Estado:** completado. El vínculo se guarda por Axie en la partida y las 3 Duo Ultimates funcionan en combate con su carta en la barra.
> **Actualización (21-oct-2026, Hito 48):** la ronda mínima es configurable (`setupCombat({ minRound })`); la prueba de la Ultimate del tutorial (`tut_ult`) la permite desde la ronda 1 con el vínculo prestado al 100 %. El combate guiado sigue sin Ultimate.

## Reglas

| Requisito | Valor |
| --- | --- |
| Vínculo con el Axie principal (squad[1]) | **100 % al entrar al combate** (no cambia durante el combate) |
| Quién la lanza | El Sapidae, en su turno |
| Coste | **6 PA** (todo su turno base) |
| Cuándo | **Desde la ronda 2** |
| Usos | **1 por combate** |
| Otros | El Axie principal debe seguir vivo · no disponible en el tutorial |

La Ultimate depende de la tríada del Axie principal:

| Tríada | Clases | Ultimate | Efecto |
| --- | --- | --- | --- |
| Asalto | Beast · Bug · Mech | **Embestida Destructiva** ⚔️ | AL 1-4 en línea. 150-170 de daño y empuje 3; si choca, 60 de impacto al empujado y a la unidad contra la que choca. |
| Bastión | Plant · Reptile · Dusk | **Égida de Gaia** 🌳 | Aliados a 3 casillas o menos: +80 escudo, +60 HP y limpieza de estados negativos. |
| Torrente | Aquatic · Bird · Dawn | **Maelstrom Celeste** 🌀 | AL 1-5, cruz de 2. 100-120 de daño a enemigos, −2 PM en su próximo turno y −1 PA en el siguiente. La iniciativa no se toca. |

## Vínculo (`src/rpg/BondService.js`)

- Fuente de verdad única: `slot.bond = { heroId: valor }` dentro de la ranura activa, así que se guarda y se sincroniza con la nube como el resto de la partida.
- Migración: si la ranura no tiene valor para un Axie, se toma el del vínculo de demostración de este navegador (`lunakai_demo_bond`) o el valor de demostración por defecto.
- `BondDemo` (CombatEndScreen) es ahora una fachada de BondService: SquadHUD, SquadModal y la pantalla de derrota muestran el valor real sin cambios.
- Solo sube fuera de combate (Axie Care, más adelante). Las derrotas siguen restando 8 %.

## Botón de la Ultimate (medallón del HUD, `src/ui/UltimateButton.js`, `src/ui/lunakai-ultimate.css`)

- Es el medallón circular que CombatHUD dibuja a la derecha de las 6 cartas, tecla **7** (las teclas 1–6 son las cartas).
- El anillo es el **vínculo** con el Axie principal. Estados: **bloqueada** (anillo rosa, candado, «Vínculo 68%») · **en espera** (vínculo completo pero falta la ronda 2, PA o es el turno de otra unidad: «Ronda 2», «Faltan PA», «Turno Sapidae») · **lista** (dorada, con rayos) · **seleccionada** · **usada**.
- El icono central es el de la Ultimate de la tríada (⚔️ 🌳 🌀) hasta que haya ilustraciones.
- Tooltip marfil con la descripción y la lista de requisitos marcados.
- Al lanzarla: texto «✦ NOMBRE ✦» y sacudida; evento `ultimate:used` para tu motor de VFX.
- `UltimateButton.js` ya no crea una carta propia: solo calcula el estado y el tooltip que CombatHUD pinta en su medallón.

## Motor

- `combat/UltimateSystem.js`: definiciones como efectos, `setupCombat`, `check(caster)` (devuelve el motivo exacto), marca de uso al lanzar.
- `SpellManager.castSpell` y `getValidTargetCells` rechazan la Ultimate si no se cumplen las condiciones (botón, tecla o consola).
- Estados con espera (`delay`) y recurso `when: 'turnAfterNext'` (para el −1 PA del Maelstrom); empuje con daño de colisión fijo (`collisionDamage`).

## Consola (F12)

```js
lkDebug.bond(100)   // vínculo al 100 % con el Axie principal (se guarda; en combate habilita la Ultimate)
lkDebug.ult()       // qué Ultimate tienes y por qué no se puede lanzar
lkDebug.ultReset()  // volver a usarla en este combate (pruebas)
```

## Verificación

- **33 pruebas** de Fase 3: guardado y migración del vínculo, las 9 clases → 3 tríadas, cada requisito por separado (ronda 1, 99 %, 5 PA, Axie caído, otra unidad, tutorial, segundo uso) y el efecto exacto de cada Ultimate.
- Fases 0, 1 y 2 siguen pasando; la regresión del resto de hechizos sigue en 0 diferencias.
- En el navegador: con vínculo 68 % la carta aparece bloqueada; con `lkDebug.bond(100)` en la ronda 2 queda lista; se lanzó la Embestida sobre una quimera y la carta pasó a «Usada».
