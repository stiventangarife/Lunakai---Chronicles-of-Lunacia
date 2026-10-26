# Hito 63 — Seguimiento de misiones desactivable

> **Estado:** en la versión de prueba (24-oct-2026), pendiente de la revisión del usuario.
> **Pedido:** poder desactivar el seguimiento de misiones (antes solo se podía cambiar a otra misión).

## Antes

Pulsar «Siguiendo» quitaba la misión elegida, pero `getTrackedQuest()` volvía a elegir sola la siguiente misión principal activa. El seguimiento nunca se apagaba.

## Ahora

- **Libro de misiones:** pulsar «Siguiendo» / «Tracking» en la misión seguida desactiva el seguimiento. Al pasar el ratón sale la pista «Pulsa para dejar de seguir». El botón pasa a «Seguir en el HUD» y ninguna misión queda marcada. Pulsar «Seguir» en cualquier misión lo reactiva.
- **Sin seguimiento:**
  - no se muestran la flecha dorada, el marcador 🎯 ni la pista de ruta;
  - el HUD muestra «Exploración · Explora las 9 macrozonas de Lunacia [M]».
- **Decisiones del usuario:**
  - al desbloquearse una nueva misión principal, el seguimiento se reactiva con ella;
  - durante el tutorial del Dojo (`quest_slime_purification` sin completar) no se puede desactivar.
- **Partida:** `trackingOff` se guarda en los datos de misiones. Las partidas antiguas empiezan con el seguimiento activado.
- Las misiones avanzan, se entregan y se completan igual: solo cambia lo que se muestra.

## Código

- `QuestManager`:
  - `trackingOff`, `isTrackingOff()` y `canDisableTracking()`;
  - `getTrackedQuest()` devuelve `null` si está desactivado;
  - `setTrackedQuest()` alterna entre seguir y desactivar;
  - al desbloquear el siguiente capítulo se reactiva;
  - `exportSaveData` / `loadSaveData` guardan y leen `trackingOff`.
- `QuestBookModal`: pista del botón (`questBook.untrackHint`, es/en).
- La flecha, el marcador y el HUD ya sabían mostrar el estado «sin misión»; no se tocaron.
