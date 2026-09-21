import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseProducts } from '../src/parser.js';
import { createStore } from '../src/store.js';
import { createApi } from '../src/server.js';
import { runImport, validateSources } from '../src/importer.js';
import { isPublicAddress, validateUrl } from '../src/fetch-page.js';

const source = { id: 'test', name: 'Supplier', origin: 'https://shop.example.com', department: 'Сантехніка', urls: ['https://shop.example.com/tap'] };
const product = { '@type': 'Product', name: 'Tap <demo>', sku: 'ABC', image: '/tap.jpg', brand: { name: 'Brand' }, offers: { price: '1234.50', priceCurrency: 'UAH', availability: 'https://schema.org/InStock' } };
const html = (node) => `<script type="application/ld+json">broken</script><script type="application/ld+json">${JSON.stringify({ '@graph': [node] })}</script>`;

test('parses graph, relative image, price and availability without inventing metadata', () => {
  const result = parseProducts(html(product), source.urls[0], source);
  assert.deepEqual(result.errors, []);
  assert.equal(result.products[0].price, 1234.5);
  assert.equal(result.products[0].image, 'https://shop.example.com/tap.jpg');
  assert.equal(result.products[0].stock, 'В наявності');
  assert.equal(result.products[0].segment, 'Не визначено');
});

test('rejects unsupported currencies and malformed prices, preserves unavailable stock', () => {
  for (const offers of [{ price: 4, priceCurrency: 'EUR' }, { price: '', priceCurrency: 'UAH' }, { price: '1,234.50', priceCurrency: 'UAH' }, { price: -1, priceCurrency: 'UAH' }]) {
    const result = parseProducts(html({ ...product, offers }), source.urls[0], source);
    assert.equal(result.products.length, 0);
    assert.equal(result.errors.length, 1);
  }
  const result = parseProducts(html({ ...product, offers: { ...product.offers, availability: 'https://schema.org/OutOfStock' } }), source.urls[0], source);
  assert.equal(result.products[0].stock, 'Немає в наявності');
  assert.equal(parseProducts('<html></html>', source.urls[0], source).errors.length, 1);
});

test('updates price without changing ID; isolates suppliers; persists across reopen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'villa-catalog-'));
  const path = join(dir, 'test.sqlite');
  let store = createStore(path);
  try {
    const parsed = parseProducts(html(product), source.urls[0], source).products[0];
    store.save([parsed]);
    const id = store.list()[0].id;
    store.save([{ ...parsed, price: 9 }, { ...parsed, sourceId: 'second' }]);
    store.close();
    store = createStore(path);
    assert.equal(store.list().length, 2);
    assert.equal(store.list()[0].id, id);
    assert.equal(store.list()[0].price, 9);
  } finally { store.close(); rmSync(dir, { recursive: true }); }
});

test('import respects robots, continues after page errors, and API returns imported records', async () => {
  const store = createStore(':memory:');
  const urls = ['/tap', '/private', '/failed'].map((path) => source.origin + path);
  const requested = [];
  const fetcher = async (url) => {
    requested.push(url);
    if (url.endsWith('/robots.txt')) return { status: 200, body: 'User-agent: *\nDisallow: /private' };
    if (url.endsWith('/failed')) return { status: 503, body: '' };
    return { status: 200, body: html(product), url };
  };
  let server;
  try {
    const report = await runImport([{ ...source, urls }], store, fetcher, async () => {});
    assert.equal(report.imported, 1);
    assert.equal(report.errors.length, 2);
    assert.ok(!requested.includes(source.origin + '/private'));
    server = createApi(store);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(base + '/api/products');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).products[0].article, 'ABC');
    assert.equal((await fetch(base + '/api/products', { method: 'POST' })).status, 405);
    assert.equal((await fetch(base + '/missing')).status, 404);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    store.close();
  }
});

test('robots fetch errors block the source', async () => {
  const store = createStore(':memory:');
  try {
    const report = await runImport([source], store, async () => ({ status: 403, body: '' }), async () => {});
    assert.equal(report.imported, 0);
    assert.equal(report.errors.length, 1);
  } finally { store.close(); }
});

test('blocks private networks, credentials, non-HTTPS and off-origin targets', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '192.168.1.1', '::1', '::ffff:127.0.0.1', 'fc00::1']) assert.equal(isPublicAddress(address), false);
  assert.equal(isPublicAddress('8.8.8.8'), true);
  for (const url of ['http://shop.example.com', 'https://user:pass@shop.example.com', 'https://shop.example.com:444', 'https://other.example.com']) assert.throws(() => validateUrl(url, source.origin));
  assert.throws(() => validateSources([source, source]));
});
