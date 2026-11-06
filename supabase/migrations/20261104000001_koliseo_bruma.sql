-- Lunakai · Koliseo, fase B0: Desafío de la Bruma (servidor).
-- Plan: axie-tactics-web/docs/PLAN_DESAFIO_DE_LA_BRUMA.md
-- Ejecutar una vez en Supabase (`supabase db push` o SQL Editor), después de las migraciones de economía (20261026*, 20261101*).
--
-- Reglas:
--   · Semana de lunes 00:00 a domingo 23:59, hora de Colombia (America/Bogota). Un bioma por semana en rotación fija
--     (la primera semana es el Bosque): forest → savannah → arctic → mystic → genesis → forest…
--   · 5 combates en los 3 tableros del bioma (A, B, A, B, jefe) con vida, daño y escudo enemigos ×1 → ×3.
--   · 2 intentos por semana POR CUENTA. Perder gasta una vida y se repite el mismo combate; con 2 derrotas, fuera.
--     Un combate empezado y no informado cuenta como derrota al empezar el siguiente (no se puede salir para no perder).
--   · Clasificación: combates superados (más) → rondas totales (menos) → quien llegó antes. Mejor intento de cada cuenta.
--   · Premios solo al top 3 (bAXS + oro al momento en la cartera de la ranura; materiales como premio pendiente).
--   · Los invitados (sin sesión) solo pueden leer la semana y la clasificación (bruma_week, bruma_board).
--
-- Nadie escribe en las tablas: todo pasa por funciones `security definer`. La semana se crea la primera vez que se
-- pide, y la anterior se cierra (y paga) sola en cuanto alguien abre el Koliseo después del domingo. Si pg_cron está
-- disponible, además se programa el cierre el lunes a las 00:05 (Colombia) como respaldo.

-- ---------------------------------------------------------------------------
-- 1. Ajustes (un solo sitio para equilibrar)
-- ---------------------------------------------------------------------------
create or replace function public.bruma_settings()
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'tz', 'America/Bogota',
    'attempts', 2,                      -- intentos por semana y cuenta
    'max_defeats', 2,                   -- derrotas que terminan el intento
    'stages', 5,
    'curve', jsonb_build_array(1.0, 1.5, 2.0, 2.5, 3.0),       -- vida, daño y escudo enemigos por combate
    'ranks', jsonb_build_array('normal', 'normal', 'normal', 'strong', 'boss'),
    'maps',  jsonb_build_array('a', 'b', 'a', 'b', 'boss'),
    'biomes', jsonb_build_array('forest', 'savannah', 'arctic', 'mystic', 'genesis'),
    'modifiers', jsonb_build_array('thick_mist', 'mist_fury', 'fog_armor', 'icy_wind'),
    'min_secs_per_round', 8,            -- duración mínima creíble de un combate (segundos por ronda informada)
    'max_rounds', 200,
    'max_actions_bytes', 262144,
    'board_size', 10,
    'prizes', jsonb_build_array(
      jsonb_build_object('rank', 1, 'baxs', 10, 'gold', 1000, 'items', jsonb_build_object('mat_lunar_shard', 3, 'mat_amber_atia', 3)),
      jsonb_build_object('rank', 2, 'baxs', 6,  'gold', 600,  'items', jsonb_build_object('mat_lunar_shard', 2, 'mat_amber_atia', 2)),
      jsonb_build_object('rank', 3, 'baxs', 4,  'gold', 300,  'items', jsonb_build_object('mat_lunar_shard', 1, 'mat_amber_atia', 1))
    )
  );
$$;

-- Los 3 tableros de cada bioma (ids de tactics/maps/BattleMaps.js)
create table if not exists public.bruma_biomes (
  biome    text primary key,
  map_a    text not null,
  map_b    text not null,
  map_boss text not null
);
insert into public.bruma_biomes (biome, map_a, map_b, map_boss) values
  ('forest',   'forest_maple_glade',   'forest_river_ford',     'forest_great_roots'),
  ('savannah', 'savannah_oasis',       'savannah_canyon',       'savannah_golden_mesa'),
  ('arctic',   'arctic_glacier_pass',  'arctic_boreal_camp',    'arctic_frozen_lake'),
  ('mystic',   'mystic_glow_swamp',    'mystic_crystal_isles',  'mystic_arcane_circle'),
  ('genesis',  'genesis_royal_garden', 'genesis_sanctum_gate',  'genesis_sanctum_origin')
on conflict (biome) do update set map_a = excluded.map_a, map_b = excluded.map_b, map_boss = excluded.map_boss;

-- ---------------------------------------------------------------------------
-- 2. Tablas
-- ---------------------------------------------------------------------------
create table if not exists public.bruma_weeks (
  week       text primary key,                     -- '2026-W46' (semana ISO en hora de Colombia)
  ord        integer not null unique,              -- 0, 1, 2… (decide el bioma de la rotación)
  biome      text not null references public.bruma_biomes (biome),
  seed       bigint not null,
  config     jsonb not null,                       -- { modifier, stages: [{stage, map, rank, mult, pick}] }
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  closed     boolean not null default false,
  results    jsonb,                                -- top 3 pagado al cerrar
  created_at timestamptz not null default now()
);

create table if not exists public.bruma_runs (
  id          bigint generated always as identity primary key,
  week        text not null references public.bruma_weeks (week),
  user_id     uuid not null references auth.users (id) on delete cascade,
  slot_id     smallint not null check (slot_id between 1 and 3),
  attempt     smallint not null check (attempt >= 1),
  status      text not null default 'active' check (status in ('active', 'finished', 'out')),
  stage       smallint not null default 1,         -- combate actual (1–5; 6 = los 5 superados)
  cleared     smallint not null default 0,
  turns       integer not null default 0,          -- rondas de todos los combates jugados (también los perdidos)
  defeats     smallint not null default 0,
  started_at  timestamptz not null default now(),
  last_at     timestamptz not null default now(),  -- último informe (desempate: quien llegó antes)
  finished_at timestamptz,
  unique (week, user_id, attempt)
);
create index if not exists bruma_runs_board on public.bruma_runs (week, cleared desc, turns, last_at);
create index if not exists bruma_runs_user on public.bruma_runs (user_id, week);

create table if not exists public.bruma_battles (
  id         bigint generated always as identity primary key,
  run_id     bigint not null references public.bruma_runs (id) on delete cascade,
  stage      smallint not null,
  try        smallint not null,
  token      uuid not null unique default gen_random_uuid(),
  result     text check (result in ('win', 'loss', 'abandon')),
  rounds     integer,
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  actions    jsonb                                  -- órdenes del combate, para el árbitro futuro
);
create index if not exists bruma_battles_run on public.bruma_battles (run_id, stage);

-- Premios pendientes (objetos que viven en la partida). El bAXS y el oro se pagan al momento en la cartera.
create table if not exists public.koliseo_rewards (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  slot_id    smallint not null check (slot_id between 1 and 3),
  source     text not null,                         -- 'bruma:2026-W46'
  rank       smallint,
  items      jsonb not null default '{}'::jsonb,    -- { mat_lunar_shard: 3, mat_amber_atia: 3 }
  gold       integer not null default 0,            -- informativo (ya pagado)
  baxs       numeric(10, 2) not null default 0,     -- informativo (ya pagado)
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  unique (user_id, source)
);

alter table public.bruma_biomes    enable row level security;
alter table public.bruma_weeks     enable row level security;
alter table public.bruma_runs      enable row level security;
alter table public.bruma_battles   enable row level security;
alter table public.koliseo_rewards enable row level security;
revoke all on public.bruma_biomes, public.bruma_weeks, public.bruma_runs, public.bruma_battles, public.koliseo_rewards from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Semana
-- ---------------------------------------------------------------------------
create or replace function public._bruma_err(p_code text, extra jsonb default '{}'::jsonb)
returns jsonb language sql immutable as $$ select jsonb_build_object('ok', false, 'error', p_code) || extra $$;

/** Estado público de un intento. */
create or replace function public._bruma_run_out(r public.bruma_runs)
returns jsonb language sql stable as $$
  select case when r.id is null then null else jsonb_build_object(
    'id', r.id, 'week', r.week, 'slot', r.slot_id, 'attempt', r.attempt, 'status', r.status, 'stage', r.stage,
    'cleared', r.cleared, 'turns', r.turns, 'defeats', r.defeats, 'started_at', r.started_at, 'finished_at', r.finished_at) end
$$;

/** Cierra (y paga) una semana terminada. Idempotente: la fila de la semana se bloquea y se marca `closed`. */
create or replace function public._bruma_close_week(p_week text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.bruma_settings();
  w public.bruma_weeks%rowtype;
  top record;
  prize jsonb;
  v_results jsonb := '[]'::jsonb;
begin
  select * into w from public.bruma_weeks where week = p_week for update;
  if not found then return public._bruma_err('unknown_week'); end if;
  if w.closed then return jsonb_build_object('ok', true, 'already', true, 'results', w.results); end if;
  if w.ends_at > now() then return public._bruma_err('week_running'); end if;

  -- Intentos abiertos: cuentan con lo que tengan. Combates sin informar: abandonados (sin efecto en la marca).
  update public.bruma_battles b set result = 'abandon', ended_at = now(), rounds = coalesce(b.rounds, 0)
    from public.bruma_runs r
   where b.run_id = r.id and r.week = p_week and b.result is null;
  update public.bruma_runs set status = 'finished', finished_at = now()
   where week = p_week and status = 'active';

  -- Mejor intento de cada cuenta (con al menos 1 combate superado) → top 3
  for top in
    with best as (
      select distinct on (user_id) id, user_id, slot_id, cleared, turns, last_at
        from public.bruma_runs
       where week = p_week and cleared >= 1
       order by user_id, cleared desc, turns asc, last_at asc, id asc
    )
    select row_number() over (order by cleared desc, turns asc, last_at asc, id asc) as rank, *
      from best order by rank limit jsonb_array_length(st -> 'prizes')
  loop
    prize := st -> 'prizes' -> (top.rank::int - 1);
    perform public._econ_wallet(top.user_id, top.slot_id);
    perform public._econ_apply(top.user_id, top.slot_id, 'reward', 'bruma:' || p_week || ':' || top.rank, null,
      (prize ->> 'gold')::bigint, 0, (prize ->> 'baxs')::numeric, 'bruma:' || p_week);
    insert into public.koliseo_rewards (user_id, slot_id, source, rank, items, gold, baxs)
    values (top.user_id, top.slot_id, 'bruma:' || p_week, top.rank, prize -> 'items', (prize ->> 'gold')::int, (prize ->> 'baxs')::numeric)
    on conflict (user_id, source) do nothing;
    v_results := v_results || jsonb_build_array(jsonb_build_object('rank', top.rank, 'run', top.id, 'cleared', top.cleared, 'turns', top.turns));
  end loop;

  update public.bruma_weeks set closed = true, results = v_results where week = p_week;
  return jsonb_build_object('ok', true, 'results', v_results);
end;
$$;

/** Cierra todas las semanas terminadas que sigan abiertas (lo llaman la semana actual y pg_cron). */
create or replace function public.bruma_close_due()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0; wk text;
begin
  for wk in select week from public.bruma_weeks where not closed and ends_at <= now() order by starts_at loop
    perform public._bruma_close_week(wk);
    n := n + 1;
  end loop;
  return n;
end;
$$;

/** Semana actual: la crea la primera vez (bioma por rotación, semilla, tableros, multiplicadores y modificador). */
create or replace function public._bruma_current()
returns public.bruma_weeks language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.bruma_settings();
  loc timestamp := now() at time zone (st ->> 'tz');
  wk text := to_char(loc, 'IYYY-"W"IW');
  w public.bruma_weeks%rowtype;
  b public.bruma_biomes%rowtype;
  n int; i int; v_ord int; v_biome text; v_seed bigint; stages jsonb := '[]'::jsonb; mapkey text; v_start timestamptz;
begin
  select * into w from public.bruma_weeks where week = wk;
  if found then return w; end if;

  perform pg_advisory_xact_lock(hashtext('lunakai_bruma_week'));
  select * into w from public.bruma_weeks where week = wk;
  if found then return w; end if;

  perform public.bruma_close_due(); -- la semana anterior se paga antes de abrir la nueva

  select coalesce(max(ord), -1) + 1 into v_ord from public.bruma_weeks;
  n := jsonb_array_length(st -> 'biomes');
  v_biome := st -> 'biomes' ->> (v_ord % n);
  select * into b from public.bruma_biomes where biome = v_biome;
  v_seed := floor(random() * 2147483647)::bigint;
  for i in 0 .. (st ->> 'stages')::int - 1 loop
    mapkey := st -> 'maps' ->> i;
    stages := stages || jsonb_build_array(jsonb_build_object(
      'stage', i + 1,
      'map', case mapkey when 'a' then b.map_a when 'b' then b.map_b else b.map_boss end,
      'rank', st -> 'ranks' ->> i,
      'mult', (st -> 'curve' -> i)::numeric,
      'pick', floor(random() * 10000)::int     -- el cliente elige el grupo del bioma con este número
    ));
  end loop;
  v_start := date_trunc('week', loc) at time zone (st ->> 'tz');
  insert into public.bruma_weeks (week, ord, biome, seed, config, starts_at, ends_at)
  values (wk, v_ord, v_biome, v_seed,
          jsonb_build_object('modifier', st -> 'modifiers' ->> floor(random() * jsonb_array_length(st -> 'modifiers'))::int, 'stages', stages),
          v_start, v_start + interval '7 days')
  returning * into w;
  return w;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Funciones que llama el juego
-- ---------------------------------------------------------------------------

/**
 * Semana actual (invitados y cuentas). Con sesión añade intentos usados, intento abierto y mejor marca.
 * { ok, week, biome, seed, config, starts_at, ends_at, now, attempts, me: { used, left, active, best } | null }
 */
create or replace function public.bruma_week()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.bruma_settings();
  w public.bruma_weeks%rowtype := public._bruma_current();
  v_uid uuid := auth.uid();
  me jsonb := null;
  used int; act public.bruma_runs%rowtype; best public.bruma_runs%rowtype;
begin
  if v_uid is not null then
    select count(*) into used from public.bruma_runs where week = w.week and user_id = v_uid;
    select * into act from public.bruma_runs where week = w.week and user_id = v_uid and status = 'active' order by id desc limit 1;
    select * into best from public.bruma_runs where week = w.week and user_id = v_uid
     order by cleared desc, turns asc, last_at asc, id asc limit 1;
    me := jsonb_build_object('used', used, 'left', greatest(0, (st ->> 'attempts')::int - used),
                             'active', public._bruma_run_out(act), 'best', public._bruma_run_out(best));
  end if;
  return jsonb_build_object('ok', true, 'week', w.week, 'biome', w.biome, 'seed', w.seed, 'config', w.config,
    'starts_at', w.starts_at, 'ends_at', w.ends_at, 'now', now(), 'attempts', (st ->> 'attempts')::int,
    'max_defeats', (st ->> 'max_defeats')::int, 'me', me);
end;
$$;

/** Empieza un intento (o devuelve el que está abierto). Gasta uno de los intentos de la semana de la cuenta. */
create or replace function public.bruma_start(p_slot smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.bruma_settings();
  v_uid uuid := public._econ_uid(p_slot);
  w public.bruma_weeks%rowtype := public._bruma_current();
  r public.bruma_runs%rowtype;
  used int;
begin
  perform pg_advisory_xact_lock(hashtext('lunakai_bruma_user:' || v_uid::text));
  select * into r from public.bruma_runs where week = w.week and user_id = v_uid and status = 'active' order by id desc limit 1;
  if found then
    if r.slot_id <> p_slot then return public._bruma_err('run_in_other_slot', jsonb_build_object('run', public._bruma_run_out(r))); end if;
    return jsonb_build_object('ok', true, 'resumed', true, 'run', public._bruma_run_out(r));
  end if;
  select count(*) into used from public.bruma_runs where week = w.week and user_id = v_uid;
  if used >= (st ->> 'attempts')::int then return public._bruma_err('no_attempts'); end if;
  insert into public.bruma_runs (week, user_id, slot_id, attempt) values (w.week, v_uid, p_slot, used + 1) returning * into r;
  return jsonb_build_object('ok', true, 'resumed', false, 'run', public._bruma_run_out(r));
end;
$$;

/**
 * Empieza el combate actual del intento y devuelve su token (un solo uso).
 * Un combate anterior sin informar cuenta como derrota (abandono): puede terminar el intento.
 */
create or replace function public.bruma_stage_begin(p_run bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.bruma_settings();
  v_uid uuid := auth.uid();
  r public.bruma_runs%rowtype;
  w public.bruma_weeks%rowtype;
  b public.bruma_battles%rowtype;
  open_b public.bruma_battles%rowtype;
  v_try int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into r from public.bruma_runs where id = p_run for update;
  if not found or r.user_id <> v_uid then return public._bruma_err('unknown_run'); end if;
  if r.status <> 'active' then return public._bruma_err('run_over', jsonb_build_object('run', public._bruma_run_out(r))); end if;
  select * into w from public.bruma_weeks where week = r.week;
  if w.closed or w.ends_at <= now() then return public._bruma_err('week_over'); end if;

  select * into open_b from public.bruma_battles where run_id = r.id and result is null order by id desc limit 1;
  if found then
    update public.bruma_battles set result = 'abandon', rounds = 0, ended_at = now() where id = open_b.id;
    r.defeats := r.defeats + 1;
    r.last_at := now();
    if r.defeats >= (st ->> 'max_defeats')::int then
      r.status := 'out'; r.finished_at := now();
    end if;
    update public.bruma_runs set defeats = r.defeats, status = r.status, finished_at = r.finished_at, last_at = r.last_at where id = r.id;
    if r.status <> 'active' then
      return public._bruma_err('run_over', jsonb_build_object('abandoned', true, 'run', public._bruma_run_out(r)));
    end if;
  end if;

  select count(*) + 1 into v_try from public.bruma_battles where run_id = r.id and stage = r.stage;
  insert into public.bruma_battles (run_id, stage, try) values (r.id, r.stage, v_try) returning * into b;
  return jsonb_build_object('ok', true, 'token', b.token, 'stage', b.stage, 'try', b.try,
    'abandoned', open_b.id is not null, 'run', public._bruma_run_out(r), 'config', w.config -> 'stages' -> (r.stage - 1),
    'modifier', w.config ->> 'modifier', 'biome', w.biome, 'seed', w.seed);
end;
$$;

/**
 * Resultado de un combate. p_result: 'win' | 'loss'; p_rounds: rondas jugadas; p_actions: órdenes (opcional).
 * Repetir el mismo informe devuelve el estado sin cambiar nada (reintento tras un corte).
 */
create or replace function public.bruma_report(p_run bigint, p_token uuid, p_result text, p_rounds integer, p_actions jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.bruma_settings();
  v_uid uuid := auth.uid();
  r public.bruma_runs%rowtype;
  w public.bruma_weeks%rowtype;
  b public.bruma_battles%rowtype;
  secs numeric;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into r from public.bruma_runs where id = p_run for update;
  if not found or r.user_id <> v_uid then return public._bruma_err('unknown_run'); end if;
  select * into b from public.bruma_battles where token = p_token and run_id = r.id for update;
  if not found then return public._bruma_err('unknown_battle'); end if;
  if b.result is not null then
    if b.result = p_result and b.rounds = p_rounds then
      return jsonb_build_object('ok', true, 'replay', true, 'run', public._bruma_run_out(r));
    end if;
    return public._bruma_err('already_reported', jsonb_build_object('run', public._bruma_run_out(r)));
  end if;
  if r.status <> 'active' then return public._bruma_err('run_over', jsonb_build_object('run', public._bruma_run_out(r))); end if;
  select * into w from public.bruma_weeks where week = r.week;
  if w.closed then return public._bruma_err('week_over'); end if;
  if p_result not in ('win', 'loss') then return public._bruma_err('bad_result'); end if;
  if p_rounds is null or p_rounds < 1 or p_rounds > (st ->> 'max_rounds')::int then return public._bruma_err('bad_rounds'); end if;
  if p_actions is not null and pg_column_size(p_actions) > (st ->> 'max_actions_bytes')::int then return public._bruma_err('too_big'); end if;
  secs := extract(epoch from now() - b.started_at);
  if secs < p_rounds * (st ->> 'min_secs_per_round')::numeric then
    return public._bruma_err('too_fast', jsonb_build_object('min_secs', p_rounds * (st ->> 'min_secs_per_round')::numeric, 'secs', round(secs)));
  end if;

  update public.bruma_battles set result = p_result, rounds = p_rounds, ended_at = now(), actions = p_actions where id = b.id;
  r.turns := r.turns + p_rounds;
  r.last_at := now();
  if p_result = 'win' then
    r.cleared := r.cleared + 1;
    r.stage := r.stage + 1;
    if r.cleared >= (st ->> 'stages')::int then r.status := 'finished'; r.finished_at := now(); end if;
  else
    r.defeats := r.defeats + 1;
    if r.defeats >= (st ->> 'max_defeats')::int then r.status := 'out'; r.finished_at := now(); end if;
  end if;
  update public.bruma_runs
     set turns = r.turns, last_at = r.last_at, cleared = r.cleared, stage = r.stage, defeats = r.defeats,
         status = r.status, finished_at = r.finished_at
   where id = r.id;
  return jsonb_build_object('ok', true, 'run', public._bruma_run_out(r));
end;
$$;

/**
 * Clasificación de una semana (por defecto la actual): los 10 primeros y, con sesión y fuera del top, tu puesto.
 * Nombre visible: el del Sapidae de la ranura y su Axie principal (de la partida en la nube).
 */
create or replace function public.bruma_board(p_week text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.bruma_settings();
  v_uid uuid := auth.uid();
  wk text := coalesce(p_week, (public._bruma_current()).week);
  w public.bruma_weeks%rowtype;
  v_rows jsonb; v_mine jsonb;
begin
  select * into w from public.bruma_weeks where week = wk;
  if not found then return public._bruma_err('unknown_week'); end if;
  with best as (
    select distinct on (r.user_id) r.*
      from public.bruma_runs r
     where r.week = wk and (r.cleared > 0 or r.defeats > 0)
     order by r.user_id, r.cleared desc, r.turns asc, r.last_at asc, r.id asc
  ), ranked as (
    select row_number() over (order by b.cleared desc, b.turns asc, b.last_at asc, b.id asc) as rank, b.*,
           s.data ->> 'playerName' as player_name, s.data -> 'mainAxie' as main_axie
      from best b
      left join public.save_slots s on s.user_id = b.user_id and s.slot_id = b.slot_id
  ), shaped as (
    select rank, user_id, jsonb_build_object(
      'rank', rank, 'name', coalesce(player_name, 'Lunacian'),
      'axie', case when main_axie is null then null else jsonb_build_object(
                'name', main_axie ->> 'name', 'class', main_axie ->> 'class', 'axieId', main_axie ->> 'axieId') end,
      'cleared', cleared, 'turns', turns, 'status', status, 'me', (v_uid is not null and user_id = v_uid)) as row
      from ranked
  )
  select coalesce(jsonb_agg(row order by rank) filter (where rank <= (st ->> 'board_size')::int), '[]'::jsonb),
         (array_agg(row) filter (where v_uid is not null and user_id = v_uid and rank > (st ->> 'board_size')::int))[1]
    into v_rows, v_mine
    from shaped;
  return jsonb_build_object('ok', true, 'week', w.week, 'biome', w.biome, 'closed', w.closed, 'rows', v_rows, 'me', v_mine);
end;
$$;

/** Entrega los premios pendientes de la ranura (y los marca recogidos). La partida los añade a la Mochila y guarda. */
create or replace function public.koliseo_claim(p_slot smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._econ_uid(p_slot);
  v_out jsonb;
begin
  with c as (
    update public.koliseo_rewards set claimed_at = now()
     where user_id = v_uid and slot_id = p_slot and claimed_at is null
     returning id, source, rank, items, gold, baxs
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'source', source, 'rank', rank, 'items', items, 'gold', gold, 'baxs', baxs) order by id), '[]'::jsonb)
    into v_out from c;
  return jsonb_build_object('ok', true, 'rewards', v_out);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Permisos
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array['bruma_week()', 'bruma_board(text)', 'bruma_settings()'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  foreach f in array array['bruma_start(smallint)', 'bruma_stage_begin(bigint)',
                           'bruma_report(bigint,uuid,text,integer,jsonb)', 'koliseo_claim(smallint)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['_bruma_current()', '_bruma_close_week(text)', 'bruma_close_due()',
                           '_bruma_run_out(public.bruma_runs)', '_bruma_err(text,jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Cierre programado (respaldo). Lunes 00:05 en Colombia = 05:05 UTC. Si pg_cron no está, no pasa nada:
--    la semana se cierra sola la primera vez que alguien abre el Koliseo después del domingo.
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron no disponible (%): la Bruma se cerrará al abrir el Koliseo', sqlerrm;
    return;
  end;
  begin
    perform cron.schedule('lunakai-bruma-close', '5 5 * * 1', 'select public.bruma_close_due()');
  exception when others then
    raise notice 'No se pudo programar el cierre de la Bruma (%)', sqlerrm;
  end;
end $$;
