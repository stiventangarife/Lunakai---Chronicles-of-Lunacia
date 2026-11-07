# Hito 92: Cascos y armaduras de Ema y Kai

> **Estado:** en la versión de prueba (27-oct-2026), pendiente de probarlo en el juego.
> **Pedido:** los GLB nuevos de Ema y Kai traen mallas de cascos y armaduras; deben cambiar según el equipo del Sapidae (por ejemplo, `beast_helmet` → la calabaza). Solo cambian la camisa y el sombrero.

## 1. Antes

- El equipo de Ema y Kai se dibujaba por código:
  - un casco hecho de piezas simples sobre el hueso de la cabeza;
  - hombreras sobre el pecho;
  - la camisa teñida del color de la armadura.
- Los GLB nuevos traían 8 mallas que el código no reconocía. Con ellos tal cual, se habrían visto los 8 cascos y armaduras a la vez.

## 2. Ahora

### Objeto → pieza del modelo

| Ranura | Común | Raro | Épico | Místico |
|---|---|---|---|---|
| Sombrero | `beast_helmet` → `hat_beast` (calabaza) | `straw_hat` → `hat_straw` | `arcane_ring` → `hat_bronze` | `crown_of_lunacia` → `hat_obsidian` |
| Armadura | `traveler_cloak` → `shirt_traveler` | `chitin_armor` → `shirt_chitin` | `bronze_armor` → `shirt_bronze` | `obsidian_plate` → `shirt_obsidian` |

La tabla está en `EQUIP_MESH_PIECES` (`SapidaeModularController.js`). Un objeto que no esté en ella sigue con el accesorio dibujado por código.

### Qué se ve con cada pieza

- **Armadura:** se muestra su malla y se oculta la camisa base. Al quitarla vuelve la camisa con el color elegido.
- **Casco:** se muestra su malla, sin el casco dibujado por código.
  - **Kai:** se oculta el pelo. La cabeza trae el flequillo pintado, del mismo color que el pelo elegido.
  - **Ema:** el pelo se aplasta bajo el casco. Lo que queda por debajo (trenzas, coletas, melena) se ve igual que siempre.
  - **Los dos:** la cabeza también se ajusta, porque la nuca pintada asomaba por los huecos del casco de bronce.
- **El equipo se conserva:** si después se cambia la personalización (color, peinado, expresión), el casco y la armadura siguen puestos.

### «Corona arcana» → «Casco de bronce»

Cambian el nombre y la descripción, en español e inglés. El icono ya era el del casco. El id interno sigue siendo `arcane_ring`, para que las partidas guardadas y la Forja sigan funcionando.

## 3. Cómo se aplasta el pelo (`src/rpg/HatHairFit.js`, nuevo)

1. **Mapa del casco.** Desde el centro de la cabeza se lanzan 72 × 36 rayos (todas las direcciones) contra el casco, para medir la distancia a su cara interior en cada dirección.
   - Se ignoran los choques más cerca que la piel: algunos cascos traen tapas por dentro.
   - Se rellenan los huecos del casco: si más abajo en la misma columna hay casco, el hueco cuenta como casco.
2. **Ajuste del pelo.** Cada vértice del pelo que queda más lejos que el casco × 0,88 se acerca al centro hasta quedar dentro. Para la cabeza se usa 0,97. Junto al borde del casco basta con que una dirección vecina lo toque, para que no asomen mechones.
3. **Copia, no modificación.** El resultado es una copia de la geometría; la original no se toca. Se guarda por combinación (peinado × casco) y se comparte entre todas las copias del modelo.
   - El contorno negro usa la misma copia.
   - Si el combate libera su geometría, sus copias también se liberan.
4. **Coste.** El primer casco tarda ~100–170 ms, porque incluye medir la cabeza; los siguientes, ~25–50 ms. Repetir uno ya calculado es inmediato.

## 4. Modelos (`assets/models/Sapidae_Ema.glb`, `Sapidae_Kai.glb`)

Los GLB exportados pesaban más del doble que los anteriores. Se reempaquetaron:

| | Exportado | En el juego | Antes del Hito 92 |
|---|---|---|---|
| Ema | 17,2 MB | **10,2 MB** | 7,9 MB |
| Kai | 14,9 MB | **8,9 MB** | 6,7 MB |

- **Ojos, boca y pelo:** venían a 2048, pero eran los de 1024 ampliados (mismos píxeles). Se usan los de 1024 del modelo anterior; no se pierde nada.
- **Armadura de obsidiana:** JPG de 2048 (2,4 MB) → WebP de 1024 (156 KB).
- **Ropa de viajero:** PNG de 1024 (646 KB) → WebP de 1024 (66 KB).
- **Cuerpo:** sigue a 2048 (Hito 49: solo el cuerpo del jugador y los jefes).
- **Lo que se queda:** los ~1,5 MB restantes de diferencia son la geometría de las 4 armaduras (≈5–6 mil vértices cada una) y de los 4 cascos.

## 5. Archivos

| Archivo | Cambio |
|---|---|
| `src/rpg/HatHairFit.js` | **Nuevo.** Ajuste del pelo y la cabeza bajo el casco (`fitUnderHat`, `baseGeometry`). |
| `src/rpg/SapidaeModularController.js` | Reconoce las piezas `<Kai\|Ema>_hat_<pieza>` y `<Kai\|Ema>_shirt_<pieza>`, también las mallas de un grupo. Añade `EQUIP_MESH_PIECES` y `_applyKaiEquipMeshes`; con malla en el modelo no se crean los accesorios por código. Libera de la GPU las texturas de las piezas ocultas. |
| `src/tactics/ItemDatabase.js`, `src/i18n/es/items.js`, `src/i18n/en/items.js` | «Corona arcana» → «Casco de bronce» / «Bronze Helmet». |
| `assets/models/Sapidae_Ema.glb`, `Sapidae_Kai.glb` | Modelos nuevos con texturas optimizadas. |

No hizo falta tocar a quien usa el controlador: el mundo, el inventario, el combate (`Unit.js`), los retratos y el tutorial ya llaman a `applyEquipment`.

## 6. Comprobado (Chromium, con el controlador y el contorno del juego)

- **Ema y Kai, con cada objeto y con combinaciones de casco y armadura:**
  - se ve solo la pieza que toca, sin accesorios dibujados por código;
  - el contorno usa la geometría ajustada;
  - al quitarlo todo vuelve la camisa y el pelo original.
- **Personalización después de equipar:** el equipo se conserva, también con el pelo teñido.
- **Ema, todos los peinados (A–E) con los 4 cascos, de frente y de espaldas:** las trenzas y la melena quedan; ni el pelo ni la nuca asoman por el casco.
- **GLB optimizados:** cargan y se ven igual que los exportados.

## 7. Pendiente

- Probarlo en el juego: equipar y desequipar en el inventario, entrar en combate y ver el retrato del escuadrón.
- La cola alta de Ema (peinado E) queda aplastada en forma de aleta por detrás con cualquier casco. Si no convence, se puede ocultar solo para ese peinado o hacer en Blender una versión de la cola para cascos. **[Resuelto · revisión del 7-nov-2026: el usuario confirma que ya no ocurre.]**
- Armas con malla propia (siguen siendo las de `WeaponVisuals`).
