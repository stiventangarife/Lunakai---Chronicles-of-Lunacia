# Hito 73: Colisiones de Génesis

Quinta y última isla de la revisión de colisiones. Usa la base común de las islas grandes (Hito 71), el deslizamiento (Hito 70) y las huellas exactas (Hito 72d).

## Antes

158 colisiones: puerta del santuario, monumentos y tótem de la plaza, fogata, obeliscos, santuario del Origen (columnas y arco), columnas de lavanda, tocones, troncos huecos (un círculo en el centro), campamento de Tripp y NPC. No había regla de agua ni de pendiente: se caminaba mar adentro sin límite.

## Ahora

| Elemento | Colisión |
|---|---|
| Árboles redondos (47) y árboles secos (20) | tronco |
| Cristales rosas de la cantera de Tripp (39) | huella exacta (contorno), en lugar de los círculos por grupo |
| Troncos huecos caídos | círculos a lo largo de todo el tronco: los extremos ya no se atraviesan |
| Piedrecitas de lavanda, ramitas, flores, hierba | ninguna, se pisan |
| Mar | hasta la rodilla (0,5 m), con ondas |
| Pendiente de más de 35° | solo el desnivel tras el gran arco del santuario (la isla es casi llana) |

**Comprobación de alcance desde el muelle:**
- se llega a Kawa, Kotaro, Tripp, el Espíritu de Atia, la plaza, el santuario, la cantera y el bosque;
- solo quedan dos huecos sueltos de 1 m² entre columnas.

**Cristales:** acercándose a cada uno desde 16 direcciones (421 intentos), el personaje nunca entra en la huella.

**Deslizamiento:**

| | Velocidad al rozar | Atascado | Veces dentro de una colisión |
|---|---|---|---|
| Antes | 32 % | 48 % | 825 |
| Ahora | 50 % | 30 % | 0 |

## Cambios en el código

- `DungeonIsland.js`: `collision` con `propRules` (árboles y decoración), `hullRules` (cristales de la cantera), pendiente y agua.
- `GenesisLandmarks.js`: sin el círculo por grupo de cristales.
- `GenesisNature.js`: los troncos huecos llevan círculos a lo largo del eje.

## Capturas

- `scratch/col/genesis_antes.jpg` y `genesis_despues.jpg`.
- `scratch/col/genesis_vadeo.jpg`: en la orilla.
