create extension if not exists pgcrypto with schema extensions;

create table if not exists public.fmv_households (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.fmv_devices (
  id uuid primary key,
  household_id uuid not null references public.fmv_households(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  platform text not null check (char_length(platform) between 1 and 40),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (auth_user_id, id)
);

create index if not exists fmv_devices_household_seen_idx
  on public.fmv_devices (household_id, last_seen_at desc);

create table if not exists public.fmv_pairing_codes (
  code_hash bytea primary key,
  household_id uuid not null references public.fmv_households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists public.fmv_sync_items (
  household_id uuid not null references public.fmv_households(id) on delete cascade,
  key text not null,
  value jsonb,
  deleted boolean not null default false,
  updated_by uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (household_id, key),
  check (
    key = any (array[
      'fmv_extra', 'fmv_ocultos', 'fmv_bloqueados', 'fmv_ocultos_det',
      'fmv_listas_ocultas', 'fmv_det_listas_ocultas', 'fmv_palabras_excluidas',
      'fmv_perfiles', 'fmv_vperfiles', 'fmv_sort_canales', 'fmv_sort_mis',
      'fmv_card_shape', 'fmv_horarios_rutina', 'fmv_modo_calma',
      'fmv_filtro_azul', 'fmv_pausas_activas'
    ]::text[])
    or key ~ '^fmv_cuenta_(hija|hijo)_(fmv_videos|fmv_videos_ocultos|limite_minutos)$'
    or key ~ '^fmv_avatar_(hija|hijo)$'
  ),
  check (not deleted or value is null)
);

create or replace function public.fmv_sync_items_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists fmv_sync_items_updated_at on public.fmv_sync_items;
create trigger fmv_sync_items_updated_at
  before insert or update on public.fmv_sync_items
  for each row execute function public.fmv_sync_items_set_updated_at();

create or replace function public.fmv_is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.fmv_devices d
    where d.household_id = p_household_id
      and d.auth_user_id = (select auth.uid())
  );
$$;

revoke all on function public.fmv_is_household_member(uuid) from public, anon;
grant execute on function public.fmv_is_household_member(uuid) to authenticated;

alter table public.fmv_households enable row level security;
alter table public.fmv_devices enable row level security;
alter table public.fmv_pairing_codes enable row level security;
alter table public.fmv_sync_items enable row level security;

drop policy if exists fmv_devices_read_household on public.fmv_devices;
create policy fmv_devices_read_household
  on public.fmv_devices for select to authenticated
  using (auth_user_id = (select auth.uid()) or public.fmv_is_household_member(household_id));

drop policy if exists fmv_devices_update_self on public.fmv_devices;
create policy fmv_devices_update_self
  on public.fmv_devices for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

drop policy if exists fmv_sync_items_read_household on public.fmv_sync_items;
create policy fmv_sync_items_read_household
  on public.fmv_sync_items for select to authenticated
  using (public.fmv_is_household_member(household_id));

drop policy if exists fmv_sync_items_insert_household on public.fmv_sync_items;
create policy fmv_sync_items_insert_household
  on public.fmv_sync_items for insert to authenticated
  with check (
    public.fmv_is_household_member(household_id)
    and updated_by = (select auth.uid())
  );

drop policy if exists fmv_sync_items_update_household on public.fmv_sync_items;
create policy fmv_sync_items_update_household
  on public.fmv_sync_items for update to authenticated
  using (public.fmv_is_household_member(household_id))
  with check (
    public.fmv_is_household_member(household_id)
    and updated_by = (select auth.uid())
  );

grant select on public.fmv_devices to authenticated;
grant update (last_seen_at) on public.fmv_devices to authenticated;
grant select, insert, update on public.fmv_sync_items to authenticated;
revoke all on public.fmv_households, public.fmv_pairing_codes from anon, authenticated;

create or replace function public.fmv_create_household(
  p_device_id uuid,
  p_name text,
  p_platform text
)
returns table (household_id uuid, pairing_code text)
language plpgsql
security definer
set search_path = public, extensions, auth, pg_temp
as $$
declare
  v_household_id uuid := gen_random_uuid();
  v_pairing_code text := encode(extensions.gen_random_bytes(24), 'hex');
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;

  delete from public.fmv_pairing_codes
    where expires_at <= now() or used_at is not null;

  if exists (select 1 from public.fmv_devices d where d.id = p_device_id) then
    raise exception 'Este dispositivo ya está registrado.';
  end if;

  insert into public.fmv_households (id) values (v_household_id);
  insert into public.fmv_devices (id, household_id, auth_user_id, name, platform)
  values (
    p_device_id, v_household_id, v_user_id,
    left(trim(p_name), 60), left(trim(p_platform), 40)
  );
  insert into public.fmv_pairing_codes (code_hash, household_id, created_by, expires_at)
  values (
    extensions.digest(v_pairing_code, 'sha256'),
    v_household_id, v_user_id, now() + interval '10 minutes'
  );

  return query select v_household_id, v_pairing_code;
end;
$$;

create or replace function public.fmv_issue_pairing_code(p_device_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions, auth, pg_temp
as $$
declare
  v_household_id uuid;
  v_pairing_code text := encode(extensions.gen_random_bytes(24), 'hex');
  v_user_id uuid := auth.uid();
begin
  select d.household_id into v_household_id
  from public.fmv_devices d
  where d.id = p_device_id and d.auth_user_id = v_user_id;

  if v_household_id is null then
    raise exception 'El dispositivo no pertenece a una casa emparejada.';
  end if;

  delete from public.fmv_pairing_codes
    where expires_at <= now() or used_at is not null;
  update public.fmv_pairing_codes
    set used_at = now()
    where household_id = v_household_id and used_at is null;
  insert into public.fmv_pairing_codes (code_hash, household_id, created_by, expires_at)
  values (
    extensions.digest(v_pairing_code, 'sha256'),
    v_household_id, v_user_id, now() + interval '10 minutes'
  );
  return v_pairing_code;
end;
$$;

create or replace function public.fmv_join_household(
  p_pairing_code text,
  p_device_id uuid,
  p_name text,
  p_platform text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth, pg_temp
as $$
declare
  v_household_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or p_pairing_code is null or char_length(p_pairing_code) <> 48 then
    raise exception 'El código de emparejamiento no es válido.';
  end if;

  if exists (select 1 from public.fmv_devices d where d.id = p_device_id) then
    raise exception 'Este dispositivo ya está registrado. Desempárelo antes de vincularlo a otra casa.';
  end if;

  update public.fmv_pairing_codes
    set used_at = now()
    where code_hash = extensions.digest(p_pairing_code, 'sha256')
      and expires_at > now()
      and used_at is null
    returning household_id into v_household_id;

  if v_household_id is null then
    raise exception 'El código venció o ya fue usado. Pide uno nuevo al dispositivo principal.';
  end if;

  insert into public.fmv_devices (id, household_id, auth_user_id, name, platform)
  values (
    p_device_id, v_household_id, v_user_id,
    left(trim(p_name), 60), left(trim(p_platform), 40)
  );
  return v_household_id;
end;
$$;

create or replace function public.fmv_touch_device(p_device_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  update public.fmv_devices
    set last_seen_at = now()
    where id = p_device_id and auth_user_id = auth.uid();

  if not found then
    raise exception 'No se encontró el dispositivo autenticado.';
  end if;
end;
$$;

create or replace function public.fmv_unpair_device(p_device_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  delete from public.fmv_devices
    where id = p_device_id and auth_user_id = auth.uid();

  if not found then
    raise exception 'No se encontró el dispositivo autenticado.';
  end if;
end;
$$;

revoke all on function public.fmv_create_household(uuid, text, text) from public, anon;
revoke all on function public.fmv_issue_pairing_code(uuid) from public, anon;
revoke all on function public.fmv_join_household(text, uuid, text, text) from public, anon;
revoke all on function public.fmv_touch_device(uuid) from public, anon;
revoke all on function public.fmv_unpair_device(uuid) from public, anon;
grant execute on function public.fmv_create_household(uuid, text, text) to authenticated;
grant execute on function public.fmv_issue_pairing_code(uuid) to authenticated;
grant execute on function public.fmv_join_household(text, uuid, text, text) to authenticated;
grant execute on function public.fmv_touch_device(uuid) to authenticated;
grant execute on function public.fmv_unpair_device(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'fmv_sync_items'
  ) then
    alter publication supabase_realtime add table public.fmv_sync_items;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'fmv_devices'
  ) then
    alter publication supabase_realtime add table public.fmv_devices;
  end if;
end;
$$;
