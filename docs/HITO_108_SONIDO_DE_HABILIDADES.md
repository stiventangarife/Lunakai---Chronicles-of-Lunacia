# Hito 108: Sonido de las habilidades (pack de combate, Sapidae, enemigos, estados y Ultimates)

> **Estado:** en la versión de prueba (31-oct-2026), probado en Chromium con el código real y el bus de efectos del juego; pendiente de escucharlo en combate.
> **Pedido:** integrar el pack de sonidos de combate (`assets/sounds/sfx/combat/*.wav`) en las habilidades, sincronizado con sus VFX, y dar sonido a lo que el pack no trae (Sapidae, gólems, Ultimates, enemigos), con el juego fluido.

## 1. Antes

- El pack de 161 WAV (entonces en `assets/sounds/sfx/combat/`) no sonaba: el código buscaba `combat/hit_beast_N.mp3` y el pack usa `{clase}_{animación}_{attack|fly|hit}.wav`.
- Dos archivos tenían `#` en el nombre (el navegador nunca los pedía) y los WAV pesaban 35,6 MB.
- Las cartas sonaban con 7 sonidos genéricos (`melee`, `bow`…); el golpe no esperaba al impacto del VFX.
- La Ultimate sonaba al pulsar el botón, no al impactar. Los enemigos y el Sapidae, con síntesis 10–15 dB más baja.

## 2. Fases

| Fase | Qué | Archivos |
|---|---|---|
| 1 | Pack preparado: MP3 mono 48 kHz, silencio recortado con fundidos, sonoridad igualada por categoría (EBU R128, sin limitador), nombres corregidos, duplicados como alias. 35,6 MB → 2,8 MB (145 sonidos). | `tools/audio/build_skill_sfx.py`, `assets/sounds/sfx/skills/*.mp3`, `manifest.json`; WAV en `backups/2026-10-30_sounds/combat/` |
| 2 | Tipo de ataque de las 235 cartas (bite, gore, slash, smash, cast, projectile, throw) según lo que dibuja su VFX; cartas α, variantes y colección. | `src/audio/SkillSfxMap.js` |
| 3 | Sonido sincronizado: ataque al lanzar, vuelo hasta el impacto, impacto en `spell:impact`; los cuerpo a cuerpo se adelantan para que su golpe caiga en `ti`. | `src/audio/SkillSfxBank.js`, `CombatSfx.js`, `VfxBridge.js` (devuelve `ti`), `main.js` (precarga) |
| 4 | Sapidae (timbre afín + firma sintetizada por clase), gólems, 31 estados, curas, escudos, limpiezas, crítico, contraataque, PA, runas y guion de las 3 Ultimates. | `SkillSfxMap.js`, `CombatSfx.js` |
| Enemigos | Las 86 habilidades no-Sapidae de `SPELLS_DB` (61 de enemigos con VFX): timbre por criatura, firma (gruñido, rugido, aullido, baba, hielo, terremoto) y golpe genérico de refuerzo. | `SkillSfxMap.js` (`ENEMY_SFX`), `CombatSfx.js` |
| 5 | Mezcla final frente a la música, atenuación de la música en las Ultimates, recorrido de VFX con sonido y comandos de consola. | `CombatSfx.js`, `VfxTour.js`, `CombatDebug.js` |

## 3. Cómo suena una habilidad

1. `spell:cast` → `CombatSfx._skillCast`: si la habilidad tiene sonido cargado, se anota y el sonido antiguo se calla. Si no, suena lo de siempre y se carga para la próxima vez.
2. `spell:windup` → a distancia: ataque y vuelo; cuerpo a cuerpo: el ataque se programa para que su arranque de golpe caiga en `ti` (lo da el VFX). Firma del Sapidae o del enemigo (al lanzar o en el impacto).
3. `spell:impact` → se corta el vuelo; impacto (`_hit`) y golpe de refuerzo.
4. `unit:damaged` → no repite el golpe de clase; el crítico y el golpe grave de 3+ PA siguen.

**Clase del sonido:** la del Axie que lanza (Mech, Dawn y Dusk suenan a sí mismos). Sapidae y enemigos: la de su tabla.
**Saltos, barricadas y transposiciones** (sin `spell:windup`): sonido de siempre.

## 4. Mezcla (fase 5)

Medido con General 100, Música 75, Efectos 80 y el compresor del bus. La música del combate queda a −24 LUFS de mediana momentánea (−22,4 el 10 % más fuerte).

| Capa | Antes (fases 3–4) | Ahora (momentáneo máximo) |
|---|---|---|
| Carta de 2 PA | −26 | **−21** (+3 dB sobre la música) |
| Sapidae y enemigos (3–5 PA) | −22 a −26 | −18 a −21 |
| Estados, curas, escudos | −28 | −24 |
| Ultimates | −19 | −16, con la música −6 dB durante su guion |
| Golpe genérico (sin sonido propio) | −29 | −23 |

Ajustes: `SKILL_MIX`, `FX_MIX`, `LAYER_GAIN`, `ULT_SYNTH_GAIN` y `ULT_DUCK` al principio de `CombatSfx.js`.

## 5. Rendimiento

- Al empezar el combate (detrás del velo) se cargan solo los sonidos de las cartas, efectos y Ultimate de las unidades presentes, más unos comunes. Como mucho 4 descargas a la vez.
- `decodeAudioData` decodifica fuera del hilo principal; lo único que se calcula es el arranque del golpe de cada archivo, una vez.
- Tope de memoria: 32 MB decodificados; se sueltan los menos usados que no sean del combate en curso.
- Si falta `manifest.json`: una sola petición, sin errores en consola, y todo sigue sintetizado.

## 6. Consola

| Comando | Qué hace |
|---|---|
| `lkDebug.sfx('skills')` | Las 7 animaciones de las 9 clases |
| `lkDebug.sfx('sapidae')` · `('enemigos')` · `('estados')` · `('ultimates')` | Cada grupo |
| `lkDebug.sfx('recorrido', { grupo: 'enemigos' })` | El recorrido de VFX (Hito 102) con su sonido; el panel dice qué suena (🔊) |
| `lkDebug.sfx('skill', 'part_beast_mouth_goda')` | Qué suena con esa habilidad |
| `lkDebug.sfx('memoria')` | Sonidos cargados y memoria |

## 7. Para el futuro

- **Los WAV originales** están en `backups/2026-10-30_sounds/combat/` (31-oct, fuera de `assets/`): el juego no los usa, solo el script.
- **Cambiar o añadir un WAV:** dejarlo en esa carpeta y ejecutar `python tools/audio/build_skill_sfx.py` desde `axie-tactics-web/` (necesita ffmpeg; `--src` si la carpeta cambia).
- **Cambiar el sonido de una carta:** una línea en `CARD_ANIM` (`SkillSfxMap.js`). Sapidae: `SAPIDAE_SFX`; enemigos: `ENEMY_SFX`; estados: `STATUS_SFX`; Ultimates: `ULTIMATE_SFX`.
- **Una habilidad enemiga nueva:** añadirla a `ENEMY_SFX`; si no, suena con el golpe genérico del pack.
- **Publicar:** Netlify publica toda la carpeta (`publish = "."`), así que `backups/` (con los 35 MB de WAV) se subiría también; conviene excluirla del despliegue.
- Falta la línea del pack en `assets/sounds/sfx/CREDITOS.txt` (autor, fuente y licencia).
- `docs/AUDIO_ARCHIVOS_A_CONSEGUIR.md`, apartado 3: lleva una nota; las familias `combat/hit_*` del Hito 88 ya no hacen falta.
