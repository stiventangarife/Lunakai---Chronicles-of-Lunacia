-- Lunakai · Hito 78 · Fase 3 del Mercado: equipo (Tier 1–3), runas y charms por bAXS.
-- Ejecutar después de 20261026000002_market.sql y 20261026000003_market_rules.sql, y luego
-- 20261026000005_market_rules.sql (lista nueva de objetos comerciables, con su moneda; generada desde el juego).
--
-- · Cada objeto se vende en una moneda: materiales, comida y pociones en oro; equipo, runas y charms en bAXS.
-- · bAXS: solo precio mínimo (el máximo lo pone el mercado); tope técnico de 1 000 000 por unidad contra errores.
-- · Comisión del 5 % en la moneda de la venta (bAXS con 2 decimales, redondeada hacia arriba).
-- · Un único punto de pago (_mkt_pay, el «marketPay» del diseño) para poder cambiarlo por bAXS real.
-- · Runas y charms: no se anuncian las que lleva un Axie ni las copias Ronin. Equipo: ni el equipado ni el de la Forja.
-- · market_inbox avisa en directo de ventas y caducidades (el juego lo consulta mientras tienes anuncios abiertos).

-- ---------------------------------------------------------------------------
-- 1. Tablas: moneda y precios con decimales
-- ---------------------------------------------------------------------------
do $$
declare c record;
begin
  for c in select conname, conrelid::regclass::text t from pg_constraint
            where contype = 'c' and conrelid in ('public.market_item_rules'::regclass, 'public.market_listings'::regclass, 'public.market_sales'::regclass)
              and pg_get_constraintdef(oid) ~ '(kind|min_price|max_price|unit_price)'
  loop
    execute format('alter table %s drop constraint %I', c.t, c.conname);
  end loop;
end $$;

alter table public.market_item_rules
  add column if not exists currency text not null default 'gold',
  alter column min_price type numeric(14, 2),
  alter column max_price type numeric(14, 2),
  alter column max_price drop not null;
alter table public.market_item_rules
  add constraint market_item_rules_kind_ck check (kind in ('mat', 'inv', 'rc')),
  add constraint market_item_rules_currency_ck check (currency in ('gold', 'baxs')),
  add constraint market_item_rules_price_ck check (min_price > 0 and (max_price is null or max_price >= min_price));

alter table public.market_listings
  add column if not exists currency text not null default 'gold',
  alter column unit_price type numeric(14, 2);
alter table public.market_listings add constraint market_listings_price_ck check (unit_price > 0);

alter table public.market_sales
  add column if not exists currency text not null default 'gold',
  alter column unit_price type numeric(14, 2),
  alter column gross type numeric(16, 2),
  alter column fee type numeric(16, 2);

-- ---------------------------------------------------------------------------
-- 2. Objetos en la partida: runas y charms (rc) además de materiales (mat) y Mochila (inv)
-- ---------------------------------------------------------------------------
/** rune:<id> / charm:<id> → ('runes'|'charms', id) */
create or replace function public._mkt_rc(p_item text, out bag text, out id text)
language sql immutable as $$
  select case when p_item like 'rune:%' then 'runes' when p_item like 'charm:%' then 'charms' end,
         substr(p_item, position(':' in p_item) + 1);
$$;

create or replace function public._mkt_count(p_data jsonb, p_item text, p_kind text)
returns integer language plpgsql immutable as $$
declare n int := 0; r record;
begin
  if p_kind = 'mat' then return greatest(0, coalesce((p_data #>> array['forge', 'mats', p_item])::int, 0)); end if;
  if p_kind = 'rc' then
    r := public._mkt_rc(p_item);
    return greatest(0, coalesce((p_data #>> array['runeCharmBag', r.bag, r.id])::int, 0));
  end if;
  select count(*) into n from jsonb_array_elements_text(case when jsonb_typeof(p_data -> 'inventory') = 'array' then p_data -> 'inventory' else '[]'::jsonb end) x where x = p_item;
  return n;
end;
$$;

create or replace function public._mkt_apply_delta(p_data jsonb, p_item text, p_kind text, p_delta int)
returns jsonb language plpgsql immutable as $$
declare
  d jsonb := coalesce(p_data, '{}'::jsonb);
  inv jsonb; out jsonb := '[]'::jsonb; x text; left_to_remove int; i int; r record; bagj jsonb;
begin
  if p_kind = 'mat' then
    d := d || jsonb_build_object('forge',
      coalesce(case when jsonb_typeof(d -> 'forge') = 'object' then d -> 'forge' end, '{}'::jsonb)
      || jsonb_build_object('mats',
           coalesce(case when jsonb_typeof(d #> '{forge,mats}') = 'object' then d #> '{forge,mats}' end, '{}'::jsonb)
           || jsonb_build_object(p_item, greatest(0, public._mkt_count(d, p_item, 'mat') + p_delta))));
    return d;
  end if;
  if p_kind = 'rc' then
    r := public._mkt_rc(p_item);
    bagj := coalesce(case when jsonb_typeof(d -> 'runeCharmBag') = 'object' then d -> 'runeCharmBag' end, '{}'::jsonb);
    bagj := bagj || jsonb_build_object(r.bag,
      coalesce(case when jsonb_typeof(bagj -> r.bag) = 'object' then bagj -> r.bag end, '{}'::jsonb)
      || jsonb_build_object(r.id, greatest(0, public._mkt_count(d, p_item, 'rc') + p_delta)));
    return d || jsonb_build_object('runeCharmBag', bagj);
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

/** Unidades que NO se pueden anunciar: runas y charms puestas en un Axie (sin contar las cubiertas por copias Ronin)
 *  y piezas de la Mochila apartadas por un trabajo de la Forja. */
create or replace function public._mkt_locked(p_data jsonb, p_item text, p_kind text)
returns integer language plpgsql immutable as $$
declare r record; worn int := 0; ronin int := 0; forge int := 0;
begin
  if p_kind = 'rc' then
    r := public._mkt_rc(p_item);
    if r.bag = 'runes' then
      select count(*) into worn from jsonb_each(case when jsonb_typeof(p_data -> 'runeCharms') = 'object' then p_data -> 'runeCharms' else '{}'::jsonb end) e
       where e.value ->> 'rune' = r.id;
    else
      select count(*) into worn
        from jsonb_each(case when jsonb_typeof(p_data -> 'runeCharms') = 'object' then p_data -> 'runeCharms' else '{}'::jsonb end) e,
             jsonb_each_text(case when jsonb_typeof(e.value -> 'charms') = 'object' then e.value -> 'charms' else '{}'::jsonb end) c
       where c.value = r.id;
    end if;
    ronin := coalesce((p_data #>> array['roninItems', r.bag, r.id])::int, 0);
    return greatest(0, worn - ronin);
  end if;
  if p_kind = 'inv' then
    select count(*) into forge
      from jsonb_array_elements(case when jsonb_typeof(p_data #> '{forge,jobs}') = 'array' then p_data #> '{forge,jobs}' else '[]'::jsonb end) j
     where j ->> 'from' = p_item and j ->> 'hero' is not null and coalesce((j ->> 'held')::boolean, false) = false
       and coalesce(p_data #>> array['equipped', j ->> 'hero', j ->> 'slot'], '') <> p_item;
    return forge;
  end if;
  return 0;
end;
$$;

create or replace function public._mkt_available(p_uid uuid, p_slot smallint, p_item text, p_kind text)
returns integer language plpgsql stable security definer set search_path = public as $$
declare d jsonb;
begin
  d := coalesce((select data from public.save_slots where user_id = p_uid and slot_id = p_slot), '{}'::jsonb);
  return greatest(0,
    public._mkt_count(d, p_item, p_kind) - public._mkt_locked(d, p_item, p_kind)
    + coalesce((select sum(delta)::int from public.slot_item_deltas where user_id = p_uid and slot_id = p_slot and item_id = p_item and not applied), 0));
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Pago (marketPay): cobra al comprador y paga al vendedor menos la comisión, en oro o en bAXS
-- ---------------------------------------------------------------------------
create or replace function public._mkt_fee(p_gross numeric, p_currency text)
returns numeric language sql immutable as $$
  select case when p_currency = 'baxs' then ceil(p_gross * 5) / 100.0 else ceil(p_gross * 0.05) end;
$$;

create or replace function public._mkt_pay(p_buyer uuid, p_buyer_slot smallint, p_seller uuid, p_seller_slot smallint,
  p_currency text, p_gross numeric, p_fee numeric, p_ref text, p_qty int, p_idem text)
returns public.slot_wallets
language plpgsql security definer set search_path = public as $$
declare w public.slot_wallets%rowtype;
begin
  perform public._econ_wallet(p_seller, p_seller_slot);
  if p_currency = 'baxs' then
    w := public._econ_apply(p_buyer, p_buyer_slot, 'market_buy', p_ref, p_qty, 0, 0, -p_gross, p_idem);
    perform public._econ_apply(p_seller, p_seller_slot, 'market_sell', p_ref, p_qty, 0, 0, p_gross - p_fee, null);
  else
    w := public._econ_apply(p_buyer, p_buyer_slot, 'market_buy', p_ref, p_qty, -p_gross::bigint, 0, 0, p_idem);
    perform public._econ_apply(p_seller, p_seller_slot, 'market_sell', p_ref, p_qty, (p_gross - p_fee)::bigint, 0, 0, null);
  end if;
  return w;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Funciones del Mercado (con moneda)
-- ---------------------------------------------------------------------------
create or replace function public._mkt_listing_json(l public.market_listings, p_uid uuid default null)
returns jsonb language sql stable as $$
  select jsonb_build_object('id', l.id, 'item', l.item_id, 'kind', l.kind, 'qty', l.qty, 'qtyLeft', l.qty_left,
    'price', l.unit_price, 'currency', l.currency, 'seller', coalesce(l.seller_name, 'Jugador'), 'mine', p_uid is not null and l.seller = p_uid,
    'status', l.status, 'createdAt', l.created_at, 'expiresAt', l.expires_at, 'closedAt', l.closed_at);
$$;

drop function if exists public.market_list(smallint, text, integer, integer, text);
create or replace function public.market_list(p_slot smallint, p_item text, p_qty int, p_price numeric, p_idem text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._econ_uid(p_slot);
  r public.market_item_rules%rowtype;
  l public.market_listings%rowtype;
  d public.slot_item_deltas%rowtype;
  open_n int;
  v_price numeric;
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
  v_price := case when r.currency = 'baxs' then round(p_price, 2) else round(p_price) end;
  if v_price is null or v_price < r.min_price or v_price > coalesce(r.max_price, 1000000) then
    return public._econ_err('bad_price', null, jsonb_build_object('min', r.min_price, 'max', r.max_price, 'currency', r.currency));
  end if;
  select count(*) into open_n from public.market_listings where seller = v_uid and status = 'open';
  if open_n >= 20 then return public._econ_err('too_many_listings'); end if;
  if public._mkt_available(v_uid, p_slot, p_item, r.kind) < p_qty then return public._econ_err('not_owned'); end if;
  perform public._econ_wallet(v_uid, p_slot);
  insert into public.market_listings (seller, seller_slot, seller_name, item_id, kind, qty, qty_left, unit_price, currency, idem)
  values (v_uid, p_slot, public._mkt_public_name(v_uid, p_slot), p_item, r.kind, p_qty, p_qty, v_price, r.currency, p_idem)
  returning * into l;
  insert into public.slot_item_deltas (user_id, slot_id, item_id, kind, delta, reason, ref)
  values (v_uid, p_slot, p_item, r.kind, -p_qty, 'list', l.id) returning * into d;
  return jsonb_build_object('ok', true, 'listing', public._mkt_listing_json(l, v_uid), 'delta', public._mkt_delta_json(d));
end;
$$;

create or replace function public.market_buy(p_slot smallint, p_listing bigint, p_qty int, p_idem text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._econ_uid(p_slot);
  l public.market_listings%rowtype;
  s public.market_sales%rowtype;
  w public.slot_wallets%rowtype;
  d public.slot_item_deltas%rowtype;
  cost numeric; fee numeric; have numeric;
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
  cost := l.unit_price * p_qty;
  have := case when l.currency = 'baxs' then w.baxs else w.gold end;
  if have < cost then
    return public._econ_err(case when l.currency = 'baxs' then 'need_baxs' else 'need_gold' end, w, jsonb_build_object('need', cost - have));
  end if;
  fee := public._mkt_fee(cost, l.currency);
  w := public._mkt_pay(v_uid, p_slot, l.seller, l.seller_slot, l.currency, cost, fee, l.item_id || '#' || l.id, p_qty, p_idem);
  insert into public.slot_item_deltas (user_id, slot_id, item_id, kind, delta, reason, ref)
  values (v_uid, p_slot, l.item_id, l.kind, p_qty, 'buy', l.id) returning * into d;
  insert into public.market_sales (listing_id, seller, seller_slot, buyer, buyer_slot, item_id, qty, unit_price, gross, fee, currency, idem, delta_id)
  values (l.id, l.seller, l.seller_slot, v_uid, p_slot, l.item_id, p_qty, l.unit_price, cost, fee, l.currency, p_idem, d.id);
  update public.market_listings
     set qty_left = qty_left - p_qty,
         status = case when qty_left - p_qty = 0 then 'sold' else status end,
         closed_at = case when qty_left - p_qty = 0 then now() else closed_at end
   where id = l.id;
  return public._econ_out(w, jsonb_build_object('cost', cost, 'currency', l.currency, 'delta', public._mkt_delta_json(d)));
end;
$$;

create or replace function public.market_mine(p_slot smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._econ_uid(p_slot); mine jsonb; hist jsonb;
begin
  perform public._mkt_expire();
  select coalesce(jsonb_agg(public._mkt_listing_json(l, v_uid) order by l.created_at desc), '[]'::jsonb) into mine
    from public.market_listings l
   where l.seller = v_uid and l.seller_slot = p_slot and (l.status = 'open' or l.created_at > now() - interval '14 days');
  select coalesce(jsonb_agg(jsonb_build_object('side', case when s.seller = v_uid and s.seller_slot = p_slot then 'sell' else 'buy' end,
           'item', s.item_id, 'qty', s.qty, 'price', s.unit_price, 'gross', s.gross, 'fee', s.fee, 'currency', s.currency, 'at', s.at) order by s.at desc), '[]'::jsonb) into hist
    from public.market_sales s
   where ((s.seller = v_uid and s.seller_slot = p_slot) or (s.buyer = v_uid and s.buyer_slot = p_slot)) and s.at > now() - interval '30 days';
  return jsonb_build_object('ok', true, 'listings', mine, 'history', hist,
    'blocked', exists (select 1 from public.market_flags where user_id = v_uid and slot_id = p_slot));
end;
$$;

/** Avisos (ventas y caducidades, una vez), anuncios abiertos y entradas pendientes de aplicar en la partida.
 *  El juego lo consulta al entrar y, mientras tienes anuncios abiertos, cada minuto. */
create or replace function public.market_inbox(p_slot smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._econ_uid(p_slot); sold jsonb; expired jsonb; pend jsonb; open_n int;
begin
  perform public._mkt_expire();
  with s as (
    update public.market_sales set seller_seen = true
     where seller = v_uid and seller_slot = p_slot and not seller_seen
    returning item_id, qty, currency, gross - fee as net)
  select coalesce(jsonb_agg(jsonb_build_object('item', item_id, 'qty', q, 'net', n, 'currency', currency)), '[]'::jsonb) into sold
    from (select item_id, currency, sum(qty) q, sum(net) n from s group by item_id, currency) g;
  with e as (
    update public.market_listings set seen = true
     where seller = v_uid and seller_slot = p_slot and status = 'expired' and not seen
    returning item_id, qty_left)
  select coalesce(jsonb_agg(jsonb_build_object('item', item_id, 'qty', qty_left)), '[]'::jsonb) into expired from e;
  select coalesce(jsonb_agg(public._mkt_delta_json(d) order by d.id), '[]'::jsonb) into pend
    from public.slot_item_deltas d where d.user_id = v_uid and d.slot_id = p_slot and not d.applied;
  select count(*) into open_n from public.market_listings where seller = v_uid and seller_slot = p_slot and status = 'open';
  return jsonb_build_object('ok', true, 'sold', sold, 'expired', expired, 'pending', pend, 'open', open_n);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Vigilancia al guardar: también equipo, runas y charms (con un margen más pequeño)
-- ---------------------------------------------------------------------------
create or replace function public._mkt_settle(p_uid uuid, p_slot smallint, p_data jsonb, p_prev jsonb, p_prev_at timestamptz)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  acks bigint[];
  d public.slot_item_deltas%rowtype;
  v_data jsonb := p_data;
  v_applied jsonb := '[]'::jsonb;
  done jsonb := '{}'::jsonb;
  r public.market_item_rules%rowtype;
  mins int;
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
  -- Materiales, comida y pociones: 60 + 5 por minuto. Equipo, runas y charms (se consiguen mucho más despacio): 10 + 1 por minuto.
  if p_prev is not null and not exists (select 1 from public.market_flags where user_id = p_uid and slot_id = p_slot) then
    mins := least(720, greatest(0, extract(epoch from now() - coalesce(p_prev_at, now())) / 60))::int;
    for r in select * from public.market_item_rules loop
      allowance := case when r.currency = 'baxs' then 10 + mins else 60 + 5 * mins end;
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

-- ---------------------------------------------------------------------------
-- 6. Permisos
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array['market_list(smallint,text,integer,numeric,text)', 'market_buy(smallint,bigint,integer,text)',
                           'market_mine(smallint)', 'market_inbox(smallint)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['_mkt_available(uuid,smallint,text,text)', '_mkt_pay(uuid,smallint,uuid,smallint,text,numeric,numeric,text,integer,text)',
                           '_mkt_settle(uuid,smallint,jsonb,jsonb,timestamptz)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
