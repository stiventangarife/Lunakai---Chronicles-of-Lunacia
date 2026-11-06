-- Lunakai Hito 121: feedback de los jugadores (botón del HUD y tarjeta del final del tutorial).
-- Ejecutar una vez en Supabase (`supabase db push` o SQL Editor).
--
-- Los invitados no tienen sesión en Supabase (AccountManager.enterGuest solo guarda en local), así que
-- nadie escribe en la tabla directamente: todo pasa por la función submit_feedback, que pueden llamar
-- `anon` (invitado) y `authenticated` (Sky Mavis / correo). El tipo de cuenta lo decide el servidor:
-- con sesión se lee de `profiles`; sin sesión es 'guest'. Los jugadores no pueden leer la tabla:
-- el feedback se revisa desde el panel de Supabase (Table Editor → feedback).

-- ---------------------------------------------------------------------------
-- 1. Tabla
-- ---------------------------------------------------------------------------
create table if not exists public.feedback (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  account_kind  text not null check (account_kind in ('guest', 'skymavis', 'email')),
  user_id       uuid references auth.users (id) on delete set null,   -- vacío si es invitado
  guest_id      uuid,                                                  -- id anónimo del navegador (invitado)
  display_name  text,
  ronin_address text,
  source        text not null default 'hud' check (source in ('hud', 'tutorial_end')),
  message       text not null check (char_length(message) between 5 and 2000),
  context       jsonb not null default '{}'::jsonb,                    -- versión, idioma, tierra, tutorial, pantalla
  ip_hash       text,                                                  -- md5 de la IP, solo para el antispam
  status        text not null default 'new' check (status in ('new', 'read', 'done', 'spam'))
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_user_idx    on public.feedback (user_id, created_at desc);
create index if not exists feedback_guest_idx   on public.feedback (guest_id, created_at desc);
create index if not exists feedback_ip_idx      on public.feedback (ip_hash, created_at desc);

-- RLS activada y sin políticas: ni `anon` ni `authenticated` pueden leer ni escribir la tabla.
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Envío
-- ---------------------------------------------------------------------------
-- Devuelve {"ok":true,"id":N} o {"ok":false,"error":"too_short"|"too_long"|"missing_guest_id"|"rate_limited"}.
-- Antispam: 3 mensajes cada 10 minutos por cuenta o por invitado, y 10 cada 10 minutos por IP.
create or replace function public.submit_feedback(
  p_message  text,
  p_source   text default 'hud',
  p_guest_id uuid default null,
  p_context  jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_msg     text := btrim(coalesce(p_message, ''));
  v_source  text := case when p_source in ('hud', 'tutorial_end') then p_source else 'hud' end;
  v_kind    text := 'guest';
  v_name    text;
  v_ronin   text;
  v_ctx     jsonb := coalesce(p_context, '{}'::jsonb);
  v_ip      text;
  v_ip_hash text;
  v_recent  integer;
  v_id      bigint;
begin
  if char_length(v_msg) < 5 then
    return jsonb_build_object('ok', false, 'error', 'too_short');
  end if;
  if char_length(v_msg) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'too_long');
  end if;
  if jsonb_typeof(v_ctx) <> 'object' or pg_column_size(v_ctx) > 4096 then
    v_ctx := '{}'::jsonb;
  end if;

  -- IP del cliente (primera de x-forwarded-for); solo se guarda su hash
  begin
    v_ip := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1);
  exception when others then
    v_ip := '';
  end;
  v_ip_hash := case when btrim(v_ip) <> '' then md5(btrim(v_ip)) else null end;

  -- Quién envía: lo decide el servidor
  if v_uid is not null then
    select coalesce(p.auth_provider, 'email'), p.display_name, p.ronin_address
      into v_kind, v_name, v_ronin
      from public.profiles p
     where p.user_id = v_uid;
    if v_kind is null or v_kind not in ('skymavis', 'email') then
      v_kind := 'email';
    end if;
    p_guest_id := null;
  else
    if p_guest_id is null then
      return jsonb_build_object('ok', false, 'error', 'missing_guest_id');
    end if;
  end if;

  -- Antispam por cuenta o invitado
  select count(*) into v_recent
    from public.feedback f
   where f.created_at > now() - interval '10 minutes'
     and ((v_uid is not null and f.user_id = v_uid) or (v_uid is null and f.guest_id = p_guest_id));
  if v_recent >= 3 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  -- Antispam por IP
  if v_ip_hash is not null then
    select count(*) into v_recent
      from public.feedback f
     where f.ip_hash = v_ip_hash
       and f.created_at > now() - interval '10 minutes';
    if v_recent >= 10 then
      return jsonb_build_object('ok', false, 'error', 'rate_limited');
    end if;
  end if;

  insert into public.feedback (account_kind, user_id, guest_id, display_name, ronin_address, source, message, context, ip_hash)
  values (v_kind, v_uid, p_guest_id, v_name, v_ronin, v_source, v_msg, v_ctx, v_ip_hash)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.submit_feedback(text, text, uuid, jsonb) from public;
grant execute on function public.submit_feedback(text, text, uuid, jsonb) to anon, authenticated;
