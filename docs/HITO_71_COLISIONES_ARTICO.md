# Hito 71: Colisiones del Ártico

Tercera isla de la revisión de colisiones, después del Bosque (Hito 66) y la Sabana (Hito 69). Usa el deslizamiento del Hito 70.

## Antes

211 colisiones: casas, fogatas, vallas, rocas y hielos grandes, NPC y 3 árboles de tala. No había regla de agua ni de pendiente: se podía caminar sobre el mar y subir los cuernos de 62 m.

## Ahora

| Elemento | Colisión |
|---|---|
| Abetos y árboles anchos (164) | tronco. Se leen de las matrices completas del LOD, así que también cuentan los lejanos, que se dibujan simplificados |
| Árboles secos (10) | tronco |
| Menas de cristal (rocas de mineral) | todas, también las pequeñas (71c): 54 nuevas + las que ya tenían colisión. Las de los cuernos quedan fuera de alcance |
| Bloques de hielo (19), rocas (4) | los de más de 0,7 m de alto |
| Losas de permafrost, baldosas, escarcha de orillas, carámbanos del suelo, niebla, peces | ninguna, se pisan |
| Icebergs | ninguna: están en agua de 3 m, a la que no se llega |
| Cuernos del norte, acantilado de la costa (~17 m), pared de hielo del sur (10 m) | pendiente de más de 35°: no se suben. A las plataformas del sur se baja por el camino central |
| Escalones de 1 m de las plataformas de hielo | se pisan |
| Mar | hasta la rodilla (0,5 m), con ondas. En la práctica solo se entra por las plataformas del sur |
| Lago helado, estanque del ermitaño, ríos helados | hielo que se camina (sin ondas) |

**Comprobación de alcance desde el muelle de Kawa** (cuadrícula de 1 m, radio 0,55 m): se llega a Chef Boreal, al Ermitaño, a Kawa, a los 3 árboles de tala, al lago, al valle de la escarcha, al invernadero y al campamento. No queda ninguna zona encerrada.

**Deslizamiento** (recorridos automáticos, misma dirección pulsada):

| | Velocidad al rozar | Atascado | Veces dentro de una colisión |
|---|---|---|---|
| Antes | 27 % | 53 % | 589 |
| Ahora | 47 % | 34 % | 0 |

## Cómo funciona (común a las islas grandes)

- **`GrandIslandZone`** admite `def.collision = { propRules, extraProps, slopeMax, wadeMax, waterSurface, adjust }`. Con eso:
  - calcula la tabla de pendiente y agua (`IslandTerrainMask`, suavizada y sin motas) al cargar la isla, en trozos sin tirones (≈0,5 s repartidos);
  - calcula los círculos de los objetos la primera vez que se entra en la isla (36 ms, durante el viaje);
  - da de alta todo al activar la isla (etiqueta `gisle_<isla>_`) y lo retira al salir;
  - pasa la profundidad del agua a las huellas para que salgan las ondas.
- La altura para la tabla es la de caminar (`zone.getHeight`, con el hielo encima del agua helada). Por eso el agua helada nunca cuenta como profunda.
- Mística y Génesis solo tendrán que declarar su `def.collision`.

## Ajuste: cultivos dentro del invernadero (71b)

- **Parcelas y espantapájaros dentro de la cúpula:** las 4 parcelas (coles, zanahorias, bayas y semilleros con tapa de cristal) y el espantapájaros pasan dentro de la cúpula de Pomodoro (centro 8, 29), en 2×2 y sin valla. Configuración en `ARCTIC_SITES.farm.greenhouse`.
- **Invernadero cerrado:** colisión circular de 7,5 m, del tamaño de la cúpula. Los cultivos se ven a través del cristal. Se quitaron las colisiones de la valla y del espantapájaros antiguos.
- **Hueco de la granja antigua:** el sitio donde estaba queda como claro nevado. Su hueco sin árboles se conserva para que el resto de la vegetación salga idéntica.
- **Alcance:** el camino junto a la cúpula, Pomodoro, su casa y el resto de la isla siguen siendo alcanzables, sin zonas encerradas.
- **Capturas:** `scratch/col/invernadero_antes.jpg`, `invernadero_despues.jpg` e `invernadero_cerca.jpg`.

## Ajuste: huella exacta de rocas, hielo y menas (71d)

- **Mismo método que los cristales de Mística (72d):** cada bloque de hielo, mena (su base y sus cristales) y roca grande tiene como colisión su huella exacta a ras de suelo (contorno de segmentos). Son 50 bloques de hielo, 90 menas, 88 grupos de cristales de mena y 53 rocas: 281 contornos y 2024 segmentos. Están en `ARCTIC_HULL_RULES`.
- **Círculos quitados:** los círculos aproximados de estos objetos (en `ArcticIce` y en las rocas de `GrandIslandZone`) y los del Hito 71 para rocas, hielo y menas. Quedan los de árboles, casas, fogatas, vallas y cuernos.
- **Comprobado:**
  - acercándose a cada objeto desde 8 direcciones (1455 intentos), el personaje nunca entra en la huella;
  - todo sigue siendo alcanzable;
  - las zonas «encerradas» nuevas son el interior de las propias rocas y bloques.
- **Captura:** `scratch/col/artico_contornos.jpg`.

## Capturas

- `scratch/col/artico_antes.jpg` y `artico_despues.jpg`: rojo, pared que no se sube; cian, agua hasta la rodilla; azul, agua honda; naranja, colisiones nuevas.
- `scratch/col/artico_vadeo.jpg`: en el mar, en la orilla de las plataformas del sur.
