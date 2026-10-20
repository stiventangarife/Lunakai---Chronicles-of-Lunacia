-- Lunakai: direcciones Ronin del jugador (19-oct)
-- Ejecutar una vez en Supabase (SQL Editor o `supabase db push`), después de 20261016000000_accounts_and_saves.sql.
-- (El nombre del archivo es histórico: el inicio de sesión usa el OIDC estándar de Sky Mavis, no Ronin Waypoint.)
--
--   · ronin_address           → claim `roninAddress` del id_token de Sky Mavis (ya existía)
--   · ronin_secondary_address → segunda dirección, si Sky Mavis la envía
--   · addresses_verified      → true si las direcciones venían dentro del id_token firmado
-- Con ellas, la función `axie-data` carga los Axies del jugador.

alter table public.profiles add column if not exists ronin_secondary_address text;
alter table public.profiles add column if not exists addresses_verified boolean not null default false;

-- El cliente sigue sin poder escribir estas columnas: solo la Edge Function (rol de servicio).
revoke update (ronin_secondary_address, addresses_verified) on public.profiles from authenticated, anon;
