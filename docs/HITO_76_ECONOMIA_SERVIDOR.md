# Hito 76: Fase 1 del Mercado. Oro, bAXS y SLP en el servidor

Base de seguridad del Mercado entre jugadores ([DISENO_TIENDA_JUGADORES.md](DISENO_TIENDA_JUGADORES.md)).

**Con cuenta**, el saldo de oro, bAXS y SLP de cada partida lo guarda y lo cambia el servidor. El navegador ya no puede subirlo inventado. **Los invitados** juegan como siempre, en local.

## Qué cambia para el jugador
- **Nada visible** en combates, la tienda de Ochi, la Forja, misiones ni tutorial. Con cuenta, cada cobro o pago pasa por el servidor; un instante después se ve el saldo nuevo.
- **Con cuenta y sin conexión:**
  - comprar, vender, forjar y acelerar dicen «Necesitas conexión para esto mientras juegas con tu cuenta» y no hacen nada;
  - jugar, combatir y explorar siguen igual;
  - el oro de un combate o una recompensa de misión cobrados sin conexión quedan **pendientes** y se cobran solos al volver la conexión, sin cobrarse nunca dos veces.
- **Bono de inicio de las partidas nuevas:** **500 SLP y 30 bAXS** (antes 1000 y 100).

## Servidor (Supabase)

### Archivos
- `supabase/migrations/20261026000000_economy.sql`: tablas, límites, funciones y el cambio en el guardado.
- `supabase/migrations/20261026000001_economy_catalog.sql`: precios. Se **genera** desde el catálogo del juego con `node tools/gen_catalog.mjs <src> <salida>`: tienda, Forja, evoluciones, aceleraciones y recompensas de misión y de tutorial (374 precios).

### Tablas
- `slot_wallets`: saldo de cada ranura, más los contadores diarios.
- `economy_ledger`: historial inmutable de movimientos, con clave de idempotencia (un doble clic o un reintento no cobran dos veces).
- `economy_reward_claims`: recompensas cobradas, una vez por ranura.
- `economy_legacy_slots`: ranuras que ya estaban en la nube al aplicar la migración.

### Funciones

| Función | Qué hace | Límite |
|---|---|---|
| `economy_get` | saldo de la ranura; lo crea la primera vez | — |
| `economy_battle_gold` | 20–45 de oro por victoria; lo decide el servidor | 1 cada 20 s, 300 al día |
| `economy_shop_buy` / `economy_shop_sell` / `economy_shop_rebuy` | tienda de Ochi | al vender, el objeto debe estar en la partida guardada; máximo 5000 de oro por ventas al día; recompra solo de ventas de las últimas 24 h |
| `economy_forge` | crear, evolucionar o acelerar | coste del catálogo; acelerar cobra la diferencia con lo ya pagado por ese trabajo; máximo 5000 SLP al día |
| `economy_reward` | misiones y tutorial | una sola vez por recompensa |
| `save_slot` (modificada) | guardar la partida | sustituye el oro, el SLP y el bAXS del navegador por los del servidor |

### Saldo al crearse por primera vez (topes)

| Caso | Oro | SLP | bAXS |
|---|---|---|---|
| Partida que ya estaba en la nube | 20 000 | 5 000 | 500 |
| Partida nueva o invitado que vincula su cuenta | 200 × nivel | 500 + 50 × nivel | 30 + 5 × nivel |

- Todos los límites se cambian en `econ_limits()`.
- Borrar una ranura borra su saldo y sus recompensas cobradas.
- Solo el propio jugador puede leer su saldo, y nadie puede escribirlo directamente: solo a través de las funciones.

## Juego
- **`src/net/EconomyService.js` (nuevo):**
  - con cuenta, pide cada movimiento al servidor y aplica el saldo que devuelve;
  - guarda lo pendiente y lo reintenta;
  - traduce los errores a mensajes.
- **Archivos conectados:**
  - victoria (`main.js`);
  - `ShopService` (`buyAsync`, `sellAsync`, `rebuyAsync`) y `ShopPanel`;
  - `ForgeService` (`craftAsync`, `evolveAsync`, `speedUpAsync`) y `ForgePanel`;
  - `QuestManager` (oro de misión);
  - `TutorialDirector` (oro del duelo y regalos de SLP y bAXS).
- **Si la base de datos aún no tiene la migración**, el juego lo detecta y sigue en local. Hasta desplegar, todo funciona como antes.

## Cómo desplegarlo
1. En la carpeta del proyecto: `supabase db push`. Aplica las dos migraciones nuevas en orden.
   - Alternativa: pegar en el SQL Editor de Supabase primero `20261026000000_economy.sql` y luego `20261026000001_economy_catalog.sql`.
2. Si cambian precios, recetas o recompensas en el juego: volver a generar el catálogo y aplicarlo:

   ```
   node tools/gen_catalog.mjs ./src supabase/migrations/20261026000001_economy_catalog.sql
   ```

## Comprobado
- **Postgres 16 local** con las migraciones reales (Supabase simulado):
  - topes al crear el saldo (legacy y por nivel);
  - el guardado no deja subir 999 999 de oro;
  - oro de combate y su límite de 20 s;
  - repetición con la misma clave (no cobra dos veces);
  - compra, artículo no a la venta y cantidad no válida;
  - venta de algo que no está en la partida, venta de material y de runa;
  - recompra, y segunda recompra rechazada;
  - Forja: bolsa de runas −80 SLP, evolución −50 SLP −0,5 bAXS, aceleración ×2 y luego ×4 pagando la diferencia, y ×4 repetido rechazado;
  - recompensa de misión, y segunda vez rechazada;
  - borrar la ranura borra su saldo;
  - un invitado sin sesión no puede llamar a las funciones, y nadie puede escribir el saldo directamente.
- **En el juego:**
  - como invitado, la tienda y la Forja funcionan igual;
  - con cuenta simulada, el saldo del servidor se aplica, no se descuenta dos veces y los mensajes de error salen bien;
  - el oro de combate sale de la respuesta del servidor;
  - con las funciones sin desplegar, el juego vuelve solo a local;
  - la partida del usuario quedó intacta.
- **Pendiente de probar con una cuenta real tras desplegar:** el recorrido completo contra Supabase.
