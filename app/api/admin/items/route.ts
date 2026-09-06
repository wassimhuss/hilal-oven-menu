import { getDb } from '@/db';
import { requireAdmin, verifyWriteRequest } from '@/lib/admin-auth';
import { validateItem } from '@/lib/menu-validation';
import { listItems } from '@/lib/menu-store';
import { json, readJson, apiError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await requireAdmin();
    return json({ items: await listItems() });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    await requireAdmin();
    verifyWriteRequest(request);
    const data = validateItem(await readJson(request));
    const id = crypto.randomUUID();
    const now = Date.now();
    await getDb()
      .prepare(
        'INSERT INTO menu_items (id, category, name_en, name_ar, description_en, description_ar, price_lbp, available, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        id,
        data.category,
        data.nameEn,
        data.nameAr,
        data.descriptionEn,
        data.descriptionAr,
        data.priceLbp,
        Number(data.available),
        now,
        now,
      )
      .run();
    return json({ item: { id, ...data, createdAt: now, updatedAt: now } }, 201);
  } catch (error) {
    return apiError(error);
  }
}
