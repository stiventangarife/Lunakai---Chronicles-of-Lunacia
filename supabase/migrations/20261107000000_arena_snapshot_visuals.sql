-- 20261107000000_arena_snapshot_visuals.sql — Arena PvP, fase P3: el aspecto de los dos equipos.
-- Plan: docs/PLAN_ARENA_PVP.md, sección 14.
--
-- La instantánea que se guarda al entrar en la cola (_pvp_snapshot) lleva ahora también lo que hace falta para DIBUJAR
-- al rival: la personalización del Sapidae (pelo, ojos, ropa, cuernos…) y los genes del Axie principal (su modelo).
-- Nada de esto cuenta en las reglas: los equipos siguen igualados (nivel 10, sin equipo ni runas; tactics/sim/PvpRoster.js).
-- Se limpia aquí (solo valores simples y cortos) y otra vez en el cliente.
--
-- Depende de 20261106000000_arena_pvp.sql. Se puede aplicar con partidas en curso: solo cambia las instantáneas nuevas.

create or replace function public._pvp_clean_custom(c jsonb)
returns jsonb language sql immutable as $$
  select coalesce((
    select jsonb_object_agg(e.key, e.value)
      from (select key, value from jsonb_each(c) limit 40) e
     where e.key ~ '^[A-Za-z][A-Za-z0-9_]{0,31}$'
       and (jsonb_typeof(e.value) in ('boolean', 'number')
            or (jsonb_typeof(e.value) = 'string' and length(e.value #>> '{}') <= 32))
  ), '{}'::jsonb)
  where jsonb_typeof(c) = 'object'
$$;
revoke all on function public._pvp_clean_custom(jsonb) from public, anon, authenticated;

create or replace function public._pvp_snapshot(p_uid uuid, p_slot smallint)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  d jsonb; main jsonb; axie_id text; pc jsonb; cards jsonb; cls text; i int; v_genes text; v_model text;
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

  -- Genes del Axie principal: los de los Axies de la cuenta o, si es el de la partida, los de `hero`
  select a ->> 'genes' into v_genes
    from jsonb_array_elements(case when jsonb_typeof(d -> 'accountAxies') = 'array' then d -> 'accountAxies' else '[]'::jsonb end) a
   where a ->> 'axieId' = axie_id
   limit 1;
  if v_genes is null and d #>> '{hero,axieId}' = axie_id then v_genes := d #>> '{hero,genes}'; end if;
  if v_genes is not null and (v_genes !~ '^0x[0-9a-fA-F]+$' or length(v_genes) > 600) then v_genes := null; end if;
  v_model := d ->> 'sapidaeModel';
  if v_model is not null and v_model !~ '^[a-z0-9\-]{1,40}$' then v_model := null; end if;

  return jsonb_build_object(
    'ok', true,
    'name', left(coalesce(d ->> 'playerName', 'Lunacian'), 32),
    'sapidaeClass', cls,
    'sapidaeModel', v_model,
    'customization', public._pvp_clean_custom(d -> 'customization'),
    'axie', jsonb_build_object(
      'axieId', axie_id,
      'name', left(coalesce(main ->> 'name', d #>> '{hero,name}', 'Axie'), 48),
      'class', coalesce(main ->> 'class', d #>> '{hero,class}', 'Beast'),
      'genes', v_genes,
      'cards', cards,
      'variants', coalesce(pc -> 'variants', '[]'::jsonb),
      'collections', coalesce(pc -> 'collections', '[]'::jsonb)));
end;
$$;
revoke all on function public._pvp_snapshot(uuid, smallint) from public, anon, authenticated;
