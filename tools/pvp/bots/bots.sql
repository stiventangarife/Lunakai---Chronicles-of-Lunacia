-- bots.sql — 30 rivales bot de la Arena. Generado por tools/pvp/bots/seed-bots.mjs (semilla 0); no editar a mano.
-- Pegar en el SQL Editor de Supabase después de la migración 20261113000000_arena_bots.sql. Se puede repetir.
begin;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000001', 'authenticated', 'authenticated', 'bot-0001@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Pipo","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000001', 1, '{"playerName":"Pipo","sapidaeClass":"shepard","sapidaeModel":"sapidae-m-kai","customization":{"useOriginalTextures":true,"hair":"#eab308","hairStyle":"c","eyes":"#06b6d4","eyeShape":"round","eyeExpr":"c","mouthExpr":"a","horns":"a","hornColor":"#0f172a","outfit":"d","suitColor":"#e11d48","shirt":"#e11d48","pants":"#e11d48","hasHat":false,"hatColor":"original"},"level":5,"mainAxie":{"id":"beast_rage","axieId":"10455","heroKey":"beast_rage","name":"Shinji","class":"Beast","image":null},"hero":{"axieId":"10455","heroKey":"beast_rage","name":"Shinji","class":"Beast","genes":"0x000000000000010001c180e1041000000001001020410304000100142841400a000100000800c30c0001000818614004000100141800c002000100141820400c"},"partCards":{"10455":{"ids":["part_aquatic_eyes_gero","part_beast_ears_nyan","part_reptile_mouth_tiny_turtle","part_bird_horn_trump","part_reptile_back_green_thorns","part_reptile_tail_tiny_dino"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000001', 855, 0, 16)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000002', 'authenticated', 'authenticated', 'bot-0002@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Kenia","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000002', 1, '{"playerName":"Kenia","sapidaeClass":"shepard","sapidaeModel":"sapidae-m-kai","customization":{"useOriginalTextures":true,"hair":"#eab308","hairStyle":"a","eyes":"#eab308","eyeShape":"round","eyeExpr":"e","mouthExpr":"a","horns":"a","hornColor":"original","outfit":"d","suitColor":"#0284c7","shirt":"#0284c7","pants":"#0284c7","hasHat":false,"hatColor":"original"},"level":5,"mainAxie":{"id":"bird_early","axieId":"3797905","heroKey":"bird_early","name":"Early Bird","class":"Bird","image":null},"hero":{"axieId":"3797905","heroKey":"bird_early","name":"Early Bird","class":"Bird","genes":"0x10000000000001000241c0e0820800000001000020408202000100082820820a000100081040800a000100142040400400010008106183040001000818418204"},"partCards":{"3797905":{"ids":["part_beast_eyes_puppy","part_bird_ears_early_bird","part_bird_mouth_little_owl","part_reptile_horn_scaly_spoon","part_bird_back_cupid","part_bird_tail_the_last_one"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000002', 870, 8, 21)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000003', 'authenticated', 'authenticated', 'bot-0003@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"JorgeLN","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000003', 1, '{"playerName":"JorgeLN","sapidaeClass":"lunalogist","sapidaeModel":"sapidae-m-kai","customization":{"useOriginalTextures":true,"hair":"#dc2626","hairStyle":"e","eyes":"#8b5cf6","eyeShape":"round","eyeExpr":"a","mouthExpr":"e","horns":"a","hornColor":"original","outfit":"d","suitColor":"original","shirt":"original","pants":"original","hasHat":false,"hatColor":"original"},"level":4,"mainAxie":{"id":"bird_early","axieId":"3797905","heroKey":"bird_early","name":"Early Bird","class":"Bird","image":null},"hero":{"axieId":"3797905","heroKey":"bird_early","name":"Early Bird","class":"Bird","genes":"0x10000000000001000241c0e0820800000001000020408202000100082820820a000100081040800a000100142040400400010008106183040001000818418204"},"partCards":{"3797905":{"ids":["part_beast_eyes_puppy","part_bird_ears_early_bird","part_bird_mouth_little_owl","part_reptile_horn_scaly_spoon","part_bird_back_cupid","part_bird_tail_the_last_one"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000003', 880, 16, 9)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000004', 'authenticated', 'authenticated', 'bot-0004@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Rinko","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000004', 1, '{"playerName":"Rinko","sapidaeClass":"stargazer","sapidaeModel":"sapidae-f-ema","customization":{"useOriginalTextures":true,"hair":"#059669","hairStyle":"d","eyes":"#0284c7","eyeShape":"round","eyeExpr":"b","mouthExpr":"e","horns":"a","hornColor":"#f8fafc","outfit":"b","suitColor":"#7e22ce","shirt":"#7e22ce","pants":"#7e22ce","hasHat":false,"hatColor":"original"},"level":7,"mainAxie":{"id":"11670689","axieId":"11670689","name":"Axie #11670689","class":"Dusk","heroKey":null,"image":null},"hero":{"axieId":"11670689","name":"Axie #11670689","class":"Dusk","heroKey":null,"genes":"0x90000000000001000241206082100000000100042821410a0001000028404204000100101821810c0001000008808302000100083001020c000100082841420a"},"partCards":{"11670689":{"ids":["var_part_bug_eyes_kotaro_kotaro","part_aquatic_ears_bubblemaker","part_beast_mouth_confident","part_beast_horn_little_branch","part_bird_back_tri_feather","var_part_bird_tail_granmas_fan_granmas_fan"],"variants":[{"id":"var_part_bug_eyes_kotaro_kotaro","baseId":"part_bug_eyes_kotaro","name":"Kotaro?","collection":null,"stage":1},{"id":"var_part_bird_tail_granmas_fan_granmas_fan","baseId":"part_bird_tail_granmas_fan","name":"Granmas Fan","collection":null,"stage":1}],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000004', 895, 19, 6)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000005', 'authenticated', 'authenticated', 'bot-0005@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Pablito07","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000005', 1, '{"playerName":"Pablito07","sapidaeClass":"crafter","sapidaeModel":"sapidae-f-ema","customization":{"useOriginalTextures":true,"hair":"#f472b6","hairStyle":"a","eyes":"original","eyeShape":"round","eyeExpr":"d","mouthExpr":"d","horns":"a","hornColor":"#06b6d4","outfit":"b","suitColor":"#0284c7","shirt":"#0284c7","pants":"#0284c7","hasHat":false,"hatColor":"original"},"level":7,"mainAxie":{"id":"12261661","axieId":"12261661","name":"Axie #12261661","class":"Dawn","heroKey":null,"image":null},"hero":{"axieId":"12261661","name":"Axie #12261661","class":"Dawn","heroKey":null,"genes":"0x88000000000001000160100102080000000100140880830a0001000c086144040001000c28210002000100041801420800010004280040040001000410218004"},"partCards":{"12261661":{"ids":["part_reptile_eyes_gecko","part_plant_ears_hollow","part_plant_mouth_serious","part_bug_horn_caterpillars","part_bug_back_scarab","part_bug_tail_twin_tail"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000005', 905, 4, 19)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000006', 'authenticated', 'authenticated', 'bot-0006@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Vera","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000006', 1, '{"playerName":"Vera","sapidaeClass":"shepard","sapidaeModel":"sapidae-f-ema","customization":{"useOriginalTextures":true,"hair":"#ea580c","hairStyle":"e","eyes":"#10b981","eyeShape":"round","eyeExpr":"b","mouthExpr":"e","horns":"a","hornColor":"#7c3aed","outfit":"b","suitColor":"#1d4ed8","shirt":"#1d4ed8","pants":"#1d4ed8","hasHat":false,"hatColor":"original"},"level":4,"mainAxie":{"id":"11829109","axieId":"11829109","name":"🌵SwingSoldier🌵","class":"Plant","heroKey":null,"image":null},"hero":{"axieId":"11829109","name":"🌵SwingSoldier🌵","class":"Plant","heroKey":null,"genes":"0x180000000000010002414000c400000000010004286043040001001020608408000100102880c302000100082840410c0001000c304102040001001030808408"},"partCards":{"11829109":{"ids":["var_part_bug_eyes_kotaro_kotaro","part_aquatic_ears_gill","part_aquatic_mouth_risky_fish","part_bird_horn_wing_horn","part_plant_back_pumpkin","part_aquatic_tail_shrimp"],"variants":[{"id":"var_part_bug_eyes_kotaro_kotaro","baseId":"part_bug_eyes_kotaro","name":"Kotaro?","collection":null,"stage":1}],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000006', 920, 16, 23)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000007', 'authenticated', 'authenticated', 'bot-0007@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Ivo","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000007', 1, '{"playerName":"Ivo","sapidaeClass":"stargazer","sapidaeModel":"sapidae-m-kai","customization":{"useOriginalTextures":true,"hair":"#451a03","hairStyle":"d","eyes":"#10b981","eyeShape":"round","eyeExpr":"a","mouthExpr":"e","horns":"a","hornColor":"#7c3aed","outfit":"d","suitColor":"#f1f5f9","shirt":"#f1f5f9","pants":"#f1f5f9","hasHat":false,"hatColor":"original"},"level":5,"mainAxie":{"id":"12266440","axieId":"12266440","name":"Axie #12266440","class":"Mech","heroKey":null,"image":null},"hero":{"axieId":"12266440","name":"Axie #12266440","class":"Mech","heroKey":null,"genes":"0x8000000000000100038140e0c410000000010004288142020001000020410008000100082881010a0001001410a0800a00010000100080040001001020610102"},"partCards":{"12266440":{"ids":["var_part_bug_eyes_kotaro_kotaro","part_bird_ears_curly","part_beast_mouth_axie_kiss","part_reptile_horn_scaly_spear","part_beast_back_hero","part_aquatic_tail_ranchu"],"variants":[{"id":"var_part_bug_eyes_kotaro_kotaro","baseId":"part_bug_eyes_kotaro","name":"Kotaro?","collection":null,"stage":1}],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000007', 930, 14, 9)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000008', 'authenticated', 'authenticated', 'bot-0008@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"MateoAxie","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000008', 1, '{"playerName":"MateoAxie","sapidaeClass":"shepard","sapidaeModel":"sapidae-m-kai","customization":{"useOriginalTextures":true,"hair":"#0284c7","hairStyle":"e","eyes":"original","eyeShape":"round","eyeExpr":"a","mouthExpr":"a","horns":"a","hornColor":"#92400e","outfit":"d","suitColor":"original","shirt":"original","pants":"original","hasHat":false,"hatColor":"original"},"level":8,"mainAxie":{"id":"5761698","axieId":"5761698","name":"NIGHTMARE","class":"Reptile","heroKey":null,"image":null},"hero":{"axieId":"5761698","name":"NIGHTMARE","class":"Reptile","heroKey":null,"genes":"0x280000000000010001408000020800000001001410a0850a0001000008a0830a0001001418a08108000100141880c50400010014182182060001001410210504"},"partCards":{"5761698":{"ids":["part_reptile_eyes_tricky","part_reptile_ears_curved_spine","part_beast_mouth_nut_cracker","part_reptile_horn_cerastes","part_reptile_back_green_thorns","part_reptile_tail_iguana"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000008', 945, 20, 8)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000009', 'authenticated', 'authenticated', 'bot-0009@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"KaitoLun","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000009', 1, '{"playerName":"KaitoLun","sapidaeClass":"lunalogist","sapidaeModel":"sapidae-m-kai","customization":{"useOriginalTextures":true,"hair":"#ea580c","hairStyle":"b","eyes":"original","eyeShape":"round","eyeExpr":"b","mouthExpr":"b","horns":"a","hornColor":"#dc2626","outfit":"d","suitColor":"original","shirt":"original","pants":"original","hasHat":false,"hatColor":"original"},"level":8,"mainAxie":{"id":"6561475","axieId":"6561475","name":"Axie #6561475","class":"Bird","heroKey":null,"image":null},"hero":{"axieId":"6561475","name":"Axie #6561475","class":"Bird","heroKey":null,"genes":"0x100000000000010002414091030800000001000808204308000100082861020a000100082041040800010008084045020001000018414208000100002000820c"},"partCards":{"6561475":{"ids":["part_bird_eyes_mavis","part_bird_ears_peace_maker","part_bird_mouth_little_owl","part_bird_horn_eggshell","part_beast_back_jaguar","part_beast_tail_hare"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000009', 960, 18, 19)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000010', 'authenticated', 'authenticated', 'bot-0010@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Tiago","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000010', 1, '{"playerName":"Tiago","sapidaeClass":"crafter","sapidaeModel":"sapidae-m-kai","customization":{"useOriginalTextures":true,"hair":"original","hairStyle":"c","eyes":"original","eyeShape":"round","eyeExpr":"b","mouthExpr":"e","horns":"a","hornColor":"#dc2626","outfit":"d","suitColor":"#b45309","shirt":"#b45309","pants":"#b45309","hasHat":false,"hatColor":"original"},"level":9,"mainAxie":{"id":"12185610","axieId":"12185610","name":"Axie #12185610","class":"Bug","heroKey":null,"image":null},"hero":{"axieId":"12185610","name":"Axie #12185610","class":"Bug","heroKey":null,"genes":"0x8000000000001000241c040820c00000001000428204402000100042040800200010014080102040001000430404208000100043041820c000100082841450a"},"partCards":{"12185610":{"ids":["var_part_bug_eyes_kotaro_kotaro","part_reptile_ears_pogona","part_bug_mouth_cute_bunny","part_bug_horn_leaf_bug","part_bug_back_spiky_wing","var_part_bird_tail_granmas_fan_granmas_fan"],"variants":[{"id":"var_part_bug_eyes_kotaro_kotaro","baseId":"part_bug_eyes_kotaro","name":"Kotaro?","collection":null,"stage":1},{"id":"var_part_bird_tail_granmas_fan_granmas_fan","baseId":"part_bird_tail_granmas_fan","name":"Granmas Fan","collection":null,"stage":1}],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000010', 975, 16, 5)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000011', 'authenticated', 'authenticated', 'bot-0011@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Lumi","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000011', 1, '{"playerName":"Lumi","sapidaeClass":"shepard","sapidaeModel":"sapidae-f-ema","customization":{"useOriginalTextures":true,"hair":"original","hairStyle":"b","eyes":"#8b5cf6","eyeShape":"round","eyeExpr":"a","mouthExpr":"c","horns":"a","hornColor":"#06b6d4","outfit":"b","suitColor":"#7e22ce","shirt":"#7e22ce","pants":"#7e22ce","hasHat":false,"hatColor":"original"},"level":8,"mainAxie":{"id":"11411831","axieId":"11411831","name":"BEAST POI NM & SUMMER","class":"Beast","heroKey":null,"image":null},"hero":{"axieId":"11411831","name":"BEAST POI NM & SUMMER","class":"Beast","heroKey":null,"genes":"0x1000300e050c404000000000304102143040003000c2881050a000206141020c00a0000039408a103040001001428610004000100002020800a"},"partCards":{"11411831":{"ids":["var_part_bug_eyes_neo_flower_sunglasses","var_part_reptile_ears_friezard_dragon_ears_lv2","var_part_plant_mouth_silence_whisper_silence_whisper_lv2","var_part_reptile_horn_unko_strawberry_ice_cream","part_reptile_back_red_ear","part_beast_tail_hare"],"variants":[{"id":"var_part_bug_eyes_neo_flower_sunglasses","baseId":"part_bug_eyes_neo","name":"Flower Sunglasses","collection":"summer","stage":1},{"id":"var_part_reptile_ears_friezard_dragon_ears_lv2","baseId":"part_reptile_ears_friezard","name":"Dragon Ears","collection":"nightmare","stage":2},{"id":"var_part_plant_mouth_silence_whisper_silence_whisper_lv2","baseId":"part_plant_mouth_silence_whisper","name":"Silence Whisper","collection":null,"stage":2},{"id":"var_part_reptile_horn_unko_strawberry_ice_cream","baseId":"part_reptile_horn_unko","name":"Strawberry Ice Cream","collection":"summer","stage":1}],"vv":1,"collections":["summer","nightmare",null,"summer",null,null],"from":"genes","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000011', 990, 20, 6)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000012', 'authenticated', 'authenticated', 'bot-0012@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"SoraTide","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000012', 1, '{"playerName":"SoraTide","sapidaeClass":"stargazer","sapidaeModel":"sapidae-m-kai","customization":{"useOriginalTextures":true,"hair":"#1e293b","hairStyle":"c","eyes":"original","eyeShape":"round","eyeExpr":"b","mouthExpr":"b","horns":"a","hornColor":"#0f172a","outfit":"d","suitColor":"#f1f5f9","shirt":"#f1f5f9","pants":"#f1f5f9","hasHat":false,"hatColor":"original"},"level":10,"mainAxie":{"id":"10567997","axieId":"10567997","name":"Axie #10567997","class":"Aquatic","heroKey":null,"image":null},"hero":{"axieId":"10567997","name":"Axie #10567997","class":"Aquatic","heroKey":null,"genes":"0x200000000000010001c0e091030c00000001000808808404000100102881040200010010184080060001001020808008000100101880c4060001001010808402"},"partCards":{"10567997":{"ids":["part_bird_eyes_mavis","part_aquatic_ears_bubblemaker","part_aquatic_mouth_piranha","part_aquatic_horn_anemone","part_aquatic_back_goldfish","part_aquatic_tail_nimo"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000012', 1005, 21, 9)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000013', 'authenticated', 'authenticated', 'bot-0013@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Zoe","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000013', 1, '{"playerName":"Zoe","sapidaeClass":"crafter","sapidaeModel":"sapidae-m-kai","customization":{"useOriginalTextures":true,"hair":"original","hairStyle":"a","eyes":"#10b981","eyeShape":"round","eyeExpr":"c","mouthExpr":"e","horns":"a","hornColor":"#06b6d4","outfit":"d","suitColor":"original","shirt":"original","pants":"original","hasHat":false,"hatColor":"original"},"level":10,"mainAxie":{"id":"12244696","axieId":"12244696","name":"Axie #12244696","class":"Mech","heroKey":null,"image":null},"hero":{"axieId":"12244696","name":"Axie #12244696","class":"Mech","heroKey":null,"genes":"0x80000000000001000301209100080000000100042821420a0001001028810204000100043040420200010008280084040001001408418208000100143061040c"},"partCards":{"12244696":{"ids":["var_part_bug_eyes_kotaro_kotaro","part_bug_ears_earwing","part_aquatic_mouth_piranha","part_bird_horn_wing_horn","part_reptile_back_bone_sail","part_reptile_tail_grass_snake"],"variants":[{"id":"var_part_bug_eyes_kotaro_kotaro","baseId":"part_bug_eyes_kotaro","name":"Kotaro?","collection":null,"stage":1}],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000013', 1020, 14, 7)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000014', 'authenticated', 'authenticated', 'bot-0014@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"MiraVex","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000014', 1, '{"playerName":"MiraVex","sapidaeClass":"lunalogist","sapidaeModel":"sapidae-f-ema","customization":{"useOriginalTextures":true,"hair":"#059669","hairStyle":"d","eyes":"original","eyeShape":"round","eyeExpr":"b","mouthExpr":"c","horns":"a","hornColor":"#f59e0b","outfit":"b","suitColor":"#7e22ce","shirt":"#7e22ce","pants":"#7e22ce","hasHat":false,"hatColor":"original"},"level":11,"mainAxie":{"id":"2012860","axieId":"2012860","name":"Axie #2012860","class":"Bug","heroKey":null,"image":null},"hero":{"axieId":"2012860","name":"Axie #2012860","class":"Bug","heroKey":null,"genes":"0x8000000000001000100805082080000000100040821410a0001000c10804104000100040820410a00010014304044020001000408204004000100041820c106"},"partCards":{"2012860":{"ids":["part_bug_eyes_bookworm","part_bug_ears_larva","part_plant_mouth_zigzag","part_reptile_horn_bumpy","part_bug_back_snail_shell","part_bug_tail_fish_snack"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000014', 1040, 13, 20)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000015', 'authenticated', 'authenticated', 'bot-0015@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Lucca","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000015', 1, '{"playerName":"Lucca","sapidaeClass":"stargazer","sapidaeModel":"sapidae-m-kai","customization":{"useOriginalTextures":true,"hair":"#059669","hairStyle":"b","eyes":"#ec4899","eyeShape":"round","eyeExpr":"c","mouthExpr":"e","horns":"a","hornColor":"#f8fafc","outfit":"d","suitColor":"#f1f5f9","shirt":"#f1f5f9","pants":"#f1f5f9","hasHat":false,"hatColor":"original"},"level":11,"mainAxie":{"id":"9775842","axieId":"9775842","name":"Axie #9775842","class":"Bird","heroKey":null,"image":null},"hero":{"axieId":"9775842","name":"Axie #9775842","class":"Bird","heroKey":null,"genes":"0x100000000000010000812090821000000001000808408202000100082841420a0001000818818204000100041840410a00010008204102080001000020010008"},"partCards":{"9775842":{"ids":["part_bird_eyes_mavis","var_part_bird_ears_little_owl_owl","part_bird_mouth_little_owl","part_bug_horn_caterpillars","part_bird_back_pigeon_post","part_beast_tail_hare"],"variants":[{"id":"var_part_bird_ears_little_owl_owl","baseId":"part_bird_ears_little_owl","name":"Owl","collection":null,"stage":1}],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000015', 1060, 21, 5)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000016', 'authenticated', 'authenticated', 'bot-0016@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Lia","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000016', 1, '{"playerName":"Lia","sapidaeClass":"shepard","sapidaeModel":"sapidae-f-ema","customization":{"useOriginalTextures":true,"hair":"#dc2626","hairStyle":"b","eyes":"#0f172a","eyeShape":"round","eyeExpr":"d","mouthExpr":"e","horns":"a","hornColor":"#06b6d4","outfit":"b","suitColor":"#f1f5f9","shirt":"#f1f5f9","pants":"#f1f5f9","hasHat":false,"hatColor":"original"},"level":12,"mainAxie":{"id":"5259416","axieId":"5259416","name":"Excelent From","class":"Plant","heroKey":null,"image":null},"hero":{"axieId":"5259416","name":"Excelent From","class":"Plant","heroKey":null,"genes":"0x180000000000010001001010000400000001000c086043020001000c086042020001000c1060810a0001000c2861430a0001000c2840430c0001001430604302"},"partCards":{"5259416":{"ids":["part_plant_eyes_papi","part_plant_ears_clover","part_plant_mouth_serious","part_plant_horn_cactus","part_plant_back_mint","part_reptile_tail_grass_snake"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000016', 1090, 9, 9)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000017', 'authenticated', 'authenticated', 'bot-0017@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Nilo","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000017', 1, '{"playerName":"Nilo","sapidaeClass":"stargazer","sapidaeModel":"sapidae-f-ema","customization":{"useOriginalTextures":true,"hair":"original","hairStyle":"e","eyes":"#0284c7","eyeShape":"round","eyeExpr":"e","mouthExpr":"a","horns":"a","hornColor":"original","outfit":"b","suitColor":"original","shirt":"original","pants":"original","hasHat":false,"hatColor":"original"},"level":14,"mainAxie":{"id":"5868462","axieId":"5868462","name":"Axie #5868462","class":"Reptile","heroKey":null,"image":null},"hero":{"axieId":"5868462","name":"Axie #5868462","class":"Reptile","heroKey":null,"genes":"0x280000000000010001410081030c000000010004288085080001000428204302000100141841030a000100040860c50a0001000028a18106000100043041420c"},"partCards":{"5868462":{"ids":["var_part_bug_eyes_kotaro_kotaro","part_reptile_ears_curved_spine","part_bug_mouth_square_teeth","part_bug_horn_lagging","part_beast_back_timber","part_bug_tail_thorny_caterpillar"],"variants":[{"id":"var_part_bug_eyes_kotaro_kotaro","baseId":"part_bug_eyes_kotaro","name":"Kotaro?","collection":null,"stage":1}],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000017', 1110, 20, 7)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000018', 'authenticated', 'authenticated', 'bot-0018@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Tano","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000018', 1, '{"playerName":"Tano","sapidaeClass":"shepard","sapidaeModel":"sapidae-m-kai","customization":{"useOriginalTextures":true,"hair":"#ea580c","hairStyle":"d","eyes":"#d97706","eyeShape":"round","eyeExpr":"d","mouthExpr":"a","horns":"a","hornColor":"original","outfit":"d","suitColor":"#7e22ce","shirt":"#7e22ce","pants":"#7e22ce","hasHat":false,"hatColor":"original"},"level":13,"mainAxie":{"id":"12194345","axieId":"12194345","name":"Wung | nEvolveD","class":"Dawn","heroKey":null,"image":null},"hero":{"axieId":"12194345","name":"Wung | nEvolveD","class":"Dawn","heroKey":null,"genes":"0x880000000000010003018090c30c0000000100042801040800010008284140040001000428218204000100082000400a000100001840800c000100082841410c"},"partCards":{"12194345":{"ids":["var_part_bug_eyes_kotaro_kotaro","part_bug_ears_tassels","part_bird_mouth_little_owl","part_bird_horn_kestrel","part_beast_back_jaguar","var_part_bird_tail_granmas_fan_granmas_fan"],"variants":[{"id":"var_part_bug_eyes_kotaro_kotaro","baseId":"part_bug_eyes_kotaro","name":"Kotaro?","collection":null,"stage":1},{"id":"var_part_bird_tail_granmas_fan_granmas_fan","baseId":"part_bird_tail_granmas_fan","name":"Granmas Fan","collection":null,"stage":1}],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000018', 1130, 21, 9)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000019', 'authenticated', 'authenticated', 'bot-0019@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Lua","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000019', 1, '{"playerName":"Lua","sapidaeClass":"stargazer","sapidaeModel":"sapidae-m-kai","customization":{"useOriginalTextures":true,"hair":"#dc2626","hairStyle":"e","eyes":"#ec4899","eyeShape":"round","eyeExpr":"b","mouthExpr":"b","horns":"a","hornColor":"original","outfit":"d","suitColor":"#f1f5f9","shirt":"#f1f5f9","pants":"#f1f5f9","hasHat":false,"hatColor":"original"},"level":12,"mainAxie":{"id":"2234383","axieId":"2234383","name":"Axie #2234383","class":"Aquatic","heroKey":null,"image":null},"hero":{"axieId":"2234383","name":"Axie #2234383","class":"Aquatic","heroKey":null,"genes":"0x200000000000010000c0607103000000000100080880840a0001001020004408000100001081440a00010010288145040001001018a0430c0001000018818404"},"partCards":{"2234383":{"ids":["part_bird_eyes_mavis","part_beast_ears_nut_cracker","part_aquatic_mouth_risky_fish","part_aquatic_horn_oranda","part_aquatic_back_goldfish","part_beast_tail_shiba"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000019', 1145, 1, 17)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000020', 'authenticated', 'authenticated', 'bot-0020@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Rafa","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000020', 1, '{"playerName":"Rafa","sapidaeClass":"lunalogist","sapidaeModel":"sapidae-m-kai","customization":{"useOriginalTextures":true,"hair":"#eab308","hairStyle":"a","eyes":"original","eyeShape":"round","eyeExpr":"a","mouthExpr":"b","horns":"a","hornColor":"original","outfit":"d","suitColor":"#7e22ce","shirt":"#7e22ce","pants":"#7e22ce","hasHat":false,"hatColor":"original"},"level":14,"mainAxie":{"id":"12264482","axieId":"12264482","name":"Axie #12264482","class":"Beast","heroKey":null,"image":null},"hero":{"axieId":"12264482","name":"Axie #12264482","class":"Beast","heroKey":null,"genes":"0x10001c0c050c20800000001001010a1450a000100142800430a00010004180180020001000408a102080001000808204406000100101821800a"},"partCards":{"12264482":{"ids":["part_aquatic_eyes_clear","part_bug_ears_ear_breathing","part_reptile_mouth_tiny_turtle","part_bug_horn_lagging","part_bird_back_balloon","part_aquatic_tail_tadpole"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000020', 1160, 3, 16)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000021', 'authenticated', 'authenticated', 'bot-0021@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Chiqui","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000021', 1, '{"playerName":"Chiqui","sapidaeClass":"stargazer","sapidaeModel":"sapidae-f-ema","customization":{"useOriginalTextures":true,"hair":"#451a03","hairStyle":"a","eyes":"original","eyeShape":"round","eyeExpr":"b","mouthExpr":"e","horns":"a","hornColor":"#10b981","outfit":"b","suitColor":"original","shirt":"original","pants":"original","hasHat":false,"hatColor":"original"},"level":16,"mainAxie":{"id":"12267112","axieId":"12267112","name":"Axie #12267112","class":"Dusk","heroKey":null,"image":null},"hero":{"axieId":"12267112","name":"Axie #12267112","class":"Dusk","heroKey":null,"genes":"0x90000000000001000140a0500308000000010010102145080001000c084143040001001028814406000100082861820a0001000410a041040001001430804402"},"partCards":{"12267112":{"ids":["part_aquatic_eyes_clear","part_aquatic_ears_gill","part_plant_mouth_serious","part_bird_horn_wing_horn","part_bug_back_garish_worm","part_reptile_tail_grass_snake"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000021', 1175, 17, 18)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000022', 'authenticated', 'authenticated', 'bot-0022@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"NoxRonin","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000022', 1, '{"playerName":"NoxRonin","sapidaeClass":"crafter","sapidaeModel":"sapidae-f-ema","customization":{"useOriginalTextures":true,"hair":"#7c3aed","hairStyle":"b","eyes":"original","eyeShape":"round","eyeExpr":"c","mouthExpr":"d","horns":"a","hornColor":"#f59e0b","outfit":"b","suitColor":"#d97706","shirt":"#d97706","pants":"#d97706","hasHat":false,"hatColor":"original"},"level":14,"mainAxie":{"id":"10908562","axieId":"10908562","name":"Axie #10908562","class":"Mech","heroKey":null,"image":null},"hero":{"axieId":"10908562","name":"Axie #10908562","class":"Mech","heroKey":null,"genes":"0x8000000000000100004120e00010000000010000288082080001001408a04008000100080820800c000100102801800a000100003001810a000100041080c206"},"partCards":{"10908562":{"ids":["part_beast_eyes_chubby","part_bird_ears_pink_cheek","part_reptile_mouth_toothless_bite","part_aquatic_horn_oranda","part_beast_back_furball","part_bug_tail_twin_tail"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000022', 1190, 20, 5)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000023', 'authenticated', 'authenticated', 'bot-0023@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Thalia","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000023', 1, '{"playerName":"Thalia","sapidaeClass":"crafter","sapidaeModel":"sapidae-f-ema","customization":{"useOriginalTextures":true,"hair":"original","hairStyle":"d","eyes":"#10b981","eyeShape":"round","eyeExpr":"b","mouthExpr":"a","horns":"a","hornColor":"#06b6d4","outfit":"b","suitColor":"#7e22ce","shirt":"#7e22ce","pants":"#7e22ce","hasHat":false,"hatColor":"original"},"level":15,"mainAxie":{"id":"137793","axieId":"137793","name":"Axie #137793","class":"Aquatic","heroKey":null,"image":null},"hero":{"axieId":"137793","name":"Axie #137793","class":"Aquatic","heroKey":null,"genes":"0x200000000000010002c1c08082100000000100002061020a000100102061400a0003000c2001030a0003028c286185080003001020014008000300042081000a"},"partCards":{"137793":{"ids":["part_beast_eyes_puppy","var_part_plant_ears_sakura_sakura_lv2","part_aquatic_mouth_risky_fish","var_col_xmas_plant_horn_santas_gift_santas_gift_lv2","var_part_aquatic_back_sponge_sponge_lv2","var_part_bug_tail_gravel_ant_gravel_ant_lv2"],"variants":[{"id":"var_part_plant_ears_sakura_sakura_lv2","baseId":"part_plant_ears_sakura","name":"Sakura","collection":null,"stage":2},{"id":"var_col_xmas_plant_horn_santas_gift_santas_gift_lv2","baseId":"col_xmas_plant_horn_santas_gift","name":"Santas Gift","collection":"xmas","stage":2},{"id":"var_part_aquatic_back_sponge_sponge_lv2","baseId":"part_aquatic_back_sponge","name":"Sponge","collection":null,"stage":2},{"id":"var_part_bug_tail_gravel_ant_gravel_ant_lv2","baseId":"part_bug_tail_gravel_ant","name":"Gravel Ant","collection":null,"stage":2}],"vv":1,"collections":[null,null,null,"xmas",null,null],"from":"genes","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000023', 1205, 9, 6)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000024', 'authenticated', 'authenticated', 'bot-0024@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Nube","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000024', 1, '{"playerName":"Nube","sapidaeClass":"stargazer","sapidaeModel":"sapidae-f-ema","customization":{"useOriginalTextures":true,"hair":"#1e293b","hairStyle":"e","eyes":"#d97706","eyeShape":"round","eyeExpr":"a","mouthExpr":"a","horns":"a","hornColor":"#7c3aed","outfit":"b","suitColor":"#f1f5f9","shirt":"#f1f5f9","pants":"#f1f5f9","hasHat":false,"hatColor":"original"},"level":16,"mainAxie":{"id":"12229516","axieId":"12229516","name":"⚡Chelo’s Axiechos⚡","class":"Dawn","heroKey":null,"image":null},"hero":{"axieId":"12229516","name":"⚡Chelo’s Axiechos⚡","class":"Dawn","heroKey":null,"genes":"0x88000000000001000340a0004410000000010010086083080001000408a10302000100043021850a0001000428a042040001000c102144040001000428618202"},"partCards":{"12229516":{"ids":["part_aquatic_eyes_sleepless","part_bug_ears_earwing","part_bug_mouth_mosquito","part_bug_horn_parasite","part_plant_back_shiitake","part_bug_tail_pupae"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000024', 1220, 19, 21)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000025', 'authenticated', 'authenticated', 'bot-0025@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Sami","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000025', 1, '{"playerName":"Sami","sapidaeClass":"stargazer","sapidaeModel":"sapidae-f-ema","customization":{"useOriginalTextures":true,"hair":"#ea580c","hairStyle":"a","eyes":"#0284c7","eyeShape":"round","eyeExpr":"d","mouthExpr":"a","horns":"a","hornColor":"#f8fafc","outfit":"b","suitColor":"original","shirt":"original","pants":"original","hasHat":false,"hatColor":"original"},"level":15,"mainAxie":{"id":"9359485","axieId":"9359485","name":"Valkur","class":"Bird","heroKey":null,"image":null},"hero":{"axieId":"9359485","name":"Valkur","class":"Bird","heroKey":null,"genes":"0x1000000000000100024120c082080000000100081040420a000100080840420a000100081801840c000100080840440800010010284102080001000830614504"},"partCards":{"9359485":{"ids":["part_bird_eyes_lucas","var_part_bird_ears_little_owl_owl","part_bird_mouth_doubletalk","part_bird_horn_eggshell","part_aquatic_back_anemone","part_bird_tail_post_fight"],"variants":[{"id":"var_part_bird_ears_little_owl_owl","baseId":"part_bird_ears_little_owl","name":"Owl","collection":null,"stage":1}],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000025', 1230, 8, 18)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000026', 'authenticated', 'authenticated', 'bot-0026@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Ona","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000026', 1, '{"playerName":"Ona","sapidaeClass":"crafter","sapidaeModel":"sapidae-f-ema","customization":{"useOriginalTextures":true,"hair":"#059669","hairStyle":"a","eyes":"#0284c7","eyeShape":"round","eyeExpr":"e","mouthExpr":"d","horns":"a","hornColor":"#f8fafc","outfit":"b","suitColor":"#15803d","shirt":"#15803d","pants":"#15803d","hasHat":false,"hatColor":"original"},"level":17,"mainAxie":{"id":"67523","axieId":"67523","name":"⛩️Japan the 1rst⛩️","class":"Plant","heroKey":null,"image":null},"hero":{"axieId":"67523","name":"⛩️Japan the 1rst⛩️","class":"Plant","heroKey":null,"genes":"0x180000000000010002018071030c0000000100102001020a0001000c0821440a0003018c2001820a000100002861000a00010004280100080001001430014108"},"partCards":{"67523":{"ids":["part_aquatic_eyes_gero","var_col_japan_plant_ears_maiko_maiko_lv2","part_plant_mouth_serious","part_beast_horn_dual_blade","part_bug_back_scarab","part_reptile_tail_grass_snake"],"variants":[{"id":"var_col_japan_plant_ears_maiko_maiko_lv2","baseId":"col_japan_plant_ears_maiko","name":"Maiko","collection":"japan","stage":2}],"vv":1,"collections":[null,"japan",null,null,null,null],"from":"genes","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000026', 1245, 16, 22)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000027', 'authenticated', 'authenticated', 'bot-0027@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Dante","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000027', 1, '{"playerName":"Dante","sapidaeClass":"crafter","sapidaeModel":"sapidae-f-ema","customization":{"useOriginalTextures":true,"hair":"#1e293b","hairStyle":"e","eyes":"#0284c7","eyeShape":"round","eyeExpr":"d","mouthExpr":"a","horns":"a","hornColor":"original","outfit":"b","suitColor":"#7e22ce","shirt":"#7e22ce","pants":"#7e22ce","hasHat":false,"hatColor":"original"},"level":17,"mainAxie":{"id":"11771909","axieId":"11771909","name":"Axie #11771909","class":"Beast","heroKey":null,"image":null},"hero":{"axieId":"11771909","name":"Axie #11771909","class":"Beast","heroKey":null,"genes":"0x1000381c0e082080000000100001000850a0001000020814008000100140801840a00010000086180040001000008004508000100103081840c"},"partCards":{"11771909":{"ids":["part_beast_eyes_little_peas","part_reptile_ears_pogona","part_beast_mouth_axie_kiss","part_beast_horn_little_branch","part_beast_back_ronin","part_aquatic_tail_shrimp"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000027', 1255, 19, 9)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000028', 'authenticated', 'authenticated', 'bot-0028@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Ilse","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000028', 1, '{"playerName":"Ilse","sapidaeClass":"crafter","sapidaeModel":"sapidae-f-ema","customization":{"useOriginalTextures":true,"hair":"original","hairStyle":"c","eyes":"#0284c7","eyeShape":"round","eyeExpr":"d","mouthExpr":"e","horns":"a","hornColor":"#dc2626","outfit":"b","suitColor":"#1e293b","shirt":"#1e293b","pants":"#1e293b","hasHat":false,"hatColor":"original"},"level":16,"mainAxie":{"id":"6701183","axieId":"6701183","name":"Axie #6701183","class":"Reptile","heroKey":null,"image":null},"hero":{"axieId":"6701183","name":"Axie #6701183","class":"Reptile","heroKey":null,"genes":"0x2800000000000100034120c083080000000100142021050200010008080084080001000808a1010c0001000808a102020001001410a0830a000100081841400c"},"partCards":{"6701183":{"ids":["part_reptile_eyes_scar","part_bird_ears_pink_cheek","part_bird_mouth_doubletalk","part_bird_horn_eggshell","part_reptile_back_tri_spikes","part_bird_tail_the_last_one"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000028', 1270, 18, 6)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000029', 'authenticated', 'authenticated', 'bot-0029@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Elio","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000029', 1, '{"playerName":"Elio","sapidaeClass":"shepard","sapidaeModel":"sapidae-m-kai","customization":{"useOriginalTextures":true,"hair":"#1e293b","hairStyle":"e","eyes":"#d97706","eyeShape":"round","eyeExpr":"a","mouthExpr":"a","horns":"a","hornColor":"original","outfit":"d","suitColor":"original","shirt":"original","pants":"original","hasHat":false,"hatColor":"original"},"level":18,"mainAxie":{"id":"3296871","axieId":"3296871","name":"Axie #3296871","class":"Dusk","heroKey":null,"image":null},"hero":{"axieId":"3296871","name":"Axie #3296871","class":"Dusk","heroKey":null,"genes":"0x900000000000010060301800c30c00000001000828a040040001001428004304000100101801830600010014186183060001000c1800c50c0001001410608502"},"partCards":{"3296871":{"ids":["part_bird_eyes_robin","part_aquatic_ears_bubblemaker","part_reptile_mouth_tiny_turtle","part_reptile_horn_cerastes","part_plant_back_bidens","part_reptile_tail_iguana"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000029', 1280, 12, 9)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-b07b-4000-8000-000000000030', 'authenticated', 'authenticated', 'bot-0030@bots.lunakai.invalid', '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          '{"display_name":"Zafiro","auth_provider":"bot"}'::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();
insert into public.save_slots (user_id, slot_id, data) values ('00000000-b07b-4000-8000-000000000030', 1, '{"playerName":"Zafiro","sapidaeClass":"shepard","sapidaeModel":"sapidae-m-kai","customization":{"useOriginalTextures":true,"hair":"#7c3aed","hairStyle":"b","eyes":"#0f172a","eyeShape":"round","eyeExpr":"b","mouthExpr":"a","horns":"a","hornColor":"original","outfit":"d","suitColor":"#0284c7","shirt":"#0284c7","pants":"#0284c7","hasHat":false,"hatColor":"original"},"level":17,"mainAxie":{"id":"11814019","axieId":"11814019","name":"PBB","class":"Bug","heroKey":null,"image":null},"hero":{"axieId":"11814019","name":"PBB","class":"Bug","heroKey":null,"genes":"0x80000000000010000c18050c20800000001001408a041020001001010a0810800010014206140080001000818a1830600010014100100040001001010804202"},"partCards":{"11814019":{"ids":["part_reptile_eyes_gecko","part_reptile_ears_small_frill","part_aquatic_mouth_catfish","part_bird_horn_trump","part_reptile_back_tri_spikes","part_aquatic_tail_nimo"],"variants":[],"vv":1,"collections":[null,null,null,null,null,null],"from":"api","v":2}}}'::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();
insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values ('00000000-b07b-4000-8000-000000000030', 1295, 20, 9)
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;
commit;
-- Resumen: Pipo 855 · Kenia 870 · JorgeLN 880 · Rinko 895 · Pablito07 905 · Vera 920 · Ivo 930 · MateoAxie 945 · KaitoLun 960 · Tiago 975 · Lumi 990 · SoraTide 1005 · Zoe 1020 · MiraVex 1040 · Lucca 1060 · Lia 1090 · Nilo 1110 · Tano 1130 · Lua 1145 · Rafa 1160 · Chiqui 1175 · NoxRonin 1190 · Thalia 1205 · Nube 1220 · Sami 1230 · Ona 1245 · Dante 1255 · Ilse 1270 · Elio 1280 · Zafiro 1295
