# Hito 78: Fase 3 del Mercado. Equipo, runas y charms por bAXS, y avisos en directo

Cierra el [diseño del Mercado](DISENO_TIENDA_JUGADORES.md). Sigue a la [fase 2](HITO_77_MERCADO_JUGADORES.md).

## Arreglo: el oro de una venta llegaba solo al reiniciar
**Causa:** el servidor pagaba al vendedor en el momento, pero el juego abierto solo pedía el saldo al cargar la partida o en sus propias compras y ventas.

**Ahora:**
- **Cada guardado** devuelve el saldo del servidor y el juego lo aplica.
  - Solo lo aplica si no hubo ninguna compra o venta propia mientras el guardado viajaba, para no pisar un saldo nuevo con uno viejo.
  - Es `walletTicket` y `onServerWallet` en `CloudSave`, más `EconomyService.track`.
- **Mientras tienes anuncios abiertos,** el juego consulta el Mercado cada 60 s y al volver a la pestaña:
  - si se vendió algo, sale el aviso «Mercado: vendiste… · +N» y el saldo se actualiza al instante;
  - lo que caducó vuelve a la partida sin recargar.
- **Sin anuncios abiertos** no hace ninguna consulta.

## Qué se vende y en qué moneda

| Objeto | Moneda | Precio por unidad |
|---|---|---|
| Materiales, comida y pociones | oro | entre lo que paga Ochi y 3 × su precio |
| Equipo T1 / T2 / T3 (en la Mochila) | bAXS | desde 0,5 / 1 / 3, sin máximo |
| Runas y charms comunes o neutrales | bAXS | desde 0,2, sin máximo |
| Runas y charms raras | bAXS | desde 0,5, sin máximo |
| Runas y charms épicas o secretas | bAXS | desde 1, sin máximo |
| Runas y charms místicas | bAXS | desde 2, sin máximo |

- **En bAXS, el máximo lo pone el mercado.** Solo hay un tope técnico de 1 000 000 por unidad, contra errores al escribir.
- **No se pueden anunciar:**
  - el equipo puesto o en la Forja;
  - el equipo T0;
  - las runas y charms que lleva un Axie;
  - las copias Ronin.
- **Comisión del 5 % en la moneda de la venta:** en bAXS se redondea hacia arriba al céntimo (2,50 → 0,13 de comisión).
- 224 objetos comerciables: 23 en oro y 201 en bAXS.

## Interfaz
- **Filtros** en Comprar y Vender: Todo · Recursos · Equipo · Runas y charms. En Equipo, también por tier.
- **Precios en bAXS** con su icono y 2 decimales. El precio se escribe a mano («3,75» o «3.75») o con los botones (±0,1).
- **El equipo** muestra sus estadísticas frente a lo que lleva tu héroe, como en la tienda de Ochi.
- **Comprar en bAXS se confirma con un segundo clic:** «Vas a comprar 1 × Corona arcana por 4,50 bAXS. Pulsa otra vez para confirmar».
- **Precio sugerido:** la mediana de las últimas 20 ventas; si aún no hay, el doble del mínimo en bAXS o el precio de Ochi en oro.

## Servidor
- `supabase/migrations/20261026000004_market_baxs.sql`:
  - moneda por objeto y por anuncio;
  - precios con decimales y máximo opcional;
  - runas y charms en la partida (`runeCharmBag`);
  - cálculo de lo que no se puede anunciar (`_mkt_locked`);
  - punto único de pago `_mkt_pay` (el «marketPay» del diseño);
  - `market_inbox` devuelve también los anuncios abiertos y las entradas pendientes;
  - la vigilancia incluye equipo, runas y charms, con un margen menor: 10 + 1 por minuto.
- `supabase/migrations/20261026000005_market_rules.sql`: lista nueva, generada con

  ```
  node tools/gen_catalog.mjs ./src supabase/migrations/20261026000001_economy_catalog.sql supabase/migrations/20261026000005_market_rules.sql
  ```

- Los anuncios, ventas y avisos de la fase 2 se conservan; pasan a ser «en oro».

## Cómo desplegarlo
En el SQL Editor de Supabase, **en este orden**:
1. `20261026000004_market_baxs.sql`
2. `20261026000005_market_rules.sql`

## Comprobado
- **Postgres 16 local:**
  - **Actualización sobre una base con datos de la fase 2:** se conservan 23 anuncios y 3 ventas.
  - **Las pruebas de la fase 2 siguen igual.**
  - **Fase 3:**
    - precio por debajo del mínimo;
    - precio enorme aceptado (999,56);
    - runas puestas en un Axie, que no se pueden anunciar;
    - charm cubierto por una copia Ronin;
    - equipo en la Forja;
    - T0 no comerciable;
    - compra en bAXS: 2,50 → el vendedor recibe 2,37; 4 → 3,80;
    - el comprador recibe la runa y el equipo al guardar;
    - comprar sin bAXS suficientes;
    - avisos con moneda, anuncios abiertos y pendientes.
- **En el juego, con el servidor simulado:**
  - filtros y tiers;
  - confirmación en dos clics: el primer clic no compra;
  - compra de equipo (−4,50 bAXS, a la Mochila) y de 2 runas (a la bolsa);
  - vender a 3,75 con comisión 0,19 y recibes 3,56; «3,75» con coma se acepta;
  - la runa equipada no aparece para vender;
  - la revisión de ventas sube el saldo y avisa;
  - lo devuelto entra en la bolsa;
  - el saldo de un guardado no pisa uno más nuevo ni uno con una compra en curso.
- **La partida del usuario quedó intacta.**
