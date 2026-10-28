-- Lunakai · Mercado: objetos que se pueden anunciar y su rango de precio (GENERADO por tools/gen_catalog.mjs; no editar a mano)
-- Hito 77. Vuelve a generarlo si cambian los precios de la tienda o los objetos.
truncate public.market_item_rules;
insert into public.market_item_rules (item_id, kind, min_price, max_price) values
  ('mat_copper', 'mat', 3, 18),
  ('mat_slime_goo', 'mat', 3, 18),
  ('mat_chimera_tail', 'mat', 3, 18),
  ('mat_wood', 'mat', 7, 42),
  ('mat_wolf_tooth', 'mat', 7, 42),
  ('mat_wool', 'mat', 7, 42),
  ('mat_moon_flower', 'mat', 15, 90),
  ('mat_druid_branch', 'mat', 15, 90),
  ('mat_druid_staff', 'mat', 15, 90),
  ('mat_druid_flower', 'mat', 15, 90),
  ('mat_frost_crystal', 'mat', 32, 195),
  ('mat_astral_dust', 'mat', 32, 195),
  ('mat_amber_atia', 'mat', 32, 195),
  ('mat_lunar_shard', 'mat', 125, 750),
  ('potion_health_small', 'inv', 7, 75),
  ('dew_flask', 'inv', 16, 165),
  ('potion_health_large', 'inv', 27, 270),
  ('food_berry', 'inv', 3, 36),
  ('food_rice_cake', 'inv', 9, 90),
  ('food_feast', 'inv', 22, 225),
  ('food_fruit', 'inv', 3, 30),
  ('food_fish', 'inv', 4, 45),
  ('food_koi', 'inv', 36, 360);
