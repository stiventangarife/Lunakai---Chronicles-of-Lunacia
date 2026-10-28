-- Lunakai · Hito 77 · Fase 2 del Mercado: comercio entre jugadores de materiales, comida y pociones por oro.
-- Ejecutar después de 20261026000000_economy.sql y 20261026000001_economy_catalog.sql, y luego
-- 20261026000003_market_rules.sql (qué se puede vender y entre qué precios; generado desde el juego).
--
-- Reglas: anuncios de 3 días, máximo 20 abiertos por jugador, 5 % de comisión al vendedor (en oro),
-- precio por unidad entre lo que paga Ochi y 3 × su precio de tienda.
--
-- Los objetos siguen viviendo en la partida (opción A del diseño). Para que un objeto no pueda estar a la vez en la
-- partida y en un anuncio, cada entrada o salida queda anotada en `slot_item_deltas`:
--   · el juego la aplica en cuanto el servidor responde y lo confirma en su guardado (`marketAck`);
--   · si al guardar llega alguna sin confirmar, la aplica el propio servidor y se la devuelve al juego (`applied`).
-- Además, si un objeto comerciable crece entre dos guardados más de lo posible, el mercado se bloquea para esa partida.

-- ---------------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------------
create table if not exists public.market_item_rules (
  item_id   text primary key,
  kind      text not null check (kind in ('mat', 'inv')),   -- mat = bolsa de materiales · inv = Mochila (comida y pociones)
  min_price integer not null check (min_price >= 1),
  max_price integer not null check (max_price >= min_price)
);

create table if not exists public.market_listings (
  id          bigserial primary key,
  seller      uuid not null references auth.users (id) on delete cascade,
  seller_slot smallint not null,
  seller_name text,
  item_id     text not null,
  kind        text not null,
  qty         integer not null check (qty > 0),
  qty_left    integer not null check (qty_left >= 0),
  unit_price  integer not null check (unit_price > 0),
  status      text not null default 'open' check (status in ('open', 'sold', 'cancelled', 'expired')),
  idem        text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '3 days',
  closed_at   timestamptz,
  seen        boolean not null default true          -- false = el vendedor aún no vio que caducó
);
create index if not exists market_listings_open on public.market_listings (status, item_id, unit_price) where status = 'open';
create index if not exists market_listings_seller on public.market_listings (seller, seller_slot, created_at desc);
create index if not exists market_listings_expiry on public.market_listings (expires_at) where status = 'open';
create unique index if not exists market_listings_idem on public.market_listings (seller, idem) where idem is not null;

create table if not exists public.market_sales (
  id          bigserial primary key,
  listing_id  bigint not null references public.market_listings (id) on delete cascade,
  seller      uuid not null,
  seller_slot smallint not null,
  buyer       uuid not null,
  buyer_slot  smallint not null,
  item_id     text not null,
  qty         integer not null,
  unit_price  integer not null,
  gross       bigint not null,
  fee         bigint not null,
  idem        text,
  delta_id    bigint,                       -- entrega al comprador (slot_item_deltas)
  at          timestamptz not null default now(),
  seller_seen boolean not null default false
);
create index if not exists market_sales_item on public.market_sales (item_id, at desc);
create index if not exists market_sales_seller on public.market_sales (seller, seller_slot, at desc);
create index if not exists market_sales_buyer on public.market_sales (buyer, buyer_slot, at desc);
create unique index if not exists market_sales_idem on public.market_sales (buyer, idem) where idem is not null;

create table if not exists public.slot_item_deltas (
  id         bigserial primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  slot_id    smallint not null,
  item_id    text not null,
  kind       text not null,
  delta      integer not null,
  reason     text not null,                -- list · buy · cancel · expire
  ref        bigint,                       -- anuncio
  applied    boolean not null default false,
  applied_by text,                         -- client · server
  at         timestamptz not null default now()
);
create index if not exists slot_item_deltas_pending on public.slot_item_deltas (user_id, slot_id) where not applied;

create table if not exists public.market_flags (
  user_id uuid not null,
  slot_id smallint not null,
  reason  text not null,
  at      timestamptz not null default now(),
  primary key (user_id, slot_id)
);

alter table public.market_item_rules enable row level security;
alter table public.market_listings   enable row level security;
alter table public.market_sales      enable row level security;
alter table public.slot_item_deltas  enable row level security;
alter table public.market_flags      enable row level security;
revoke all on public.market_item_rules, public.market_listings, public.market_sales, public.slot_item_deltas, public.market_flags from anon, authenticated;
drop policy if exists "market_item_rules: leer" on public.market_item_rules;
create policy "market_item_rules: leer" on public.market_item_rules for select to anon, authenticated using (true);
grant select on public.market_item_rules to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Ayudantes
-- ---------------------------------------------------------------------------
/** Cuántas unidades hay en la partida: bolsa de materiales (mat) o Mochila (inv). */
create or replace function public._mkt_count(p_data jsonb, p_item text, p_kind text)
returns integer language plpgsql immutable as $$
declare n int := 0;
begin
  if p_kind = 'mat' then return greatest(0, coalesce((p_data #>> array['forge', 'mats', p_item])::int, 0)); end if;
  select count(*) into n from jsonb_array_elements_text(case when jsonb_typeof(p_data -> 'inventory') = 'array' then p_data -> 'inventory' else '[]'::jsonb end) x where x = p_item;
  return n;
end;
$$;

/** Aplica una entrada (+) o salida (−) de un objeto a la partida. */
create or replace function public._mkt_apply_delta(p_data jsonb, p_item text, p_kind text, p_delta int)
returns jsonb language plpgsql immutable as $$
declare
  d jsonb := coalesce(p_data, '{}'::jsonb);
  inv jsonb; out jsonb := '[]'::jsonb; x text; left_to_remove int; i int;
begin
  if p_kind = 'mat' then
    d := d || jsonb_build_object('forge',
      coalesce(case when jsonb_typeof(d -> 'forge') = 'object' then d -> 'forge' end, '{}'::jsonb)
      || jsonb_build_object('mats',
           coalesce(case when jsonb_typeof(d #> '{forge,mats}') = 'object' then d #> '{forge,mats}' end, '{}'::jsonb)
           || jsonb_build_object(p_item, greatest(0, public._mkt_count(d, p_item, 'mat') + p_delta))));
    return d;
  end if;
  inv := case when jsonb_typeof(d -> 'inventory') = 'array' then d -> 'inventory' else '[]'::jsonb end;
  if p_delta > 0 then
    for i in 1..p_delta loop inv := inv || to_jsonb(p_item); end loop;
  elsif p_delta < 0 then
    left_to_remove := -p_delta;
    for x in select value from jsonb_array_elements_text(inv) loop
      if x = p_item and left_to_remove > 0 then left_to_remove := left_to_remove - 1; else out := out || to_jsonb(x); end if;
    end loop;
    inv := out;
  end if;
  return d || jsonb_build_object('inventory', inv);
end;
$$;

/** Lo que el jugador tiene de verdad: la partida guardada más las entradas y salidas del mercado aún sin aplicar. */
create or replace function public._mkt_available(p_uid uuid, p_slot smallint, p_item text, p_kind text)
returns integer language sql stable security definer set search_path = public as $$
  select greatest(0,
    public._mkt_count(coalesce((select data from public.save_slots where user_id = p_uid and slot_id = p_slot), '{}'::jsonb), p_item, p_kind)
    + coalesce((select sum(delta)::int from public.slot_item_deltas where user_id = p_uid and slot_id = p_slot and item_id = p_item and not applied), 0));
$$;

/** Anuncios caducados: vuelven a su dueño (el servidor lo aplica en su próximo guardado). */
create or replace function public._mkt_expire()
returns void language plpgsql security definer set search_path = public as $$
declare l record;
begin
  for l in update public.market_listings
              set status = 'expired', closed_at = now(), seen = false
            where status = 'open' and expires_at < now()
        returning id, seller, seller_slot, item_id, kind, qty_left
  loop
    if l.qty_left > 0 then
      insert into public.slot_item_deltas (user_id, slot_id, item_id, kind, delta, reason, ref)
      values (l.seller, l.seller_slot, l.item_id, l.kind, l.qty_left, 'expire', l.id);
    end if;
  end loop;
end;
$$;

/** Nombre que ven los demás: el del personaje de esa partida o el apodo de la cuenta, nunca el principio del correo. */
create or replace function public._mkt_public_name(p_uid uuid, p_slot smallint)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select nullif(left(regexp_replace(trim(data ->> 'playerName'), '[<>]', '', 'g'), 24), '') from public.save_slots where user_id = p_uid and slot_id = p_slot),
    (select nullif(left(trim(display_name), 24), '') from public.profiles
      where user_id = p_uid and lower(trim(coalesce(display_name, ''))) <> lower(split_part(coalesce(email, ''), '@', 1))),
    'Jugador ' || upper(left(md5(p_uid::text), 4)));
$$;

create or replace function public._mkt_delta_json(d public.slot_item_deltas)
returns jsonb language sql immutable as $$
  select jsonb_build_object('id', d.id, 'item', d.item_id, 'kind', d.kind, 'delta', d.delta, 'reason', d.reason);
$$;

create or replace function public._mkt_listing_json(l public.market_listings, p_uid uuid default null)
returns jsonb language sql stable as $$
  select jsonb_build_object('id', l.id, 'item', l.item_id, 'kind', l.kind, 'qty', l.qty, 'qtyLeft', l.qty_left,
    'price', l.unit_price, 'seller', coalesce(l.seller_name, 'Jugador'), 'mine', p_uid is not null and l.seller = p_uid,
    'status', l.status, 'createdAt', l.created_at, 'expiresAt', l.expires_at, 'closedAt', l.closed_at);
$$;

-- ---------------------------------------------------------------------------
-- 3. Funciones del Mercado
-- ---------------------------------------------------------------------------

/** Publicar: aparta el objeto de la partida y abre el anuncio. */
create or replace function public.market_list(p_slot smallint, p_item text, p_qty int, p_price int, p_idem text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._econ_uid(p_slot);
  r public.market_item_rules%rowtype;
  l public.market_listings%rowtype;
  d public.slot_item_deltas%rowtype;
  open_n int;
begin
  perform public._mkt_expire();
  if p_idem is not null then
    select * into l from public.market_listings where seller = v_uid and idem = p_idem;
    if found then
      select * into d from public.slot_item_deltas where ref = l.id and reason = 'list' and user_id = v_uid;
      return jsonb_build_object('ok', true, 'replay', true, 'listing', public._mkt_listing_json(l, v_uid), 'delta', public._mkt_delta_json(d));
    end if;
  end if;
  if exists (select 1 from public.market_flags where user_id = v_uid and slot_id = p_slot) then return public._econ_err('market_blocked'); end if;
  select * into r from public.market_item_rules where item_id = p_item;
  if not found then return public._econ_err('not_tradeable'); end if;
  if p_qty is null or p_qty < 1 or p_qty > 99 then return public._econ_err('invalid_qty'); end if;
  if p_price is null or p_price < r.min_price or p_price > r.max_price then
    return public._econ_err('bad_price', null, jsonb_build_object('min', r.min_price, 'max', r.max_price));
  end if;
  select count(*) into open_n from public.market_listings where seller = v_uid and status = 'open';
  if open_n >= 20 then return public._econ_err('too_many_listings'); end if;
  if public._mkt_available(v_uid, p_slot, p_item, r.kind) < p_qty then return public._econ_err('not_owned'); end if;
  perform public._econ_wallet(v_uid, p_slot); -- el saldo existe (ahí cobrará)
  insert into public.market_listings (seller, seller_slot, seller_name, item_id, kind, qty, qty_left, unit_price, idem)
  values (v_uid, p_slot, public._mkt_public_name(v_uid, p_slot), p_item, r.kind, p_qty, p_qty, p_price, p_idem)
  returning * into l;
  insert into public.slot_item_deltas (user_id, slot_id, item_id, kind, delta, reason, ref)
  values (v_uid, p_slot, p_item, r.kind, -p_qty, 'list', l.id) returning * into d;
  return jsonb_build_object('ok', true, 'listing', public._mkt_listing_json(l, v_uid), 'delta', public._mkt_delta_json(d));
end;
$$;

/** Comprar (todo o parte de un anuncio): cobra, paga al vendedor menos el 5 % y entrega; o no hace nada. */
create or replace function public.market_buy(p_slot smallint, p_listing bigint, p_qty int, p_idem text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._econ_uid(p_slot);
  l public.market_listings%rowtype;
  s public.market_sales%rowtype;
  w public.slot_wallets%rowtype;
  d public.slot_item_deltas%rowtype;
  cost bigint; fee bigint;
begin
  perform public._mkt_expire();
  if p_idem is not null then
    select * into s from public.market_sales where buyer = v_uid and idem = p_idem;
    if found then
      w := public._econ_wallet(v_uid, p_slot);
      select * into d from public.slot_item_deltas where id = s.delta_id;
      return public._econ_out(w, jsonb_build_object('replay', true, 'delta', public._mkt_delta_json(d)));
    end if;
  end if;
  if exists (select 1 from public.market_flags where user_id = v_uid and slot_id = p_slot) then return public._econ_err('market_blocked'); end if;
  select * into l from public.market_listings where id = p_listing for update;
  if not found or l.status <> 'open' then return public._econ_err('listing_gone'); end if;
  if l.seller = v_uid then return public._econ_err('own_listing'); end if;
  if p_qty is null or p_qty < 1 or p_qty > l.qty_left then return public._econ_err('invalid_qty', null, jsonb_build_object('left', l.qty_left)); end if;
  w := public._econ_wallet(v_uid, p_slot);
  cost := l.unit_price::bigint * p_qty;
  if w.gold < cost then return public._econ_err('need_gold', w, jsonb_build_object('need', cost - w.gold)); end if;
  fee := ceil(cost * 0.05);
  perform public._econ_wallet(l.seller, l.seller_slot);
  w := public._econ_apply(v_uid, p_slot, 'market_buy', l.item_id || '#' || l.id, p_qty, -cost, 0, 0, p_idem);
  perform public._econ_apply(l.seller, l.seller_slot, 'market_sell', l.item_id || '#' || l.id, p_qty, cost - fee, 0, 0, null);
  insert into public.slot_item_deltas (user_id, slot_id, item_id, kind, delta, reason, ref)
  values (v_uid, p_slot, l.item_id, l.kind, p_qty, 'buy', l.id) returning * into d;
  insert into public.market_sales (listing_id, seller, seller_slot, buyer, buyer_slot, item_id, qty, unit_price, gross, fee, idem, delta_id)
  values (l.id, l.seller, l.seller_slot, v_uid, p_slot, l.item_id, p_qty, l.unit_price, cost, fee, p_idem, d.id);
  update public.market_listings
     set qty_left = qty_left - p_qty,
         status = case when qty_left - p_qty = 0 then 'sold' else status end,
         closed_at = case when qty_left - p_qty = 0 then now() else closed_at end
   where id = l.id;
  return public._econ_out(w, jsonb_build_object('cost', cost, 'delta', public._mkt_delta_json(d)));
end;
$$;

/** Retirar un anuncio propio: lo que quede vuelve a la partida. */
create or replace function public.market_cancel(p_slot smallint, p_listing bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._econ_uid(p_slot);
  l public.market_listings%rowtype;
  d public.slot_item_deltas%rowtype;
begin
  perform public._mkt_expire();
  select * into l from public.market_listings where id = p_listing and seller = v_uid for update;
  if not found then return public._econ_err('listing_gone'); end if;
  if l.status <> 'open' then return public._econ_err('listing_gone'); end if;
  if l.seller_slot <> p_slot then return public._econ_err('other_slot'); end if;
  update public.market_listings set status = 'cancelled', closed_at = now() where id = l.id;
  if l.qty_left > 0 then
    insert into public.slot_item_deltas (user_id, slot_id, item_id, kind, delta, reason, ref)
    values (v_uid, p_slot, l.item_id, l.kind, l.qty_left, 'cancel', l.id) returning * into d;
    return jsonb_build_object('ok', true, 'delta', public._mkt_delta_json(d));
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

/** Anuncios abiertos de todos (también para invitados, solo lectura). */
create or replace function public.market_browse(p_item text default null, p_kind text default null, p_sort text default 'price', p_limit int default 120)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); res jsonb;
begin
  perform public._mkt_expire();
  select coalesce(jsonb_agg(public._mkt_listing_json(l, v_uid) order by
           case when p_sort = 'new' then -extract(epoch from l.created_at) else l.unit_price end, l.created_at desc), '[]'::jsonb)
    into res
    from (select * from public.market_listings
           where status = 'open' and (p_item is null or item_id = p_item) and (p_kind is null or kind = p_kind)
           order by case when p_sort = 'new' then -extract(epoch from created_at) else unit_price end, created_at desc
           limit least(greatest(coalesce(p_limit, 120), 1), 300)) l;
  return jsonb_build_object('ok', true, 'listings', res);
end;
$$;

/** Mis anuncios (14 días) y mi historial de compras y ventas (30 días) en esta partida. */
create or replace function public.market_mine(p_slot smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._econ_uid(p_slot); mine jsonb; hist jsonb;
begin
  perform public._mkt_expire();
  select coalesce(jsonb_agg(public._mkt_listing_json(l, v_uid) order by l.created_at desc), '[]'::jsonb) into mine
    from public.market_listings l
   where l.seller = v_uid and l.seller_slot = p_slot and (l.status = 'open' or l.created_at > now() - interval '14 days');
  select coalesce(jsonb_agg(jsonb_build_object('side', case when s.seller = v_uid and s.seller_slot = p_slot then 'sell' else 'buy' end,
           'item', s.item_id, 'qty', s.qty, 'price', s.unit_price, 'gross', s.gross, 'fee', s.fee, 'at', s.at) order by s.at desc), '[]'::jsonb) into hist
    from public.market_sales s
   where ((s.seller = v_uid and s.seller_slot = p_slot) or (s.buyer = v_uid and s.buyer_slot = p_slot)) and s.at > now() - interval '30 days';
  return jsonb_build_object('ok', true, 'listings', mine, 'history', hist,
    'blocked', exists (select 1 from public.market_flags where user_id = v_uid and slot_id = p_slot));
end;
$$;

/** Avisos de lo que pasó mientras no estabas (ventas y anuncios caducados). Se marcan como vistos. */
create or replace function public.market_inbox(p_slot smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._econ_uid(p_slot); sold jsonb; expired jsonb;
begin
  perform public._mkt_expire();
  with s as (
    update public.market_sales set seller_seen = true
     where seller = v_uid and seller_slot = p_slot and not seller_seen
    returning item_id, qty, gross - fee as net)
  select coalesce(jsonb_agg(jsonb_build_object('item', item_id, 'qty', q, 'net', n)), '[]'::jsonb) into sold
    from (select item_id, sum(qty) q, sum(net) n from s group by item_id) g;
  with e as (
    update public.market_listings set seen = true
     where seller = v_uid and seller_slot = p_slot and status = 'expired' and not seen
    returning item_id, qty_left)
  select coalesce(jsonb_agg(jsonb_build_object('item', item_id, 'qty', qty_left)), '[]'::jsonb) into expired from e;
  return jsonb_build_object('ok', true, 'sold', sold, 'expired', expired);
end;
$$;

/** Precio sugerido: mediana de las últimas 20 ventas (null si aún no hay ventas). */
create or replace function public.market_price_hint(p_item text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true, 'item', p_item,
    'median', (select percentile_disc(0.5) within group (order by unit_price)
                 from (select unit_price from public.market_sales where item_id = p_item order by at desc limit 20) x),
    'sales', (select count(*) from public.market_sales where item_id = p_item));
$$;

-- ---------------------------------------------------------------------------
-- 4. Vender a Ochi: no se puede vender lo que está anunciado (cuenta las salidas aún sin guardar)
-- ---------------------------------------------------------------------------
create or replace function public.economy_shop_sell(p_slot smallint, p_item text, p_qty int, p_idem text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._econ_uid(p_slot);
  lim jsonb := public.econ_limits();
  w public.slot_wallets%rowtype;
  c public.economy_catalog%rowtype;
  d jsonb;
  gain bigint;
  today_sold int;
  owned int;
begin
  w := public._econ_wallet(v_uid, p_slot);
  if (public._econ_replay(v_uid, p_slot, p_idem)).id is not null then return public._econ_out(w, jsonb_build_object('replay', true)); end if;
  if p_qty is null or p_qty < 1 or p_qty > (lim ->> 'max_qty')::int then return public._econ_err('invalid_qty', w); end if;
  select * into c from public.economy_catalog where key = 'sell:' || p_item;
  if not found or c.gold <= 0 then return public._econ_err('not_sellable', w); end if;
  select data into d from public.save_slots where user_id = v_uid and slot_id = p_slot;
  owned := public._econ_owned(coalesce(d, '{}'::jsonb), p_item)
         + coalesce((select sum(delta)::int from public.slot_item_deltas where user_id = v_uid and slot_id = p_slot and item_id = p_item and not applied), 0);
  if owned < p_qty then return public._econ_err('not_owned', w); end if;
  gain := c.gold::bigint * p_qty;
  today_sold := case when w.sell_day = current_date then w.sell_gold else 0 end;
  if today_sold + gain > (lim ->> 'sell_gold_per_day')::int then return public._econ_err('daily_cap', w); end if;
  update public.slot_wallets set sell_gold = today_sold + gain, sell_day = current_date where user_id = v_uid and slot_id = p_slot;
  w := public._econ_apply(v_uid, p_slot, 'shop_sell', p_item, p_qty, gain, 0, 0, p_idem);
  return public._econ_out(w, jsonb_build_object('gain', gain));
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Guardado: monedas del servidor + entradas y salidas del mercado + vigilancia
-- ---------------------------------------------------------------------------
create or replace function public._mkt_settle(p_uid uuid, p_slot smallint, p_data jsonb, p_prev jsonb, p_prev_at timestamptz)
returns jsonb    -- { data, applied: [...] }
language plpgsql security definer set search_path = public as $$
declare
  acks bigint[];
  d public.slot_item_deltas%rowtype;
  v_data jsonb := p_data;
  v_applied jsonb := '[]'::jsonb;
  done jsonb := '{}'::jsonb;     -- variación del mercado por objeto en este guardado
  r public.market_item_rules%rowtype;
  allowance int;
  shop_in int;
  grew int;
begin
  select coalesce(array_agg(x::bigint), '{}') into acks
    from jsonb_array_elements_text(case when jsonb_typeof(p_data -> 'marketAck') = 'array' then p_data -> 'marketAck' else '[]'::jsonb end) x
   where x ~ '^\d{1,15}$';
  for d in select * from public.slot_item_deltas where user_id = p_uid and slot_id = p_slot and not slot_item_deltas.applied order by id for update loop
    if d.id = any(acks) then
      update public.slot_item_deltas set applied = true, applied_by = 'client' where id = d.id;
    else
      v_data := public._mkt_apply_delta(v_data, d.item_id, d.kind, d.delta);
      update public.slot_item_deltas set applied = true, applied_by = 'server' where id = d.id;
      v_applied := v_applied || public._mkt_delta_json(d);
    end if;
    done := done || jsonb_build_object(d.item_id, coalesce((done ->> d.item_id)::int, 0) + d.delta);
  end loop;
  -- Vigilancia: un objeto comerciable no puede crecer entre dos guardados más de lo que se consigue jugando
  -- (60 + 5 por minuto desde el guardado anterior), sin contar lo comprado a Ochi ni lo que entró por el mercado.
  if p_prev is not null and not exists (select 1 from public.market_flags where user_id = p_uid and slot_id = p_slot) then
    allowance := 60 + 5 * least(720, greatest(0, extract(epoch from now() - coalesce(p_prev_at, now())) / 60))::int;
    for r in select * from public.market_item_rules loop
      select coalesce(sum(qty), 0) into shop_in from public.economy_ledger
       where user_id = p_uid and slot_id = p_slot and kind in ('shop_buy', 'shop_rebuy') and ref = r.item_id
         and at > coalesce(p_prev_at, now() - interval '1 hour');
      grew := public._mkt_count(v_data, r.item_id, r.kind) - public._mkt_count(p_prev, r.item_id, r.kind)
              - coalesce((done ->> r.item_id)::int, 0) - shop_in;
      if grew > allowance then
        insert into public.market_flags (user_id, slot_id, reason)
        values (p_uid, p_slot, format('%s: +%s entre guardados (margen %s)', r.item_id, grew, allowance))
        on conflict do nothing;
        exit;
      end if;
    end loop;
  end if;
  return jsonb_build_object('data', v_data, 'applied', v_applied);
end;
$$;

create or replace function public.save_slot(p_slot_id smallint, p_data jsonb, p_expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.save_slots%rowtype;
  w public.slot_wallets%rowtype;
  st jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_slot_id not between 1 and 3 then
    raise exception 'invalid_slot' using errcode = '22023';
  end if;

  select * into v_row from public.save_slots
   where user_id = v_uid and slot_id = p_slot_id
   for update;

  if not found then
    if coalesce(p_expected_version, 0) <> 0 then
      return jsonb_build_object('ok', false, 'conflict', true, 'version', 0, 'data', null);
    end if;
    delete from public.slot_wallets where user_id = v_uid and slot_id = p_slot_id;
    w := public._econ_wallet(v_uid, p_slot_id, p_data);
    st := public._mkt_settle(v_uid, p_slot_id, public._econ_stamp(p_data, w), null, null);
    insert into public.save_slots (user_id, slot_id, data, version)
    values (v_uid, p_slot_id, st -> 'data', 1);
    update public.profiles set last_slot_id = p_slot_id, updated_at = now() where user_id = v_uid;
    return jsonb_build_object('ok', true, 'version', 1, 'gold', w.gold, 'slp', w.slp, 'baxs', w.baxs, 'applied', st -> 'applied');
  end if;

  if v_row.version <> coalesce(p_expected_version, -1) then
    return jsonb_build_object('ok', false, 'conflict', true, 'version', v_row.version, 'data', v_row.data);
  end if;

  w := public._econ_wallet(v_uid, p_slot_id, v_row.data);
  st := public._mkt_settle(v_uid, p_slot_id, public._econ_stamp(p_data, w), v_row.data, v_row.updated_at);
  update public.save_slots
     set data = st -> 'data', version = v_row.version + 1, updated_at = now()
   where user_id = v_uid and slot_id = p_slot_id;

  update public.profiles set last_slot_id = p_slot_id, updated_at = now() where user_id = v_uid;

  return jsonb_build_object('ok', true, 'version', v_row.version + 1, 'gold', w.gold, 'slp', w.slp, 'baxs', w.baxs, 'applied', st -> 'applied');
end;
$$;

-- Borrar una ranura: sus anuncios abiertos se cierran (sin devolver nada) y se olvidan sus entradas pendientes.
create or replace function public._econ_on_slot_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.slot_wallets where user_id = old.user_id and slot_id = old.slot_id;
  delete from public.economy_reward_claims where user_id = old.user_id and slot_id = old.slot_id;
  delete from public.economy_legacy_slots where user_id = old.user_id and slot_id = old.slot_id;
  update public.market_listings set status = 'cancelled', closed_at = now() where seller = old.user_id and seller_slot = old.slot_id and status = 'open';
  delete from public.slot_item_deltas where user_id = old.user_id and slot_id = old.slot_id;
  delete from public.market_flags where user_id = old.user_id and slot_id = old.slot_id;
  return old;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Permisos
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'market_list(smallint,text,integer,integer,text)', 'market_buy(smallint,bigint,integer,text)', 'market_cancel(smallint,bigint)',
    'market_mine(smallint)', 'market_inbox(smallint)', 'economy_shop_sell(smallint,text,integer,text)', 'save_slot(smallint,jsonb,integer)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['market_browse(text,text,text,integer)', 'market_price_hint(text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  foreach f in array array['_mkt_available(uuid,smallint,text,text)', '_mkt_expire()', '_mkt_public_name(uuid,smallint)', '_mkt_settle(uuid,smallint,jsonb,jsonb,timestamptz)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
