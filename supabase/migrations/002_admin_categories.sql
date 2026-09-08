-- Run this after 001_menu_and_pin_admin.sql in the Supabase SQL Editor.
-- It moves menu categories from hard-coded application values into the database.

begin;

create table if not exists public.menu_categories (
  id text primary key default (
    'category-' || replace(extensions.gen_random_uuid()::text, '-', '')
  ),
  name_en text not null check (length(btrim(name_en)) between 1 and 80),
  name_ar text not null check (length(btrim(name_ar)) between 1 and 80),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

insert into public.menu_categories (id, name_en, name_ar)
values
  ('manakish', 'Manakish', 'مناقيش'),
  ('croissants', 'Croissants', 'كرواسون'),
  ('soiree', 'Soiree', 'سواريه'),
  ('pizza', 'Pizza', 'بيتزا'),
  ('drinks', 'Cold drinks', 'مشروبات باردة')
on conflict (id) do nothing;

alter table public.menu_items
  drop constraint if exists menu_items_category_check;

alter table public.menu_items
  drop constraint if exists menu_items_category_fkey;

alter table public.menu_items
  add constraint menu_items_category_fkey
  foreign key (category) references public.menu_categories(id)
  on update restrict on delete restrict;

alter table public.menu_categories enable row level security;

drop policy if exists "Public can read menu categories" on public.menu_categories;
create policy "Public can read menu categories"
on public.menu_categories
for select
to anon, authenticated
using (true);

revoke all on table public.menu_categories from anon, authenticated;
grant select on table public.menu_categories to anon, authenticated;

create or replace function private.validate_category_names(
  p_name_en text,
  p_name_ar text
)
returns void
language plpgsql
immutable
set search_path = pg_temp
as $$
begin
  if p_name_en is null or length(btrim(p_name_en)) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'INVALID_ENGLISH_CATEGORY_NAME';
  end if;
  if p_name_ar is null or length(btrim(p_name_ar)) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'INVALID_ARABIC_CATEGORY_NAME';
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
  if p_category is null or length(btrim(p_category)) = 0 then
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
  if not exists (select 1 from public.menu_categories where id = p_category) then
    raise exception using errcode = '22023', message = 'INVALID_CATEGORY';
  end if;

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
  if not exists (select 1 from public.menu_categories where id = p_category) then
    raise exception using errcode = '22023', message = 'INVALID_CATEGORY';
  end if;

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

create or replace function public.admin_create_category(
  p_session_token text,
  p_name_en text,
  p_name_ar text
)
returns public.menu_categories
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  result public.menu_categories;
begin
  perform private.require_admin_session(p_session_token);
  perform private.validate_category_names(p_name_en, p_name_ar);
  insert into public.menu_categories (name_en, name_ar)
  values (btrim(p_name_en), btrim(p_name_ar))
  returning * into result;
  return result;
end;
$$;

create or replace function public.admin_update_category(
  p_session_token text,
  p_category_id text,
  p_expected_updated_at timestamptz,
  p_name_en text,
  p_name_ar text
)
returns public.menu_categories
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  result public.menu_categories;
begin
  perform private.require_admin_session(p_session_token);
  perform private.validate_category_names(p_name_en, p_name_ar);
  update public.menu_categories
  set
    name_en = btrim(p_name_en),
    name_ar = btrim(p_name_ar),
    updated_at = clock_timestamp()
  where id = p_category_id and updated_at = p_expected_updated_at
  returning * into result;
  if result.id is null then
    raise exception using errcode = 'P0001', message = 'CATEGORY_CHANGED';
  end if;
  return result;
end;
$$;

create or replace function public.admin_delete_category(
  p_session_token text,
  p_category_id text,
  p_expected_updated_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  deleted_id text;
begin
  perform private.require_admin_session(p_session_token);
  if exists (select 1 from public.menu_items where category = p_category_id) then
    raise exception using errcode = 'P0001', message = 'CATEGORY_IN_USE';
  end if;
  delete from public.menu_categories
  where id = p_category_id and updated_at = p_expected_updated_at
  returning id into deleted_id;
  if deleted_id is null then
    raise exception using errcode = 'P0001', message = 'CATEGORY_CHANGED';
  end if;
  return deleted_id;
end;
$$;

revoke all on function public.admin_create_category(text, text, text) from public;
revoke all on function public.admin_update_category(text, text, timestamptz, text, text) from public;
revoke all on function public.admin_delete_category(text, text, timestamptz) from public;
grant execute on function public.admin_create_category(text, text, text) to anon, authenticated;
grant execute on function public.admin_update_category(text, text, timestamptz, text, text) to anon, authenticated;
grant execute on function public.admin_delete_category(text, text, timestamptz) to anon, authenticated;

commit;
