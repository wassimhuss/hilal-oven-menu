import { AdminError } from './admin-auth';
import { InputError } from './menu-validation';
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
export async function readJson(request: Request) {
  if (Number(request.headers.get('content-length') ?? 0) > 16000)
    throw new AdminError(413, 'Item is too large.');
  const body = await request.text();
  if (new TextEncoder().encode(body).length > 16000)
    throw new AdminError(413, 'Item is too large.');
  try {
    return JSON.parse(body);
  } catch {
    throw new InputError('Invalid request.');
  }
}
export function apiError(error: unknown) {
  if (error instanceof AdminError)
    return json({ error: error.message }, error.status);
  if (error instanceof InputError) return json({ error: error.message }, 400);
  console.error(
    'Menu request failed',
    error instanceof Error ? error.message : 'Unknown error',
  );
  return json(
    { error: 'The menu service is temporarily unavailable. Please try again.' },
    503,
  );
}
