import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createStore } from '../src/store.js';
import { createApi } from '../src/server.js';

test('orders persist, snapshot products, isolate identical/empty articles, validate totals and reject stale writes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'vg-orders-'));
  const path = join(dir, 'catalog.sqlite');
  let store = createStore(path);
  const server = createApi(store);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, method = 'GET', body, headers = {}) => {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, ...(await response.json()) };
  };
  try {
    store.save([{ sourceId: 'a', externalId: '1', name: 'Товар А', article: '', price: 100, supplier: 'A' }, { sourceId: 'b', externalId: '1', name: 'Товар Б', article: '', price: 200, supplier: 'B' }]);
    const products = store.list();
    const input = { requestId: 'request-1234567890', client: 'Олена', address: 'Львів, будинок 1', total: 99999,
      items: products.map((p) => ({ productId: p.id, quantity: 2, price: p.price, discount: 10 })) };
    const created = await request('/api/orders', 'POST', input);
    assert.equal(created.status, 201);
    assert.equal(created.order.status, 'Нове');
    assert.equal(created.order.total, 540);
    assert.equal(created.order.itemCount, 2);
    assert.notEqual(created.order.items[0].lineId, created.order.items[1].lineId);
    assert.equal(created.order.items[0].purchasePrice, null);
    assert.equal((await request('/api/orders', 'POST', input)).order.id, created.order.id);
    assert.equal((await request('/api/orders', 'POST', { ...input, client: 'Інший' })).status, 409);
    assert.equal((await request('/api/orders')).orders.length, 1);
    const items = created.order.items.map((item, index) => ({ ...item, quantity: index === 0 ? 3 : 2, total: 9999 }));
    const patch = { client: 'Олена К.', address: 'Нова адреса', status: 'В роботі', items, revision: 1 };
    const updated = await request(`/api/orders/${created.order.id}`, 'PATCH', patch);
    assert.equal(updated.status, 200);
    assert.equal(updated.order.total, 630);
    assert.equal(updated.order.items[1].quantity, 2);
    assert.equal((await request(`/api/orders/${created.order.id}`, 'PATCH', patch)).status, 409);
    assert.equal((await request(`/api/orders/${created.order.id}`, 'PATCH', { ...patch, revision: 2, items: [{ ...items[0], quantity: -1 }] })).status, 400);
    assert.equal((await request('/api/orders', 'POST', { ...input, requestId: 'request-0000000002', items: [{ ...input.items[0], price: '100' }] })).status, 400);
    assert.equal((await request('/api/orders', 'POST', input, { Origin: 'https://example.com' })).status, 403);
    const removed = await request(`/api/orders/${created.order.id}`, 'PATCH', { ...patch, revision: 2, items: [items[1]] });
    assert.equal(removed.order.itemCount, 1);
    assert.equal(removed.order.items[0].name, 'Товар Б');
    store.replaceSource('b', [], { startedAt: new Date().toISOString(), errors: [] });
    assert.equal((await request(`/api/orders/${created.order.id}`)).order.items[0].name, 'Товар Б');
    assert.equal((await request('/api/orders', 'POST', input)).order.id, created.order.id);
    await new Promise((resolve) => server.close(resolve));
    store.close(); store = createStore(path);
    const saved = store.getOrder(created.order.id);
    assert.equal(saved.status, 'В роботі');
    assert.equal(saved.client, 'Олена К.');
    assert.equal(saved.items.length, 1);
    assert.equal(saved.total, 360);
  } finally { server.close(); store.close(); rmSync(dir, { recursive: true, force: true }); }
});
