-- Lunakai: cuentas de jugador y guardado en la nube
-- Ejecutar una vez en Supabase (SQL Editor o `supabase db push`).
-- Cada jugador autenticado ve y modifica SOLO sus propias filas (RLS).

-- ---------------------------------------------------------------------------
-- 1. Perfil del jugador (uno por cuenta de Supabase Auth)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  display_name        text,
  email               text,
  auth_provider       text not null default 'email',      -- 'email' | 'skymavis'
  mavis_id            text unique,                         -- claim `sub` de Sky Mavis
  ronin_address       text,                                -- claim `roninAddress` de Sky Mavis
  has_completed_intro boolean not null default false,
  last_slot_id        smallint check (last_slot_id between 1 and 3),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: leer el propio" on public.profiles;
create policy "profiles: leer el propio" on public.profiles
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "profiles: editar el propio" on public.profiles;
create policy "profiles: editar el propio" on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- El cliente solo puede cambiar estas columnas; la identidad de Sky Mavis
-- (mavis_id, ronin_address, auth_provider) la escribe únicamente la Edge Function.
revoke insert, update, delete on public.profiles from authenticated, anon;
grant select on public.profiles to authenticated;
grant update (display_name, has_completed_intro, last_slot_id, updated_at) on public.profiles to authenticated;

-- Crear el perfil automáticamente al registrarse (email o Sky Mavis).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name, auth_provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'auth_provider', 'email')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. Ranuras de guardado (3 por jugador)
-- ---------------------------------------------------------------------------
create table if not exists public.save_slots (
  user_id    uuid not null references auth.users (id) on delete cascade,
  slot_id    smallint not null check (slot_id between 1 and 3),
  data       jsonb not null,
  version    integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot_id),
  constraint save_slots_data_size check (pg_column_size(data) < 512000)
);

alter table public.save_slots enable row level security;

drop policy if exists "save_slots: leer las propias" on public.save_slots;
create policy "save_slots: leer las propias" on public.save_slots
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "save_slots: borrar las propias" on public.save_slots;
create policy "save_slots: borrar las propias" on public.save_slots
  for delete to authenticated using (user_id = auth.uid());

-- Las escrituras pasan por la función save_slot (control de versión); no hay
-- insert/update directos desde el cliente.
revoke insert, update on public.save_slots from authenticated, anon;
grant select, delete on public.save_slots to authenticated;

-- Guardado con control de concurrencia optimista.
-- p_expected_version = versión que el cliente leyó (0 si la ranura no existía).
-- Devuelve {"ok":true,"version":N} o, si otro dispositivo guardó antes,
-- {"ok":false,"conflict":true,"version":N,"data":{...}} con la copia del servidor.
create or replace function public.save_slot(p_slot_id smallint, p_data jsonb, p_expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.save_slots%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_slot_id not between 1 and 3 then
    raise exception 'invalid_slot' using errcode = '22023';
  end if;

  select * into v_row from public.save_slots
   where user_id = v_uid and slot_id = p_slot_id
   for update;

  if not found then
    if coalesce(p_expected_version, 0) <> 0 then
      return jsonb_build_object('ok', false, 'conflict', true, 'version', 0, 'data', null);
    end if;
    insert into public.save_slots (user_id, slot_id, data, version)
    values (v_uid, p_slot_id, p_data, 1);
    update public.profiles set last_slot_id = p_slot_id, updated_at = now() where user_id = v_uid;
    return jsonb_build_object('ok', true, 'version', 1);
  end if;

  if v_row.version <> coalesce(p_expected_version, -1) then
    return jsonb_build_object('ok', false, 'conflict', true, 'version', v_row.version, 'data', v_row.data);
  end if;

  update public.save_slots
     set data = p_data, version = v_row.version + 1, updated_at = now()
   where user_id = v_uid and slot_id = p_slot_id;

  update public.profiles set last_slot_id = p_slot_id, updated_at = now() where user_id = v_uid;

  return jsonb_build_object('ok', true, 'version', v_row.version + 1);
end;
$$;

revoke all on function public.save_slot(smallint, jsonb, integer) from public, anon;
grant execute on function public.save_slot(smallint, jsonb, integer) to authenticated;
