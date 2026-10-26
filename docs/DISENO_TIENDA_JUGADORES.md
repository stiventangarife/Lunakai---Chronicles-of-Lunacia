# Diseño técnico: Tienda entre jugadores (Mercado de Lunacia)

> Estado: **diseño v2, sin programar**. Es una demo para Sky Mavis: el bAXS del juego es ficticio y funciona como una moneda del juego más, igual que el oro.
> **Sin firma de billetera** por ahora. El pago pasa por un único punto del código (`marketPay`) para poder cambiarlo por bAXS real más adelante sin tocar el resto.

## Decisiones tomadas (25-oct)

| Tema | Decisión |
|---|---|
| Monedas de la tienda | solo **oro** y **bAXS**; el SLP no se comercia ni se convierte |
| Firma o billetera | se omite; ventana de confirmación normal (precio, comisión, total) |
| Saldo | **el mismo de la partida** (sin monedero aparte) |
| Comisión | **5 % en las ventas por bAXS** |
| Anuncios | duran **3 días**, máximo **20 por jugador** |
| Objetos de antes del mercado | **se venden con normalidad** |
| Invitados | pendiente de confirmar (propuesta en §6) |

## 1. Qué se vende y con qué moneda

| Categoría | Moneda |
|---|---|
| Recursos (materiales de recolección y botín) | **Oro** |
| Equipamiento **Tier 1, 2 y 3** | **bAXS** |
| Runas y charms de la bolsa | **bAXS** |

No se comercia:
- el equipo de Tier 0;
- los objetos de misión;
- lo que está equipado o en la Forja;
- Axies;
- **SLP**;
- las copias Ronin (NFT).

## 2. Seguridad: oro, bAXS y SLP pasan a mandar desde el servidor

Hoy la partida se sube entera desde el navegador. Con un mercado compartido, inventarse monedas u objetos perjudicaría a otros jugadores.

**El SLP también cuenta**, aunque la tienda no lo acepte: con SLP se forjan bolsas de runas y charms y se evoluciona equipo, y todo eso se vende por bAXS. SLP inventado acabaría convertido en bAXS.

Como el saldo es el mismo que el de la partida, **el servidor guarda los saldos de oro, bAXS y SLP** de cada ranura. El navegador ya no puede cambiarlos al guardar: `save_slot` ignora esos campos y conserva los del servidor.

Todo lo que mueve monedas pasa por funciones del servidor, con límites razonables:

| Acción | Función | Límite |
|---|---|---|
| Oro de combate (20–45) | `claim_battle_gold` | máx. ~1 cobro cada 20 s y un tope diario |
| Tienda de Ochi (comprar o vender) | `shop_buy` / `shop_sell` | precios del catálogo en el servidor |
| Forja: bolsas (SLP) y evolución (SLP + bAXS) | `forge_pay` | coste del catálogo; tope diario de SLP gastado |
| Recompensas de misión, tutorial y bonos de inicio | `grant_reward` | una sola vez por id de recompensa |
| Mercado | `market_*` | ver §3 |

**Objetos:**
- Los objetos de la partida (incluidos los de antes) se pueden vender con normalidad.
- Al anunciar uno, el servidor comprueba que está en **su copia** de la partida y lo retira de allí en la misma operación.
- Además se vigila que el inventario no crezca de golpe entre dos guardados (aviso y bloqueo del mercado para esa ranura si pasa).

## 3. Mercado

### Tablas

| Tabla | Para qué |
|---|---|
| `market_listings` | `seller`, `slot_id`, `item_kind`, `item_id`, `qty`, `currency` (`gold`/`baxs`), `unit_price`, `status` (`open`/`sold`/`cancelled`/`expired`), `expires_at` (3 días) |
| `market_ledger` | historial inmutable de anuncios, compras, ventas, comisiones y retiradas (con clave de idempotencia) |
| `market_item_rules` | lista blanca: qué se puede vender, en qué moneda y entre qué precios |

### Funciones (en una transacción, con `FOR UPDATE`)

| Función | Qué hace |
|---|---|
| `market_list(slot, item, qty, price)` | retira el objeto de la partida del servidor y abre el anuncio (máx. 20 abiertos; precio dentro de los límites) |
| `market_buy(slot, listing, qty, idem)` | cobra al comprador del saldo de su partida, entrega el objeto y paga al vendedor; en bAXS se descuenta la **comisión del 5 %**; o todo o nada |
| `market_cancel(listing)` | devuelve el objeto a la partida del vendedor |
| `market_expire()` | tarea periódica: los anuncios de más de 3 días vuelven a su dueño |

Si el vendedor no está conectado, el pago y el objeto devuelto le esperan en su partida del servidor. Los recibe al volver a cargarla.

### `marketPay` (punto único de pago)
Hoy descuenta del saldo de la partida en el servidor. El día que haya bAXS real, solo cambia esta parte (pedir la firma en Ronin Wallet o Waypoint), sin tocar anuncios, interfaz ni reglas.

## 4. Interfaz (tienda de Ochi, pestaña «Mercado»)
- **Comprar:** filtros por categoría, clase, tier y moneda; orden por precio o fecha.
- **Vender:** lo comerciable de tu partida, con precio sugerido (mediana de las últimas ventas o precio de la tienda) y aviso de comisión.
- **Mis anuncios:** abiertos, vendidos y caducados, con opción de retirar.
- **Historial:** cada movimiento en lenguaje claro.
- **Confirmación** al comprar: objeto, cantidad, precio, comisión y total.

## 5. Fases

| Fase | Contenido |
|---|---|
| 1 · Monedas en el servidor | saldos de oro, bAXS y SLP en el servidor; `save_slot` deja de aceptarlos; `claim_battle_gold`, `shop_*`, `forge_pay`, `grant_reward` |
| 2 · Recursos por oro | tablas y funciones del mercado; pestaña Mercado |
| 3 · Equipo, runas y charms por bAXS | reglas por tier y clase; comisión del 5 %; precios sugeridos |

## 6. Invitados (propuesta, pendiente de confirmar)
- **Juegan como hoy:** la Forja, la tienda de Ochi y las monedas funcionan en su partida local, sin servidor.
- **Mercado:** lo pueden ver, pero no comerciar. Los botones explican que hace falta vincular una cuenta.
- **Al vincular la cuenta**, la partida de invitado se sube con sus objetos. Las monedas se ajustan a un máximo razonable según el progreso de la partida (nivel y misiones). Así una partida local editada no entra al mercado con saldos inventados.

## 7. Pendiente
- Confirmar la propuesta de invitados (§6).
- Comisión en las ventas por **oro**: ¿sin comisión, o también un 5 % (en oro)?
- Más adelante, antes de usar bAXS o AXS reales: consultar las condiciones de Sky Mavis para juegos de terceros (developersupport@skymavis.com).
