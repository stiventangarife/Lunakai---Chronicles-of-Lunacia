-- Lunakai · Koliseo, Arena PvP, fase P1: servidor (cola, partidas, órdenes, tiempo, rendición, puntos, SLP, temporada).
-- Plan: axie-tactics-web/docs/PLAN_ARENA_PVP.md (sección 12). Ejecutar una vez en Supabase después de las migraciones
-- de economía (20261026*, 20261101*) y del Koliseo (20261104*, 20261105*).
--
-- Modelo («lockstep» con árbitro):
--   · El servidor NO simula el combate. Ordena y guarda las órdenes de los dos jugadores (pvp_actions), comprueba que
--     cada una llega en su turno, en orden y a tiempo, y las reparte. Los dos clientes ejecutan las mismas órdenes con
--     la misma semilla en el mismo motor (tactics/SpellRules + sim/HeadlessCombat) y comparan la huella del estado.
--   · Si las huellas no coinciden o los finales que informan son distintos, la partida queda «en disputa» y la decide
--     el árbitro (fase P4: repite las órdenes guardadas en el motor sin gráficos). Hasta entonces se queda en disputa.
--   · Quién juega: el cliente que termina su turno manda con su END el bando que juega después (lo calcula su motor).
--     Si mintiera, el otro cliente lo vería (orden fuera de turno → huella distinta → disputa → árbitro).
--
-- Reglas (todas las cifras en pvp_settings()):
--   · Solo cuentas (sesión). Arena igualada: la «foto» de cada jugador la arma el servidor desde su partida guardada
--     (clase del Sapidae, Axie principal y sus 6 cartas); el cliente no manda estadísticas.
--   · Temporada = mes natural (hora de Colombia). Puntos Elo desde la primera partida: 1000 al empezar, K = 32 las
--     primeras 20 partidas y 24 después, +10 como mínimo al ganar y −30 como máximo al perder. Empate: Elo a medias.
--     Contra el mismo rival solo puntúan 3 partidas al día.
--   · 15 SLP por victoria, como mucho 10 victorias con SLP al día.
--   · Cierre de temporada: bAXS al top 10 (30 / 20 / 15 / 10 / 10 / 5 / 5 / 5 / 5 / 5) en la cartera de la ranura
--     con la que jugó por última vez; la temporada siguiente empieza en 1000 + (puntos − 1000) / 2.
--   · Turno: 45 s (30 + sobrante) más 5 s de margen. Pasado el tiempo, el rival puede forzar el fin del turno
--     (pvp_timeout). Sin ninguna orden en 3 minutos, pierde quien debía jugar. 60 s para volver tras desconectarse
--     (lo gestiona el cliente con la presencia de Realtime, fase P2; el servidor solo aplica los 3 minutos).
--
-- Nadie escribe en las tablas: todo pasa por funciones `security definer` (RLS activada sin políticas).

-- ---------------------------------------------------------------------------
-- 1. Ajustes
-- ---------------------------------------------------------------------------
create or replace function public.pvp_settings()
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'tz', 'America/Bogota',
    'start_points', 1000,
    'k_new', 32, 'k_new_games', 20, 'k', 24,
    'min_win', 10, 'max_loss', 30,
    'same_rival_per_day', 3,
    'slp_win', 15, 'slp_wins_per_day', 10,
    'board_size', 10,
    'payout', jsonb_build_array(30, 20, 15, 10, 10, 5, 5, 5, 5, 5),
    'queue_window', 100, 'queue_step', 100, 'queue_step_secs', 15, 'queue_any_secs', 60, 'queue_ttl_secs', 120,
    'turn_secs', 45, 'turn_grace_secs', 5, 'abandon_secs', 180, 'report_wait_secs', 120,
    'max_rounds', 25,
    'max_actions', 3000,
    -- Lista PvP (mapas sin jefe). La fase P5 la ajustará con la revisión de justicia de cada mapa.
    'maps', jsonb_build_array('forest_maple_glade', 'forest_river_ford', 'savannah_oasis', 'savannah_canyon',
      'arctic_glacier_pass', 'arctic_boreal_camp', 'mystic_glow_swamp', 'mystic_crystal_isles',
      'genesis_royal_garden', 'genesis_sanctum_gate'),
    'sapidae_classes', jsonb_build_array('crafter', 'shepard', 'lunalogist', 'stargazer')
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Tablas
-- ---------------------------------------------------------------------------
create table if not exists public.pvp_seasons (
  season     text primary key,                       -- '2026-11'
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  closed     boolean not null default false,
  results    jsonb                                   -- top 10 pagado al cerrar
);

create table if not exists public.pvp_ratings (
  season      text not null references public.pvp_seasons (season),
  user_id     uuid not null references auth.users (id) on delete cascade,
  points      integer not null,
  games       integer not null default 0,
  wins        integer not null default 0,
  losses      integer not null default 0,
  draws       integer not null default 0,
  streak      integer not null default 0,              -- racha de victorias actual
  best_streak integer not null default 0,
  points_at   timestamptz not null default now(),      -- cuándo llegó a su cifra (desempate: antes gana)
  last_slot   smallint,                                -- ranura de su última partida (aquí se paga el bAXS)
  primary key (season, user_id)
);
create index if not exists pvp_ratings_rank on public.pvp_ratings (season, points desc, games desc, points_at asc);

create table if not exists public.pvp_queue (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  slot_id      smallint not null check (slot_id between 1 and 3),
  points       integer not null,
  snapshot     jsonb not null,
  joined_at    timestamptz not null default now(),
  heartbeat_at timestamptz not null default now()
);

create table if not exists public.pvp_matches (
  id             uuid primary key default gen_random_uuid(),
  season         text not null references public.pvp_seasons (season),
  status         text not null default 'active' check (status in ('active', 'ended', 'finished', 'disputed', 'aborted')),
  seed           bigint not null,
  map_id         text not null,
  tie_break      text not null check (tie_break in ('A', 'B')),   -- bando que empieza con empate de iniciativa
  a_user         uuid not null references auth.users (id) on delete cascade,
  a_slot         smallint not null,
  a_snapshot     jsonb not null,
  b_user         uuid not null references auth.users (id) on delete cascade,
  b_slot         smallint not null,
  b_snapshot     jsonb not null,
  next_seq       integer not null default 0,           -- número de la siguiente orden
  turn_side      text check (turn_side in ('A', 'B')), -- null hasta la primera orden (el motor decide quién empieza)
  turn_deadline  timestamptz,
  last_action_at timestamptz not null default now(),
  reports        jsonb not null default '{}'::jsonb,   -- { A: { winner, reason, hash, at }, B: … }
  winner         text check (winner in ('A', 'B')),    -- null = empate o sin decidir
  reason         text,                                 -- elimination · rounds · surrender · abandon · arbiter
  rated          boolean,
  deltas         jsonb,                                -- { A: +18, B: -14 }
  slp            jsonb,                                -- { A: 15, B: 0 }
  dispute        jsonb,                                -- por qué se discute (huella, informes)
  created_at     timestamptz not null default now(),
  ended_at       timestamptz
);
create index if not exists pvp_matches_a on public.pvp_matches (a_user, created_at desc);
create index if not exists pvp_matches_b on public.pvp_matches (b_user, created_at desc);
create index if not exists pvp_matches_open on public.pvp_matches (status) where status in ('active', 'ended', 'disputed');

create table if not exists public.pvp_actions (
  match_id  uuid not null references public.pvp_matches (id) on delete cascade,
  seq       integer not null,
  side      text not null check (side in ('A', 'B', 'S')),   -- S = el servidor (fin de turno forzado por tiempo)
  ord       jsonb not null,                                  -- { t: move|cast|end|timeout, unit, x, z, spell }
  hash      text,                                            -- huella tras un END (del que lo manda)
  ack_hash  text,                                            -- huella del rival al aplicarlo (pvp_ack)
  at        timestamptz not null default now(),
  primary key (match_id, seq)
);

alter table public.pvp_seasons enable row level security;
alter table public.pvp_ratings enable row level security;
alter table public.pvp_queue   enable row level security;
alter table public.pvp_matches enable row level security;
alter table public.pvp_actions enable row level security;
revoke all on public.pvp_seasons, public.pvp_ratings, public.pvp_queue, public.pvp_matches, public.pvp_actions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Ayudantes internos
-- ---------------------------------------------------------------------------
create or replace function public._pvp_err(p_code text, extra jsonb default '{}'::jsonb)
returns jsonb language sql immutable as $$ select jsonb_build_object('ok', false, 'error', p_code) || extra $$;

create or replace function public._pvp_uid()
returns uuid language plpgsql stable as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return v;
end;
$$;

/** Día de Colombia de un instante (para los topes diarios). */
create or replace function public._pvp_day(p_at timestamptz)
returns date language sql stable as $$ select (p_at at time zone (public.pvp_settings() ->> 'tz'))::date $$;

/**
 * Foto igualada de una partida guardada: { name, sapidaeClass, axie: { axieId, name, class, cards[6], variants } }.
 * Solo lo que decide el combate igualado; las estadísticas (nivel 10, sin equipo, runas ni charms) las pone el motor.
 */
create or replace function public._pvp_snapshot(p_uid uuid, p_slot smallint)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  d jsonb; main jsonb; axie_id text; pc jsonb; cards jsonb; cls text; i int;
begin
  select data into d from public.save_slots where user_id = p_uid and slot_id = p_slot;
  if d is null then return public._pvp_err('no_save'); end if;
  cls := coalesce(d ->> 'sapidaeClass', 'crafter');
  if not (public.pvp_settings() -> 'sapidae_classes') ? cls then cls := 'crafter'; end if;
  main := d -> 'mainAxie';
  axie_id := coalesce(main ->> 'axieId', d #>> '{hero,axieId}');
  if axie_id is null then return public._pvp_err('no_axie'); end if;
  pc := d -> 'partCards' -> axie_id;
  cards := pc -> 'ids';
  if cards is null or jsonb_typeof(cards) <> 'array' or jsonb_array_length(cards) <> 6 then
    return public._pvp_err('no_cards'); -- el juego resuelve y guarda las cartas al entrar en combate o abrir el Escuadrón
  end if;
  for i in 0 .. 5 loop
    if jsonb_typeof(cards -> i) <> 'string' or length(cards ->> i) > 96 or (cards ->> i) !~ '^[a-z0-9_\-]+$' then
      return public._pvp_err('bad_cards');
    end if;
  end loop;
  return jsonb_build_object(
    'ok', true,
    'name', left(coalesce(d ->> 'playerName', 'Lunacian'), 32),
    'sapidaeClass', cls,
    'sapidaeModel', d ->> 'sapidaeModel',
    'axie', jsonb_build_object(
      'axieId', axie_id,
      'name', left(coalesce(main ->> 'name', d #>> '{hero,name}', 'Axie'), 48),
      'class', coalesce(main ->> 'class', d #>> '{hero,class}', 'Beast'),
      'cards', cards,
      'variants', coalesce(pc -> 'variants', '[]'::jsonb),
      'collections', coalesce(pc -> 'collections', '[]'::jsonb)));
end;
$$;

/**
 * Temporada actual (la crea la primera vez; antes cierra y paga las que hayan terminado).
 */
create or replace function public._pvp_season()
returns public.pvp_seasons language plpgsql security definer set search_path = public as $$
declare
  tz text := public.pvp_settings() ->> 'tz';
  loc timestamp := now() at time zone tz;
  sid text := to_char(loc, 'YYYY-MM');
  s public.pvp_seasons%rowtype;
  v_start timestamptz;
begin
  select * into s from public.pvp_seasons where season = sid;
  if found then return s; end if;
  perform pg_advisory_xact_lock(hashtext('lunakai_pvp_season'));
  select * into s from public.pvp_seasons where season = sid;
  if found then return s; end if;
  perform public.pvp_close_due();
  v_start := date_trunc('month', loc) at time zone tz;
  insert into public.pvp_seasons (season, starts_at, ends_at)
  values (sid, v_start, (date_trunc('month', loc) + interval '1 month') at time zone tz)
  returning * into s;
  return s;
end;
$$;

/** Fila de puntos del jugador en la temporada (la crea con el reinicio suave de la anterior). */
create or replace function public._pvp_rating(p_season text, p_uid uuid)
returns public.pvp_ratings language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.pvp_settings();
  r public.pvp_ratings%rowtype;
  prev integer;
  base integer := (st ->> 'start_points')::int;
begin
  select * into r from public.pvp_ratings where season = p_season and user_id = p_uid;
  if found then return r; end if;
  select points into prev from public.pvp_ratings
   where user_id = p_uid and season < p_season order by season desc limit 1;
  insert into public.pvp_ratings (season, user_id, points)
  values (p_season, p_uid, case when prev is null then base else base + round((prev - base) / 2.0)::int end)
  on conflict (season, user_id) do nothing;
  select * into r from public.pvp_ratings where season = p_season and user_id = p_uid;
  return r;
end;
$$;

/** Bando del jugador en la partida ('A' | 'B' | null). */
create or replace function public._pvp_side(m public.pvp_matches, p_uid uuid)
returns text language sql immutable as $$
  select case when m.a_user = p_uid then 'A' when m.b_user = p_uid then 'B' else null end
$$;

/** Vista de la partida para un jugador (sin las órdenes). */
create or replace function public._pvp_match_out(m public.pvp_matches, p_side text)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', m.id, 'season', m.season, 'status', m.status, 'seed', m.seed, 'map', m.map_id, 'tieBreak', m.tie_break,
    'side', p_side,
    'A', m.a_snapshot - 'ok', 'B', m.b_snapshot - 'ok',
    'nextSeq', m.next_seq, 'turnSide', m.turn_side, 'turnDeadline', m.turn_deadline,
    'winner', m.winner, 'reason', m.reason, 'rated', m.rated, 'deltas', m.deltas, 'slp', m.slp,
    'maxRounds', (public.pvp_settings() ->> 'max_rounds')::int,
    'createdAt', m.created_at, 'endedAt', m.ended_at, 'now', now())
$$;

/**
 * Cierra la partida con su resultado oficial: puntos (Elo) y SLP en una sola transacción, una sola vez.
 * p_winner: 'A' | 'B' | null (empate). La llaman la rendición, el abandono, los dos informes iguales y el árbitro.
 */
create or replace function public._pvp_resolve(p_match uuid, p_winner text, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.pvp_settings();
  m public.pvp_matches%rowtype;
  ra public.pvp_ratings%rowtype; rb public.pvp_ratings%rowtype;
  ea numeric; sa numeric; ka int; kb int; da int; db int;
  pair_today int; v_rated boolean;
  slp_a int := 0; slp_b int := 0; wins_today int; win_uid uuid;
  v_day date := public._pvp_day(now());
begin
  select * into m from public.pvp_matches where id = p_match for update;
  if not found then return public._pvp_err('unknown_match'); end if;
  if m.status in ('finished', 'aborted') then return jsonb_build_object('ok', true, 'already', true, 'match', public._pvp_match_out(m, null)); end if;

  ra := public._pvp_rating(m.season, m.a_user);
  rb := public._pvp_rating(m.season, m.b_user);
  select * into ra from public.pvp_ratings where season = m.season and user_id = m.a_user for update;
  select * into rb from public.pvp_ratings where season = m.season and user_id = m.b_user for update;

  -- Antiabuso: contra el mismo rival solo puntúan N partidas al día (sin contar esta)
  select count(*) into pair_today from public.pvp_matches x
   where x.status = 'finished' and x.rated and x.id <> m.id and public._pvp_day(x.ended_at) = v_day
     and ((x.a_user = m.a_user and x.b_user = m.b_user) or (x.a_user = m.b_user and x.b_user = m.a_user));
  v_rated := pair_today < (st ->> 'same_rival_per_day')::int;

  if v_rated then
    sa := case p_winner when 'A' then 1 when 'B' then 0 else 0.5 end;
    ea := 1 / (1 + power(10::numeric, (rb.points - ra.points) / 400.0));
    ka := case when ra.games < (st ->> 'k_new_games')::int then (st ->> 'k_new')::int else (st ->> 'k')::int end;
    kb := case when rb.games < (st ->> 'k_new_games')::int then (st ->> 'k_new')::int else (st ->> 'k')::int end;
    da := round(ka * (sa - ea))::int;
    db := round(kb * ((1 - sa) - (1 - ea)))::int;
    if p_winner = 'A' then da := greatest(da, (st ->> 'min_win')::int); db := greatest(db, -(st ->> 'max_loss')::int);
    elsif p_winner = 'B' then db := greatest(db, (st ->> 'min_win')::int); da := greatest(da, -(st ->> 'max_loss')::int);
    end if;
  else
    da := 0; db := 0;
  end if;

  update public.pvp_ratings set
    points = greatest(0, points + da), games = games + 1,
    wins = wins + (p_winner = 'A')::int, losses = losses + (p_winner = 'B')::int, draws = draws + (p_winner is null)::int,
    streak = case when p_winner = 'A' then streak + 1 else 0 end,
    best_streak = greatest(best_streak, case when p_winner = 'A' then streak + 1 else 0 end),
    points_at = case when da <> 0 then now() else points_at end,
    last_slot = m.a_slot
   where season = m.season and user_id = m.a_user;
  update public.pvp_ratings set
    points = greatest(0, points + db), games = games + 1,
    wins = wins + (p_winner = 'B')::int, losses = losses + (p_winner = 'A')::int, draws = draws + (p_winner is null)::int,
    streak = case when p_winner = 'B' then streak + 1 else 0 end,
    best_streak = greatest(best_streak, case when p_winner = 'B' then streak + 1 else 0 end),
    points_at = case when db <> 0 then now() else points_at end,
    last_slot = m.b_slot
   where season = m.season and user_id = m.b_user;

  -- SLP del ganador (tope diario de victorias con SLP)
  if p_winner is not null then
    win_uid := case p_winner when 'A' then m.a_user else m.b_user end;
    select count(*) into wins_today from public.pvp_matches x
     where x.status = 'finished' and x.id <> m.id and public._pvp_day(x.ended_at) = v_day
       and ((x.a_user = win_uid and coalesce((x.slp ->> 'A')::int, 0) > 0)
         or (x.b_user = win_uid and coalesce((x.slp ->> 'B')::int, 0) > 0));
    if wins_today < (st ->> 'slp_wins_per_day')::int then
      if p_winner = 'A' then
        slp_a := (st ->> 'slp_win')::int;
        perform public._econ_wallet(m.a_user, m.a_slot);
        perform public._econ_apply(m.a_user, m.a_slot, 'reward', 'pvp_win', 1, 0, slp_a, 0, 'pvp:' || m.id);
      else
        slp_b := (st ->> 'slp_win')::int;
        perform public._econ_wallet(m.b_user, m.b_slot);
        perform public._econ_apply(m.b_user, m.b_slot, 'reward', 'pvp_win', 1, 0, slp_b, 0, 'pvp:' || m.id);
      end if;
    end if;
  end if;

  update public.pvp_matches set
    status = 'finished', winner = p_winner, reason = p_reason, rated = v_rated,
    deltas = jsonb_build_object('A', da, 'B', db), slp = jsonb_build_object('A', slp_a, 'B', slp_b),
    ended_at = coalesce(ended_at, now()), turn_side = null, turn_deadline = null
   where id = m.id
  returning * into m;
  return jsonb_build_object('ok', true, 'match', public._pvp_match_out(m, null));
end;
$$;

/** Partidas abandonadas (sin órdenes en 3 min) e informes que esperan demasiado. La llaman pg_cron y la cola. */
create or replace function public.pvp_cleanup()
returns integer language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.pvp_settings();
  m record; n int := 0; side text; rep jsonb;
begin
  delete from public.pvp_queue where heartbeat_at < now() - make_interval(secs => (st ->> 'queue_ttl_secs')::int);
  for m in select * from public.pvp_matches
            where status = 'active' and last_action_at < now() - make_interval(secs => (st ->> 'abandon_secs')::int)
            for update skip locked loop
    if m.turn_side is null then
      update public.pvp_matches set status = 'aborted', reason = 'no_start', ended_at = now() where id = m.id;
    else
      perform public._pvp_resolve(m.id, case m.turn_side when 'A' then 'B' else 'A' end, 'abandon');
    end if;
    n := n + 1;
  end loop;
  -- Un solo informe de final y el otro jugador no informa: vale el que hay
  for m in select * from public.pvp_matches
            where status = 'ended' and ended_at < now() - make_interval(secs => (st ->> 'report_wait_secs')::int)
            for update skip locked loop
    side := (select k from jsonb_object_keys(m.reports) k limit 1);
    rep := m.reports -> side;
    perform public._pvp_resolve(m.id, nullif(rep ->> 'winner', ''), coalesce(rep ->> 'reason', 'report'));
    n := n + 1;
  end loop;
  return n;
end;
$$;

/** Cierra y paga las temporadas terminadas (idempotente). */
create or replace function public._pvp_close_season(p_season text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.pvp_settings();
  s public.pvp_seasons%rowtype;
  top record; amount numeric; v_results jsonb := '[]'::jsonb;
begin
  select * into s from public.pvp_seasons where season = p_season for update;
  if not found then return public._pvp_err('unknown_season'); end if;
  if s.closed then return jsonb_build_object('ok', true, 'already', true, 'results', s.results); end if;
  if s.ends_at > now() then return public._pvp_err('season_running'); end if;
  for top in
    select row_number() over (order by points desc, games desc, points_at asc, user_id) as rank, *
      from public.pvp_ratings where season = p_season and games > 0
     order by rank limit jsonb_array_length(st -> 'payout')
  loop
    amount := (st -> 'payout' ->> (top.rank::int - 1))::numeric;
    if top.last_slot is null then amount := 0; end if; -- sin ranura conocida no hay cartera donde pagar
    if amount > 0 then
      perform public._econ_wallet(top.user_id, top.last_slot);
      perform public._econ_apply(top.user_id, top.last_slot, 'reward', 'pvp_season:' || p_season || ':' || top.rank, null,
        0, 0, amount, 'pvp_season:' || p_season);
    end if;
    v_results := v_results || jsonb_build_array(jsonb_build_object('rank', top.rank, 'user', top.user_id, 'points', top.points, 'games', top.games, 'baxs', amount));
  end loop;
  update public.pvp_seasons set closed = true, results = v_results where season = p_season;
  return jsonb_build_object('ok', true, 'results', v_results);
end;
$$;

create or replace function public.pvp_close_due()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0; sid text;
begin
  for sid in select season from public.pvp_seasons where not closed and ends_at <= now() order by starts_at loop
    perform public._pvp_close_season(sid);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Funciones que llama el juego
-- ---------------------------------------------------------------------------

/**
 * Buscar rival (y latido de la cola: el cliente la llama cada pocos segundos mientras espera).
 * { ok, status: 'queued', waited } · { ok, status: 'matched' | 'in_match', match } · error (no_save, no_cards…)
 * Ventana de puntos: ±100, +100 cada 15 s de espera; a los 60 s, cualquiera.
 */
create or replace function public.pvp_enqueue(p_slot smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.pvp_settings();
  v_uid uuid := public._pvp_uid();
  s public.pvp_seasons%rowtype;
  r public.pvp_ratings%rowtype;
  m public.pvp_matches%rowtype;
  q public.pvp_queue%rowtype;
  opp public.pvp_queue%rowtype;
  snap jsonb; waited numeric; win int; v_seed bigint; v_map text; a_first boolean;
begin
  if p_slot is null or p_slot not between 1 and 3 then return public._pvp_err('invalid_slot'); end if;
  perform public.pvp_cleanup();
  s := public._pvp_season();

  -- ¿Ya está en una partida abierta?
  select * into m from public.pvp_matches
   where status in ('active', 'ended', 'disputed') and (a_user = v_uid or b_user = v_uid)
   order by created_at desc limit 1;
  if found then return jsonb_build_object('ok', true, 'status', 'in_match', 'match', public._pvp_match_out(m, public._pvp_side(m, v_uid))); end if;

  snap := public._pvp_snapshot(v_uid, p_slot);
  if snap ->> 'ok' = 'false' then return snap; end if;
  r := public._pvp_rating(s.season, v_uid);

  perform pg_advisory_xact_lock(hashtext('lunakai_pvp_queue'));
  insert into public.pvp_queue (user_id, slot_id, points, snapshot)
  values (v_uid, p_slot, r.points, snap)
  on conflict (user_id) do update set slot_id = excluded.slot_id, points = excluded.points, snapshot = excluded.snapshot,
    heartbeat_at = now(), joined_at = case when pvp_queue.slot_id = excluded.slot_id then pvp_queue.joined_at else now() end
  returning * into q;

  waited := extract(epoch from now() - q.joined_at);
  win := case when waited >= (st ->> 'queue_any_secs')::int then 1000000
              else (st ->> 'queue_window')::int + (st ->> 'queue_step')::int * floor(waited / (st ->> 'queue_step_secs')::int)::int end;

  select * into opp from public.pvp_queue o
   where o.user_id <> v_uid
     and abs(o.points - q.points) <= greatest(win,
           case when extract(epoch from now() - o.joined_at) >= (st ->> 'queue_any_secs')::int then 1000000
                else (st ->> 'queue_window')::int + (st ->> 'queue_step')::int * floor(extract(epoch from now() - o.joined_at) / (st ->> 'queue_step_secs')::int)::int end)
   order by abs(o.points - q.points), o.joined_at
   limit 1;
  if not found then
    return jsonb_build_object('ok', true, 'status', 'queued', 'waited', floor(waited), 'points', r.points, 'window', least(win, 9999));
  end if;

  -- Partida: semilla, mapa, bandos y desempate al azar del servidor
  v_seed := floor(random() * 4294967295)::bigint;
  v_map := st -> 'maps' ->> floor(random() * jsonb_array_length(st -> 'maps'))::int;
  a_first := random() < 0.5;   -- quién es el bando A (sale en las casillas P)
  insert into public.pvp_matches (season, seed, map_id, tie_break, a_user, a_slot, a_snapshot, b_user, b_slot, b_snapshot)
  values (s.season, v_seed, v_map, case when random() < 0.5 then 'A' else 'B' end,
          case when a_first then q.user_id else opp.user_id end, case when a_first then q.slot_id else opp.slot_id end,
          case when a_first then q.snapshot else opp.snapshot end,
          case when a_first then opp.user_id else q.user_id end, case when a_first then opp.slot_id else q.slot_id end,
          case when a_first then opp.snapshot else q.snapshot end)
  returning * into m;
  delete from public.pvp_queue where user_id in (q.user_id, opp.user_id);
  perform public._pvp_rating(s.season, opp.user_id);
  return jsonb_build_object('ok', true, 'status', 'matched', 'match', public._pvp_match_out(m, public._pvp_side(m, v_uid)));
end;
$$;

/** Salir de la cola. */
create or replace function public.pvp_leave_queue()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._pvp_uid();
begin
  delete from public.pvp_queue where user_id = v_uid;
  return jsonb_build_object('ok', true);
end;
$$;

/** Estado de la partida y órdenes desde `p_from` (reconexión y repetición rápida). Solo los dos jugadores. */
create or replace function public.pvp_match(p_match uuid, p_from integer default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._pvp_uid();
  m public.pvp_matches%rowtype; side text; acts jsonb;
begin
  select * into m from public.pvp_matches where id = p_match;
  if not found then return public._pvp_err('unknown_match'); end if;
  side := public._pvp_side(m, v_uid);
  if side is null then return public._pvp_err('not_in_match'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('seq', seq, 'side', a.side, 'ord', ord, 'hash', hash, 'at', a.at) order by seq), '[]'::jsonb)
    into acts from public.pvp_actions a where a.match_id = m.id and a.seq >= greatest(0, coalesce(p_from, 0));
  return jsonb_build_object('ok', true, 'match', public._pvp_match_out(m, side), 'actions', acts);
end;
$$;

/**
 * Una orden del jugador. p_seq = la siguiente (evita duplicados y desorden). p_order: { t, unit, x, z, spell }.
 * Con t = 'end': p_hash = huella tras el fin del turno y p_next = bando que juega ahora (lo dice su motor).
 * El servidor comprueba: partida abierta, bando del turno (desde la primera orden), número de orden, tiempo y forma.
 */
create or replace function public.pvp_act(p_match uuid, p_seq integer, p_order jsonb, p_hash text default null, p_next text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.pvp_settings();
  v_uid uuid := public._pvp_uid();
  m public.pvp_matches%rowtype; side text; t text;
begin
  select * into m from public.pvp_matches where id = p_match for update;
  if not found then return public._pvp_err('unknown_match'); end if;
  side := public._pvp_side(m, v_uid);
  if side is null then return public._pvp_err('not_in_match'); end if;
  if m.status <> 'active' then return public._pvp_err('match_closed', jsonb_build_object('status', m.status)); end if;
  if p_seq is distinct from m.next_seq then return public._pvp_err('bad_seq', jsonb_build_object('nextSeq', m.next_seq)); end if;
  if m.turn_side is not null and m.turn_side <> side then return public._pvp_err('not_your_turn'); end if;
  if m.turn_deadline is not null and now() > m.turn_deadline + make_interval(secs => (st ->> 'turn_grace_secs')::int) then
    return public._pvp_err('turn_over');
  end if;
  if m.next_seq >= (st ->> 'max_actions')::int then return public._pvp_err('too_many_actions'); end if;

  -- Forma de la orden (la legalidad la comprueban los dos motores y el árbitro)
  t := p_order ->> 't';
  if t not in ('move', 'cast', 'end') or length(coalesce(p_order ->> 'unit', '')) not between 1 and 64
     or length(p_order::text) > 512 then
    return public._pvp_err('bad_order');
  end if;
  if t in ('move', 'cast') and (jsonb_typeof(p_order -> 'x') <> 'number' or jsonb_typeof(p_order -> 'z') <> 'number') then
    return public._pvp_err('bad_order');
  end if;
  if t = 'cast' and length(coalesce(p_order ->> 'spell', '')) not between 1 and 96 then return public._pvp_err('bad_order'); end if;
  if t = 'end' and (p_hash is null or p_hash !~ '^[0-9a-f]{8}$' or p_next not in ('A', 'B')) then return public._pvp_err('bad_end'); end if;

  insert into public.pvp_actions (match_id, seq, side, ord, hash)
  values (m.id, m.next_seq, side, jsonb_strip_nulls(jsonb_build_object('t', t, 'unit', p_order ->> 'unit', 'x', p_order -> 'x', 'z', p_order -> 'z', 'spell', p_order ->> 'spell')),
          case when t = 'end' then p_hash end);
  update public.pvp_matches set
    next_seq = next_seq + 1,
    last_action_at = now(),
    turn_side = case when t = 'end' then p_next else coalesce(turn_side, side) end,
    turn_deadline = case when t = 'end' or turn_side is null then now() + make_interval(secs => (st ->> 'turn_secs')::int) else turn_deadline end
   where id = m.id
  returning * into m;
  return jsonb_build_object('ok', true, 'seq', m.next_seq - 1, 'nextSeq', m.next_seq, 'turnSide', m.turn_side, 'turnDeadline', m.turn_deadline);
end;
$$;

/** El rival se ha pasado de tiempo: fin de turno forzado (lo pide quien espera). p_next como en pvp_act. */
create or replace function public.pvp_timeout(p_match uuid, p_seq integer, p_hash text, p_next text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.pvp_settings();
  v_uid uuid := public._pvp_uid();
  m public.pvp_matches%rowtype; side text;
begin
  select * into m from public.pvp_matches where id = p_match for update;
  if not found then return public._pvp_err('unknown_match'); end if;
  side := public._pvp_side(m, v_uid);
  if side is null then return public._pvp_err('not_in_match'); end if;
  if m.status <> 'active' then return public._pvp_err('match_closed', jsonb_build_object('status', m.status)); end if;
  if m.turn_side is null or m.turn_side = side then return public._pvp_err('not_their_turn'); end if;
  if now() <= m.turn_deadline + make_interval(secs => (st ->> 'turn_grace_secs')::int) then
    return public._pvp_err('not_yet', jsonb_build_object('turnDeadline', m.turn_deadline));
  end if;
  if p_seq is distinct from m.next_seq then return public._pvp_err('bad_seq', jsonb_build_object('nextSeq', m.next_seq)); end if;
  if p_hash is null or p_hash !~ '^[0-9a-f]{8}$' or p_next not in ('A', 'B') then return public._pvp_err('bad_end'); end if;
  insert into public.pvp_actions (match_id, seq, side, ord, hash)
  values (m.id, m.next_seq, 'S', jsonb_build_object('t', 'timeout', 'side', m.turn_side), p_hash);
  update public.pvp_matches set next_seq = next_seq + 1, last_action_at = now(), turn_side = p_next,
    turn_deadline = now() + make_interval(secs => (st ->> 'turn_secs')::int)
   where id = m.id returning * into m;
  return jsonb_build_object('ok', true, 'nextSeq', m.next_seq, 'turnSide', m.turn_side, 'turnDeadline', m.turn_deadline);
end;
$$;

/**
 * El rival confirma la huella de un fin de turno al aplicarlo. Si no coincide, la partida queda en disputa (árbitro).
 */
create or replace function public.pvp_ack(p_match uuid, p_seq integer, p_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._pvp_uid();
  m public.pvp_matches%rowtype; a public.pvp_actions%rowtype; side text;
begin
  select * into m from public.pvp_matches where id = p_match for update;
  if not found then return public._pvp_err('unknown_match'); end if;
  side := public._pvp_side(m, v_uid);
  if side is null then return public._pvp_err('not_in_match'); end if;
  select * into a from public.pvp_actions where match_id = m.id and seq = p_seq;
  if not found or a.hash is null then return public._pvp_err('no_hash'); end if;
  if a.side = side then return public._pvp_err('own_turn'); end if;
  update public.pvp_actions set ack_hash = p_hash where match_id = m.id and seq = p_seq;
  if p_hash is distinct from a.hash and m.status in ('active', 'ended') then
    update public.pvp_matches set status = 'disputed', ended_at = coalesce(ended_at, now()),
      dispute = jsonb_build_object('kind', 'hash', 'seq', p_seq, 'hash', a.hash, 'ack', p_hash, 'by', side)
     where id = m.id;
    return jsonb_build_object('ok', true, 'disputed', true);
  end if;
  return jsonb_build_object('ok', true, 'disputed', false);
end;
$$;

/**
 * Final de la partida según el motor de cada jugador: p_winner 'A' | 'B' | 'draw', p_reason elimination | rounds,
 * p_hash = huella final. Con los dos informes iguales se cierra (puntos y SLP); distintos → disputa.
 */
create or replace function public.pvp_report(p_match uuid, p_winner text, p_reason text, p_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._pvp_uid();
  m public.pvp_matches%rowtype; side text; other text; mine jsonb; theirs jsonb;
begin
  select * into m from public.pvp_matches where id = p_match for update;
  if not found then return public._pvp_err('unknown_match'); end if;
  side := public._pvp_side(m, v_uid);
  if side is null then return public._pvp_err('not_in_match'); end if;
  if m.status in ('finished', 'aborted') then return jsonb_build_object('ok', true, 'match', public._pvp_match_out(m, side)); end if;
  if p_winner not in ('A', 'B', 'draw') or p_reason not in ('elimination', 'rounds') or p_hash !~ '^[0-9a-f]{8}$' then
    return public._pvp_err('bad_report');
  end if;
  other := case side when 'A' then 'B' else 'A' end;
  mine := jsonb_build_object('winner', case when p_winner = 'draw' then '' else p_winner end, 'reason', p_reason, 'hash', p_hash, 'at', now());
  update public.pvp_matches set reports = reports || jsonb_build_object(side, mine),
    status = case when status = 'active' then 'ended' else status end,
    ended_at = coalesce(ended_at, now()), turn_side = null, turn_deadline = null
   where id = m.id returning * into m;
  theirs := m.reports -> other;
  if m.status = 'disputed' then return jsonb_build_object('ok', true, 'match', public._pvp_match_out(m, side)); end if;
  if theirs is null then return jsonb_build_object('ok', true, 'waiting', true, 'match', public._pvp_match_out(m, side)); end if;
  if theirs ->> 'winner' = mine ->> 'winner' and theirs ->> 'hash' = mine ->> 'hash' then
    perform public._pvp_resolve(m.id, nullif(mine ->> 'winner', ''), p_reason);
  else
    update public.pvp_matches set status = 'disputed', dispute = jsonb_build_object('kind', 'report', 'A', m.reports -> 'A', 'B', m.reports -> 'B')
     where id = m.id;
  end if;
  select * into m from public.pvp_matches where id = p_match;
  return jsonb_build_object('ok', true, 'match', public._pvp_match_out(m, side));
end;
$$;

/**
 * El motor del jugador no está de acuerdo (una orden recibida es ilegal, un final que su motor no ve…): disputa.
 * La decide el árbitro (fase P4) repitiendo las órdenes guardadas.
 */
create or replace function public.pvp_dispute(p_match uuid, p_reason text, p_seq integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._pvp_uid();
  m public.pvp_matches%rowtype; side text;
begin
  select * into m from public.pvp_matches where id = p_match for update;
  if not found then return public._pvp_err('unknown_match'); end if;
  side := public._pvp_side(m, v_uid);
  if side is null then return public._pvp_err('not_in_match'); end if;
  if m.status not in ('active', 'ended') then return jsonb_build_object('ok', true, 'status', m.status); end if;
  update public.pvp_matches set status = 'disputed', ended_at = coalesce(ended_at, now()), turn_side = null, turn_deadline = null,
    dispute = jsonb_build_object('kind', 'client', 'by', side, 'reason', left(coalesce(p_reason, ''), 64), 'seq', p_seq)
   where id = m.id;
  return jsonb_build_object('ok', true, 'status', 'disputed');
end;
$$;

/** Rendirse: derrota en el acto. */
create or replace function public.pvp_surrender(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._pvp_uid();
  m public.pvp_matches%rowtype; side text;
begin
  select * into m from public.pvp_matches where id = p_match for update;
  if not found then return public._pvp_err('unknown_match'); end if;
  side := public._pvp_side(m, v_uid);
  if side is null then return public._pvp_err('not_in_match'); end if;
  if m.status not in ('active', 'ended') then return public._pvp_err('match_closed', jsonb_build_object('status', m.status)); end if;
  return public._pvp_resolve(m.id, case side when 'A' then 'B' else 'A' end, 'surrender');
end;
$$;

/** Clasificación de una temporada: los 10 primeros y, si estás fuera, tu puesto. Invitados: sin «me». */
create or replace function public.pvp_board(p_season text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.pvp_settings();
  v_uid uuid := auth.uid();
  sid text := coalesce(p_season, (public._pvp_season()).season);
  s public.pvp_seasons%rowtype;
  v_rows jsonb; v_mine jsonb;
begin
  select * into s from public.pvp_seasons where season = sid;
  if not found then return public._pvp_err('unknown_season'); end if;
  with ranked as (
    select row_number() over (order by r.points desc, r.games desc, r.points_at asc, r.user_id) as rank, r.*,
           sl.data ->> 'playerName' as player_name, sl.data -> 'mainAxie' as main_axie
      from public.pvp_ratings r
      left join public.save_slots sl on sl.user_id = r.user_id and sl.slot_id = r.last_slot
     where r.season = sid and r.games > 0
  ), shaped as (
    select rank, user_id, jsonb_build_object(
      'rank', rank, 'name', coalesce(player_name, 'Lunacian'),
      'axie', case when main_axie is null then null else jsonb_build_object('name', main_axie ->> 'name', 'class', main_axie ->> 'class', 'axieId', main_axie ->> 'axieId') end,
      'points', points, 'games', games, 'wins', wins, 'losses', losses, 'draws', draws, 'bestStreak', best_streak,
      'me', (v_uid is not null and user_id = v_uid)) as row
      from ranked
  )
  select coalesce(jsonb_agg(row order by rank) filter (where rank <= (st ->> 'board_size')::int), '[]'::jsonb),
         (array_agg(row) filter (where v_uid is not null and user_id = v_uid and rank > (st ->> 'board_size')::int))[1]
    into v_rows, v_mine
    from shaped;
  return jsonb_build_object('ok', true, 'season', s.season, 'startsAt', s.starts_at, 'endsAt', s.ends_at, 'closed', s.closed,
    'payout', st -> 'payout', 'rows', v_rows, 'me', v_mine, 'now', now());
end;
$$;

/** Lo mío: temporada, puntos, puesto, cola, partida abierta y victorias con SLP que quedan hoy. */
create or replace function public.pvp_me()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.pvp_settings();
  v_uid uuid := public._pvp_uid();
  s public.pvp_seasons%rowtype;
  r public.pvp_ratings%rowtype;
  m public.pvp_matches%rowtype;
  q public.pvp_queue%rowtype;
  v_rank bigint; slp_wins int; recent jsonb;
begin
  perform public.pvp_cleanup();
  s := public._pvp_season();
  select * into r from public.pvp_ratings where season = s.season and user_id = v_uid;
  if found and r.games > 0 then
    select count(*) + 1 into v_rank from public.pvp_ratings x
     where x.season = s.season and x.games > 0
       and (x.points > r.points or (x.points = r.points and (x.games > r.games or (x.games = r.games and (x.points_at < r.points_at or (x.points_at = r.points_at and x.user_id < r.user_id))))));
  end if;
  select * into m from public.pvp_matches
   where status in ('active', 'ended', 'disputed') and (a_user = v_uid or b_user = v_uid) order by created_at desc limit 1;
  select * into q from public.pvp_queue where user_id = v_uid;
  select count(*) into slp_wins from public.pvp_matches x
   where x.status = 'finished' and public._pvp_day(x.ended_at) = public._pvp_day(now())
     and ((x.a_user = v_uid and coalesce((x.slp ->> 'A')::int, 0) > 0) or (x.b_user = v_uid and coalesce((x.slp ->> 'B')::int, 0) > 0));
  select coalesce(jsonb_agg(row order by created_at desc), '[]'::jsonb) into recent from (
    select x.created_at, jsonb_build_object(
      'id', x.id, 'at', x.ended_at, 'map', x.map_id, 'reason', x.reason,
      'result', case when x.winner is null then 'draw' when x.winner = public._pvp_side(x, v_uid) then 'win' else 'loss' end,
      'delta', x.deltas -> public._pvp_side(x, v_uid),
      'rival', case when x.a_user = v_uid then x.b_snapshot ->> 'name' else x.a_snapshot ->> 'name' end) as row
      from public.pvp_matches x
     where x.status = 'finished' and (x.a_user = v_uid or x.b_user = v_uid)
     order by x.created_at desc limit 5) z;
  return jsonb_build_object('ok', true,
    'season', s.season, 'endsAt', s.ends_at,
    'points', coalesce(r.points, (public._pvp_rating(s.season, v_uid)).points),
    'games', coalesce(r.games, 0), 'wins', coalesce(r.wins, 0), 'losses', coalesce(r.losses, 0), 'draws', coalesce(r.draws, 0),
    'streak', coalesce(r.streak, 0), 'rank', v_rank,
    'slpWinsLeft', greatest(0, (st ->> 'slp_wins_per_day')::int - slp_wins), 'slpPerWin', (st ->> 'slp_win')::int,
    'queued', case when q.user_id is null then null else jsonb_build_object('since', q.joined_at, 'slot', q.slot_id) end,
    'match', case when m.id is null then null else public._pvp_match_out(m, public._pvp_side(m, v_uid)) end,
    'recent', recent, 'now', now());
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Permisos
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array['pvp_settings()', 'pvp_board(text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  foreach f in array array['pvp_enqueue(smallint)', 'pvp_leave_queue()', 'pvp_match(uuid,integer)',
                           'pvp_act(uuid,integer,jsonb,text,text)', 'pvp_timeout(uuid,integer,text,text)',
                           'pvp_ack(uuid,integer,text)', 'pvp_report(uuid,text,text,text)', 'pvp_dispute(uuid,text,integer)',
                           'pvp_surrender(uuid)', 'pvp_me()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['_pvp_err(text,jsonb)', '_pvp_uid()', '_pvp_day(timestamptz)', '_pvp_snapshot(uuid,smallint)',
                           '_pvp_season()', '_pvp_rating(text,uuid)', '_pvp_side(public.pvp_matches,uuid)',
                           '_pvp_match_out(public.pvp_matches,text)', '_pvp_resolve(uuid,text,text)',
                           '_pvp_close_season(text)', 'pvp_close_due()', 'pvp_cleanup()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Tareas programadas (respaldo; sin pg_cron, la cola y pvp_me hacen la limpieza y el cierre al usarse)
--    · cada minuto: partidas abandonadas e informes que esperan
--    · día 1 a las 00:05 de Colombia (05:05 UTC): cierre y pago de la temporada
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron no disponible: la limpieza y el cierre se hacen al usar la Arena';
    return;
  end;
  begin
    perform cron.unschedule('lunakai_pvp_cleanup');
  exception when others then null;
  end;
  begin
    perform cron.unschedule('lunakai_pvp_season');
  exception when others then null;
  end;
  perform cron.schedule('lunakai_pvp_cleanup', '* * * * *', 'select public.pvp_cleanup()');
  perform cron.schedule('lunakai_pvp_season', '5 5 1 * *', 'select public._pvp_season(); select public.pvp_close_due()');
exception when others then
  raise notice 'No se pudieron programar las tareas de la Arena: %', sqlerrm;
end $$;
