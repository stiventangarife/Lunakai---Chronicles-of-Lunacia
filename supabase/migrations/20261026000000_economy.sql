-- Lunakai · Hito 76 · Fase 1 del Mercado: oro, bAXS y SLP los guarda y los cambia el servidor.
-- Ejecutar después de 20261016000000_accounts_and_saves.sql y 20261019000000_waypoint_addresses.sql
-- (`supabase db push`), y luego 20261026000001_economy_catalog.sql (precios, generado desde el juego).
--
-- Idea: en las partidas con cuenta, el saldo de cada ranura vive en `slot_wallets`. El juego ya no puede
-- subirlo inventado: `save_slot` sustituye el oro, el SLP y el bAXS que manda el navegador por los del servidor,
-- y cada ganancia o gasto pasa por una función (combate, tienda de Ochi, Forja, recompensas) con sus límites.
-- Los invitados no pasan por aquí (juegan en local).

-- ---------------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------------
create table if not exists public.economy_catalog (
  key  text primary key,               -- buy:<id> · sell:<id> · craft:<receta> · evolve:<pieza>:<rapidez> · tier:<pieza> · speed:<tier>:<x> · reward:<id>
  gold integer not null default 0,
  slp  integer not null default 0,
  baxs numeric(12, 2) not null default 0,
  meta integer                         -- tier (evolve/tier) · 1 = recompensa «completar hasta» (reward)
);

create table if not exists public.slot_wallets (
  user_id      uuid not null references auth.users (id) on delete cascade,
  slot_id      smallint not null check (slot_id between 1 and 3),
  gold         bigint not null default 0 check (gold >= 0),
  slp          bigint not null default 0 check (slp >= 0),
  baxs         numeric(14, 2) not null default 0 check (baxs >= 0),
  origin       text not null default 'new',          -- legacy (ya estaba en la nube) · new
  battle_last  timestamptz,
  battle_day   date,
  battle_count integer not null default 0,
  sell_day     date,
  sell_gold    integer not null default 0,
  slp_day      date,
  slp_spent    integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, slot_id)
);

create table if not exists public.economy_ledger (
  id       bigserial primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  slot_id  smallint not null,
  kind     text not null,              -- init · battle · shop_buy · shop_sell · shop_rebuy · craft · evolve · speed · reward
  ref      text,                       -- objeto, receta, trabajo o recompensa
  qty      integer,
  gold     bigint not null default 0,  -- variación (+ gana, − gasta)
  slp      bigint not null default 0,
  baxs     numeric(14, 2) not null default 0,
  idem     text,                       -- clave de idempotencia del cliente (un doble clic no cobra dos veces)
  at       timestamptz not null default now()
);
create unique index if not exists economy_ledger_idem on public.economy_ledger (user_id, slot_id, idem) where idem is not null;
create index if not exists economy_ledger_lookup on public.economy_ledger (user_id, slot_id, kind, ref, at desc);

create table if not exists public.economy_reward_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  slot_id smallint not null,
  reward  text not null,
  at      timestamptz not null default now(),
  primary key (user_id, slot_id, reward)
);

-- Ranuras que ya estaban en la nube al aplicar esta migración: su saldo se acepta con un tope amplio.
create table if not exists public.economy_legacy_slots (
  user_id uuid not null,
  slot_id smallint not null,
  primary key (user_id, slot_id)
);
insert into public.economy_legacy_slots (user_id, slot_id)
  select user_id, slot_id from public.save_slots
  on conflict do nothing;

alter table public.economy_catalog       enable row level security;
alter table public.slot_wallets          enable row level security;
alter table public.economy_ledger        enable row level security;
alter table public.economy_reward_claims enable row level security;
alter table public.economy_legacy_slots  enable row level security;

drop policy if exists "economy_catalog: leer" on public.economy_catalog;
create policy "economy_catalog: leer" on public.economy_catalog for select to authenticated using (true);
drop policy if exists "slot_wallets: leer el propio" on public.slot_wallets;
create policy "slot_wallets: leer el propio" on public.slot_wallets for select to authenticated using (user_id = auth.uid());
drop policy if exists "economy_ledger: leer el propio" on public.economy_ledger;
create policy "economy_ledger: leer el propio" on public.economy_ledger for select to authenticated using (user_id = auth.uid());

revoke all on public.economy_catalog, public.slot_wallets, public.economy_ledger, public.economy_reward_claims, public.economy_legacy_slots from anon, authenticated;
grant select on public.economy_catalog, public.slot_wallets, public.economy_ledger to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Límites (cámbialos aquí)
-- ---------------------------------------------------------------------------
create or replace function public.econ_limits()
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'legacy_gold', 20000, 'legacy_slp', 5000, 'legacy_baxs', 500,   -- partidas que ya estaban en la nube
    'gold_per_level', 200, 'slp_base', 500, 'slp_per_level', 50,     -- partidas nuevas e invitados que vinculan
    'baxs_base', 30, 'baxs_per_level', 5,                            -- (base = bono de inicio: 500 SLP · 30 bAXS)
    'battle_min', 20, 'battle_max', 45, 'battle_every_s', 20, 'battle_per_day', 300,
    'sell_gold_per_day', 5000, 'slp_spent_per_day', 5000, 'max_qty', 99
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Ayudantes (solo los usan las funciones de abajo)
-- ---------------------------------------------------------------------------
create or replace function public._econ_level(p_data jsonb)
returns integer language sql immutable as $$
  select least(60, greatest(1,
    coalesce((p_data ->> 'level')::int, 1),
    coalesce((p_data #>> '{progression,sapidae,level}')::int, 1),
    coalesce((p_data #>> '{progression,kotaro,level}')::int, 1)));
$$;

create or replace function public._econ_num(p jsonb)
returns numeric language sql immutable as $$
  select case when jsonb_typeof(p) = 'number' then greatest(0, (p #>> '{}')::numeric) else 0 end;
$$;

/** Saldo de la ranura (bloqueado para la transacción). Si no existe, lo crea a partir de la partida con tope. */
create or replace function public._econ_wallet(p_uid uuid, p_slot smallint, p_data jsonb default null)
returns public.slot_wallets
language plpgsql security definer set search_path = public as $$
declare
  w public.slot_wallets%rowtype;
  d jsonb := p_data;
  lim jsonb := public.econ_limits();
  lvl int;
  legacy boolean;
  g numeric; s numeric; b numeric;
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
  if legacy then
    g := least(g, (lim ->> 'legacy_gold')::numeric);
    s := least(s, (lim ->> 'legacy_slp')::numeric);
    b := least(b, (lim ->> 'legacy_baxs')::numeric);
  else
    g := least(g, (lim ->> 'gold_per_level')::numeric * lvl);
    s := least(s, (lim ->> 'slp_base')::numeric + (lim ->> 'slp_per_level')::numeric * lvl);
    b := least(b, (lim ->> 'baxs_base')::numeric + (lim ->> 'baxs_per_level')::numeric * lvl);
  end if;
  insert into public.slot_wallets (user_id, slot_id, gold, slp, baxs, origin)
  values (p_uid, p_slot, g, s, b, case when legacy then 'legacy' else 'new' end)
  on conflict (user_id, slot_id) do nothing;
  insert into public.economy_ledger (user_id, slot_id, kind, ref, gold, slp, baxs)
  values (p_uid, p_slot, 'init', case when legacy then 'legacy' else 'level ' || lvl end, g, s, b);
  select * into w from public.slot_wallets where user_id = p_uid and slot_id = p_slot for update;
  return w;
end;
$$;

create or replace function public._econ_out(w public.slot_wallets, extra jsonb default '{}'::jsonb)
returns jsonb language sql immutable as $$
  select jsonb_build_object('ok', true, 'gold', w.gold, 'slp', w.slp, 'baxs', w.baxs) || coalesce(extra, '{}'::jsonb);
$$;

create or replace function public._econ_err(p_code text, w public.slot_wallets default null, extra jsonb default '{}'::jsonb)
returns jsonb language sql immutable as $$
  select jsonb_build_object('ok', false, 'error', p_code)
    || case when w.user_id is null then '{}'::jsonb else jsonb_build_object('gold', w.gold, 'slp', w.slp, 'baxs', w.baxs) end
    || coalesce(extra, '{}'::jsonb);
$$;

/** Comprueba la sesión y la ranura. */
create or replace function public._econ_uid(p_slot smallint)
returns uuid language plpgsql stable as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_slot is null or p_slot not between 1 and 3 then raise exception 'invalid_slot' using errcode = '22023'; end if;
  return v;
end;
$$;

/** Respuesta repetida si esta clave de idempotencia ya se usó (doble clic, reintento tras un corte). */
create or replace function public._econ_replay(p_uid uuid, p_slot smallint, p_idem text)
returns public.economy_ledger language sql stable as $$
  select * from public.economy_ledger where user_id = p_uid and slot_id = p_slot and idem = p_idem and p_idem is not null limit 1;
$$;

/** Aplica una variación (comprueba que no quede saldo negativo) y la anota. */
create or replace function public._econ_apply(p_uid uuid, p_slot smallint, p_kind text, p_ref text, p_qty int,
  p_gold bigint, p_slp bigint, p_baxs numeric, p_idem text)
returns public.slot_wallets
language plpgsql security definer set search_path = public as $$
declare w public.slot_wallets%rowtype;
begin
  update public.slot_wallets
     set gold = gold + p_gold, slp = slp + p_slp, baxs = round(baxs + p_baxs, 2), updated_at = now()
   where user_id = p_uid and slot_id = p_slot
  returning * into w;
  insert into public.economy_ledger (user_id, slot_id, kind, ref, qty, gold, slp, baxs, idem)
  values (p_uid, p_slot, p_kind, p_ref, p_qty, p_gold, p_slp, p_baxs, p_idem);
  return w;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Funciones que llama el juego (todas: sesión obligatoria, una transacción, saldo bloqueado)
-- ---------------------------------------------------------------------------

/** Saldo actual de la ranura (lo crea la primera vez). */
create or replace function public.economy_get(p_slot smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._econ_uid(p_slot); w public.slot_wallets%rowtype;
begin
  w := public._econ_wallet(v_uid, p_slot);
  return public._econ_out(w, jsonb_build_object('origin', w.origin));
end;
$$;

/** Oro de un combate ganado: lo decide el servidor (20–45), como mucho uno cada 20 s y 300 al día. */
create or replace function public.economy_battle_gold(p_slot smallint, p_idem text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._econ_uid(p_slot);
  lim jsonb := public.econ_limits();
  w public.slot_wallets%rowtype;
  r public.economy_ledger%rowtype;
  amount int;
begin
  w := public._econ_wallet(v_uid, p_slot);
  r := public._econ_replay(v_uid, p_slot, p_idem);
  if r.id is not null then return public._econ_out(w, jsonb_build_object('amount', r.gold, 'replay', true)); end if;
  if w.battle_last is not null and w.battle_last > now() - make_interval(secs => (lim ->> 'battle_every_s')::int) then
    return public._econ_err('too_fast', w);
  end if;
  if w.battle_day = current_date and w.battle_count >= (lim ->> 'battle_per_day')::int then
    return public._econ_err('daily_cap', w);
  end if;
  amount := (lim ->> 'battle_min')::int + floor(random() * ((lim ->> 'battle_max')::int - (lim ->> 'battle_min')::int + 1))::int;
  update public.slot_wallets
     set battle_last = now(),
         battle_count = case when battle_day = current_date then battle_count + 1 else 1 end,
         battle_day = current_date
   where user_id = v_uid and slot_id = p_slot;
  w := public._econ_apply(v_uid, p_slot, 'battle', null, null, amount, 0, 0, p_idem);
  return public._econ_out(w, jsonb_build_object('amount', amount));
end;
$$;

/** Comprar en la tienda de Ochi: precio del catálogo. Las existencias y la entrega las lleva la partida. */
create or replace function public.economy_shop_buy(p_slot smallint, p_item text, p_qty int, p_idem text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._econ_uid(p_slot);
  w public.slot_wallets%rowtype;
  c public.economy_catalog%rowtype;
  cost bigint;
begin
  w := public._econ_wallet(v_uid, p_slot);
  if (public._econ_replay(v_uid, p_slot, p_idem)).id is not null then return public._econ_out(w, jsonb_build_object('replay', true)); end if;
  if p_qty is null or p_qty < 1 or p_qty > (public.econ_limits() ->> 'max_qty')::int then return public._econ_err('invalid_qty', w); end if;
  select * into c from public.economy_catalog where key = 'buy:' || p_item;
  if not found then return public._econ_err('not_for_sale', w); end if;
  cost := c.gold::bigint * p_qty;
  if w.gold < cost then return public._econ_err('need_gold', w, jsonb_build_object('need', cost - w.gold)); end if;
  w := public._econ_apply(v_uid, p_slot, 'shop_buy', p_item, p_qty, -cost, 0, 0, p_idem);
  return public._econ_out(w, jsonb_build_object('cost', cost));
end;
$$;

/** Cuántas unidades de un objeto hay en la copia del servidor de la partida (Mochila, materiales o bolsa de runas). */
create or replace function public._econ_owned(p_data jsonb, p_item text)
returns integer language plpgsql immutable as $$
declare n int := 0; k text; kind text;
begin
  if p_item like 'rune:%' or p_item like 'charm:%' then
    kind := case when p_item like 'rune:%' then 'runes' else 'charms' end;
    k := substr(p_item, position(':' in p_item) + 1);
    return coalesce((p_data #>> array['runeCharmBag', kind, k])::int, 0);
  end if;
  if p_data #> array['forge', 'mats', p_item] is not null then
    return coalesce((p_data #>> array['forge', 'mats', p_item])::int, 0);
  end if;
  select count(*) into n from jsonb_array_elements_text(coalesce(p_data -> 'inventory', '[]'::jsonb)) x where x = p_item;
  return n;
end;
$$;

/** Vender en la tienda de Ochi: el objeto tiene que estar en tu partida guardada; tope de oro por ventas al día. */
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
begin
  w := public._econ_wallet(v_uid, p_slot);
  if (public._econ_replay(v_uid, p_slot, p_idem)).id is not null then return public._econ_out(w, jsonb_build_object('replay', true)); end if;
  if p_qty is null or p_qty < 1 or p_qty > (lim ->> 'max_qty')::int then return public._econ_err('invalid_qty', w); end if;
  select * into c from public.economy_catalog where key = 'sell:' || p_item;
  if not found or c.gold <= 0 then return public._econ_err('not_sellable', w); end if;
  select data into d from public.save_slots where user_id = v_uid and slot_id = p_slot;
  if public._econ_owned(coalesce(d, '{}'::jsonb), p_item) < p_qty then return public._econ_err('not_owned', w); end if;
  gain := c.gold::bigint * p_qty;
  today_sold := case when w.sell_day = current_date then w.sell_gold else 0 end;
  if today_sold + gain > (lim ->> 'sell_gold_per_day')::int then return public._econ_err('daily_cap', w); end if;
  update public.slot_wallets set sell_gold = today_sold + gain, sell_day = current_date where user_id = v_uid and slot_id = p_slot;
  w := public._econ_apply(v_uid, p_slot, 'shop_sell', p_item, p_qty, gain, 0, 0, p_idem);
  return public._econ_out(w, jsonb_build_object('gain', gain));
end;
$$;

/** Recomprar lo último vendido al mismo precio (solo ventas de las últimas 24 h que no se hayan recomprado). */
create or replace function public.economy_shop_rebuy(p_slot smallint, p_item text, p_qty int, p_idem text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._econ_uid(p_slot);
  w public.slot_wallets%rowtype;
  s public.economy_ledger%rowtype;
begin
  w := public._econ_wallet(v_uid, p_slot);
  if (public._econ_replay(v_uid, p_slot, p_idem)).id is not null then return public._econ_out(w, jsonb_build_object('replay', true)); end if;
  select * into s from public.economy_ledger l
   where l.user_id = v_uid and l.slot_id = p_slot and l.kind = 'shop_sell' and l.ref = p_item and l.qty = p_qty
     and l.at > now() - interval '24 hours'
     and not exists (select 1 from public.economy_ledger r where r.user_id = v_uid and r.slot_id = p_slot and r.kind = 'shop_rebuy' and r.ref = p_item || '#' || l.id)
   order by l.at desc limit 1;
  if s.id is null then return public._econ_err('nothing_to_rebuy', w); end if;
  if w.gold < s.gold then return public._econ_err('need_gold', w, jsonb_build_object('need', s.gold - w.gold)); end if;
  w := public._econ_apply(v_uid, p_slot, 'shop_rebuy', p_item || '#' || s.id, p_qty, -s.gold, 0, 0, p_idem);
  return public._econ_out(w, jsonb_build_object('cost', s.gold));
end;
$$;

/**
 * Forja. p_kind: 'craft' (p_key = receta) · 'evolve' (p_key = '<pieza>:<rapidez>') · 'speed' (p_key = '<trabajo>:<pieza destino>:<x>').
 * Coste del catálogo; tope de SLP gastado al día. Acelerar cobra la diferencia con lo ya pagado por ese trabajo.
 */
create or replace function public.economy_forge(p_slot smallint, p_kind text, p_key text, p_idem text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._econ_uid(p_slot);
  lim jsonb := public.econ_limits();
  w public.slot_wallets%rowtype;
  c public.economy_catalog%rowtype;
  g bigint := 0; s bigint := 0; b numeric := 0;
  job text; target text; x int; tier int; prev_x int; p_new numeric; p_old numeric;
  spent int;
begin
  w := public._econ_wallet(v_uid, p_slot);
  if (public._econ_replay(v_uid, p_slot, p_idem)).id is not null then return public._econ_out(w, jsonb_build_object('replay', true)); end if;
  if p_kind = 'craft' then
    select * into c from public.economy_catalog where key = 'craft:' || p_key;
    if not found then return public._econ_err('unknown_recipe', w); end if;
    g := c.gold; s := c.slp; b := c.baxs;
  elsif p_kind = 'evolve' then
    select * into c from public.economy_catalog where key = 'evolve:' || p_key;
    if not found then return public._econ_err('cant_evolve', w); end if;
    g := c.gold; s := c.slp; b := c.baxs;
  elsif p_kind = 'speed' then
    job := split_part(p_key, ':', 1); target := split_part(p_key, ':', 2); x := nullif(split_part(p_key, ':', 3), '')::int;
    select meta into tier from public.economy_catalog where key = 'tier:' || target;
    if tier is null or x not in (2, 4) then return public._econ_err('cant_speed_up', w); end if;
    select coalesce(max(qty), 1) into prev_x from public.economy_ledger
     where user_id = v_uid and slot_id = p_slot and kind = 'speed' and ref = 'job:' || job || ':' || target and at > now() - interval '7 days';
    if x <= prev_x then return public._econ_err('cant_speed_up', w); end if;
    select baxs into p_new from public.economy_catalog where key = 'speed:' || tier || ':' || x;
    select baxs into p_old from public.economy_catalog where key = 'speed:' || tier || ':' || prev_x;
    b := coalesce(p_new, 0) - coalesce(p_old, 0);
  else
    return public._econ_err('invalid_request', w);
  end if;
  if w.gold < g then return public._econ_err('need_gold', w, jsonb_build_object('need', g - w.gold)); end if;
  if w.slp < s then return public._econ_err('need_slp', w, jsonb_build_object('need', s - w.slp)); end if;
  if w.baxs < b then return public._econ_err('need_baxs', w, jsonb_build_object('need', round(b - w.baxs, 2))); end if;
  spent := case when w.slp_day = current_date then w.slp_spent else 0 end;
  if s > 0 and spent + s > (lim ->> 'slp_spent_per_day')::int then return public._econ_err('daily_cap', w); end if;
  if s > 0 then update public.slot_wallets set slp_spent = spent + s, slp_day = current_date where user_id = v_uid and slot_id = p_slot; end if;
  w := public._econ_apply(v_uid, p_slot, p_kind,
         case when p_kind = 'speed' then 'job:' || job || ':' || target else p_key end,
         case when p_kind = 'speed' then x else null end, -g, -s, -b, p_idem);
  return public._econ_out(w, jsonb_build_object('gold_cost', g, 'slp_cost', s, 'baxs_cost', b));
end;
$$;

/** Recompensa (misión, tutorial…): una sola vez por ranura. meta = 1 → «completar hasta» la cantidad del catálogo. */
create or replace function public.economy_reward(p_slot smallint, p_reward text, p_idem text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._econ_uid(p_slot);
  w public.slot_wallets%rowtype;
  c public.economy_catalog%rowtype;
  g bigint; s bigint; b numeric;
begin
  w := public._econ_wallet(v_uid, p_slot);
  select * into c from public.economy_catalog where key = 'reward:' || p_reward;
  if not found then return public._econ_err('unknown_reward', w); end if;
  insert into public.economy_reward_claims (user_id, slot_id, reward) values (v_uid, p_slot, p_reward) on conflict do nothing;
  if not found then return public._econ_err('already_claimed', w); end if;
  if c.meta = 1 then
    g := greatest(0, c.gold - w.gold); s := greatest(0, c.slp - w.slp); b := greatest(0, c.baxs - w.baxs);
  else
    g := c.gold; s := c.slp; b := c.baxs;
  end if;
  w := public._econ_apply(v_uid, p_slot, 'reward', p_reward, null, g, s, b, p_idem);
  return public._econ_out(w, jsonb_build_object('gold_gain', g, 'slp_gain', s, 'baxs_gain', b));
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Guardado: el oro, el SLP y el bAXS los pone el servidor
-- ---------------------------------------------------------------------------
create or replace function public._econ_stamp(p_data jsonb, w public.slot_wallets)
returns jsonb language sql immutable as $$
  select coalesce(p_data, '{}'::jsonb)
    || jsonb_build_object('gold', w.gold,
         'forge', coalesce(case when jsonb_typeof(p_data -> 'forge') = 'object' then p_data -> 'forge' end, '{}'::jsonb)
                  || jsonb_build_object('slp', w.slp, 'baxs', w.baxs));
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
    -- Hito 76: ranura nueva (o partida de invitado que se vincula): el saldo entra con tope según su nivel
    delete from public.slot_wallets where user_id = v_uid and slot_id = p_slot_id;
    w := public._econ_wallet(v_uid, p_slot_id, p_data);
    insert into public.save_slots (user_id, slot_id, data, version)
    values (v_uid, p_slot_id, public._econ_stamp(p_data, w), 1);
    update public.profiles set last_slot_id = p_slot_id, updated_at = now() where user_id = v_uid;
    return jsonb_build_object('ok', true, 'version', 1, 'gold', w.gold, 'slp', w.slp, 'baxs', w.baxs);
  end if;

  if v_row.version <> coalesce(p_expected_version, -1) then
    return jsonb_build_object('ok', false, 'conflict', true, 'version', v_row.version, 'data', v_row.data);
  end if;

  w := public._econ_wallet(v_uid, p_slot_id, v_row.data);
  update public.save_slots
     set data = public._econ_stamp(p_data, w), version = v_row.version + 1, updated_at = now()
   where user_id = v_uid and slot_id = p_slot_id;

  update public.profiles set last_slot_id = p_slot_id, updated_at = now() where user_id = v_uid;

  return jsonb_build_object('ok', true, 'version', v_row.version + 1, 'gold', w.gold, 'slp', w.slp, 'baxs', w.baxs);
end;
$$;

-- Borrar una ranura borra también su saldo y sus recompensas cobradas (una partida nueva empieza de cero).
create or replace function public._econ_on_slot_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.slot_wallets where user_id = old.user_id and slot_id = old.slot_id;
  delete from public.economy_reward_claims where user_id = old.user_id and slot_id = old.slot_id;
  delete from public.economy_legacy_slots where user_id = old.user_id and slot_id = old.slot_id;
  return old;
end;
$$;
drop trigger if exists econ_slot_deleted on public.save_slots;
create trigger econ_slot_deleted after delete on public.save_slots for each row execute function public._econ_on_slot_delete();

-- ---------------------------------------------------------------------------
-- 6. Permisos: el juego solo puede llamar a estas funciones
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'economy_get(smallint)', 'economy_battle_gold(smallint,text)', 'economy_shop_buy(smallint,text,integer,text)',
    'economy_shop_sell(smallint,text,integer,text)', 'economy_shop_rebuy(smallint,text,integer,text)',
    'economy_forge(smallint,text,text,text)', 'economy_reward(smallint,text,text)', 'save_slot(smallint,jsonb,integer)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array[
    '_econ_wallet(uuid,smallint,jsonb)', '_econ_apply(uuid,smallint,text,text,integer,bigint,bigint,numeric,text)',
    '_econ_on_slot_delete()'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
