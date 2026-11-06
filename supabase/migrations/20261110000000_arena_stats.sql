-- 20261110000000_arena_stats.sql — Arena PvP, fase P6: estadísticas de las partidas reales para el equilibrio.
-- Plan: docs/PLAN_ARENA_PVP.md, sección 17. Depende de las migraciones de la Arena (P1–P5).
--
-- pvp_stats(días) resume las partidas terminadas de los últimos N días: bandos, quién empezó, mapas, clases de Sapidae
-- y de Axie, motivos de final, disputas y faltas del árbitro, duración. Solo para el equipo (SQL Editor o clave de
-- servicio): no lo puede llamar ningún jugador. Uso:  select jsonb_pretty(public.pvp_stats(30));
-- Lo mismo con el motor sin gráficos y el jugador automático: node tools/pvp/balance.mjs.

create or replace function public.pvp_stats(p_days integer default 30)
returns jsonb language sql stable security definer set search_path = public as $$
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
$$;
revoke all on function public.pvp_stats(integer) from public, anon, authenticated;
grant execute on function public.pvp_stats(integer) to service_role;
