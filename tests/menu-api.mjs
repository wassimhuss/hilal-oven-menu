import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
assert.equal(
  new URL(base).hostname,
  'localhost',
  'These tests only run against the local development site.',
);
const admin = { Cookie: '__sites_local_auth=1' };
async function call(
  path,
  {
    method = 'GET',
    body,
    auth = false,
    origin = base,
    contentType = 'application/json',
    headers = {},
  } = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(auth ? admin : {}),
      ...(method !== 'GET'
        ? { Origin: origin, 'Content-Type': contentType }
        : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { error: raw };
  }
  return { status: response.status, headers: response.headers, data };
}
const draft = {
  category: 'manakish',
  nameEn: 'Verification item',
  nameAr: 'صنف للتحقق',
  descriptionEn: 'Za’atar & olive oil <script>text</script>',
  descriptionAr: 'زعتر وزيت زيتون',
  priceLbp: 150000,
  available: true,
};
let item;
try {
  const publicMenu = await call('/api/menu');
  assert.equal(publicMenu.status, 200);
  assert.equal(publicMenu.headers.get('cache-control'), 'no-store');
  for (const [path, method] of [
    ['/api/admin/items', 'GET'],
    ['/api/admin/items', 'POST'],
    ['/api/admin/items/fake-id', 'PUT'],
    ['/api/admin/items/fake-id', 'DELETE'],
  ]) {
    const result = await call(path, {
      method,
      body: method === 'GET' ? undefined : draft,
    });
    assert.equal(result.status, 401, `${method} rejects anonymous visitors`);
  }
  const spoof = await call('/api/admin/items', {
    headers: {
      'oai-authenticated-user-id': 'local_seedy',
      'oai-authenticated-user-email': 'seedy@sites.test',
    },
  });
  assert.equal(spoof.status, 401, 'Spoofed identity headers are rejected');
  assert.equal(
    (
      await call('/api/admin/items', {
        method: 'POST',
        body: draft,
        auth: true,
        origin: 'https://untrusted.example',
      })
    ).status,
    403,
    'Cross-origin edits rejected',
  );
  assert.equal(
    (
      await call('/api/admin/items', {
        method: 'POST',
        body: draft,
        auth: true,
        contentType: 'text/plain',
      })
    ).status,
    415,
    'Non-JSON writes rejected',
  );
  for (const patch of [
    { priceLbp: 0 },
    { priceLbp: -1 },
    { priceLbp: 1.5 },
    { priceLbp: '150000' },
    { priceLbp: 1000000001 },
    { nameAr: '  ' },
    { nameEn: 'x'.repeat(121) },
    { category: 'unknown' },
    { available: 'yes' },
    { descriptionAr: 'x'.repeat(501) },
  ]) {
    assert.equal(
      (
        await call('/api/admin/items', {
          method: 'POST',
          body: { ...draft, ...patch },
          auth: true,
        })
      ).status,
      400,
      'Invalid data rejected',
    );
  }
  const create = await call('/api/admin/items', {
    method: 'POST',
    body: draft,
    auth: true,
  });
  assert.equal(create.status, 201);
  item = create.data.item;
  assert.ok(item.id);
  assert.equal(item.priceLbp, 150000);
  const fresh = await call('/api/menu');
  const published = fresh.data.items.find((i) => i.id === item.id);
  assert.deepEqual(
    published,
    item,
    'Created item is shared with anonymous visitors',
  );
  const original = item;
  const update = await call(`/api/admin/items/${item.id}`, {
    method: 'PUT',
    body: {
      ...item,
      nameEn: 'Updated verification item',
      nameAr: 'صنف تحقق معدّل',
      priceLbp: 200000,
      available: false,
    },
    auth: true,
  });
  assert.equal(update.status, 200);
  item = { ...item, ...update.data.item };
  assert.ok(item.updatedAt > original.updatedAt);
  const stale = await call(`/api/admin/items/${item.id}`, {
    method: 'PUT',
    body: { ...original, priceLbp: 123 },
    auth: true,
  });
  assert.equal(stale.status, 409, 'Stale editor cannot overwrite another edit');
  assert.equal(
    (
      await call(`/api/admin/items/${item.id}`, {
        method: 'DELETE',
        body: { updatedAt: original.updatedAt },
        auth: true,
      })
    ).status,
    409,
    'Stale deletion is rejected',
  );
  const changed = (await call('/api/menu')).data.items.find(
    (i) => i.id === item.id,
  );
  assert.equal(changed.priceLbp, 200000);
  assert.equal(changed.available, false);
  assert.equal(changed.nameAr, 'صنف تحقق معدّل');
  assert.equal(changed.descriptionEn, draft.descriptionEn);
  const removed = await call(`/api/admin/items/${item.id}`, {
    method: 'DELETE',
    body: { updatedAt: item.updatedAt },
    auth: true,
  });
  assert.equal(removed.status, 200);
  assert.ok(
    !(await call('/api/menu')).data.items.some((i) => i.id === item.id),
    'Deleted item removed for new visitors',
  );
  item = null;
  assert.equal(
    (await call('/api/menu')).data.items.length,
    publicMenu.data.items.length,
    'Verification leaves the menu unchanged',
  );
  console.log(
    'PASS: public loading, anonymous and spoofed identity denial, cross-origin protection, validation, bilingual CRUD, availability, conflict protection, and cleanup.',
  );
} finally {
  if (item) {
    const current = (
      await call('/api/admin/items', { auth: true })
    ).data.items.find((i) => i.id === item.id);
    if (current)
      await call(`/api/admin/items/${item.id}`, {
        method: 'DELETE',
        body: { updatedAt: current.updatedAt },
        auth: true,
      });
  }
}
