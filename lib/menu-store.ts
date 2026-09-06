import { getDb } from '@/db';
import type { MenuItem } from './menu';
export const columns =
  'id, category, name_en AS nameEn, name_ar AS nameAr, description_en AS descriptionEn, description_ar AS descriptionAr, price_lbp AS priceLbp, available, created_at AS createdAt, updated_at AS updatedAt';
export function toItem(
  row: Omit<MenuItem, 'available'> & { available: number | boolean },
): MenuItem {
  return { ...row, available: !!row.available };
}
export async function listItems() {
  const { results } = await getDb()
    .prepare(`SELECT ${columns} FROM menu_items ORDER BY created_at, id`)
    .all<Omit<MenuItem, 'available'> & { available: number }>();
  return results.map(toItem);
}
