-- 20261108000000_arena_arbiter.sql — Arena PvP, fase P4: el árbitro.
-- Plan: docs/PLAN_ARENA_PVP.md, sección 15. Depende de 20261106000000_arena_pvp.sql y 20261106000001_arena_realtime.sql.
--
-- El árbitro es la Edge Function `pvp-arbiter`: repite las órdenes guardadas en el motor sin gráficos del juego y
-- decide. Aquí, lo que necesita del servidor:
--   · pvp_arbiter_pending(límite)    partidas que esperan árbitro (en disputa, o terminadas con un solo informe), con
--                                    sus órdenes; solo la clave de servicio.
--   · pvp_arbiter_verdict(id, …)     aplica el veredicto: ganador por _pvp_resolve (puntos y SLP) o partida anulada.
--   · pvp_matches.arbiter            el veredicto completo (culpable, falta, orden, repetición, huella del motor).
--   · pvp_cleanup                    ya no da por bueno al momento un informe solitario: lo decide el árbitro; solo si
--                                    el árbitro no está (o falla) se cierra como antes pasado arbiter_fallback_secs, y
--                                    una disputa que nadie resuelve se anula pasado dispute_void_secs.
--   · Avisos al árbitro (opcional): con pg_net y una fila en pvp_arbiter_config (URL de la función y la clave
--     compartida, que se pone a mano en el SQL Editor y nunca en el código), una disputa nueva lo llama en el acto y
--     pg_cron lo llama cada minuto. Sin esa fila no se llama a nada (y la limpieza hace de respaldo).

-- ---------------------------------------------------------------------------
-- 1. Ajustes y columnas
-- ---------------------------------------------------------------------------
create or replace function public.pvp_settings_arbiter()
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'max_tries', 5,                 -- intentos del árbitro por partida (luego queda para revisión a mano)
    'retry_secs', 60,               -- espera entre intentos
    'arbiter_fallback_secs', 900,   -- sin árbitro: un informe solitario vale pasados 15 min (antes: 2 min)
    'dispute_void_secs', 1800       -- sin árbitro: una disputa se anula pasados 30 min (los jugadores vuelven a la cola)
  );
$$;

alter table public.pvp_matches add column if not exists arbiter jsonb;              -- veredicto del árbitro
alter table public.pvp_matches add column if not exists arbiter_tries integer not null default 0;
alter table public.pvp_matches add column if not exists arbiter_at timestamptz;     -- último intento

-- Configuración del aviso al árbitro (una fila; sin políticas: solo el propietario la ve)
create table if not exists public.pvp_arbiter_config (
  id    boolean primary key default true check (id),
  url   text not null,            -- https://<proyecto>.supabase.co/functions/v1/pvp-arbiter
  key   text not null             -- = secreto PVP_ARBITER_KEY de la función
);
alter table public.pvp_arbiter_config enable row level security;
revoke all on public.pvp_arbiter_config from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Partidas que esperan árbitro
-- ---------------------------------------------------------------------------
create or replace function public.pvp_arbiter_pending(p_limit integer default 5)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.pvp_settings();
  sa jsonb := public.pvp_settings_arbiter();
  ids uuid[]; out jsonb;
begin
  select coalesce(array_agg(id), '{}') into ids from (
    select id from public.pvp_matches
     where (status = 'disputed'
            or (status = 'ended' and ended_at < now() - make_interval(secs => (st ->> 'report_wait_secs')::int)))
       and arbiter_tries < (sa ->> 'max_tries')::int
       and (arbiter_at is null or arbiter_at < now() - make_interval(secs => (sa ->> 'retry_secs')::int))
     order by ended_at nulls first
     limit greatest(1, least(coalesce(p_limit, 5), 20))
     for update skip locked) x;
  update public.pvp_matches set arbiter_tries = arbiter_tries + 1, arbiter_at = now() where id = any(ids);
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'status', m.status, 'seed', m.seed, 'map', m.map_id, 'tieBreak', m.tie_break,
      'maxRounds', (st ->> 'max_rounds')::int,
      'A', m.a_snapshot - 'ok', 'B', m.b_snapshot - 'ok',
      'reports', m.reports, 'dispute', m.dispute, 'nextSeq', m.next_seq,
      'actions', (select coalesce(jsonb_agg(jsonb_build_object('seq', a.seq, 'side', a.side, 'ord', a.ord, 'hash', a.hash, 'ackHash', a.ack_hash) order by a.seq), '[]'::jsonb)
                    from public.pvp_actions a where a.match_id = m.id)
    ) order by m.ended_at), '[]'::jsonb)
    into out
    from public.pvp_matches m where m.id = any(ids);
  return jsonb_build_object('ok', true, 'matches', out, 'now', now());
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Veredicto
-- ---------------------------------------------------------------------------
/**
 * p_verdict (PvpArbiter.arbitrate): { v, result 'win'|'draw'|'void', winner 'A'|'B'|null,
 *   reason 'elimination'|'rounds'|'arbiter'|'void', culprit, fault, seq, detail, replay, engine }.
 * p_actions = número de órdenes que repitió el árbitro: si la partida tiene otras, no se aplica (se vuelve a pedir).
 */
create or replace function public.pvp_arbiter_verdict(p_match uuid, p_verdict jsonb, p_actions integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m public.pvp_matches%rowtype;
  res text := p_verdict ->> 'result';
  win text := nullif(p_verdict ->> 'winner', '');
  why text := p_verdict ->> 'reason';
  rec jsonb := p_verdict || jsonb_build_object('at', now());
begin
  select * into m from public.pvp_matches where id = p_match for update;
  if not found then return public._pvp_err('unknown_match'); end if;
  if m.status not in ('disputed', 'ended') then
    return jsonb_build_object('ok', true, 'already', true, 'status', m.status);
  end if;
  if p_actions is distinct from m.next_seq then return public._pvp_err('stale', jsonb_build_object('nextSeq', m.next_seq)); end if;
  if res not in ('win', 'draw', 'void')
     or (res = 'win' and (win is null or win not in ('A', 'B') or why not in ('elimination', 'rounds', 'arbiter')))
     or (res = 'draw' and (win is not null or why not in ('elimination', 'rounds')))
     or length(p_verdict::text) > 8000 then
    return public._pvp_err('bad_verdict');
  end if;
  if res = 'void' then
    update public.pvp_matches set status = 'aborted', reason = 'void', ended_at = coalesce(ended_at, now()),
      turn_side = null, turn_deadline = null, arbiter = rec
     where id = m.id;
  else
    perform public._pvp_resolve(m.id, win, why);
    update public.pvp_matches set arbiter = rec where id = m.id;
  end if;
  select * into m from public.pvp_matches where id = p_match;
  return jsonb_build_object('ok', true, 'status', m.status, 'winner', m.winner, 'reason', m.reason, 'deltas', m.deltas, 'slp', m.slp);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. La vista de la partida dice qué decidió el árbitro (culpable y falta, sin el detalle)
-- ---------------------------------------------------------------------------
create or replace function public._pvp_match_out(m public.pvp_matches, p_side text)
returns jsonb language sql stable as $$
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
$$;
revoke all on function public._pvp_match_out(public.pvp_matches, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Limpieza: el árbitro decide; esto solo es el respaldo si no está
-- ---------------------------------------------------------------------------
create or replace function public.pvp_cleanup()
returns integer language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.pvp_settings();
  sa jsonb := public.pvp_settings_arbiter();
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
  -- Un solo informe y nadie lo ha arbitrado a tiempo: vale el que hay (como en la fase P1)
  for m in select * from public.pvp_matches
            where status = 'ended' and ended_at < now() - make_interval(secs => (sa ->> 'arbiter_fallback_secs')::int)
            for update skip locked loop
    side := (select k from jsonb_object_keys(m.reports) k limit 1);
    rep := m.reports -> side;
    perform public._pvp_resolve(m.id, nullif(rep ->> 'winner', ''), coalesce(rep ->> 'reason', 'report'));
    n := n + 1;
  end loop;
  -- Disputa sin resolver: se anula (sin puntos) para que los dos puedan volver a la cola
  for m in select * from public.pvp_matches
            where status = 'disputed' and ended_at < now() - make_interval(secs => (sa ->> 'dispute_void_secs')::int)
            for update skip locked loop
    update public.pvp_matches set status = 'aborted', reason = 'void', turn_side = null, turn_deadline = null,
      arbiter = coalesce(arbiter, '{}'::jsonb) || jsonb_build_object('result', 'void', 'fault', 'timeout', 'at', now())
     where id = m.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Aviso al árbitro (pg_net) y tarea programada (pg_cron); sin ellos, nada
-- ---------------------------------------------------------------------------
create or replace function public.pvp_arbiter_ping()
returns boolean language plpgsql security definer set search_path = public as $$
declare c public.pvp_arbiter_config%rowtype;
begin
  select * into c from public.pvp_arbiter_config where id;
  if not found or to_regnamespace('net') is null then return false; end if;
  execute 'select net.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 5000)'
    using c.url, jsonb_build_object('Content-Type', 'application/json', 'x-arbiter-key', c.key), '{}'::jsonb;
  return true;
exception when others then
  raise warning 'pvp_arbiter_ping: %', sqlerrm;
  return false;
end;
$$;

create or replace function public._pvp_on_dispute()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'disputed' and old.status is distinct from 'disputed' then perform public.pvp_arbiter_ping(); end if;
  return new;
end;
$$;
drop trigger if exists pvp_matches_dispute on public.pvp_matches;
create trigger pvp_matches_dispute after update of status on public.pvp_matches
  for each row execute function public._pvp_on_dispute();

do $$
begin
  begin
    create extension if not exists pg_net;
  exception when others then
    raise notice 'pg_net no disponible: el árbitro se llama a mano o desde el panel (Integrations → Cron)';
  end;
  if to_regnamespace('cron') is not null then
    begin
      perform cron.unschedule('lunakai_pvp_arbiter');
    exception when others then null;
    end;
    perform cron.schedule('lunakai_pvp_arbiter', '* * * * *', 'select public.pvp_arbiter_ping()');
  end if;
exception when others then
  raise notice 'tarea del árbitro no programada: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Permisos: el árbitro entra con la clave de servicio; nadie más
-- ---------------------------------------------------------------------------
revoke all on function public.pvp_arbiter_pending(integer) from public, anon, authenticated;
revoke all on function public.pvp_arbiter_verdict(uuid, jsonb, integer) from public, anon, authenticated;
grant execute on function public.pvp_arbiter_pending(integer) to service_role;
grant execute on function public.pvp_arbiter_verdict(uuid, jsonb, integer) to service_role;
revoke all on function public.pvp_arbiter_ping() from public, anon, authenticated;
revoke all on function public._pvp_on_dispute() from public, anon, authenticated;
revoke all on function public.pvp_settings_arbiter() from public;
grant execute on function public.pvp_settings_arbiter() to anon, authenticated, service_role;
revoke all on function public.pvp_cleanup() from public, anon, authenticated;
