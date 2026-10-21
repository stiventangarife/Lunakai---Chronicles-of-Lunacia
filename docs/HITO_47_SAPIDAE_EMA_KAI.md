# Hito 47 — Sapidae Ema y Kai en la personalización

> **Estado:** completado en la versión de prueba (21-oct-2026). Actualizado el 21-oct con los modelos definitivos de piezas A–E.
> **Pedido:** usar los modelos nuevos `Sapidae_Ema.glb` (femenina) y `Sapidae_Kai.glb` (masculino) en la creación del personaje, con sus expresiones y su pelo.

## 1. Los modelos

Los dos usan el mismo esqueleto que el Sapidae de siempre (111 huesos) y las mismas animaciones (Idle, Walk, Run, Run_Fast, Attack, Skill, Dead). Cada parte es una malla con su propia textura (sin atlas) y se muestra u oculta según la elección. Nombres: `Kai_<grupo>_<A–E>` y `Ema_<grupo>_<A–E>`.

### Kai (masculino)

| Grupo | Piezas | En el creador |
| --- | --- | --- |
| Peinado (`Kai_hair_A–E` + `Kai_head_A–E`) | Rubio, Moño, Plateado, Castaño, Ceniza | 5 opciones + color |
| Ojos (`Kai_eyes_A–E`) | Normal, Sorprendido, Alegre, Confiado, Enfadado | 5 opciones + color de ojos |
| Boca (`Kai_mouth_A, B, E`) | Sonrisa, Gatuna, Molesto | 3 opciones (las mallas C y D quedan ocultas) |
| Camisa (`Kai_shirt_D`) | Siempre la D (naranja) | Solo color |
| Cuernos (`Kai_horns_A`) | Siempre los de serie | Solo color |
| `Kai_body`, `Kai_pants` | Siempre visibles | — |

Por defecto: peinado A, ojos A, boca A, camisa D (`KAI_DEFAULTS`).

### Ema (femenina)

| Grupo | Piezas | En el creador |
| --- | --- | --- |
| Peinado (`Ema_hair_A–E` + `Ema_head_A–E`) | Trenza, **Rizos**, Larga, Despeinada, Moño | 5 opciones + color |
| Ojos (`Ema_eyes_A–E`) | Normal, Coqueta, Decidida, Tranquila, Ilusionada | 5 opciones + color de ojos |
| Boca (`Ema_mouth_A–E`) | Pequeña, Gatuna, Enfadada, Sorpresa, Sonrisa | 5 opciones |
| Camisa (`Ema_shirt_B`) | Siempre la B (turquesa) | Solo color |
| Cuernos (`Ema_horns_A`) | Siempre los de serie | Solo color |
| `Ema_cheek` | Rubor siempre visible | — |
| `Ema_hat`, `Ema_mouth_C_in` | Siempre ocultos | — |

Por defecto: peinado B (Rizos), ojos A, boca E (Sonrisa), camisa B (`EMA_DEFAULTS`).

## 2. Qué se ve en el juego

- **Creación de personaje → Apariencia:** Base («Femenina · Ema» / «Masculina · Kai»), Peinado y su color, Expresión (Ojos y Boca), Color de ojos, Color de cuernos y Color de camisa. Cada opción lleva su imagen (`assets/ui/creator/`: `hair_kai_*`, `eyes_kai_*`, `mouth_kai_*`, `outfit_kai_*`, `hair_ema2_*`, `eyes_ema2_*`, `mouth_ema2_*`). Al cambiar de base se cargan sus valores por defecto. «Aleatorio» elige entre las piezas reales. La muestra «Original» de cada color es el color real de esa base y ese peinado.
- **Pelo y cabeza del mismo color:** cada peinado enciende su cabeza, que trae el pelo de la frente pintado. El color tiñe el pelo y esa zona de la cabeza (la zona se saca comparando las 5 cabezas: lo que cambia entre ellas es pelo).
- **Camisa:** solo cambia el tono principal de la tela y deja los adornos.
- **Ojos:** el color cambia el iris de las 5 piezas de ojos.
- **Cuernos:** la cabeza también trae unos cuernos cortos; esos vértices se pliegan para que solo se vea la pieza `horns_A`.
- **Combate:** la cara cambia sola y luego vuelve a la elegida.
  - Kai: al atacar, ojos Enfadado + boca Gatuna; al recibir daño o caer, ojos Alegre (cerrados) + boca Molesto.
  - Ema: al atacar, ojos Decidida + boca Enfadada; al recibir daño o caer, ojos Tranquila + boca Sorpresa.
- **Partidas existentes:** el jugador pasa de `sapidae-f-a` a Ema y de `sapidae-m-a` a Kai al cargar la partida; la personalización antigua toma las piezas por defecto. Los NPC siguen con sus modelos de siempre.
- **Cinemática del prólogo (Hito 48):** la silueta del héroe en el final épico es el modelo del jugador, con su peinado.

## 3. Cómo funciona

| Archivo | Qué hace |
| --- | --- |
| `src/rpg/SapidaeModels.js` | **Nuevo.** Claves `sapidae-f-ema` / `sapidae-m-kai` → archivo GLB, `sapidaeModelUrl()` y `playerSapidaeModel()` (modelos antiguos del jugador → nuevos). |
| `src/rpg/SapidaeModularController.js` | `PIECE_SETS { m, f }` con las listas de cada grupo, los valores por defecto y los alias de expresiones de combate. Aplica peinado, cabeza, ojos, boca, camisa, cuernos y colores (`_applyCustomizationKai`, `_kaiHairMask`, `_kaiTintedHead`, `_hideHeadHorns`, `_recolorClothV2`). `setExpression(model, ojos, boca)` sirve para cualquier momento del juego. |
| `src/rpg/ui/StartScreenUI.js` | Panel de apariencia (`_ccRenderLookV2`), aleatorio y resumen. |
| `src/rpg/ui/CharacterPreviewDiorama.js`, `src/rpg/PlayerEntity.js`, `src/tactics/Unit.js`, `src/tactics/CharacterPortraitService.js` | Cargan el GLB con `sapidaeModelUrl()` y tratan ojos, boca y rubor como calcomanías de la cara (sin contorno). |
| `src/rpg/SaveSlotManager.js` | Cambia el modelo de las partidas guardadas a Ema / Kai. |
| `src/tactics/Unit.js` | `_sapiFace()`: expresiones al atacar, al recibir daño y al caer. |

**Personalización guardada** (`slot.customization`): `hairStyle`, `eyeExpr` y `mouthExpr` con la letra de la pieza (`a`–`e`); `outfit` (`d` en Kai, `b` en Ema); colores `hair`, `eyes`, `hornColor` y `suitColor` (`'original'` = color de serie).

## 4. Historial de cambios del 21-oct

1. Primera versión con los modelos de atlas (2 peinados de Ema, atuendos, sombrero y expresiones 2 × 2).
2. Sin la expresión «Pícara»; cuernos solo de serie con color; sin sombrero; imágenes en cada opción.
3. Kai nuevo con piezas A–E: 5 peinados, 5 ojos, bocas (sin Ondulada ni Tímida), camisa D con color, pelo y cabeza del mismo color.
4. Ema nueva con la misma estructura: 5 peinados (Rizos por defecto), 5 ojos, 5 bocas, camisa B con color; `Ema_mouth_C_in` siempre oculta.

## 5. Pruebas

En el juego (navegador integrado): creador con Ema y Kai (todas las piezas, colores y expresiones), partida «Auditoria» cargada en el mundo, retrato del escuadrón y combate de prueba (`lkDebug.arena()`) con las expresiones de ataque y daño. Sin errores en consola. Capturas en `scratch/cc/`.

## 6. Pendiente

- Modelos 3D de sombreros, armaduras y armas para Ema / Kai (el equipo actual sigue siendo de piezas de primitivas).
- Más expresiones (por ejemplo, tristeza al perder).
