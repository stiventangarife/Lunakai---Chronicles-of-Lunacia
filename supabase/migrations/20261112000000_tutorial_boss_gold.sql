-- Lunakai · Hito 136 · Botín del Slime Caballero (combate final del tutorial): 30 de oro que paga el servidor.
-- Solo añade esta fila al catálogo (no lo regenera entero). tools/gen_catalog.mjs ya la incluye si se vuelve a generar.
--  · reward:tut:boss → 30 de oro, una vez por ranura (economy_reward_claims). La Baba de slime la da el cliente, como el resto de materiales.
insert into public.economy_catalog (key, gold, slp, baxs, meta) values
  ('reward:tut:boss', 30, 0, 0, null)
on conflict (key) do update set gold = excluded.gold, slp = excluded.slp, baxs = excluded.baxs, meta = excluded.meta;
