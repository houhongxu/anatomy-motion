// 验证新旧结构ID共存，不迁移私人记录。 / Verify new/old IDs coexist without migrating journals.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
const supplement = JSON.parse(readFileSync(new URL('../../shared/supplemental-manifest.json', import.meta.url))).structures;
test('supplemental muscles and legacy tendon IDs retain ownership, side and persistence', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'anatomy-supplement-'));
  const dbPath = join(directory, 'records.sqlite');
  let instance, server, base;
  const open = async () => {
    instance = createApp({ dbPath, allowedOrigin: 'http://localhost:3000' });
    server = instance.app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  };
  const close = async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); instance.close(); };
  let cookie = '';
  const request = (path, body, method = 'POST') => fetch(base + path, { method, headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json', Cookie: cookie }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    await open();
    const auth = await request('/api/auth/register', { username: 'supplement_test', password: 'local-test-passphrase' });
    assert.equal(auth.status, 201); cookie = auth.headers.get('set-cookie').split(';')[0];
    assert.equal(supplement.length, 8);
    for (const s of [...supplement, { id: 'FJ1405', side: 'right' }]) {
      const r = await request('/api/records', { date: '2026-10-28', structureId: s.id, side: s.side, intensity: 3, note: 'compatibility fixture' });
      assert.equal(r.status, 200, s.id);
      assert.equal((await r.json()).record.structureId, s.id);
    }
    const mismatch = await request('/api/records', { date: '2026-10-28', structureId: supplement[0].id, side: 'midline', intensity: 2 });
    assert.equal(mismatch.status, 400);
    await close(); await open();
    const list = await request('/api/records', null, 'GET');
    assert.equal(list.status, 200); assert.equal((await list.json()).total, 9);
    cookie = '';
    assert.equal((await request('/api/records', null, 'GET')).status, 401);
  } finally { if (server?.listening) await close(); rmSync(directory, { recursive: true, force: true }); }
});
test('duplicate IDs cannot shadow a historical structure', () => {
  assert.throws(() => createApp({ dbPath: ':memory:', structures: [{ id:'same',kind:'muscle',side:'left' },{ id:'same',kind:'muscle',side:'right' }] }), /duplicate structure IDs/);
});
