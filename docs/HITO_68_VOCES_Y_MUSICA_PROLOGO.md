# Hito 68 — Voces del narrador y música nueva en la cinemática del prólogo

> **Estado:** prueba en la versión de prueba (25-oct-2026), pendiente de la revisión del usuario.

## Voces

- **Archivos:** `assets/voice/<idioma>/prologue_0N_*.mp3`, según el idioma configurado. Ya están las 9 en español y las 9 en inglés. Con un idioma sin voces, la cinemática sigue solo con subtítulos.
- Cada línea suena cuando entra su subtítulo y se corta si se salta la cinemática (`rpg/cinematic/PrologueVoice.js`).

| # | Entra | Dura (es) | Termina (es) |
|---|---|---|---|
| 1 | 0:00,5 | 5,1 s | 0:05,6 |
| 2 | 0:10,5 | 4,3 s | 0:14,8 |
| 3 | 0:19,5 | 4,4 s | 0:23,9 |
| 4 | 0:30,5 | 3,5 s | 0:34,0 |
| 5 | 0:39,5 | 5,4 s | 0:44,9 |
| 6 | 0:47,5 | 4,8 s | 0:52,3 |
| 7 | 0:55,3 | 4,9 s | 1:00,2 |
| 8 | 1:00,3 | 3,2 s | 1:03,5 |
| 9 | 1:04,2 | 1,3 s | 1:05,5 |

- **Inglés:** las tomas caben con los mismos tiempos (la 7 dura 4,2 s y termina a 0:59,5; la 8 dura 2,8 s y termina a 1:03,2). La línea 2 es la más larga (5,4 s, de 0:10,5 a 0:15,9) y entra en su escena.
- **Líneas 7 y 8:** la 7 entra 0,3 s antes y la 8 0,5 s después. Sus subtítulos se movieron igual, así caben completas antes del destello.
- **Volumen igualado en el juego:** cada toma se lleva a ≈ −18 LUFS; los archivos no se tocan.
- La voz sigue el volumen de la música, no el de efectos.
- **La música baja ≈ −10 dB mientras habla el narrador:** rampa de 0,25 s al bajar y 0,6 s al subir. En el «¡Resonad!» no baja.

## Música

- **Pieza nueva** `assets/sounds/PROLOGO.mp3` (clave `PROLOGO` en MusicManager): sustituye a CINEMATICA + BATTLE_BOSS. Se hizo a partir de `assets/voice/music.mp3`, que puede borrarse.
- **Sincronía:** la pieza original dura 58 s y su clímax está a los 54,5 s. Para que no quede silencio al principio, `PROLOGO.mp3` (67,8 s) lleva delante el inicio de la pieza alargado 9,7 s (fundido de 1,7 s hacia la pieza). A partir de los 9,7 s va la pieza original sin tocar, en la misma posición:
  - el cambio a tensión cae al romperse la luna (0:40);
  - el clímax cae en el destello del «¡Resonad!» (1:04,2).
- Suena desde el principio de la cinemática y sustituye con un fundido a la música del mundo.
- Del 1:08 al final (logo) ya no hay música. Se probó a prolongar el último acorde con campanillas hasta el fundido, pero el usuario prefirió esta versión.

## Vídeos de prueba

- `video/Lunakai_Prologo_ES_final.mp4` (español)
- `video/Lunakai_Prologue_EN_final.mp4` (inglés)
- `video/Lunakai_Prologo_ES_voces_musica_anterior.mp4` (comparación con la música de antes)

Son vídeos montados fuera del juego con los mismos tiempos, volúmenes y agachado del código. No incluyen los efectos de sonido sintetizados de la cinemática (golpes del clímax).

## Código

- `rpg/cinematic/PrologueVoice.js` (nuevo)
- `rpg/cinematic/PrologueCinematic.js`
- `audio/MusicManager.js`
