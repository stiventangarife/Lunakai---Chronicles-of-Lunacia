-- Jugadores de prueba de two-players.cjs (00000000-0000-0000-0000-0000000001NN) con partida guardada y cartas.
update public.pvp_matches set status = 'aborted' where status in ('active', 'ended', 'disputed');
delete from public.pvp_queue;
insert into auth.users select ('00000000-0000-0000-0000-0000000001' || lpad(i::text, 2, '0'))::uuid, 'a' || i || '@x.invalid', '{}' from generate_series(1, 20) i on conflict do nothing;
insert into public.save_slots (user_id, slot_id, data) select ('00000000-0000-0000-0000-0000000001' || lpad(i::text, 2, '0'))::uuid, 1,
  jsonb_build_object('playerName', 'Arena' || i, 'sapidaeClass', (array['crafter', 'shepard', 'lunalogist', 'stargazer'])[1 + i % 4],
    'mainAxie', jsonb_build_object('axieId', (700 + i)::text, 'name', 'Ax' || i, 'class', (array['Beast', 'Plant', 'Aquatic', 'Bird', 'Bug', 'Reptile'])[1 + i % 6]),
    'partCards', jsonb_build_object((700 + i)::text, jsonb_build_object('ids', jsonb_build_array('p_a', 'p_b', 'p_c', 'p_d', 'p_e', 'p_f'))))
  from generate_series(1, 20) i
on conflict (user_id, slot_id) do update set data = excluded.data;
