-- Optional bilingual size variants with an LBP price for each size.
begin;

alter table public.menu_items
  add column if not exists variants jsonb not null default '[]'::jsonb;

alter table public.menu_items
  drop constraint if exists menu_items_variants_valid;
alter table public.menu_items
  add constraint menu_items_variants_valid check (
    jsonb_typeof(variants) = 'array' and jsonb_array_length(variants) <= 12
  );

create or replace function private.validate_item_variants(p_variants jsonb)
returns void
language plpgsql
immutable
set search_path = pg_temp
as $$
declare
  variant jsonb;
  variant_price numeric;
begin
  if p_variants is null or jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) > 12 then
    raise exception using errcode = '22023', message = 'INVALID_VARIANTS';
  end if;
  for variant in select value from jsonb_array_elements(p_variants)
  loop
    if jsonb_typeof(variant) <> 'object'
      or length(btrim(coalesce(variant->>'name_en', ''))) not between 1 and 60
      or length(btrim(coalesce(variant->>'name_ar', ''))) not between 1 and 60
      or coalesce(variant->>'price_lbp', '') !~ '^[0-9]+$'
    then
      raise exception using errcode = '22023', message = 'INVALID_VARIANT';
    end if;
    variant_price := (variant->>'price_lbp')::numeric;
    if variant_price not between 1 and 1000000000 or trunc(variant_price) <> variant_price then
      raise exception using errcode = '22023', message = 'INVALID_VARIANT_PRICE';
    end if;
  end loop;
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
  p_variants jsonb,
  p_available boolean
)
returns public.menu_items
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare result public.menu_items;
begin
  perform private.require_admin_session(p_session_token);
  perform private.validate_item(p_category, p_name_en, p_name_ar, p_description_en, p_description_ar, p_price_lbp);
  perform private.validate_item_variants(coalesce(p_variants, '[]'::jsonb));
  if not exists (select 1 from public.menu_categories where id = p_category) then
    raise exception using errcode = '22023', message = 'INVALID_CATEGORY';
  end if;
  insert into public.menu_items (
    category, name_en, name_ar, description_en, description_ar,
    price_lbp, variants, available
  ) values (
    p_category, btrim(p_name_en), btrim(p_name_ar),
    btrim(coalesce(p_description_en, '')), btrim(coalesce(p_description_ar, '')),
    p_price_lbp, coalesce(p_variants, '[]'::jsonb), coalesce(p_available, true)
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
  p_variants jsonb,
  p_available boolean
)
returns public.menu_items
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare result public.menu_items;
begin
  perform private.require_admin_session(p_session_token);
  perform private.validate_item(p_category, p_name_en, p_name_ar, p_description_en, p_description_ar, p_price_lbp);
  perform private.validate_item_variants(coalesce(p_variants, '[]'::jsonb));
  if not exists (select 1 from public.menu_categories where id = p_category) then
    raise exception using errcode = '22023', message = 'INVALID_CATEGORY';
  end if;
  update public.menu_items set
    category = p_category,
    name_en = btrim(p_name_en),
    name_ar = btrim(p_name_ar),
    description_en = btrim(coalesce(p_description_en, '')),
    description_ar = btrim(coalesce(p_description_ar, '')),
    price_lbp = p_price_lbp,
    variants = coalesce(p_variants, '[]'::jsonb),
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

revoke all on function public.admin_create_item(text, text, text, text, text, text, bigint, jsonb, boolean) from public;
revoke all on function public.admin_update_item(text, uuid, timestamptz, text, text, text, text, text, bigint, jsonb, boolean) from public;
grant execute on function public.admin_create_item(text, text, text, text, text, text, bigint, jsonb, boolean) to anon, authenticated;
grant execute on function public.admin_update_item(text, uuid, timestamptz, text, text, text, text, text, bigint, jsonb, boolean) to anon, authenticated;

commit;
