# Hito 110: Moneda AXS en el Mercado entre jugadores

> **Actualización (Hito 115, 2-nov-2026):** se quitó el icono de candado de la runa y el charm que regala el tutorial en el panel de Runas y charms (`boundTag`). La regla no cambia: siguen ligados a la partida y no se comercian.

**Problema:** el Mercado de equipo, runas y charms usaba **bAXS** (Hito 78). En el ecosistema de Axie Infinity y Ronin, el bAXS es una recompensa por jugar y no se puede intercambiar. La moneda que sí se intercambia entre jugadores es el **AXS**.

## Economía tras el cambio

| Moneda | Para qué | Dónde |
|---|---|---|
| **Oro** | Recursos, consumibles y materiales, y Forja Tier 0 | Tienda de Ochi, Forja «Crear», Mercado de recursos |
| **SLP** | Evolución de equipo y bolsas de runas y charms | Forja |
| **AXS** (nuevo) | Compra y venta entre jugadores de equipo Tier 1–3, runas y charms (se perciben como NFT) | Mercado |
| **bAXS** | Tasas: comisión de evolución (0,5) y rapidez de la Forja. Más adelante, premios de la arena y del reto semanal | Forja. **Ya no se intercambia** |

- **Ochi ya no compra runas, charms, sus bolsas ni equipo de Tier 1–3.** Todo eso se vende solo en el Mercado, por AXS.
  - Las bolsas de runa (desde 0,5 AXS) y de charm (desde 0,3) se anuncian en «Runas y charms», sin sello NFT.
  - Ochi sigue comprando por oro el equipo Tier 0, los materiales y los consumibles.
- **El regalo del tutorial no se comercia:** la runa Pure Power y el charm Awaken Stamp que da el tutorial (también al saltarlo) se equipan, pero no se venden ni se gastan. Si consigues otra copia igual en el botín, esa sí se vende. En Mochila › Runas llevan un candado.
- **Comisión del Mercado:** 5 %, descontada al vendedor en la moneda de la venta. En AXS se redondea hacia arriba al céntimo (2,50 → 0,13).
- **Bono de inicio:**
  - partidas nuevas: **500 SLP, 15 bAXS (antes 30) y 5 AXS**;
  - partidas que ya existían: **+5 AXS y +15 bAXS una sola vez**.

## Qué ve el jugador
- **Cabecera de la Tienda, la Mochila y la Forja:** oro · SLP · **AXS** · bAXS (icono `assets/currency/axs.webp`). La Forja no gasta AXS, pero muestra el saldo igual que los otros paneles.
- **Mercado:**
  - el equipo, las runas y los charms tienen precio en AXS, con 2 decimales;
  - compra con confirmación en dos clics;
  - sello **NFT** en la casilla y en la ficha.
- **Ochi, pestaña Vender:** ya no aparecen las runas ni los charms. Si se intenta por código, sale el aviso «Ochi no compra runas ni charms: véndelos en el Mercado, por AXS».
- **Historial:** las ventas de antes del cambio conservan su bAXS. Los anuncios abiertos pasaron a AXS al mismo precio.

## Sello NFT (Ronin) en el equipo Tier 1–3
- El equipo T1–3 lleva el logo de Ronin (`assets/ui/icons/ronin.webp`, el mismo de las runas y charms Ronin) en todos los sitios donde aparece:
  - Mochila: casilla, ranura equipada del muñeco y chapa «NFT» en la ficha;
  - Tienda de Ochi (comprar y vender) y Mercado (casilla y chapa de la ficha);
  - Forja (tarjetas de la pieza y de la evolución).
- En el Mercado las runas y los charms llevan el mismo sello (antes era el texto «NFT»). El Tier 0 y las bolsas no lo llevan.
- Si Ochi rechaza una pieza T1–3, el aviso dice que se vende en el Mercado, por AXS.
- Código: `isNftGear(it)` y `nftSeal(title, cls)` en `ui/lk.js`; estilos `.lk-nft-seal`, `--slot` y `--chip` en `ui/lunakai-ui.css`.

## Servidor (Supabase)

### Archivos
Primera parte (moneda AXS):
- `supabase/migrations/20261101000000_axs.sql`:
  - columnas `axs` y `axs_launch` en `slot_wallets` y `axs` en `economy_ledger`;
  - límites nuevos en `econ_limits()`;
  - `_econ_wallet`, `_econ_out`, `_econ_err`, `_econ_stamp` y `save_slot` con AXS;
  - ayudante interno `_econ_apply_axs`;
  - regalo único a los saldos existentes;
  - mercado en `gold`/`axs`: `_mkt_fee`, `_mkt_pay`, `market_list`, `market_buy`, `market_price_hint` y `_mkt_settle`;
  - anuncios abiertos de bAXS a AXS.
- `supabase/migrations/20261101000001_economy_catalog.sql`: catálogo regenerado, sin las 180 filas `sell:rune:*` / `sell:charm:*`.
- `supabase/migrations/20261101000002_market_rules.sql`: las mismas 224 reglas, ahora 23 en oro y 201 en AXS.

Segunda parte (regalo del tutorial, bolsas y Ochi):
- `supabase/migrations/20261101000003_market_bound_bags.sql`: `_mkt_bound` (regalo del tutorial ya recibido, leído de `tutorialProgress.flags.runes`) y `_mkt_locked` = max(ligadas, equipadas − Ronin).
- `supabase/migrations/20261101000004_economy_catalog.sql`: sin venta a Ochi del equipo T1–3 (21 filas) ni de las bolsas (2 filas).
- `supabase/migrations/20261101000005_market_rules.sql`: 226 reglas (23 en oro, 203 en AXS: se suman las dos bolsas).

Los catálogos se generan con:

```
node tools/gen_catalog.mjs ./src supabase/migrations/<fecha>_economy_catalog.sql supabase/migrations/<fecha>_market_rules.sql
```

Siempre en archivos nuevos: `supabase db push` no repite una migración ya aplicada. Los de la segunda parte sustituyen a los de la primera.

### Reglas
- **El AXS lo pone el servidor**, igual que el oro, el SLP y el bAXS: el guardado sustituye `forge.axs` por el del servidor.
  - Todo saldo nuevo empieza con `axs_base` (5); no se acepta el AXS que mande el navegador.
- **`_mkt_pay` es el único punto de pago.** El día que haya AXS real (firma en Ronin Wallet o Waypoint), solo cambia esa función.
  - Un anuncio en otra moneda que no sea oro o AXS da error `bad_currency`.
- **El regalo es de una sola vez:** `slot_wallets.axs_launch` lo marca. Volver a ejecutar la migración no regala dos veces.
- **Vigilancia al guardar:** lo que se vende en AXS usa el margen pequeño (10 + 1 por minuto).

### Límites (`econ_limits()`)

| Clave | Valor |
|---|---|
| `axs_base` | 5 (AXS al crear el saldo) |
| `baxs_base` | 15 (antes 30) |
| `axs_launch` / `baxs_launch` | 5 / 15 (regalo único) |

## Juego
- `tactics/data/EconomyCatalog.js`:
  - `CURRENCIES`, `DECIMAL_CURRENCIES` y `MARKET_CURRENCY`;
  - mínimos en AXS (`MARKET_GEAR_MIN_AXS`, `MARKET_RC_MIN_AXS`);
  - `STARTER_AXS` y `LAUNCH_GIFT`;
  - `sellPrice` de runas y charms = 0.
- `rpg/ForgeService.js`:
  - guarda `forge.axs` (`wallet()` lo devuelve) y `grant({ axs })`;
  - bono de inicio con 15 bAXS y 5 AXS;
  - regalo único (`forge.axsLaunch`) para las partidas locales antiguas.
- `net/EconomyService.js`: aplica `res.axs` solo si el servidor lo manda (si aún no tiene la migración, se queda el de la partida); traduce el error `need_axs`.
- `net/MarketService.js`: `AXS_CEIL`, `isDecimalCurrency()`, comisión al céntimo en AXS, error `need_axs`.
- `ui/ShopPanel.js`:
  - pastilla de AXS en la cabecera;
  - el Mercado trabaja con cualquier moneda decimal (AXS, y bAXS en el historial);
  - sello NFT.
- `rpg/ShopService.js`: Ochi no lista ni compra runas, charms ni bolsas (`sellBlock`).
- `rpg/RuneCharmService.js`: `BOUND_GIFT` (los ids de `TutorialScript.REWARDS`), `boundCount()` y `sellable()` sin las unidades ligadas.
- `ui/RunesCharmsPanel.js`: candado con explicación sobre el regalo del tutorial.
- `EconomyCatalog.js`: `MARKET_BAG_MIN_AXS` y `maxSellGearTier()`; `sellPrice` de las bolsas = 0.
- `rpg/ui/InventoryModal.js`: pastilla de AXS en la cabecera de la Mochila.
- CSS (`ui/lunakai-ui.css`): cuatro monedas en la cabecera, sello `.lk-nft` y `.lk-nft-chip`.
- Textos nuevos en español e inglés:
  - `market.needAxs`, `market.nft` y `market.nftHint`;
  - `notices.economy.needAxs` y `notices.shop.rcMarketOnly`;
  - `shop.axsTitle` e `inventory.axsTitle`;
  - textos del Mercado actualizados.
- **Versión del juego en pantalla:** `v0.4.0`, sin cambio (constante `GAME_VERSION` en `rpg/ui/StartScreenUI.js`; la usan la pantalla de inicio y la de selección de personaje).
- **`ASSET_VERSION` sigue en `0.4.0`:** `axs.webp` es un archivo nuevo de interfaz (las `<img>` no llevan versión). Subirla obligaría a todos los jugadores a volver a descargar modelos y audio sin motivo.

## Cómo desplegarlo
1. Subir el juego (pantalla de inicio: «Demo 1 (v0.4.0)»). El icono `assets/currency/axs.webp` va en minúsculas: en Linux (Hostinger) `AXS.webp` no lo encuentra. Purgar la CDN o LiteSpeed si está activa.
2. En el SQL Editor de Supabase, **en este orden** (o `supabase db push`):
   1. `20261101000000_axs.sql`
   2. `20261101000001_economy_catalog.sql`
   3. `20261101000002_market_rules.sql`
   4. `20261101000003_market_bound_bags.sql`
   5. `20261101000004_economy_catalog.sql`
   6. `20261101000005_market_rules.sql`
3. Si la migración aún no está aplicada, el juego sigue funcionando: el Mercado en AXS dará error de moneda hasta aplicarla.

## Comprobado
- **Postgres 16 local** con todas las migraciones reales y una base con datos de la fase 3 (un anuncio abierto y una venta en bAXS):
  - **Migración de datos:**
    - regalo de +5 AXS +15 bAXS a los dos saldos, con su fila `grant` en el libro;
    - el anuncio abierto pasa a AXS y la venta antigua conserva el bAXS;
    - 201 reglas en AXS y 23 en oro;
    - 0 filas de venta de runas a Ochi;
    - repetir la migración no regala otra vez.
  - **Compras y ventas:**
    - compra en AXS: el comprador paga 2,50 y el vendedor recibe 2,37 (comisión 0,13);
    - repetir la compra con la misma clave no cobra dos veces;
    - comprar sin AXS suficientes da `need_axs`;
    - un precio por debajo del mínimo da `bad_price`.
  - **Ochi y la Forja:**
    - Ochi rechaza una runa (`not_sellable`) y sigue comprando un sombrero por oro;
    - evolucionar sigue cobrando 50 SLP y 0,5 bAXS.
  - **Saldos:**
    - el guardado con `axs: 999` conserva el AXS del servidor;
    - una partida nueva empieza con 5 AXS y 15 bAXS.
  - **Precio sugerido y permisos:**
    - el precio sugerido cuenta las ventas antiguas en bAXS como AXS (cambio 1:1);
    - un jugador no puede llamar a `_econ_apply_axs` ni a `_mkt_pay`;
    - un invitado puede consultar el precio sugerido.
- **Lógica del juego en Node:**
  - bono de una partida nueva (5 AXS, 15 bAXS, 500 SLP) y que no se repite;
  - regalo único en una partida antigua;
  - saldo del servidor con y sin `axs`;
  - comisión (2,50 → 0,13; 4 → 0,20; 100 de oro → 5);
  - mensaje `need_axs`;
  - Ochi rechaza runas.
- **Interfaz (página de prueba con el Mercado simulado, Chromium):**
  - cabecera con cuatro monedas;
  - sello NFT en la casilla y la ficha, también en las runas con cantidad;
  - confirmación en dos clics en AXS;
  - pestaña Vender del Mercado con precios en AXS;
  - historial con bAXS antiguo y AXS nuevo;
  - Ochi sin runas en Vender.
  - Sin errores en consola.
- **Segunda parte (Postgres 16 local):**
  - el regalo del tutorial no se anuncia (runa y charm);
  - con otra copia igual del botín, se anuncia 1 y no 2, también con el regalo equipado;
  - sin haber recibido el regalo, la misma runa sí se anuncia;
  - Ochi rechaza el sombrero T1 y la bolsa de runa y sigue pagando la espada T0;
  - la bolsa de runa se anuncia en AXS y por debajo de 0,5 da `bad_price`;
  - un jugador no puede llamar a `_mkt_bound`.
- **Segunda parte (Node):** las mismas reglas en `RuneCharmService.sellable` / `boundCount`; las dos bolsas y el equipo T1+ rechazados por Ochi.
- **Pendiente de probar con cuentas reales tras desplegar:** dos cuentas comerciando en AXS.

## Pendiente
- **AXS real:** antes de usarlo, consultar las condiciones de Sky Mavis para juegos de terceros.
