# Hito 27: Motor de combate — Fase 1 (estados, áreas, triángulo elemental y efectos por datos)

> **Estado:** completado. Es la base que usarán las fases 2–4 (Sapidae, Ultimates y cartas de partes).
> Los hechizos actuales se juegan igual: la regresión sigue en 0 diferencias.

## Qué añade

| Sistema | Archivo | Resumen |
| --- | --- | --- |
| Estados alterados | `combat/StatusSystem.js` | 22 estados con duración. La duración cuenta **turnos del afectado** y baja al terminar su turno. Volver a aplicar renueva la duración y se queda con el valor mayor (el veneno suma, máx. 60). |
| Objetos temporales | `combat/BattlefieldObjects.js` | Obstáculos e invocaciones sin vida (bloquean paso y visión) y zonas que dan ±PA/PM al empezar el turno dentro. Colocados en la ronda R, desaparecen al empezar la R+N. |
| Triángulo elemental | `combat/Elements.js` | Asalto (Beast/Bug/Mech) → Bastión (Plant/Reptile/Dusk) → Torrente (Aquatic/Bird/Dawn) → Asalto. ±15 %. Solo actúa si ambas unidades tienen `axieClass`. |
| Efectos por datos | `combat/EffectResolver.js` | Las habilidades nuevas se escriben como `effects: [...]` en vez de campos sueltos. |
| Áreas nuevas | `Spells.js → getAoECells` | `cross2`, `circle1/2/3`, `box3x3`, `line2/3`, `allEnemies`, `allAllies` (además de `single` y `cross1`). |
| Turnos | `TurnManager.js` | Ganchos `onCombatStart`, `onRoundStart`, `onUnitTurnStart`, `onUnitTurnEnd`. Turno perdido automático (aturdido/dormido) y muerte por daño periódico. |
| IA | `TacticalAI.js` | Respeta Provocación (ataca y se acerca al provocador) y Miedo (huye y termina el turno). Reconoce hechizos de daño escritos con `effects`. |
| HUD | `Unit.js` | Iconos de estado con turnos restantes bajo la barra de vida. |

### Estados disponibles

- **Daño periódico** (al empezar el turno del afectado): `poison` ☠️, `bleed` 🩸, `burn` 🔥
- **Control:** `stun` 💫 y `sleep` 💤 (pierde el turno; el sueño se rompe al recibir daño), `fear` 😱 (no puede usar hechizos de daño), `taunt` 🎯 (los enemigos deben atacarle si está a su alcance)
- **Daño (%):** `fragile` +25 recibido, `weak` −20 infligido, `empowered` +15 infligido, `guarded` −20 recibido, `guardedRanged` −30 recibido a distancia, `critUp` +20 crítico
- **Alcance:** `rangeDown` / `rangeUp` (solo hechizos de alcance > 1)
- **Otros:** `healBlock` 🚫 (no puede curarse), `reflect` 🌵 (devuelve daño fijo cuerpo a cuerpo), `immune` 🌟 (inmune a aturdir, dormir y miedo)
- **Próximo turno:** `drained` −PA, `slowed` −PM, `energized` +PA, `hasted` +PM

## Escribir una habilidad con efectos

```js
my_card: {
  id: 'my_card', name: 'Ejemplo', paCost: 3, minRange: 1, maxRange: 4,
  requiresLoS: true, isLinear: false, targetType: 'enemy', areaType: 'single',
  effects: [
    { type: 'damage', min: 60, max: 70, pierceShield: 0.25,
      bonus: [{ if: { targetHpBelow: 0.5 }, add: 20 }] },
    { type: 'status', status: 'bleed', value: 15, duration: 2 },
    { type: 'push', distance: 1 },
  ],
}
```

**Tipos de efecto:** `damage` (min/max, hits, pierceShield, critBonus, bonus[]) · `heal` · `drain` (% del daño hecho) · `shield` · `push` (distance, collisionBonus) · `pull` · `status` · `cleanse` · `dispel` · `resource` (pa/pm, `when: 'now' | 'nextTurn'`) · `summon` (obstáculo temporal, rounds) · `zone` (rounds, ally/enemy) · `teleport` · `swap`

**`target`:** `area` (por defecto, según `targetType`) · `enemiesInArea` · `alliesInArea` · `self` · `allEnemies` · `allAllies`

**Condiciones (`if`):** `targetHpBelow`, `casterHpBelow`, `targetClass: [...]`, `targetHasStatus`, `targetHasDebuff`, `casterHasShield`, `targetNoShield`, `minRound`, `chance`

Así quedan las reglas de cartas acordadas: *Reactivar / reiniciar* → `{ type: 'resource', pa: 2 }`; *abaratar la siguiente carta* → `{ type: 'resource', pa: 1 }`; *Inicial* → el bonus se aplica siempre.

## Eventos nuevos (para tu motor de VFX)

`status:applied` · `status:expired` (reason: expired, woke, cleansed, dispelled) · `status:tick` · `status:skipTurn` · `status:resisted` · `unit:healBlocked` · `unit:teleported` · `unit:pulled` · `field:obstaclePlaced` · `field:obstacleExpired` · `field:zonePlaced` · `field:zoneExpired`. `unit:damaged` incluye `elemental` (1.15 / 0.85) cuando aplica.

## Consola de pruebas (F12)

```js
lkDebug.statusList()                                   // estados disponibles
lkDebug.status("foe", "poison", { value: 20, duration: 2 })
lkDebug.statuses("foe"); lkDebug.clearStatus("foe")
lkDebug.setClass("kotaro", "Beast"); lkDebug.setClass("foe", "Plant")
lkDebug.obstacle(4, 4, 2)                              // obstáculo que dura 2 rondas
lkDebug.cast("active", { targetType: "any", areaType: "cross2",
  effects: [{ type: "damage", min: 100, max: 120 }, { type: "resource", pm: -1, when: "nextTurn" }] }, 5, 5)
```

## Notas

- Los enemigos aún no tienen clase: el triángulo solo se nota entre Axies, o si se añade `axieClass: 'Plant'` a un enemigo en la configuración del nivel. Asignar clases a los enemigos queda para la fase 5 (balance).
- `sm.elementalEnabled = false` apaga el triángulo.
- La Barricada actual sigue siendo permanente; pasará a durar 2 rondas en la fase 2 usando `field.placeObstacle`.

## Verificación

- **Regresión:** 118 escenarios, 1.727 eventos, 0 diferencias frente al `castSpell` original.
- **Fase 0:** desacoplamiento lógica/presentación sigue pasando.
- **Fase 1:** 56 pruebas automáticas (estados, turnos perdidos, muerte por veneno, sueño, miedo, provocación, alcance, las 9 áreas, triángulo ±15 %, caducidad de obstáculos y zonas, los 14 tipos de efecto y sus condiciones).
- **En navegador:** el juego carga sin errores; en un combate real el veneno hace daño al empezar el turno del enemigo, el aturdido pierde el turno solo y los estados caducan.
