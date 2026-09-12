import { createClient } from '@supabase/supabase-js';
import type {
  CategoryId,
  MenuCategory,
  MenuItem,
  MenuItemVariant,
} from './menu';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://qqetkxgtajhcfxnprxrj.supabase.co';
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  'sb_publishable_dBiMbymJqhN7HWkd3TAbdA_gUv86Hg8';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type MenuRow = {
  id: string;
  category: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  price_lbp: number;
  variants: Array<{
    name_en: string;
    name_ar: string;
    price_lbp: number;
  }> | null;
  available: boolean;
  created_at: string;
  updated_at: string;
};

type CategoryRow = {
  id: string;
  name_en: string;
  name_ar: string;
  image_position: string;
  image_path: string | null;
  created_at: string;
  updated_at: string;
};

export function menuRowToItem(row: MenuRow): MenuItem {
  return {
    id: row.id,
    category: row.category as CategoryId,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    descriptionEn: row.description_en,
    descriptionAr: row.description_ar,
    priceLbp: Number(row.price_lbp),
    variants: (row.variants ?? []).map((variant) => ({
      nameEn: variant.name_en,
      nameAr: variant.name_ar,
      priceLbp: Number(variant.price_lbp),
    })),
    available: row.available,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function categoryRowToCategory(row: CategoryRow): MenuCategory {
  return {
    id: row.id,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    imagePosition: row.image_position,
    imagePath: row.image_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as MenuRow[]).map(menuRowToItem);
}

export async function listMenuCategories(): Promise<MenuCategory[]> {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as CategoryRow[]).map(categoryRowToCategory);
}

export class AdminRequestError extends Error {
  constructor(
    public kind: 'session' | 'conflict' | 'request',
    message: string,
  ) {
    super(message);
  }
}

function rpcError(error: { message: string }): AdminRequestError {
  if (error.message.includes('INVALID_SESSION'))
    return new AdminRequestError('session', error.message);
  if (error.message.includes('ITEM_CHANGED'))
    return new AdminRequestError('conflict', error.message);
  if (
    error.message.includes('CATEGORY_CHANGED') ||
    error.message.includes('CATEGORY_IN_USE')
  )
    return new AdminRequestError('conflict', error.message);
  return new AdminRequestError('request', error.message);
}

export async function validateAdminSession(token: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_validate_session', {
    p_session_token: token,
  });
  if (error) return false;
  return data === true;
}

export async function loginAdmin(pin: string): Promise<{
  ok: boolean;
  sessionToken?: string;
  expiresAt?: string;
  reason?: string;
  retryAfterSeconds?: number;
}> {
  const { data, error } = await supabase.rpc('admin_login', { p_pin: pin });
  if (error) throw rpcError(error);
  return {
    ok: data?.ok === true,
    sessionToken: data?.session_token,
    expiresAt: data?.expires_at,
    reason: data?.reason,
    retryAfterSeconds: data?.retry_after_seconds,
  };
}

export async function logoutAdmin(token: string): Promise<void> {
  await supabase.rpc('admin_logout', { p_session_token: token });
}

type ItemInput = {
  category: CategoryId;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  priceLbp: number;
  variants: MenuItemVariant[];
  available: boolean;
};

type CategoryInput = {
  nameEn: string;
  nameAr: string;
  imagePath: string | null;
};

const itemArgs = (token: string, item: ItemInput) => ({
  p_session_token: token,
  p_category: item.category,
  p_name_en: item.nameEn,
  p_name_ar: item.nameAr,
  p_description_en: item.descriptionEn,
  p_description_ar: item.descriptionAr,
  p_price_lbp: item.priceLbp,
  p_variants: item.variants.map((variant) => ({
    name_en: variant.nameEn,
    name_ar: variant.nameAr,
    price_lbp: variant.priceLbp,
  })),
  p_available: item.available,
});

export async function createMenuItem(
  token: string,
  item: ItemInput,
): Promise<MenuItem> {
  const { data, error } = await supabase.rpc(
    'admin_create_item',
    itemArgs(token, item),
  );
  if (error) throw rpcError(error);
  return menuRowToItem(data as MenuRow);
}

export async function updateMenuItem(
  token: string,
  id: string,
  expectedUpdatedAt: string,
  item: ItemInput,
): Promise<MenuItem> {
  const { data, error } = await supabase.rpc('admin_update_item', {
    ...itemArgs(token, item),
    p_item_id: id,
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (error) throw rpcError(error);
  return menuRowToItem(data as MenuRow);
}

export async function deleteMenuItem(
  token: string,
  id: string,
  expectedUpdatedAt: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_item', {
    p_session_token: token,
    p_item_id: id,
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (error) throw rpcError(error);
}

export async function createMenuCategory(
  token: string,
  category: Omit<CategoryInput, 'imagePath'>,
): Promise<MenuCategory> {
  const { data, error } = await supabase.rpc('admin_create_category', {
    p_session_token: token,
    p_name_en: category.nameEn,
    p_name_ar: category.nameAr,
  });
  if (error) throw rpcError(error);
  return categoryRowToCategory(data as CategoryRow);
}

export async function updateMenuCategory(
  token: string,
  id: string,
  expectedUpdatedAt: string,
  category: CategoryInput,
): Promise<MenuCategory> {
  const { data, error } = await supabase.rpc(
    'admin_update_category_with_image',
    {
      p_session_token: token,
      p_category_id: id,
      p_expected_updated_at: expectedUpdatedAt,
      p_name_en: category.nameEn,
      p_name_ar: category.nameAr,
      p_image_path: category.imagePath,
    },
  );
  if (error) throw rpcError(error);
  return categoryRowToCategory(data as CategoryRow);
}

const CATEGORY_IMAGE_BUCKET = 'category-images';

export function categoryImageUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from(CATEGORY_IMAGE_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

export async function uploadCategoryImage(
  token: string,
  categoryId: string,
  file: File,
): Promise<string> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type))
    throw new Error('Choose a JPG, PNG, or WebP image.');
  if (file.size > 5 * 1024 * 1024)
    throw new Error('Choose an image smaller than 5 MB.');

  const { data, error } = await supabase.functions.invoke(
    'category-image-upload',
    {
      body: {
        sessionToken: token,
        categoryId,
        contentType: file.type,
      },
    },
  );
  if (error) throw new Error(error.message);
  if (!data?.path || !data?.token)
    throw new Error('Could not prepare the image upload.');

  const { error: uploadError } = await supabase.storage
    .from(CATEGORY_IMAGE_BUCKET)
    .uploadToSignedUrl(data.path, data.token, file, {
      cacheControl: '31536000',
      contentType: file.type,
    });
  if (uploadError) throw new Error(uploadError.message);
  return data.path as string;
}

export async function removeCategoryImage(
  token: string,
  categoryId: string,
  imagePath: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke('category-image-upload', {
    body: {
      action: 'delete',
      sessionToken: token,
      categoryId,
      imagePath,
    },
  });
  if (error) throw new Error(error.message);
}

export async function deleteMenuCategory(
  token: string,
  id: string,
  expectedUpdatedAt: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_category', {
    p_session_token: token,
    p_category_id: id,
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (error) throw rpcError(error);
}
