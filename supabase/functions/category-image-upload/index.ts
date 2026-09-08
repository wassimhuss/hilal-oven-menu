import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const bucket = 'category-images';
const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST')
    return response({ error: 'Method not allowed.' }, 405);

  try {
    const { action = 'prepare', sessionToken, categoryId, contentType, imagePath } =
      await request.json();
    if (
      typeof sessionToken !== 'string' ||
      typeof categoryId !== 'string' ||
      categoryId.length > 80 ||
      (action !== 'prepare' && action !== 'delete') ||
      (action === 'prepare' &&
        (typeof contentType !== 'string' || !extensions[contentType])) ||
      (action === 'delete' &&
        (typeof imagePath !== 'string' ||
          !imagePath.startsWith(`categories/${categoryId}/`)))
    ) {
      return response({ error: 'Invalid upload request.' }, 400);
    }

    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceRoleKey)
      return response({ error: 'Image uploads are not configured.' }, 500);

    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: valid, error: sessionError } = await client.rpc(
      'admin_validate_session',
      { p_session_token: sessionToken },
    );
    if (sessionError || valid !== true)
      return response({ error: 'Your admin session has ended.' }, 401);

    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    if (action === 'delete') {
      const { error } = await admin.storage.from(bucket).remove([imagePath]);
      if (error) return response({ error: 'Could not remove image.' }, 500);
      return response({ ok: true });
    }

    const { data: category, error: categoryError } = await admin
      .from('menu_categories')
      .select('id')
      .eq('id', categoryId)
      .maybeSingle();
    if (categoryError || !category)
      return response({ error: 'Category not found.' }, 404);

    const path = `categories/${categoryId}/${crypto.randomUUID()}.${extensions[contentType]}`;
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUploadUrl(path);
    if (error || !data) return response({ error: 'Could not prepare upload.' }, 500);

    return response({ path, token: data.token });
  } catch {
    return response({ error: 'Could not prepare upload.' }, 500);
  }
});
