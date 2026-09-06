-- Hilal Oven menu schema for Supabase.
-- Run this file once in Supabase SQL Editor, then run the one-time PIN hash
-- statement generated locally. Never store the four-digit PIN in this file.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in ('manakish', 'croissants', 'soiree', 'pizza', 'drinks')
  ),
  name_en text not null check (length(btrim(name_en)) between 1 and 120),
  name_ar text not null check (length(btrim(name_ar)) between 1 and 120),
  description_en text not null default '' check (length(description_en) <= 500),
  description_ar text not null default '' check (length(description_ar) <= 500),
  price_lbp bigint not null check (price_lbp between 1 and 1000000000),
  available boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table if not exists private.admin_config (
  id smallint primary key check (id = 1),
  pin_hash text,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default clock_timestamp()
);

insert into private.admin_config (id)
values (1)
on conflict (id) do nothing;

create table if not exists private.admin_sessions (
  token_hash bytea primary key,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null
);

alter table public.menu_items enable row level security;

drop policy if exists "Public can read the menu" on public.menu_items;
create policy "Public can read the menu"
on public.menu_items
for select
to anon, authenticated
using (true);

revoke all on table public.menu_items from anon, authenticated;
grant select on table public.menu_items to anon, authenticated;
revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;

create or replace function private.session_is_valid(p_session_token text)
returns boolean
language sql
security definer
set search_path = private, extensions, pg_temp
as $$
  select
    p_session_token is not null
    and p_session_token ~ '^[0-9a-f]{64}$'
    and exists (
      select 1
      from private.admin_sessions
      where token_hash = extensions.digest(p_session_token, 'sha256')
        and expires_at > clock_timestamp()
    );
$$;

create or replace function private.require_admin_session(p_session_token text)
returns void
language plpgsql
security definer
set search_path = private, extensions, pg_temp
as $$
begin
  if not private.session_is_valid(p_session_token) then
    raise exception using errcode = 'P0001', message = 'INVALID_SESSION';
  end if;
end;
$$;

create or replace function public.admin_login(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  cfg private.admin_config%rowtype;
  new_token text;
  new_expiry timestamptz;
  remaining_seconds integer;
begin
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_PIN');
  end if;

  select * into cfg
  from private.admin_config
  where id = 1
  for update;

  if cfg.pin_hash is null then
    return jsonb_build_object('ok', false, 'reason', 'NOT_CONFIGURED');
  end if;

  if cfg.locked_until is not null and cfg.locked_until > clock_timestamp() then
    remaining_seconds := greatest(
      1,
      ceil(extract(epoch from (cfg.locked_until - clock_timestamp())))::integer
    );
    return jsonb_build_object(
      'ok', false,
      'reason', 'LOCKED',
      'retry_after_seconds', remaining_seconds
    );
  end if;

  if extensions.crypt(p_pin, cfg.pin_hash) <> cfg.pin_hash then
    update private.admin_config
    set
      failed_attempts = case when cfg.failed_attempts + 1 >= 5 then 0 else cfg.failed_attempts + 1 end,
      locked_until = case
        when cfg.failed_attempts + 1 >= 5 then clock_timestamp() + interval '15 minutes'
        else null
      end,
      updated_at = clock_timestamp()
    where id = 1;
    return jsonb_build_object(
      'ok', false,
      'reason', case when cfg.failed_attempts + 1 >= 5 then 'LOCKED' else 'INVALID_PIN' end,
      'retry_after_seconds', case when cfg.failed_attempts + 1 >= 5 then 900 else null end
    );
  end if;

  update private.admin_config
  set failed_attempts = 0, locked_until = null, updated_at = clock_timestamp()
  where id = 1;

  delete from private.admin_sessions where expires_at <= clock_timestamp();
  new_token := encode(extensions.gen_random_bytes(32), 'hex');
  new_expiry := clock_timestamp() + interval '2 hours';
  insert into private.admin_sessions (token_hash, expires_at)
  values (extensions.digest(new_token, 'sha256'), new_expiry);

  return jsonb_build_object(
    'ok', true,
    'session_token', new_token,
    'expires_at', new_expiry
  );
end;
$$;

create or replace function public.admin_validate_session(p_session_token text)
returns boolean
language sql
security definer
set search_path = public, private, extensions, pg_temp
as $$
  select private.session_is_valid(p_session_token);
$$;

create or replace function public.admin_logout(p_session_token text)
returns void
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
begin
  if p_session_token is not null then
    delete from private.admin_sessions
    where token_hash = extensions.digest(p_session_token, 'sha256');
  end if;
end;
$$;

create or replace function private.validate_item(
  p_category text,
  p_name_en text,
  p_name_ar text,
  p_description_en text,
  p_description_ar text,
  p_price_lbp bigint
)
returns void
language plpgsql
immutable
set search_path = pg_temp
as $$
begin
  if p_category is null or p_category not in ('manakish', 'croissants', 'soiree', 'pizza', 'drinks') then
    raise exception using errcode = '22023', message = 'INVALID_CATEGORY';
  end if;
  if p_name_en is null or length(btrim(p_name_en)) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'INVALID_ENGLISH_NAME';
  end if;
  if p_name_ar is null or length(btrim(p_name_ar)) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'INVALID_ARABIC_NAME';
  end if;
  if length(coalesce(p_description_en, '')) > 500 or length(coalesce(p_description_ar, '')) > 500 then
    raise exception using errcode = '22023', message = 'INVALID_DESCRIPTION';
  end if;
  if p_price_lbp is null or p_price_lbp not between 1 and 1000000000 then
    raise exception using errcode = '22023', message = 'INVALID_PRICE';
  end if;
end;
$$;

create or replace function public.admin_create_item(
  p_session_token text,
  p_category text,
  p_name_en text,
  p_name_ar text,
  p_description_en text,
  p_description_ar text,
  p_price_lbp bigint,
  p_available boolean
)
returns public.menu_items
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  result public.menu_items;
begin
  perform private.require_admin_session(p_session_token);
  perform private.validate_item(p_category, p_name_en, p_name_ar, p_description_en, p_description_ar, p_price_lbp);

  insert into public.menu_items (
    category, name_en, name_ar, description_en, description_ar, price_lbp, available
  ) values (
    p_category,
    btrim(p_name_en),
    btrim(p_name_ar),
    btrim(coalesce(p_description_en, '')),
    btrim(coalesce(p_description_ar, '')),
    p_price_lbp,
    coalesce(p_available, true)
  ) returning * into result;
  return result;
end;
$$;

create or replace function public.admin_update_item(
  p_session_token text,
  p_item_id uuid,
  p_expected_updated_at timestamptz,
  p_category text,
  p_name_en text,
  p_name_ar text,
  p_description_en text,
  p_description_ar text,
  p_price_lbp bigint,
  p_available boolean
)
returns public.menu_items
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  result public.menu_items;
begin
  perform private.require_admin_session(p_session_token);
  perform private.validate_item(p_category, p_name_en, p_name_ar, p_description_en, p_description_ar, p_price_lbp);

  update public.menu_items
  set
    category = p_category,
    name_en = btrim(p_name_en),
    name_ar = btrim(p_name_ar),
    description_en = btrim(coalesce(p_description_en, '')),
    description_ar = btrim(coalesce(p_description_ar, '')),
    price_lbp = p_price_lbp,
    available = coalesce(p_available, true),
    updated_at = clock_timestamp()
  where id = p_item_id and updated_at = p_expected_updated_at
  returning * into result;

  if result.id is null then
    raise exception using errcode = 'P0001', message = 'ITEM_CHANGED';
  end if;
  return result;
end;
$$;

create or replace function public.admin_delete_item(
  p_session_token text,
  p_item_id uuid,
  p_expected_updated_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  deleted_id uuid;
begin
  perform private.require_admin_session(p_session_token);
  delete from public.menu_items
  where id = p_item_id and updated_at = p_expected_updated_at
  returning id into deleted_id;

  if deleted_id is null then
    raise exception using errcode = 'P0001', message = 'ITEM_CHANGED';
  end if;
  return deleted_id;
end;
$$;

revoke all on function public.admin_login(text) from public;
revoke all on function public.admin_validate_session(text) from public;
revoke all on function public.admin_logout(text) from public;
revoke all on function public.admin_create_item(text, text, text, text, text, text, bigint, boolean) from public;
revoke all on function public.admin_update_item(text, uuid, timestamptz, text, text, text, text, text, bigint, boolean) from public;
revoke all on function public.admin_delete_item(text, uuid, timestamptz) from public;

grant execute on function public.admin_login(text) to anon, authenticated;
grant execute on function public.admin_validate_session(text) to anon, authenticated;
grant execute on function public.admin_logout(text) to anon, authenticated;
grant execute on function public.admin_create_item(text, text, text, text, text, text, bigint, boolean) to anon, authenticated;
grant execute on function public.admin_update_item(text, uuid, timestamptz, text, text, text, text, text, bigint, boolean) to anon, authenticated;
grant execute on function public.admin_delete_item(text, uuid, timestamptz) to anon, authenticated;
