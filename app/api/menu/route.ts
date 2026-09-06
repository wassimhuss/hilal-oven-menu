import { listItems } from '@/lib/menu-store';
import { json, apiError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return json({ items: await listItems() });
  } catch (error) {
    return apiError(error);
  }
}
