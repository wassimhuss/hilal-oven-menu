import { env } from 'cloudflare:workers';
import { getChatGPTUser, type ChatGPTUser } from '@/app/chatgpt-auth';
export function isAdmin(user: ChatGPTUser | null) {
  const allowed = (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return !!user && allowed.includes(user.email.trim().toLowerCase());
}
export async function requireAdmin() {
  const user = await getChatGPTUser();
  if (!user) throw new AdminError(401, 'Please sign in to manage the menu.');
  if (!isAdmin(user))
    throw new AdminError(403, 'This account does not have menu access.');
  return user;
}
export class AdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function verifyWriteRequest(request: Request) {
  const origin = request.headers.get('origin');
  if (
    !origin ||
    origin !== new URL(request.url).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new AdminError(403, 'Request not allowed.');
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    throw new AdminError(415, 'Expected a JSON request.');
}
