# Hito 57 — Modelos GLB en la Isla Mística

> **Estado:** en la versión de prueba (24-oct-2026), pendiente de la revisión del usuario.
> **Pedido:** poner la casa del Bosque, cambiar el tótem del árbol del lago por `statue_mystic`, sacar del lago una flor de recolección y decorar con `statue_mystic`, todo optimizado.

## 1. Qué cambia

| Lugar | Antes | Ahora |
| --- | --- | --- |
| **Casa del astrólogo** (50, −26) | Casa de piedra y entramado con primitivas | `house.glb` ×4 (la del Bosque), mirando hacia donde miraba. El jardín de cristales de amatista se queda a su lado (algo más separado, porque la casa nueva es más ancha). Zócalo de piedra gris violácea si hay pendiente. |
| **Islote del pantano** (−61.6, 59.8) | Pilar de runas de primitivas frente al sauce | `statue_mystic` ×1.3 (~2,4 m) en el mismo sitio, mirando a la Chamana Espiritual. |
| **Flor del pantano** (`herb_mystic_2`) | En (−50, 50), dentro del agua del pantano | En (−46, 33), en la orilla sur, a unos 8 m de la Chamana. Mismo id y nombre: las partidas no cambian. |
| **Observatorio Astral** | — | `statue_mystic` junto a la farola derecha de la puerta. |

La isla solo tenía una casa (la del astrólogo).

## 2. Código

- `islands/kit/IslandProps.js`: entrada `statue_mystic` (escala 1.3, colisión 0.8). La casa usa la caché `#islas`, compartida con la Sabana y el Ártico.
- `islands/mystic/MysticLandmarks.js`: `_buildModels()` coloca las piezas GLB en su propio grupo, `MysticProps`, porque llegan después de `mergeStaticByMaterial`. `_buildHouse()` deja solo el jardín de cristales. Se quita el pilar de runas de `_buildIslet()`.
- `tactics/data/GatheringCatalog.js`: nueva posición de `herb_mystic_2`.

## 3. Assets

| Archivo | Cambio | Tamaño |
| --- | --- | --- |
| `assets/environment/statue_mystic.glb` | Mapa de normales 1024 → 512 | 405 KB → 274 KB |

Original en `scratch/_respaldo_glb/`.
