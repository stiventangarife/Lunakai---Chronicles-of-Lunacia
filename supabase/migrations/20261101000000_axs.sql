-- Lunakai · Hito 110 · Moneda AXS: el Mercado de equipo, runas y charms pasa de bAXS a AXS.
-- Ejecutar después de 20261026000005_market_rules.sql, y luego (generados desde el juego con tools/gen_catalog.mjs):
--   20261101000001_economy_catalog.sql  (Ochi ya no compra runas ni charms)
--   20261101000002_market_rules.sql     (equipo T1–3, runas y charms en AXS)
--
-- Economía tras este hito:
--   · Oro  — tienda de Ochi (recursos, consumibles, materiales), Forja Tier 0 y Mercado de recursos.
--   · SLP  — evolución de equipo y bolsas de runas y charms.
--   · AXS  — Mercado entre jugadores: equipo Tier 1–3, runas y charms (se perciben como NFT). Comisión del 5 % en AXS.
--   · bAXS — tasas de la Forja (comisión de evolución y rapidez) y, más adelante, premios de arena y reto semanal.
--            Ya NO se intercambia entre jugadores.
-- Bono: partidas nuevas 5 AXS + 15 bAXS (antes 30 bAXS); partidas existentes +5 AXS +15 bAXS una sola vez.

-- ---------------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------------
alter table public.slot_wallets
  add column if not exists axs        numeric(14, 2) not null default 0,
  add column if not exists axs_launch boolean        not null default false;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'slot_wallets_axs_ck') then
    alter table public.slot_wallets add constraint slot_wallets_axs_ck check (axs >= 0);
  end if;
end $$;

alter table public.economy_ledger
  add column if not exists axs numeric(14, 2) not null default 0;

-- ---------------------------------------------------------------------------
-- 2. Límites (cámbialos aquí)
-- ---------------------------------------------------------------------------
create or replace function public.econ_limits()
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'legacy_gold', 20000, 'legacy_slp', 5000, 'legacy_baxs', 500,   -- partidas que ya estaban en la nube
    'gold_per_level', 200, 'slp_base', 500, 'slp_per_level', 50,     -- partidas nuevas e invitados que vinculan
    'baxs_base', 15, 'baxs_per_level', 5,                            -- (base = bono de inicio: 500 SLP · 15 bAXS · 5 AXS)
    'axs_base', 5,                                                   -- AXS al crear el saldo (no se acepta el del navegador)
    'axs_launch', 5, 'baxs_launch', 15,                              -- regalo único a las partidas que ya existían (Hito 110)
    'battle_min', 20, 'battle_max', 45, 'battle_every_s', 20, 'battle_per_day', 300,
    'sell_gold_per_day', 5000, 'slp_spent_per_day', 5000, 'max_qty', 99
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Saldo con AXS
-- ---------------------------------------------------------------------------
/** Saldo de la ranura (bloqueado para la transacción). Si no existe, lo crea a partir de la partida con tope.
 *  El AXS no se toma del navegador: todo saldo nuevo empieza con axs_base. */
create or replace function public._econ_wallet(p_uid uuid, p_slot smallint, p_data jsonb default null)
returns public.slot_wallets
language plpgsql security definer set search_path = public as $$
declare
  w public.slot_wallets%rowtype;
  d jsonb := p_data;
  lim jsonb := public.econ_limits();
  lvl int;
  legacy boolean;
  g numeric; s numeric; b numeric; a numeric;
begin
  select * into w from public.slot_wallets where user_id = p_uid and slot_id = p_slot for update;
  if found then return w; end if;
  if d is null then select data into d from public.save_slots where user_id = p_uid and slot_id = p_slot; end if;
  d := coalesce(d, '{}'::jsonb);
  lvl := public._econ_level(d);
  legacy := exists (select 1 from public.economy_legacy_slots where user_id = p_uid and slot_id = p_slot);
  g := floor(public._econ_num(d -> 'gold'));
  s := floor(public._econ_num(d #> '{forge,slp}'));
  b := round(public._econ_num(d #> '{forge,baxs}'), 2);
  a := (lim ->> 'axs_base')::numeric;
  if legacy then
    g := least(g, (lim ->> 'legacy_gold')::numeric);
    s := least(s, (lim ->> 'legacy_slp')::numeric);
    b := least(b, (lim ->> 'legacy_baxs')::numeric);
  else
    g := least(g, (lim ->> 'gold_per_level')::numeric * lvl);
    s := least(s, (lim ->> 'slp_base')::numeric + (lim ->> 'slp_per_level')::numeric * lvl);
    -- el tope cuenta el regalo único del Hito 110 (una partida local antigua ya lo trae)
    b := least(b, (lim ->> 'baxs_base')::numeric + (lim ->> 'baxs_launch')::numeric + (lim ->> 'baxs_per_level')::numeric * lvl);
  end if;
  insert into public.slot_wallets (user_id, slot_id, gold, slp, baxs, axs, axs_launch, origin)
  values (p_uid, p_slot, g, s, b, a, true, case when legacy then 'legacy' else 'new' end)
  on conflict (user_id, slot_id) do nothing;
  insert into public.economy_ledger (user_id, slot_id, kind, ref, gold, slp, baxs, axs)
  values (p_uid, p_slot, 'init', case when legacy then 'legacy' else 'level ' || lvl end, g, s, b, a);
  select * into w from public.slot_wallets where user_id = p_uid and slot_id = p_slot for update;
  return w;
end;
$$;

create or replace function public._econ_out(w public.slot_wallets, extra jsonb default '{}'::jsonb)
returns jsonb language sql immutable as $$
  select jsonb_build_object('ok', true, 'gold', w.gold, 'slp', w.slp, 'baxs', w.baxs, 'axs', w.axs) || coalesce(extra, '{}'::jsonb);
$$;

create or replace function public._econ_err(p_code text, w public.slot_wallets default null, extra jsonb default '{}'::jsonb)
returns jsonb language sql immutable as $$
  select jsonb_build_object('ok', false, 'error', p_code)
    || case when w.user_id is null then '{}'::jsonb else jsonb_build_object('gold', w.gold, 'slp', w.slp, 'baxs', w.baxs, 'axs', w.axs) end
    || coalesce(extra, '{}'::jsonb);
$$;

/** Variación de AXS (comprueba que no quede saldo negativo por el check de la tabla) y la anota. */
create or replace function public._econ_apply_axs(p_uid uuid, p_slot smallint, p_kind text, p_ref text, p_qty int,
  p_axs numeric, p_idem text)
returns public.slot_wallets
language plpgsql security definer set search_path = public as $$
declare w public.slot_wallets%rowtype;
begin
  update public.slot_wallets
     set axs = round(axs + p_axs, 2), updated_at = now()
   where user_id = p_uid and slot_id = p_slot
  returning * into w;
  insert into public.economy_ledger (user_id, slot_id, kind, ref, qty, axs, idem)
  values (p_uid, p_slot, p_kind, p_ref, p_qty, round(p_axs, 2), p_idem);
  return w;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Regalo único a las partidas que ya tenían saldo: +5 AXS +15 bAXS
-- ---------------------------------------------------------------------------
do $$
declare lim jsonb := public.econ_limits(); r record;
begin
  for r in select user_id, slot_id from public.slot_wallets where not axs_launch for update loop
    update public.slot_wallets
       set axs = round(axs + (lim ->> 'axs_launch')::numeric, 2),
           baxs = round(baxs + (lim ->> 'baxs_launch')::numeric, 2),
           axs_launch = true, updated_at = now()
     where user_id = r.user_id and slot_id = r.slot_id;
    insert into public.economy_ledger (user_id, slot_id, kind, ref, baxs, axs)
    values (r.user_id, r.slot_id, 'grant', 'axs_launch', (lim ->> 'baxs_launch')::numeric, (lim ->> 'axs_launch')::numeric);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Guardado: el oro, el SLP, el bAXS y el AXS los pone el servidor
-- ---------------------------------------------------------------------------
create or replace function public._econ_stamp(p_data jsonb, w public.slot_wallets)
returns jsonb language sql immutable as $$
  select coalesce(p_data, '{}'::jsonb)
    || jsonb_build_object('gold', w.gold,
         'forge', coalesce(case when jsonb_typeof(p_data -> 'forge') = 'object' then p_data -> 'forge' end, '{}'::jsonb)
                  || jsonb_build_object('slp', w.slp, 'baxs', w.baxs, 'axs', w.axs, 'axsLaunch', true));
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
    return jsonb_build_object('ok', true, 'version', 1, 'gold', w.gold, 'slp', w.slp, 'baxs', w.baxs, 'axs', w.axs, 'applied', st -> 'applied');
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

  return jsonb_build_object('ok', true, 'version', v_row.version + 1, 'gold', w.gold, 'slp', w.slp, 'baxs', w.baxs, 'axs', w.axs, 'applied', st -> 'applied');
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Mercado: oro y AXS (el bAXS sale del Mercado)
-- ---------------------------------------------------------------------------
alter table public.market_item_rules drop constraint if exists market_item_rules_currency_ck;
-- Las reglas en bAXS pasan a AXS aquí mismo (la lista generada 20261101000002 las vuelve a escribir igual).
update public.market_item_rules set currency = 'axs' where currency = 'baxs';
alter table public.market_item_rules
  add constraint market_item_rules_currency_ck check (currency in ('gold', 'axs'));

-- Anuncios abiertos en bAXS → AXS al mismo precio. El historial (cerrados y ventas) conserva su moneda.
update public.market_listings set currency = 'axs' where currency = 'baxs' and status = 'open';

/** Comisión del 5 %: oro redondeado hacia arriba; AXS (y el bAXS de ventas antiguas) hacia arriba al céntimo. */
create or replace function public._mkt_fee(p_gross numeric, p_currency text)
returns numeric language sql immutable as $$
  select case when p_currency in ('axs', 'baxs') then ceil(p_gross * 5) / 100.0 else ceil(p_gross * 0.05) end;
$$;

/** marketPay: cobra al comprador y paga al vendedor menos la comisión, en oro o en AXS.
 *  Es el único punto que habría que cambiar para pagar con AXS real (firma en Ronin Wallet / Waypoint). */
create or replace function public._mkt_pay(p_buyer uuid, p_buyer_slot smallint, p_seller uuid, p_seller_slot smallint,
  p_currency text, p_gross numeric, p_fee numeric, p_ref text, p_qty int, p_idem text)
returns public.slot_wallets
language plpgsql security definer set search_path = public as $$
declare w public.slot_wallets%rowtype;
begin
  perform public._econ_wallet(p_seller, p_seller_slot);
  if p_currency = 'axs' then
    w := public._econ_apply_axs(p_buyer, p_buyer_slot, 'market_buy', p_ref, p_qty, -p_gross, p_idem);
    perform public._econ_apply_axs(p_seller, p_seller_slot, 'market_sell', p_ref, p_qty, p_gross - p_fee, null);
  elsif p_currency = 'gold' then
    w := public._econ_apply(p_buyer, p_buyer_slot, 'market_buy', p_ref, p_qty, -p_gross::bigint, 0, 0, p_idem);
    perform public._econ_apply(p_seller, p_seller_slot, 'market_sell', p_ref, p_qty, (p_gross - p_fee)::bigint, 0, 0, null);
  else
    raise exception 'bad_currency' using errcode = '22023'; -- el bAXS ya no se intercambia
  end if;
  return w;
end;
$$;

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
  v_price := case when r.currency = 'gold' then round(p_price) else round(p_price, 2) end;
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
  if l.currency not in ('gold', 'axs') then return public._econ_err('listing_gone'); end if; -- restos en bAXS: ya no se venden
  if l.seller = v_uid then return public._econ_err('own_listing'); end if;
  if p_qty is null or p_qty < 1 or p_qty > l.qty_left then return public._econ_err('invalid_qty', null, jsonb_build_object('left', l.qty_left)); end if;
  w := public._econ_wallet(v_uid, p_slot);
  cost := l.unit_price * p_qty;
  have := case when l.currency = 'axs' then w.axs else w.gold end;
  if have < cost then
    return public._econ_err(case when l.currency = 'axs' then 'need_axs' else 'need_gold' end, w, jsonb_build_object('need', cost - have));
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

/** Precio sugerido: mediana de las últimas 20 ventas en la moneda actual del objeto
 *  (las ventas antiguas en bAXS cuentan como AXS: el cambio fue 1 a 1). */
create or replace function public.market_price_hint(p_item text)
returns jsonb language sql stable security definer set search_path = public as $$
  with cur as (select coalesce((select currency from public.market_item_rules where item_id = p_item), 'gold') c),
  s as (select unit_price from public.market_sales, cur
         where item_id = p_item and (case when currency = 'baxs' then 'axs' else currency end) = cur.c
         order by at desc limit 20)
  select jsonb_build_object('ok', true, 'item', p_item,
    'median', (select percentile_disc(0.5) within group (order by unit_price) from s),
    'sales', (select count(*) from s));
$$;

-- Vigilancia al guardar: lo que se vende en AXS (equipo, runas y charms) con el margen pequeño.
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
  -- Materiales, comida y pociones (oro): 60 + 5 por minuto. Equipo, runas y charms (AXS): 10 + 1 por minuto.
  if p_prev is not null and not exists (select 1 from public.market_flags where user_id = p_uid and slot_id = p_slot) then
    mins := least(720, greatest(0, extract(epoch from now() - coalesce(p_prev_at, now())) / 60))::int;
    for r in select * from public.market_item_rules loop
      allowance := case when r.currency = 'gold' then 60 + 5 * mins else 10 + mins end;
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
-- 7. Permisos
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array['market_list(smallint,text,integer,numeric,text)', 'market_buy(smallint,bigint,integer,text)',
                           'save_slot(smallint,jsonb,integer)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- invitados: solo mirar (como antes)
  execute 'revoke all on function public.market_price_hint(text) from public';
  execute 'grant execute on function public.market_price_hint(text) to anon, authenticated';
  foreach f in array array['_econ_wallet(uuid,smallint,jsonb)', '_econ_apply_axs(uuid,smallint,text,text,integer,numeric,text)',
                           '_mkt_pay(uuid,smallint,uuid,smallint,text,numeric,numeric,text,integer,text)',
                           '_mkt_settle(uuid,smallint,jsonb,jsonb,timestamptz)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
