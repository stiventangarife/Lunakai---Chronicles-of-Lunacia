-- =============================================================================
-- Koliseo, fase B4: entrega de los premios del Desafío de la Bruma en dos pasos.
-- Plan: docs/PLAN_DESAFIO_DE_LA_BRUMA.md (sección 12).
--
-- El bAXS y el oro del top 3 ya se pagan en la cartera al cerrar la semana (_bruma_close_week). Los materiales
-- (Esquirla lunar, Ámbar de Atia) viven en la partida, que guarda el cliente. Con koliseo_claim (B0) el premio se
-- marcaba como cobrado ANTES de que la partida lo guardara: si el juego se cerraba en medio, se perdía.
-- Ahora:
--   1. koliseo_pending(slot)     → premios sin cobrar de la partida (cierra antes las semanas terminadas).
--   2. el cliente suma los materiales y guarda en la partida los ids cobrados (forge.kolClaimed).
--   3. koliseo_ack(slot, ids)    → los marca como cobrados. Si este paso falla, la próxima vez vuelven a salir,
--      pero el cliente ve sus ids en la partida y no los suma otra vez (solo repite el ack).
-- koliseo_claim(smallint) se deja por compatibilidad; el juego ya no lo usa.
-- =============================================================================

create or replace function public.koliseo_pending(p_slot smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._econ_uid(p_slot);
  v_out jsonb;
begin
  -- La semana se cierra sola al abrir la siguiente; aquí también, para no esperar a que alguien abra el Koliseo.
  perform public.bruma_close_due();
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id, 'source', r.source, 'rank', r.rank, 'items', r.items, 'gold', r.gold, 'baxs', r.baxs,
           'week', split_part(r.source, ':', 2), 'biome', w.biome) order by r.id), '[]'::jsonb)
    into v_out
    from public.koliseo_rewards r
    left join public.bruma_weeks w on w.week = split_part(r.source, ':', 2)
   where r.user_id = v_uid and r.slot_id = p_slot and r.claimed_at is null;
  return jsonb_build_object('ok', true, 'rewards', v_out);
end;
$$;

create or replace function public.koliseo_ack(p_slot smallint, p_ids bigint[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public._econ_uid(p_slot);
  n integer;
begin
  if p_ids is null or cardinality(p_ids) = 0 then return jsonb_build_object('ok', true, 'acked', 0); end if;
  if cardinality(p_ids) > 50 then return jsonb_build_object('ok', false, 'error', 'too_many'); end if;
  update public.koliseo_rewards set claimed_at = now()
   where user_id = v_uid and slot_id = p_slot and claimed_at is null and id = any (p_ids);
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'acked', n);
end;
$$;

revoke all on function public.koliseo_pending(smallint) from public, anon;
grant execute on function public.koliseo_pending(smallint) to authenticated;
revoke all on function public.koliseo_ack(smallint, bigint[]) from public, anon;
grant execute on function public.koliseo_ack(smallint, bigint[]) to authenticated;
