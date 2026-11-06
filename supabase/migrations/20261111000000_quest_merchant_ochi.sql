-- Lunakai · Hito 124 · Misión «El mercader del Dojō» (Ochi): recompensas que paga el servidor.
-- Solo añade estas dos filas al catálogo (no lo regenera entero). tools/gen_catalog.mjs ya las incluye si se vuelve a generar.
--  · reward:tut:ochi_purse              → monedero de aprendiz: meta = 1 = «completa hasta 60 de oro» (una vez por ranura)
--  · reward:quest:quest_merchant_ochi   → 80 de oro al entregar la misión (las pociones las da el cliente, como el resto de objetos)
insert into public.economy_catalog (key, gold, slp, baxs, meta) values
  ('reward:tut:ochi_purse', 60, 0, 0, 1),
  ('reward:quest:quest_merchant_ochi', 80, 0, 0, null)
on conflict (key) do update set gold = excluded.gold, slp = excluded.slp, baxs = excluded.baxs, meta = excluded.meta;
