# Hito 52 — Armas del mixer en el Sapidae y en el Axie

> **Estado:** en la versión de prueba (23-oct-2026). Agarre ajustado dos veces más (secciones 4b y 4c).
> **Pedido:** usar los modelos de armas de la librería del mixer (espadas, arcos y bastones) cuando el Sapidae o el Axie tengan un arma equipada; cada uno lleva la suya. Las armas no se ajustaban a la mano.

## 1. Qué modelo lleva cada arma

Modelos en `assets/axie/weapons/v2/<Familia>/<familia>-l<N>.glb` (280–750 triángulos, 45–330 KB). Un nivel por Tier:

| Tier | Espada | Arco | Bastón |
| --- | --- | --- | --- |
| 0 | Espada de madera → l1 | Arco compuesto → l1 | Bastón de hongo → l1 |
| 1 | Espada de hierro → l2 | Arco de hueso → l2 | Bastón de planta → l2 |
| 2 | Espada del pez → l4 | Arco de planta → l3 | Bastón de hielo → l3 |
| 3 | Espada de quimera → l5 | Arco de pájaro → l4 | Bastón de la llave → l4 |

Tabla y agarres en `rpg/WeaponVisuals.js`. Las armas que no están en la tabla siguen con el arma hecha con primitivas.

## 2. Por qué no se ajustaban

- **Sapidae:** el arma era de primitivas y se colgaba de `Weapon_R` con un giro fijo que la dejaba perpendicular al eje del hueso (hacia `WeaponEnd_R`): la hoja salía de lado, a la altura de la cabeza. Tampoco compensaba la escala del hueso, que algunas animaciones cambian (en Kai, 0,64 en reposo).
- **Axie:** el juego forzaba siempre `Default.Idle/Run`, así que con un arma no adoptaba la postura del arma.

## 3. Cómo funciona ahora

| Pieza | Archivo |
| --- | --- |
| **Sapidae:** copia estática del modelo (sin esqueleto) colgada de `Weapon_R`. El mango pasa por el hueco del puño (del meñique al índice, eje Y del hueso; centro en `FIST_R`) y las tres familias salen hacia delante, casi horizontales y algo hacia dentro. La espada sube ~6° y el bastón ~25°, lo justo para no tocar el suelo al correr. El punto del mango que queda en el puño depende del modelo (espadas: un 10–18 % del largo según el nivel). Cada cambio lleva un número para descartar cargas viejas. | `WeaponVisuals.js` (`SAPIDAE_GRIP`, `mountOnSapidae`), `SapidaeModularController._updateWeaponProp` |
| **Axie compañero:** `equipWeapon('sword-l2')` de la librería (lo coloca en `Root_Weapon_R_JNT`/`_L`) y animaciones del arma (`Sword.Idle`, `Bow.Run`…). Se vuelve a poner sola al cambiar de compañero, y después de pescar o talar vuelve el arma que tenía. | `PlayerEntity` (`setCompanionWeapon`, `companionClip`), `OverworldManager._refreshCompanionWeapon`, `GatheringActors` |
| **Axies en combate:** cada uno lleva el arma equipada (`equipped` en su configuración) con sus animaciones de reposo, carrera y ataque (`Sword.Attack` en lugar de `Action.AttackCombo`). | `main.js`, `tactics/Unit.js` (`clip`) |
| **Memoria:** la librería quita el arma anterior pero no libera su esqueleto (una textura huérfana por cambio). `equipAxieWeapon` lo libera, y `disposeAxieWeapons` antes de desechar un Axie. Medido: 36 cambios de arma, el contador de texturas no se mueve. | `WeaponVisuals.js` |

## 4. Pruebas

- Mundo abierto, partida «Auditoria»: los 12 modelos en el Sapidae y en el Axie (capturas `armas_mixer.jpg`).
- Combate de prueba (`lkDebug.arena`): Sapidae con espada de quimera y Axie con arco de pájaro (`Bow.Idle`, `Bow.Attack`).
- Kai: probado al entrar al juego, andando y corriendo (sección 4c).
- Pendiente: la vista previa del inventario y el Sapidae en combate con el agarre nuevo.

## 4b. Ajuste del agarre (23-oct)

Primera vuelta: espada girada (salía al revés) y subida, arco en la mano derecha. Segunda vuelta, la que queda: todas las armas en la misma línea, hacia delante desde la mano, y que la espada no se salga de la mano.

- El puño cerrado del Sapidae deja el hueco a lo largo del eje Y del hueso, con el centro en (-0,035, 0, 0,02). Antes el arma se colgaba por su origen (el pomo) en otro punto, y por eso la espada quedaba fuera de los dedos.
- El punto del mango de cada espada se midió en su geometría: entre el pomo y la guarda.
- Altura mínima sobre el suelo, medida durante las animaciones (andar / correr):

| Arma | Andar | Correr |
| --- | --- | --- |
| Espadas (4 niveles) | 0,24–0,34 m | 0–0,10 m |
| Bastones | 0,11–0,14 m | 0,01–0,05 m |
| Arcos | 0,40–0,45 m | 0,23–0,26 m |

## 4c. Armas pequeñas al entrar con Kai (23-oct)

- Las animaciones de Kai cambian la escala del hueso `Weapon_R` (0,64 en reposo; 1 antes de empezar a animar). Al entrar al juego el arma se montaba antes de la primera animación, se calculaba con escala 1 y luego se veía al 64 % (0,59 m en vez de 0,90 m). Al volver a equiparla se veía bien.
- Ahora `mountOnSapidae` compensa la escala del hueso en cada fotograma: el arma mide lo mismo (0,90 m) al entrar, andando, corriendo y al cambiarla. Ema no cambia (su hueso siempre está a 1).

## 5. Notas

- El Sapidae no tiene animaciones con arma: en combate su pose de reposo levanta un poco el brazo y la espada queda más alta que en el mundo abierto.
- Bing y Pomodoro como compañeros son modelos GLB sin sistema de armas: no muestran arma.
