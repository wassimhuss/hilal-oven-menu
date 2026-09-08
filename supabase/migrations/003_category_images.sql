-- Run this after 002_admin_categories.sql in the Supabase SQL Editor.
-- Category images are public so customers can view the menu without signing in.
-- Upload permission stays server-side in the Edge Function.

begin;

alter table public.menu_categories
  add column if not exists image_path text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'category-images',
  'category-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.admin_update_category_with_image(
  p_session_token text,
  p_category_id text,
  p_expected_updated_at timestamptz,
  p_name_en text,
  p_name_ar text,
  p_image_path text
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
  if p_image_path is not null and p_image_path !~ '^categories/[a-z0-9-]+/[0-9a-f-]+\.(jpg|png|webp)$' then
    raise exception using errcode = '22023', message = 'INVALID_CATEGORY_IMAGE';
  end if;

  update public.menu_categories
  set
    name_en = btrim(p_name_en),
    name_ar = btrim(p_name_ar),
    image_path = p_image_path,
    updated_at = clock_timestamp()
  where id = p_category_id and updated_at = p_expected_updated_at
  returning * into result;
  if result.id is null then
    raise exception using errcode = 'P0001', message = 'CATEGORY_CHANGED';
  end if;
  return result;
end;
$$;

revoke all on function public.admin_update_category_with_image(text, text, timestamptz, text, text, text) from public;
grant execute on function public.admin_update_category_with_image(text, text, timestamptz, text, text, text) to anon, authenticated;

commit;
