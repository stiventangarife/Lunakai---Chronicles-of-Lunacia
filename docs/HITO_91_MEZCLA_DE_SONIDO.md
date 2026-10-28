# Hito 91: Mezcla de sonido (fase 6 del plan)

> **Estado:** en la versión de prueba (27-oct-2026), pendiente de escucharlo en el juego.
> **Pedido:** fase 6 del plan: el repaso final del volumen de música, ambiente y efectos.

## 1. Lo que se midió

Sonoridad con ffmpeg (`ebur128`, LUFS), con las opciones por defecto: General 100, Música 75, Efectos 80, Ambiente 60.

| Capa | Antes |
|---|---|
| Música de las islas | −22,7 LUFS (Bosque); temas de −18,6 a −20,9 en el archivo |
| Música del combate | **−17,6** LUFS (el archivo está a −13,5) |
| Victoria y derrota | −12,2 y −15,8 en el archivo |
| Ambiente | −29 (Ártico) a −40 (Génesis); Bosque −33 |
| Pasos | Pico momentáneo de **−46** |
| Golpes del combate | Pico momentáneo de **−40**, unos 25 dB por debajo de la música del combate |

**Conclusiones:**
- La música del combate y la victoria sonaban 6–8 dB más fuertes que la de las islas.
- **Todos los efectos quedaban unos 20 dB por debajo de la música**: el bus de efectos tenía una base de 0,25. Los golpes casi no se oían.

## 2. Cambios

| Qué | Antes | Ahora |
|---|---|---|
| Música | Cada pista a su nivel | Todas igualadas a **−20,5 LUFS** (`TRACK_LUFS` y `trackGain` en `MusicManager`). Solo se bajan las fuertes: combate ×0,45, jefe ×0,53, victoria ×0,38, derrota ×0,58, Bosque y Sabana ×0,8. |
| Bus de efectos | Base 0,25 | Base **0,6** (+7,6 dB), en `TacticalAudio.SFX_BASE`. |
| Compresor | No había | **Compresor suave** en el bus de efectos (umbral −14 dB, 4:1). Solo actúa cuando suenan muchas cosas a la vez, para que no saturen. |
| Golpes del combate | ×0,8 | ×1,1 (+2,8 dB) en `CombatSfx`. |
| Ambiente del Ártico | Igual que las demás islas | −3 dB (`ISLAND_TRIM`), sin cambiar su ventisca: quedaba solo 4 dB bajo la música. |
| Volumen «Efectos» | `SettingsModal` fijaba el bus con su propio 0,25 | `audio.setSfxVolume(general × efectos)`. |
| Silenciar y volver | El bus volvía a 0,25 sin mirar Opciones | Vuelve al nivel de Opciones. |

## 3. Resultado con las opciones por defecto

| Capa | Antes | Ahora |
|---|---|---|
| Música del Bosque | −22,7 | −24,9 |
| Música del combate | −17,6 | −24,2 |
| Ambiente del Bosque (por debajo de la música) | 10 dB | 8 dB |
| Pasos (pico momentáneo) | −46 | −38 |
| Golpes (pico momentáneo) | −40 | −30 |
| Distancia entre golpes y música del combate | ~24 dB | ~7 dB |

- La música queda pareja entre las islas y el combate.
- El ambiente se mantiene de fondo.
- Los pasos se oyen sin molestar.
- Los golpes se oyen por encima de la música, como corresponde a un sonido breve.
- Los picos de la mezcla bajan de −5 a −10 dBFS en combate: hay más margen.

## 4. Archivos

| Archivo | Cambio |
|---|---|
| `src/audio/MusicManager.js` | `MUSIC_TARGET_LUFS`, `TRACK_LUFS` y `trackGain()`; `playTrack` iguala cada pista. |
| `src/tactics/TacticalAudio.js` | `SFX_BASE`, `_sfxVol`, `setSfxVolume()`, compresor `sfxComp`; silenciar respeta el nivel de Opciones. |
| `src/rpg/ui/SettingsModal.js` | El volumen «Efectos» va por `setSfxVolume`. |
| `src/audio/AmbienceManager.js` | `ISLAND_TRIM` (Ártico −3 dB). |
| `src/audio/CombatSfx.js` | Golpes ×1,1. |

## 5. Para el futuro

- **Cambiar o añadir una canción:** medirla (`ffmpeg -i pista.mp3 -af ebur128 -f null -`, valor `I:`) y poner su número en `TRACK_LUFS`.
- **Si todo suena demasiado fuerte o flojo:** el control está en Opciones. Para cambiar el equilibrio por defecto:
  - `SFX_BASE` (efectos);
  - `MUSIC_TARGET_LUFS` (música);
  - `MIX_GAIN` en `AmbienceManager` (ambiente).
