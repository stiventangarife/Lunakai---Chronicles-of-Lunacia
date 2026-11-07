-- 20261114000000_arena_bots_ready.sql — El bot espera a que el jugador tenga el combate en pantalla (Hito 138, R5).
-- Plan: docs/PLAN_BOTS_ARENA.md §14. Requiere 20261113000000_arena_bots.sql. Se puede volver a ejecutar.
--
-- Problema: la partida contra un bot se crea en cuanto el jugador sale de la cola, pero su cliente todavía tiene que
-- enseñar la presentación («VS») y cargar el combate. Si le tocaba al bot, el bot ya había movido para entonces y el
-- jugador lo veía ocurrir bajo la pantalla de carga (o ya hecho).
--
-- Qué hace:
--   · pvp_bot_ready: cuándo el jugador humano de una partida con bot tuvo el combate listo. Lo anota pvp_match la
--     primera vez que la llama el humano (el cliente la llama al montar el combate: PvpBattle.onBattleReady →
--     PvpSession.start → _sync; antes no la llama nadie). Sin cambios en el cliente.
--   · En ese momento, si nadie ha jugado todavía, el turno en curso vuelve a tener su tiempo completo (el que se le
--     fue al jugador cargando, o al bot esperando) y se avisa a la Edge Function para que el bot juegue ya.
--   · pvp_match, cuando la llama el bot: + rivalReadyAt (null = el jugador aún está cargando). El bot no juega ni
--     reclama tiempo hasta entonces (src/tactics/sim/PvpBotRunner.js; con un tope por si el jugador cerró el juego).
--   · Las partidas entre personas no cambian.
--
-- Deshacer: tools/pvp/bots/rollback.sql (vuelve a poner pvp_match de antes y borra pvp_bot_ready).

create table if not exists public.pvp_bot_ready (
  match_id uuid primary key references public.pvp_matches (id) on delete cascade,
  ready_at timestamptz not null default now()
);
alter table public.pvp_bot_ready enable row level security;
revoke all on public.pvp_bot_ready from anon, authenticated;

-- pvp_match: copia de la versión vigente (20261106000000_arena_pvp.sql) + lo marcado «bots»
create or replace function public.pvp_match(p_match uuid, p_from integer default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._pvp_uid();
  m public.pvp_matches%rowtype; side text; acts jsonb;
  rival uuid; v_ready timestamptz; out jsonb; n int;   -- bots
begin
  select * into m from public.pvp_matches where id = p_match;
  if not found then return public._pvp_err('unknown_match'); end if;
  side := public._pvp_side(m, v_uid);
  if side is null then return public._pvp_err('not_in_match'); end if;

  -- bots: el humano tiene el combate listo (primera llamada)
  rival := case side when 'A' then m.b_user else m.a_user end;
  if public._pvp_is_bot(rival) and not public._pvp_is_bot(v_uid) and m.status = 'active' then
    begin
      insert into public.pvp_bot_ready (match_id) values (m.id) on conflict (match_id) do nothing;
      get diagnostics n = row_count;
      if n > 0 then
        if m.next_seq = 0 and m.turn_deadline is not null then
          update public.pvp_matches
             set turn_deadline = greatest(turn_deadline, now() + make_interval(secs => (public.pvp_settings() ->> 'turn_secs')::int))
           where id = m.id and status = 'active' and next_seq = 0
           returning * into m;
          if not found then select * into m from public.pvp_matches where id = p_match; end if;
        end if;
        perform public.pvp_bot_ping(m.id);
      end if;
    exception when others then
      raise warning 'pvp_match (bots, listo): %', sqlerrm; -- nunca impide ver la partida
    end;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('seq', seq, 'side', a.side, 'ord', ord, 'hash', hash, 'at', a.at) order by seq), '[]'::jsonb)
    into acts from public.pvp_actions a where a.match_id = m.id and a.seq >= greatest(0, coalesce(p_from, 0));
  out := public._pvp_match_out(m, side);

  -- bots: el bot sabe si el rival ya tiene el combate en pantalla
  if public._pvp_is_bot(v_uid) then
    select r.ready_at into v_ready from public.pvp_bot_ready r where r.match_id = m.id;
    out := out || jsonb_build_object('rivalReadyAt', v_ready);
  end if;
  return jsonb_build_object('ok', true, 'match', out, 'actions', acts);
end;
$$;
