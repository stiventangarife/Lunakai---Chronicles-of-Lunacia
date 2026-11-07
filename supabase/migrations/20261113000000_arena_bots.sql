-- 20261113000000_arena_bots.sql — Rivales bot en la Arena PvP clasificatoria (fase R1).
-- Plan: docs/PLAN_BOTS_ARENA.md. Cerebro del bot: src/tactics/sim/PvpBot.js. Quién juega: Edge Function `pvp-bot` (R2).
--
-- Qué hace:
--   · pvp_bots: las cuentas que son bots. Cada bot es un usuario de auth.users con su partida guardada (save_slots,
--     ranura 1), igual que un jugador: así sale en la clasificación con su nombre y su Axie, y su instantánea de la
--     Arena la hace el mismo _pvp_snapshot. Los crea tools/pvp/bots/bots.sql (generado por seed-bots.mjs).
--   · pvp_enqueue: si un jugador lleva bot_after_secs s en la cola sin rival humano, juega contra el bot libre con
--     puntos más parecidos (antes los que aún puntúan contra él hoy). Si aparece un humano antes, siempre gana el humano.
--   · El bot juega con las MISMAS funciones que un jugador (pvp_match, pvp_act, pvp_ack, pvp_timeout, pvp_report), a
--     través de pvp_bot_call, que solo puede usar la clave de servicio (la Edge Function). Mismas reglas, mismo
--     árbitro, mismos puntos y SLP.
--   · Avisos a la Edge Function: al crearse la partida, cuando el rival termina su turno o se le acaba el tiempo y
--     cuando el rival informa del final (pg_net); y cada minuto, las partidas de bots atascadas (pg_cron).
--   · _pvp_match_out: rivalPresence = false si el rival es un bot (no se conecta al canal en tiempo real; el cliente
--     no avisa de «rival desconectado»).
--   · pvp_stats: sin las partidas con bot (el estudio de equilibrio es de jugadores) y con su número aparte.
--
-- Qué NO cambia: Elo, SLP, premios de temporada (también para los bots, decisión del 6-nov), reglas, árbitro,
-- invitados (la Arena sigue pidiendo cuenta).
--
-- Los bots solo entran cuando pvp_bot_config tiene la URL y la clave de la Edge Function (fase R2): aplicar esta
-- migración antes no cambia nada para los jugadores.
-- Desactivar los bots sin deshacer nada:   update public.pvp_bots set active = false;
-- Deshacer la migración: tools/pvp/bots/rollback.sql (vuelve a poner las funciones de antes y borra lo nuevo).

-- ---------------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------------
create table if not exists public.pvp_bots (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  base_points  integer not null check (base_points between 0 and 3000),    -- puntos con los que empieza cada temporada
  level        text check (level in ('novice', 'normal', 'strong')),       -- null = según sus puntos (levelForPoints)
  active       boolean not null default true,
  online_from  smallint not null default 0 check (online_from between 0 and 23),   -- hora de Colombia en que «se conecta»
  online_hours smallint not null default 24 check (online_hours between 1 and 24), -- horas seguidas «conectado»
  created_at   timestamptz not null default now()
);

-- Turno en curso de la Edge Function por partida (dos llamadas no juegan a la vez la misma partida)
create table if not exists public.pvp_bot_locks (
  match_id uuid primary key references public.pvp_matches (id) on delete cascade,
  until    timestamptz not null
);

-- Dónde está la Edge Function y su clave (como pvp_arbiter_config). Se rellena a mano al desplegar (fase R2).
create table if not exists public.pvp_bot_config (
  id  boolean primary key default true check (id),
  url text not null,
  key text not null
);

alter table public.pvp_bots       enable row level security;
alter table public.pvp_bot_locks  enable row level security;
alter table public.pvp_bot_config enable row level security;
revoke all on public.pvp_bots, public.pvp_bot_locks, public.pvp_bot_config from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Ayudantes
-- ---------------------------------------------------------------------------
create or replace function public._pvp_is_bot(p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_uid is not null and exists (select 1 from public.pvp_bots b where b.user_id = p_uid)
$$;

/** ¿El bot está «conectado» ahora? (su franja horaria, hora de Colombia; puede pasar de medianoche) */
create or replace function public._pvp_bot_online(b public.pvp_bots, p_at timestamptz default now())
returns boolean language sql stable as $$
  select b.online_hours >= 24
      or ((extract(hour from p_at at time zone (public.pvp_settings() ->> 'tz'))::int - b.online_from + 24) % 24) < b.online_hours
$$;

/** Fila de puntos del bot en la temporada: empieza con sus puntos de base (no con los 1000 de un jugador nuevo). */
create or replace function public._pvp_bot_rating(p_season text, p_bot uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.pvp_ratings (season, user_id, points, last_slot)
  select p_season, b.user_id, b.base_points, 1 from public.pvp_bots b where b.user_id = p_bot
  on conflict (season, user_id) do nothing
$$;

/**
 * El bot para un jugador que espera: activo, «conectado», sin partida abierta. Primero los que todavía puntúan contra
 * él hoy (same_rival_per_day) y no fueron su rival en los últimos 20 min; luego los de puntos más parecidos; el
 * desempate cambia cada día y con cada jugador.
 */
create or replace function public._pvp_pick_bot(p_season text, p_uid uuid, p_points integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.pvp_settings();
  v_day date := public._pvp_day(now());
  v_bot uuid;
begin
  select b.user_id into v_bot
    from public.pvp_bots b
    left join public.pvp_ratings r on r.season = p_season and r.user_id = b.user_id
   where b.active and b.user_id <> p_uid and public._pvp_bot_online(b)
     and exists (select 1 from public.pvp_bot_config c where c.id)   -- sin la Edge Function configurada, no hay bots
     and not exists (select 1 from public.pvp_matches x
                      where x.status in ('active', 'ended', 'disputed') and (x.a_user = b.user_id or x.b_user = b.user_id))
   order by
     (select count(*) from public.pvp_matches x
       where x.status = 'finished' and x.rated and public._pvp_day(x.ended_at) = v_day
         and ((x.a_user = b.user_id and x.b_user = p_uid) or (x.a_user = p_uid and x.b_user = b.user_id)))
       >= (st ->> 'same_rival_per_day')::int,
     -- El bot de la partida anterior (últimos 20 min), al final: no repetir rival seguido
     exists (select 1 from public.pvp_matches x
              where x.created_at > now() - interval '20 minutes'
                and ((x.a_user = b.user_id and x.b_user = p_uid) or (x.a_user = p_uid and x.b_user = b.user_id))),
     abs(coalesce(r.points, b.base_points) - p_points),
     hashtext(b.user_id::text || p_uid::text || v_day::text)
   limit 1
   for update of b skip locked;
  if v_bot is not null then perform public._pvp_bot_rating(p_season, v_bot); end if;
  return v_bot;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Funciones existentes que cambian (copia de la versión vigente + el cambio marcado)
-- ---------------------------------------------------------------------------

-- pvp_settings: + bot_after_secs, bot_stuck_secs, bot_lock_secs
CREATE OR REPLACE FUNCTION public.pvp_settings()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
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
    -- Lista PvP (fase P5): tableros simétricos con un giro de 180° y equilibrados en las partidas simuladas
    'maps', jsonb_build_array('forest_maple_glade', 'genesis_royal_garden',
      'pvp_savannah_oasis', 'pvp_savannah_canyon', 'pvp_arctic_glacier_pass', 'pvp_arctic_boreal_camp',
      'pvp_mystic_glow_swamp'),
    'sapidae_classes', jsonb_build_array('crafter', 'shepard', 'lunalogist', 'stargazer'),
    -- Rivales bot (docs/PLAN_BOTS_ARENA.md): a los N s en la cola sin rival humano se le da un bot
    'bot_after_secs', 10, 'bot_stuck_secs', 15, 'bot_lock_secs', 90
  );
$function$;

-- pvp_enqueue: rama «sin rival humano → bot»
CREATE OR REPLACE FUNCTION public.pvp_enqueue(p_slot smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  st jsonb := public.pvp_settings();
  v_uid uuid := public._pvp_uid();
  s public.pvp_seasons%rowtype;
  r public.pvp_ratings%rowtype;
  m public.pvp_matches%rowtype;
  q public.pvp_queue%rowtype;
  opp public.pvp_queue%rowtype;
  snap jsonb; waited numeric; win int; v_seed bigint; v_map text; a_first boolean;
  v_bot uuid; v_bot_snap jsonb;
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
    -- Rivales bot: a los bot_after_secs s sin rival humano, el bot libre con puntos más parecidos
    if waited >= (st ->> 'bot_after_secs')::int then
      v_bot := public._pvp_pick_bot(s.season, v_uid, q.points);
      if v_bot is not null then
        v_bot_snap := public._pvp_snapshot(v_bot, 1::smallint);
        if coalesce(v_bot_snap ->> 'ok', 'false') = 'true' then
          opp.user_id := v_bot; opp.slot_id := 1; opp.snapshot := v_bot_snap;
        end if;
      end if;
    end if;
    if opp.user_id is null then
      return jsonb_build_object('ok', true, 'status', 'queued', 'waited', floor(waited), 'points', r.points, 'window', least(win, 9999));
    end if;
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
$function$;

-- _pvp_match_out: + rivalPresence
CREATE OR REPLACE FUNCTION public._pvp_match_out(m pvp_matches, p_side text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select jsonb_build_object(
    'id', m.id, 'season', m.season, 'status', m.status, 'seed', m.seed, 'map', m.map_id, 'tieBreak', m.tie_break,
    'side', p_side,
    'A', m.a_snapshot - 'ok', 'B', m.b_snapshot - 'ok',
    'nextSeq', m.next_seq, 'turnSide', m.turn_side, 'turnDeadline', m.turn_deadline,
    'winner', m.winner, 'reason', m.reason, 'rated', m.rated, 'deltas', m.deltas, 'slp', m.slp,
    'maxRounds', (public.pvp_settings() ->> 'max_rounds')::int,
    'turnSecs', (public.pvp_settings() ->> 'turn_secs')::int,
    'graceSecs', (public.pvp_settings() ->> 'turn_grace_secs')::int,
    'timeouts', m.timeouts,
    'verdict', case when m.arbiter is null then null
                    else jsonb_build_object('result', m.arbiter ->> 'result', 'culprit', m.arbiter ->> 'culprit', 'fault', m.arbiter ->> 'fault') end,
    'rivalPresence', not public._pvp_is_bot(case p_side when 'A' then m.b_user when 'B' then m.a_user end),
    'createdAt', m.created_at, 'endedAt', m.ended_at, 'now', now())
$function$;

-- pvp_stats: sin las partidas con bot (+ botMatches)
CREATE OR REPLACE FUNCTION public.pvp_stats(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with m as (
    select x.*,
           (select a.side from public.pvp_actions a where a.match_id = x.id and a.side in ('A', 'B') order by a.seq limit 1) as first_side,
           extract(epoch from (x.ended_at - x.created_at)) / 60.0 as minutes
      from public.pvp_matches x
     where x.created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
       and not public._pvp_is_bot(x.a_user) and not public._pvp_is_bot(x.b_user)
  ),
  fin as (select * from m where status = 'finished'),
  sides as (   -- una fila por jugador y partida terminada
    select f.id, s.side, case when f.winner is null then 'd' when f.winner = s.side then 'w' else 'l' end as r,
           case s.side when 'A' then f.a_snapshot else f.b_snapshot end as snap
      from fin f cross join (values ('A'), ('B')) s(side)
  ),
  agg as (
    select key, count(*) filter (where r = 'w') as w, count(*) filter (where r = 'l') as l, count(*) filter (where r = 'd') as d
      from (select snap ->> 'sapidaeClass' as key, r from sides) z group by key
  ),
  aggx as (
    select key, count(*) filter (where r = 'w') as w, count(*) filter (where r = 'l') as l, count(*) filter (where r = 'd') as d
      from (select lower(snap #>> '{axie,class}') as key, r from sides) z group by key
  )
  select jsonb_build_object(
    'days', p_days, 'now', now(),
    'botMatches', (select count(*) from public.pvp_matches x where x.created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
                    and (public._pvp_is_bot(x.a_user) or public._pvp_is_bot(x.b_user))),
    'matches', (select count(*) from m),
    'byStatus', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from m group by status) z),
    'byReason', (select coalesce(jsonb_object_agg(coalesce(reason, '-'), n), '{}') from (select reason, count(*) n from m where status in ('finished', 'aborted') group by reason) z),
    'finished', (select count(*) from fin),
    'rated', (select count(*) from fin where rated),
    'sideA', (select jsonb_build_object('wins', count(*) filter (where winner = 'A'), 'losses', count(*) filter (where winner = 'B'), 'draws', count(*) filter (where winner is null)) from fin),
    'firstPlayer', (select jsonb_build_object('wins', count(*) filter (where winner = first_side), 'losses', count(*) filter (where winner is not null and winner <> first_side), 'draws', count(*) filter (where winner is null))
                      from fin where first_side is not null),
    'byMap', (select coalesce(jsonb_object_agg(map_id, v), '{}') from (
                select map_id, jsonb_build_object('games', count(*), 'A', count(*) filter (where winner = 'A'), 'B', count(*) filter (where winner = 'B'),
                       'draws', count(*) filter (where winner is null), 'firstWins', count(*) filter (where winner = first_side),
                       'avgActions', round(avg(next_seq)), 'avgMinutes', round(avg(minutes)::numeric, 1)) as v
                  from fin group by map_id) z),
    'bySapidae', (select coalesce(jsonb_object_agg(key, jsonb_build_object('w', w, 'l', l, 'd', d, 'winRate', round(w::numeric / nullif(w + l, 0), 3))), '{}') from agg),
    'byAxieClass', (select coalesce(jsonb_object_agg(key, jsonb_build_object('w', w, 'l', l, 'd', d, 'winRate', round(w::numeric / nullif(w + l, 0), 3))), '{}') from aggx),
    'arbiter', (select jsonb_build_object(
                  'decided', count(*) filter (where arbiter is not null),
                  'void', count(*) filter (where arbiter ->> 'result' = 'void'),
                  'byFault', (select coalesce(jsonb_object_agg(f, n), '{}') from (select arbiter ->> 'fault' f, count(*) n from m where arbiter ->> 'fault' is not null group by 1) q))
                from m),
    'disputesOpen', (select count(*) from m where status = 'disputed'),
    'avgMinutes', (select round(avg(minutes)::numeric, 1) from fin),
    'avgActions', (select round(avg(next_seq)) from fin)
  );
$function$;

-- ---------------------------------------------------------------------------
-- 4. Lo que usa la Edge Function `pvp-bot` (solo con la clave de servicio)
-- ---------------------------------------------------------------------------

/**
 * El bot llama a las funciones de siempre como si fuera un jugador: mismas reglas, mismas comprobaciones.
 * p_fn: match {match, from} · act {match, seq, order, hash, next} · ack {match, seq, hash}
 *       timeout {match, seq, hash, next} · report {match, winner, reason, hash} · dispute {match, reason, seq}
 */
create or replace function public.pvp_bot_call(p_bot uuid, p_fn text, p_args jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a jsonb := coalesce(p_args, '{}'::jsonb);
begin
  if not public._pvp_is_bot(p_bot) then return public._pvp_err('not_a_bot'); end if;
  perform set_config('request.jwt.claim.sub', p_bot::text, true); -- auth.uid() = el bot, solo en esta transacción
  case p_fn
    when 'match' then
      return public.pvp_match((a ->> 'match')::uuid, coalesce((a ->> 'from')::int, 0));
    when 'act' then
      return public.pvp_act((a ->> 'match')::uuid, (a ->> 'seq')::int, a -> 'order', a ->> 'hash', a ->> 'next');
    when 'ack' then
      return public.pvp_ack((a ->> 'match')::uuid, (a ->> 'seq')::int, a ->> 'hash');
    when 'timeout' then
      return public.pvp_timeout((a ->> 'match')::uuid, (a ->> 'seq')::int, a ->> 'hash', a ->> 'next');
    when 'report' then
      return public.pvp_report((a ->> 'match')::uuid, a ->> 'winner', a ->> 'reason', a ->> 'hash');
    when 'dispute' then
      return public.pvp_dispute((a ->> 'match')::uuid, a ->> 'reason', (a ->> 'seq')::int);
    else
      return public._pvp_err('bad_fn');
  end case;
end;
$$;

/** Partidas en las que un bot tiene algo que hacer (jugar, confirmar huellas, reclamar tiempo, informar del final). */
create or replace function public.pvp_bot_pending(p_limit integer default 10)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('match', z.id, 'bot', z.bot, 'side', z.side, 'level', z.level, 'points', z.points)
                            order by z.last_action_at), '[]'::jsonb)
    from (
      select m.id, m.last_action_at, sb.side, b.user_id as bot, b.level,
             coalesce(r.points, b.base_points) as points
        from public.pvp_matches m
        cross join lateral (values ('A', m.a_user), ('B', m.b_user)) sb(side, uid)
        join public.pvp_bots b on b.user_id = sb.uid
        left join public.pvp_ratings r on r.season = m.season and r.user_id = b.user_id
       where (m.status = 'active' or (m.status = 'ended' and not (m.reports ? sb.side)))
         and not exists (select 1 from public.pvp_bot_locks l where l.match_id = m.id and l.until > now())
       order by m.last_action_at
       limit greatest(1, least(coalesce(p_limit, 10), 50))
    ) z
$$;

/** Reserva una partida para un turno de la Edge Function (true si nadie más la está jugando). */
create or replace function public.pvp_bot_claim(p_match uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.pvp_bot_locks (match_id, until)
  values (p_match, now() + make_interval(secs => (public.pvp_settings() ->> 'bot_lock_secs')::int))
  on conflict (match_id) do update set until = excluded.until where public.pvp_bot_locks.until <= now();
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

create or replace function public.pvp_bot_release(p_match uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.pvp_bot_locks where match_id = p_match
$$;

revoke all on function public.pvp_bot_call(uuid, text, jsonb), public.pvp_bot_pending(integer),
  public.pvp_bot_claim(uuid), public.pvp_bot_release(uuid),
  public._pvp_pick_bot(text, uuid, integer), public._pvp_bot_rating(text, uuid)
  from public, anon, authenticated;
grant execute on function public.pvp_bot_call(uuid, text, jsonb), public.pvp_bot_pending(integer),
  public.pvp_bot_claim(uuid), public.pvp_bot_release(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Avisos a la Edge Function (pg_net) y tarea de cada minuto (pg_cron)
-- ---------------------------------------------------------------------------

/** Despierta a la Edge Function (con una partida concreta o, sin ella, para que mire todas las pendientes). */
create or replace function public.pvp_bot_ping(p_match uuid default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare c public.pvp_bot_config%rowtype;
begin
  select * into c from public.pvp_bot_config where id;
  if not found or to_regnamespace('net') is null then return false; end if;
  execute 'select net.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 5000)'
    using c.url, jsonb_build_object('Content-Type', 'application/json', 'x-bot-key', c.key),
          case when p_match is null then '{}'::jsonb else jsonb_build_object('match', p_match) end;
  return true;
exception when others then
  raise warning 'pvp_bot_ping: %', sqlerrm;
  return false;
end;
$$;

/** Cada minuto: partidas de bots sin movimiento desde hace bot_stuck_secs s (aviso perdido, función caída…). */
create or replace function public.pvp_bot_tick()
returns integer language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.pvp_matches m
   where m.status in ('active', 'ended')
     and (public._pvp_is_bot(m.a_user) or public._pvp_is_bot(m.b_user))
     and m.last_action_at < now() - make_interval(secs => (public.pvp_settings() ->> 'bot_stuck_secs')::int);
  if n > 0 then perform public.pvp_bot_ping(null); end if;
  return n;
end;
$$;

-- Partida nueva con bot, o el rival informa del final: aviso
create or replace function public._pvp_bot_on_match()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not (public._pvp_is_bot(new.a_user) or public._pvp_is_bot(new.b_user)) then return null; end if;
  if tg_op = 'INSERT' or (new.status = 'ended' and old.status is distinct from 'ended') then
    perform public.pvp_bot_ping(new.id);
  end if;
  return null;
end;
$$;

-- El rival (o el servidor, por tiempo) termina un turno: aviso. Las órdenes del propio bot no avisan.
create or replace function public._pvp_bot_on_action()
returns trigger language plpgsql security definer set search_path = public as $$
declare m public.pvp_matches%rowtype; bot_side text;
begin
  if (new.ord ->> 't') not in ('end', 'timeout') then return null; end if;
  select * into m from public.pvp_matches where id = new.match_id;
  bot_side := case when public._pvp_is_bot(m.a_user) then 'A' when public._pvp_is_bot(m.b_user) then 'B' end;
  if bot_side is null or new.side = bot_side then return null; end if;
  perform public.pvp_bot_ping(new.match_id);
  return null;
end;
$$;

drop trigger if exists pvp_matches_bot on public.pvp_matches;
create trigger pvp_matches_bot after insert or update of status on public.pvp_matches
  for each row execute function public._pvp_bot_on_match();
drop trigger if exists pvp_actions_bot on public.pvp_actions;
create trigger pvp_actions_bot after insert on public.pvp_actions
  for each row execute function public._pvp_bot_on_action();

do $$
begin
  if to_regnamespace('cron') is not null then
    perform cron.unschedule(jobid) from cron.job where jobname = 'lunakai_pvp_bots';
    perform cron.schedule('lunakai_pvp_bots', '* * * * *', 'select public.pvp_bot_tick()');
  else
    raise notice 'pg_cron no está: la tarea lunakai_pvp_bots no se programa (los avisos de pg_net siguen funcionando)';
  end if;
end;
$$;
