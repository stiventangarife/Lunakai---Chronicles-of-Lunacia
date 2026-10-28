# Hito 77: Fase 2 del Mercado. Comercio entre jugadores

Segunda fase del [diseño del Mercado](DISENO_TIENDA_JUGADORES.md), con la opción A aprobada: los objetos siguen viviendo en la partida y el servidor vigila sus entradas y salidas. Se apoya en la fase 1 ([Hito 76](HITO_76_ECONOMIA_SERVIDOR.md)): el oro ya lo mueve el servidor.

## Qué ve el jugador
La tienda de Ochi tiene un tercer modo, **Mercado**, junto a Comprar y Vender, con cuatro pestañas:

| Pestaña | Qué hace |
|---|---|
| **Comprar** | anuncios de otros jugadores: vendedor, cuántos quedan y cuándo caduca; se puede comprar una parte |
| **Vender** | tus materiales, comida y pociones; eliges cantidad y precio por unidad, ves el precio sugerido, la comisión y lo que recibirás |
| **Mis anuncios** | publicados, vendidos, retirados y caducados; «Retirar anuncio» devuelve lo que no se vendió |
| **Historial** | tus compras y ventas de los últimos 30 días |

- **Reglas:**
  - pago en oro;
  - **5 % de comisión** al vendedor, redondeada hacia arriba;
  - anuncios de **3 días**, **20 abiertos** como máximo;
  - precio por unidad **entre lo que paga Ochi y 3 × su precio de venta** (por ejemplo, cobre del cañón de 3 a 18).
- **Se puede vender:** 14 materiales, más comida y pociones (23 objetos). El equipo, las runas y los charms quedan para la fase de bAXS.
- **Precio sugerido:** la mediana de las últimas 20 ventas; si aún no hay ventas, el precio de Ochi.
- **Al entrar en la partida:** un aviso dice lo que se vendió y lo que caducó mientras no estabas.
- **Invitados:** pueden mirar los anuncios; comprar y vender pide cuenta.
- **No puedes comprar tus propios anuncios.**
- **Lo que se ve de ti:** el nombre de tu personaje, nunca tu correo.

## Cómo se evita duplicar objetos
1. **Al publicar,** el servidor comprueba lo que tienes en tu partida guardada, menos lo ya apartado. Crea el anuncio y una **salida** anotada (`slot_item_deltas`). El juego la aplica al momento y la apunta en `marketAck`.
2. **Al comprar, retirar o caducar,** pasa lo mismo con una **entrada**.
3. **Al guardar,** el servidor marca como hechas las que el juego confirmó en `marketAck`. Las que no confirmó, por ejemplo un anuncio que caducó o un guardado que salió antes de la respuesta, **las aplica él mismo** a la partida y las devuelve en `applied`. El juego aplica las que aún no tenía. Cada entrada tiene su número, así que nunca se aplica dos veces.
4. **Vender a Ochi** también descuenta lo que está anunciado.
5. **Vigilancia:**
   - si un objeto comerciable crece entre dos guardados más de lo que se consigue jugando, se bloquea el mercado de esa partida y queda anotado en `market_flags`;
   - el margen es 60 más 5 por minuto desde el guardado anterior;
   - no cuentan lo comprado a Ochi ni lo que entró por el mercado;
   - para desbloquear una partida, se borra su fila de `market_flags`.
6. **Borrar una partida** cierra sus anuncios.

## Servidor (Supabase)

### Archivos
- `supabase/migrations/20261026000002_market.sql`: tablas, funciones, el guardado ampliado y permisos.
- `supabase/migrations/20261026000003_market_rules.sql`: qué se puede vender y entre qué precios. Se genera desde el juego:

  ```
  node tools/gen_catalog.mjs ./src supabase/migrations/20261026000001_economy_catalog.sql supabase/migrations/20261026000003_market_rules.sql
  ```

### Tablas
`market_item_rules` · `market_listings` · `market_sales` · `slot_item_deltas` · `market_flags`. Nadie puede leerlas ni escribirlas directamente, salvo las reglas, que son públicas.

### Funciones
- `market_browse` (también invitados): anuncios abiertos.
- `market_list`: publicar.
- `market_buy`: comprar todo o parte.
- `market_cancel`: retirar.
- `market_mine`: mis anuncios e historial.
- `market_inbox`: avisos.
- `market_price_hint` (también invitados): precio sugerido.
- `save_slot` y `economy_shop_sell` quedan ampliadas.

Todas usan clave de idempotencia (un doble clic no publica ni compra dos veces) y hacen caducar los anuncios vencidos.

## Juego
- **`src/net/MarketService.js` (nuevo):** llama al servidor, aplica entradas y salidas, y traduce los errores. Si la base de datos aún no tiene el Mercado, la pestaña lo dice y el resto del juego sigue igual.
- **`src/ui/ShopPanel.js`:** modo Mercado. Los modos Comprar y Vender no cambian.
- **`src/net/CloudSave.js`:** pasa al Mercado las entradas que aplicó el servidor al guardar (`onServerApplied`).
- **`src/main.js`:** conecta el servicio y muestra los avisos al entrar en la partida.
- **i18n:** `market.*` (es/en).

## Cómo desplegarlo
En el SQL Editor de Supabase, **en este orden**:
1. `20261026000002_market.sql`
2. `20261026000003_market_rules.sql`

Alternativa: `supabase db push` desde la carpeta del proyecto.

## Comprobado
- **Postgres 16 local, con dos jugadores:**
  - precio fuera de rango;
  - objeto no comerciable;
  - publicar más de lo que tienes, incluido lo ya apartado;
  - vender a Ochi lo anunciado;
  - repetir la misma clave;
  - comprar lo propio;
  - compra parcial y compra sin oro;
  - comisión del 5 %: el vendedor recibe 328 de oro por 3 ventas;
  - guardado con confirmación parcial: el servidor aplica el resto y lo devuelve;
  - retirar y retirar dos veces;
  - caducidad: devuelve el objeto y avisa;
  - aviso de ventas una sola vez;
  - vigilancia: +500 de cobre bloquea esa partida;
  - límite de 20 anuncios;
  - permisos: un invitado no puede publicar ni leer las tablas;
  - borrar la partida cierra sus anuncios.
- **En el juego, con el servidor simulado:**
  - comprar 3 de cobre suma 3 a la bolsa y resta 27 de oro;
  - recibir otra vez la misma entrada no suma nada;
  - publicar 4 babas a 8 de oro: el precio se ajusta al rango (99 → 18), resume comisión 2 y recibes 30, y salen de la bolsa;
  - retirar las devuelve;
  - una compra de pociones va a la Mochila y a la copia de la partida;
  - aviso de ventas;
  - historial.
- **Regresiones:**
  - los modos Comprar y Vender de Ochi siguen igual;
  - sin el Mercado desplegado, la pestaña dice «El Mercado aún no está activo en el servidor»;
  - la partida del usuario quedó intacta.
- **Pendiente con cuentas reales tras desplegar:** dos cuentas comerciando de verdad.
