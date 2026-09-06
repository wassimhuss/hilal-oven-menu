import { getDb } from '@/db';
import { requireAdmin, verifyWriteRequest, AdminError } from '@/lib/admin-auth';
import { validateItem, validateRevision } from '@/lib/menu-validation';
import { json, readJson, apiError } from '@/lib/api';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  try {
    await requireAdmin();
    verifyWriteRequest(request);
    const { id } = await context.params;
    const body = await readJson(request);
    const data = validateItem(body);
    const revision = validateRevision(body.updatedAt);
    const now = Math.max(Date.now(), revision + 1);
    const result = await getDb()
      .prepare(
        'UPDATE menu_items SET category=?, name_en=?, name_ar=?, description_en=?, description_ar=?, price_lbp=?, available=?, updated_at=? WHERE id=? AND updated_at=?',
      )
      .bind(
        data.category,
        data.nameEn,
        data.nameAr,
        data.descriptionEn,
        data.descriptionAr,
        data.priceLbp,
        Number(data.available),
        now,
        id,
        revision,
      )
      .run();
    if (!result.meta.changes)
      throw new AdminError(
        409,
        'This item changed in another session. Refresh the menu and try again.',
      );
    return json({ item: { id, ...data, updatedAt: now } });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    await requireAdmin();
    verifyWriteRequest(request);
    const { id } = await context.params;
    const body = await readJson(request);
    const revision = validateRevision(body?.updatedAt);
    const result = await getDb()
      .prepare('DELETE FROM menu_items WHERE id=? AND updated_at=?')
      .bind(id, revision)
      .run();
    if (!result.meta.changes)
      throw new AdminError(
        409,
        'This item changed in another session. Refresh the menu and try again.',
      );
    return json({ deleted: id });
  } catch (error) {
    return apiError(error);
  }
}
