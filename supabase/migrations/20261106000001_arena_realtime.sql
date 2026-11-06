-- Lunakai · Arena PvP, fase P2: avisos en tiempo real (Supabase Realtime) y tope de turnos perdidos.
-- Plan: axie-tactics-web/docs/PLAN_ARENA_PVP.md (sección 13). Ejecutar después de 20261106000000_arena_pvp.sql.
--
-- Canales privados (Realtime «broadcast» autorizado por RLS sobre realtime.messages):
--   · pvp_user:<uid>   el jugador recibe «matched» cuando la cola le encuentra rival.
--   · pvp:<partida>    los dos jugadores reciben cada orden guardada («action») y los cambios de estado («status»);
--                      también es el canal de presencia (¿está conectado el rival?).
-- Los avisos los mandan disparadores con realtime.send(), así que las funciones de la fase P1 no cambian: una orden
-- solo se avisa si quedó guardada. Si Realtime no existe (PostgreSQL local), los avisos no hacen nada y el cliente
-- se entera preguntando (pvp_enqueue / pvp_match), que sigue siendo la fuente de verdad.
--
-- Tope de turnos perdidos: 3 fines de turno forzados seguidos del mismo bando (≈ 2,5 min sin jugar) = derrota por
-- abandono. Así se cumple «60 s para volver» sin fiarse de la presencia (que la cuenta el cliente): el rival desconectado
-- pierde sus turnos por tiempo y, al tercero, la partida.
--
-- Primer turno con plazo: el servidor no sabe qué bando empieza (lo decide el motor por iniciativa), así que la partida
-- nace con plazo (turno + 10 s de presentación). Si quien empieza no juega, el rival pide el fin forzado como siempre.

-- ---------------------------------------------------------------------------
-- 1. Avisos
-- ---------------------------------------------------------------------------

/** Manda un aviso por Realtime si existe (Supabase); en otro caso no hace nada. Nunca rompe la transacción. */
create or replace function public._pvp_notify(p_topic text, p_event text, p_payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is null then return; end if;
  begin
    execute 'select realtime.send($1, $2, $3, true)' using p_payload, p_event, p_topic;
  exception when others then
    raise warning '[pvp] aviso % % no enviado: %', p_topic, p_event, sqlerrm;
  end;
end;
$$;

create or replace function public._pvp_on_action()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._pvp_notify('pvp:' || new.match_id, 'action',
    jsonb_build_object('seq', new.seq, 'side', new.side, 'ord', new.ord, 'hash', new.hash, 'at', new.at));
  return null;
end;
$$;

create or replace function public._pvp_on_match()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public._pvp_notify('pvp_user:' || new.a_user, 'matched', jsonb_build_object('match', new.id, 'side', 'A'));
    perform public._pvp_notify('pvp_user:' || new.b_user, 'matched', jsonb_build_object('match', new.id, 'side', 'B'));
  elsif new.status is distinct from old.status then
    perform public._pvp_notify('pvp:' || new.id, 'status', jsonb_build_object(
      'status', new.status, 'winner', new.winner, 'reason', new.reason, 'deltas', new.deltas, 'slp', new.slp, 'rated', new.rated));
  end if;
  return null;
end;
$$;

drop trigger if exists pvp_actions_notify on public.pvp_actions;
create trigger pvp_actions_notify after insert on public.pvp_actions for each row execute function public._pvp_on_action();
drop trigger if exists pvp_matches_notify on public.pvp_matches;
create trigger pvp_matches_notify after insert or update of status on public.pvp_matches for each row execute function public._pvp_on_match();

-- ---------------------------------------------------------------------------
-- 2. Quién puede escuchar y estar presente en cada canal
-- ---------------------------------------------------------------------------

/** ¿Puede el jugador con sesión usar este tema? (su canal personal o el de una partida suya) */
create or replace function public.pvp_can_listen(p_topic text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null or p_topic is null then return false; end if;
  if p_topic = 'pvp_user:' || v_uid then return true; end if;
  if p_topic like 'pvp:%' then
    begin v_id := substr(p_topic, 5)::uuid; exception when others then return false; end;
    return exists (select 1 from public.pvp_matches m where m.id = v_id and (m.a_user = v_uid or m.b_user = v_uid));
  end if;
  return false;
end;
$$;
revoke all on function public.pvp_can_listen(text) from public, anon;
grant execute on function public.pvp_can_listen(text) to authenticated;
revoke all on function public._pvp_notify(text, text, jsonb) from public, anon, authenticated;

-- Políticas de Realtime (solo existen en Supabase)
do $$
begin
  if to_regclass('realtime.messages') is null then
    raise notice 'Sin realtime.messages (no es Supabase): se omiten las políticas de Realtime';
    return;
  end if;
  execute 'drop policy if exists "lunakai pvp listen" on realtime.messages';
  execute 'drop policy if exists "lunakai pvp presence" on realtime.messages';
  -- Recibir avisos y presencia: solo en sus canales
  execute $p$create policy "lunakai pvp listen" on realtime.messages for select to authenticated
    using (public.pvp_can_listen((select realtime.topic())))$p$;
  -- Mandar: solo presencia en el canal de su partida (las órdenes van por pvp_act, nunca por el canal)
  execute $p$create policy "lunakai pvp presence" on realtime.messages for insert to authenticated
    with check (realtime.messages.extension = 'presence' and (select realtime.topic()) like 'pvp:%'
                and public.pvp_can_listen((select realtime.topic())))$p$;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Turnos perdidos seguidos
-- ---------------------------------------------------------------------------
alter table public.pvp_matches add column if not exists timeouts jsonb not null default '{}'::jsonb;

create or replace function public.pvp_settings_realtime()
returns jsonb language sql immutable as $$ select jsonb_build_object('max_timeouts', 3, 'first_turn_extra_secs', 10) $$;

/** Una orden propia pone a cero los turnos perdidos de su bando. */
create or replace function public._pvp_on_own_action()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.side in ('A', 'B') then
    update public.pvp_matches set timeouts = timeouts - new.side where id = new.match_id and timeouts ? new.side;
  elsif new.side = 'S' and new.ord ->> 't' = 'timeout' and (new.ord ->> 'side') in ('A', 'B') then
    update public.pvp_matches
       set timeouts = jsonb_set(timeouts, array[new.ord ->> 'side'], to_jsonb(coalesce((timeouts ->> (new.ord ->> 'side'))::int, 0) + 1))
     where id = new.match_id;
  end if;
  return null;
end;
$$;
drop trigger if exists pvp_actions_timeouts on public.pvp_actions;
create trigger pvp_actions_timeouts after insert on public.pvp_actions for each row execute function public._pvp_on_own_action();

/**
 * pvp_timeout (fase P1) con el tope: al tercer fin de turno forzado seguido del mismo bando, ese bando pierde
 * por abandono. Misma firma y mismas respuestas; añade { abandoned: true, match } cuando se cierra la partida.
 */
create or replace function public.pvp_timeout(p_match uuid, p_seq integer, p_hash text, p_next text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st jsonb := public.pvp_settings();
  v_uid uuid := public._pvp_uid();
  m public.pvp_matches%rowtype; side text; lost text; n int;
begin
  select * into m from public.pvp_matches where id = p_match for update;
  if not found then return public._pvp_err('unknown_match'); end if;
  side := public._pvp_side(m, v_uid);
  if side is null then return public._pvp_err('not_in_match'); end if;
  if m.status <> 'active' then return public._pvp_err('match_closed', jsonb_build_object('status', m.status)); end if;
  if m.turn_side = side then return public._pvp_err('not_their_turn'); end if;
  if m.turn_deadline is null or now() <= m.turn_deadline + make_interval(secs => (st ->> 'turn_grace_secs')::int) then
    return public._pvp_err('not_yet', jsonb_build_object('turnDeadline', m.turn_deadline));
  end if;
  if p_seq is distinct from m.next_seq then return public._pvp_err('bad_seq', jsonb_build_object('nextSeq', m.next_seq)); end if;
  if p_hash is null or p_hash !~ '^[0-9a-f]{8}$' or p_next not in ('A', 'B') then return public._pvp_err('bad_end'); end if;
  lost := coalesce(m.turn_side, case side when 'A' then 'B' else 'A' end); -- nadie había jugado: pierde el turno el rival de quien lo pide
  insert into public.pvp_actions (match_id, seq, side, ord, hash)
  values (m.id, m.next_seq, 'S', jsonb_build_object('t', 'timeout', 'side', lost), p_hash);
  update public.pvp_matches set next_seq = next_seq + 1, last_action_at = now(), turn_side = p_next,
    turn_deadline = now() + make_interval(secs => (st ->> 'turn_secs')::int)
   where id = m.id returning * into m;
  n := coalesce((m.timeouts ->> lost)::int, 0);
  if n >= (public.pvp_settings_realtime() ->> 'max_timeouts')::int then
    perform public._pvp_resolve(m.id, case lost when 'A' then 'B' else 'A' end, 'abandon');
    select * into m from public.pvp_matches where id = p_match;
    return jsonb_build_object('ok', true, 'abandoned', true, 'match', public._pvp_match_out(m, side));
  end if;
  return jsonb_build_object('ok', true, 'nextSeq', m.next_seq, 'turnSide', m.turn_side, 'turnDeadline', m.turn_deadline, 'timeouts', n);
end;
$$;
revoke all on function public.pvp_timeout(uuid, integer, text, text) from public, anon;
grant execute on function public.pvp_timeout(uuid, integer, text, text) to authenticated;
revoke all on function public.pvp_settings_realtime() from public;
grant execute on function public.pvp_settings_realtime() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. La vista de la partida lleva también la duración del turno y el margen (el cliente calcula el plazo de cada
--    turno con ellos al recibir un fin de turno por Realtime)
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
    'createdAt', m.created_at, 'endedAt', m.ended_at, 'now', now())
$$;
revoke all on function public._pvp_match_out(public.pvp_matches, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Primer turno con plazo
-- ---------------------------------------------------------------------------
create or replace function public._pvp_first_deadline()
returns trigger language plpgsql as $$
begin
  if new.turn_deadline is null then
    new.turn_deadline := now() + make_interval(secs => (public.pvp_settings() ->> 'turn_secs')::int
                                                     + (public.pvp_settings_realtime() ->> 'first_turn_extra_secs')::int);
  end if;
  return new;
end;
$$;
drop trigger if exists pvp_matches_first_deadline on public.pvp_matches;
create trigger pvp_matches_first_deadline before insert on public.pvp_matches for each row execute function public._pvp_first_deadline();

/**
 * (Fase P2: el primer turno conserva el plazo con que nació la partida.) Una orden del jugador. p_seq = la siguiente (evita duplicados y desorden). p_order: { t, unit, x, z, spell }.
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
    turn_deadline = case when t = 'end' then now() + make_interval(secs => (st ->> 'turn_secs')::int)
                         else coalesce(turn_deadline, now() + make_interval(secs => (st ->> 'turn_secs')::int)) end
   where id = m.id
  returning * into m;
  return jsonb_build_object('ok', true, 'seq', m.next_seq - 1, 'nextSeq', m.next_seq, 'turnSide', m.turn_side, 'turnDeadline', m.turn_deadline);
end;
$$;

revoke all on function public.pvp_act(uuid, integer, jsonb, text, text) from public, anon;
grant execute on function public.pvp_act(uuid, integer, jsonb, text, text) to authenticated;
