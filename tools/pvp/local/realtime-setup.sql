-- Realtime simulado para las pruebas locales: realtime.send guarda el aviso; el servidor de pruebas lo reparte.
create schema if not exists realtime;
create table if not exists realtime.outbox (id bigserial primary key, topic text, event text, payload jsonb, private boolean, at timestamptz default now());
create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true)
returns void language sql as $$ insert into realtime.outbox (topic, event, payload, private) values (topic, event, payload, private) $$;
-- Opcional, para probar el tiempo agotado sin esperar 45 s (deshacer volviendo a aplicar 20261106000000_arena_pvp.sql):
-- create or replace function public.pvp_settings() returns jsonb language sql immutable as $$
--   select <ajustes de 20261106000000_arena_pvp.sql> || '{"turn_secs": 4, "turn_grace_secs": 1}'::jsonb $$;
