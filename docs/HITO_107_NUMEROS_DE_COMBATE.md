# Hito 107: Números de combate con el sistema de diseño

> **Estado:** en la versión de prueba (31-oct-2026), pendiente de probarlo en combates reales.
> **Pedido:** rehacer los números flotantes del combate según el sistema de diseño «Crónica Celeste» y mejorar el *game feel*.

## 1. Estilo (sistema de diseño · «Números de combate»)

- Nunito Sans 900 cursiva, cifras de ancho fijo, sombra fina (sin contorno grueso). `index.html` carga ya la cursiva real.
- **Colores:** daño que haces en blanco · daño que recibes en carmesí suave `#FFB4AE` · cura `#9FF0B0` · escudo `#B7F2EC` · crítico `#FFD88A` · esquiva gris en mayúsculas.
- **Tres niveles:**
  - *principal* (2rem, crece con el golpe 0,85–1,45): daño, cura, escudo ganado, esquiva;
  - *crítico* (2,6rem): etiqueta «Crítico» encima del número, destello de un fotograma, anillo y chispas (una sola vez);
  - *etiquetas* (píldoras de 0,78rem con el color del recurso o estado): escudo roto, PA/PM, estados con su icono, runas, gólems, zonas.
- Especiales: sello **KO** al derribar, píldora **Total N** junto a quien lanza cuando un ataque da a 2+ objetivos, título de **Ultimate** en Marcellus.

## 2. Coreografía

- Cada unidad tiene su cola: las etiquetas salen de una en una (0,1 s) y en filas a la derecha del número; nada se pisa.
- Varios números principales a la vez sobre la misma unidad (cura + escudo, crítico + esquiva) van uno encima de otro.
- Golpes seguidos a la misma unidad (< 0,45 s) se **suman** en un solo número que vuelve a latir (`×2`, `×3`).
- El número aparece de ×0,55 a su pico (×1,18; crítico ×1,38) y se asienta; sube 52 px desacelerando (no cae) y se aleja un poco del atacante.
- Golpes grandes (≥ 50 % del «golpe máximo») y críticos **cuentan** hasta su valor en 150 ms.
- Durante la **pausa de impacto** el número se queda en su pico (`combatText.isFrozen`, lo pone `SpellPresentation`).
- La columna de etiquetas pasa a la izquierda si a la derecha hay otra unidad con avisos en pantalla (a menos de 200 px) y a la izquierda no (`_tagSide`); la píldora lleva entonces el filo de color a la derecha.
- «Eficaz / Resistido» ya no es un texto aparte: es una flecha ▲/▼ junto al número.
- Ya no sale «−PA» sobre quien lanza (el HUD lo muestra). Escudo y vida nunca van en la misma línea.

## 3. Uso

```js
combatText.pop({ pos, key: unit, kind: 'hit', value: 48, size, from: posAtacante, adv: 1, merge: true, countUp: true });
combatText.pop({ pos, key: unit, kind: 'debuff', text: 'Veneno · 2', icon, alt });
```

- `kind`: `hit` · `taken` · `crit` · `heal` · `shield` · `miss` · `ko` · `total` · `title` · `shieldBreak` · `pa` · `pm` · `buff` · `debuff` · `gilt` · `info`.
- `spawn(pos, texto, tipo, opts)` sigue funcionando (adaptador) para código antiguo.
- Un aviso nuevo del combate se añade en `SpellPresentation` con `pop`, con `key: unidad` para que entre en su cola.

## 4. Accesibilidad y opciones

- Opciones › Accesibilidad › **Números de combate**: Todos / Solo daño / Ocultos (`access.combatNumbers`).
- Tamaños en rem (crecen con «Tamaño del texto»); modo daltonismo cambia daño recibido y cura (`--lk-fct-taken`, `--lk-fct-heal`); alto contraste oscurece el halo y la píldora.
- «Reducir movimiento»: sin rebote, deriva, conteo, destello ni chispas; solo sube un poco y se desvanece.

## 5. Rendimiento

- Nodos reutilizados (sin crear y borrar `div` en cada golpe), tope de 40 a la vez, una escritura de `transform`/`opacity` por fotograma, sin animaciones infinitas.

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `src/tactics/FloatingCombatText.js` | Reescrito: `pop()`, niveles, colas, suma, conteo, pausa, KO, total, reutilización. |
| `src/tactics/combat/SpellPresentation.js` | Todos los avisos con `pop`; sin «−PA»; escudo aparte; flecha elemental; total de área; KO. |
| `src/ui/lunakai-ui.css` | Estilos `.lk-fct*`. |
| `src/ui/lunakai-access.css` | Daltonismo, alto contraste y movimiento para `.lk-fct*` (fuera las reglas de `.floating-text`). |
| `src/ui/AccessPrefs.js`, `src/rpg/ui/SettingsModal.js` | Opción «Números de combate». |
| `src/i18n/{es,en}/combatFx.js`, `settings.js` | Claves nuevas. |
| `index.html` | Nunito Sans cursiva 800/900. |

## 7. Pendiente

- Probar en combates y ajustar: subida (52 px), ventana de suma (0,45 s), separación de etiquetas (0,1 s), tamaños.
- Si en un ataque en área varias unidades pegadas reciben avisos en el mismo instante, sus columnas aún pueden rozarse.
