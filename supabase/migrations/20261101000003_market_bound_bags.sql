-- Lunakai · Hito 110 (2.ª parte) · Regalo del tutorial no comerciable, bolsas al Mercado y Ochi sin equipo T1–3.
-- Ejecutar después de 20261101000002_market_rules.sql, y luego (generados con tools/gen_catalog.mjs):
--   20261101000004_economy_catalog.sql  (Ochi ya no compra equipo T1–3 ni bolsas de runa y de charm)
--   20261101000005_market_rules.sql     (las bolsas se anuncian en AXS)
--
-- La runa y el charm que regala el tutorial (TutorialScript.REWARDS: 'neutral-pure-power' y 'neutral-awaken-stamp-m')
-- quedan ligados a la partida: una unidad de cada uno no se puede anunciar. Se reconoce leyendo la partida guardada
-- (tutorialProgress.flags.runes = true, que también pone «Saltar tutorial»), igual que en el juego
-- (RuneCharmService.boundCount). Si cambian esos ids, cambiar los dos sitios.

/** Unidades ligadas a la partida (regalo del tutorial ya recibido). */
create or replace function public._mkt_bound(p_data jsonb, p_bag text, p_id text)
returns integer language sql immutable as $$
  select case
    when (p_data #> '{tutorialProgress,flags,runes}') = 'true'::jsonb
     and ((p_bag = 'runes' and p_id = 'neutral-pure-power') or (p_bag = 'charms' and p_id = 'neutral-awaken-stamp-m'))
    then 1 else 0 end;
$$;

/** Unidades que NO se pueden anunciar:
 *  · runas y charms: las ligadas a la partida y las puestas en un Axie (lo equipado usa primero las copias Ronin y las
 *    ligadas) → max(ligadas, equipadas − Ronin);
 *  · Mochila: piezas apartadas por un trabajo de la Forja. */
create or replace function public._mkt_locked(p_data jsonb, p_item text, p_kind text)
returns integer language plpgsql immutable as $$
declare r record; worn int := 0; ronin int := 0; bound int := 0; forge int := 0;
begin
  if p_kind = 'rc' then
    r := public._mkt_rc(p_item);
    if r.bag = 'runes' then
      select count(*) into worn from jsonb_each(case when jsonb_typeof(p_data -> 'runeCharms') = 'object' then p_data -> 'runeCharms' else '{}'::jsonb end) e
       where e.value ->> 'rune' = r.id;
    else
      select count(*) into worn
        from jsonb_each(case when jsonb_typeof(p_data -> 'runeCharms') = 'object' then p_data -> 'runeCharms' else '{}'::jsonb end) e,
             jsonb_each_text(case when jsonb_typeof(e.value -> 'charms') = 'object' then e.value -> 'charms' else '{}'::jsonb end) c
       where c.value = r.id;
    end if;
    ronin := coalesce((p_data #>> array['roninItems', r.bag, r.id])::int, 0);
    bound := least(public._mkt_bound(p_data, r.bag, r.id), public._mkt_count(p_data, p_item, 'rc'));
    return greatest(0, bound, worn - ronin);
  end if;
  if p_kind = 'inv' then
    select count(*) into forge
      from jsonb_array_elements(case when jsonb_typeof(p_data #> '{forge,jobs}') = 'array' then p_data #> '{forge,jobs}' else '[]'::jsonb end) j
     where j ->> 'from' = p_item and j ->> 'hero' is not null and coalesce((j ->> 'held')::boolean, false) = false
       and coalesce(p_data #>> array['equipped', j ->> 'hero', j ->> 'slot'], '') <> p_item;
    return forge;
  end if;
  return 0;
end;
$$;

do $$
begin
  execute 'revoke all on function public._mkt_bound(jsonb,text,text) from public, anon, authenticated';
end $$;
