-- rollback.sql — Deshace las migraciones 20261114000000_arena_bots_ready.sql y 20261113000000_arena_bots.sql (rivales bot
-- de la Arena). También sirve si solo se aplicó la primera de las dos.
-- Vuelve a poner pvp_settings, pvp_enqueue, _pvp_match_out y pvp_stats como estaban y borra tablas, funciones,
-- disparadores y la tarea de los bots. Las cuentas de bot (auth.users, save_slots) y sus partidas jugadas NO se
-- borran (sus filas de puntos siguen en la clasificación): para quitarlas, ver el final de este archivo.
begin;
drop trigger if exists pvp_matches_bot on public.pvp_matches;
drop trigger if exists pvp_actions_bot on public.pvp_actions;
do $$ begin if to_regnamespace('cron') is not null then perform cron.unschedule(jobid) from cron.job where jobname = 'lunakai_pvp_bots'; end if; end $$;

-- pvp_match (versión anterior: 20261106000000_arena_pvp.sql) y la tabla de 20261114000000_arena_bots_ready.sql
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
drop table if exists public.pvp_bot_ready;

-- pvp_settings (versión anterior)
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
    'sapidae_classes', jsonb_build_array('crafter', 'shepard', 'lunalogist', 'stargazer')
  );
$function$;

-- pvp_enqueue (versión anterior)
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
$function$;

-- _pvp_match_out (versión anterior)
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
    'createdAt', m.created_at, 'endedAt', m.ended_at, 'now', now())
$function$;

-- pvp_stats (versión anterior)
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

drop function if exists public._pvp_bot_on_match();
drop function if exists public._pvp_bot_on_action();
drop function if exists public.pvp_bot_tick();
drop function if exists public.pvp_bot_ping(uuid);
drop function if exists public.pvp_bot_release(uuid);
drop function if exists public.pvp_bot_claim(uuid);
drop function if exists public.pvp_bot_pending(integer);
drop function if exists public.pvp_bot_call(uuid, text, jsonb);
drop function if exists public._pvp_pick_bot(text, uuid, integer);
drop function if exists public._pvp_bot_rating(text, uuid);
drop function if exists public._pvp_bot_online(public.pvp_bots, timestamptz);
drop function if exists public._pvp_is_bot(uuid);
drop table if exists public.pvp_bot_config;
drop table if exists public.pvp_bot_locks;
drop table if exists public.pvp_bots;
commit;

-- Opcional: borrar también las cuentas de bot y todo lo suyo (partidas, puntos, cartera). Los ids salen de bots.sql:
-- delete from auth.users where id::text like '00000000-b07b-4000-8000-%';
