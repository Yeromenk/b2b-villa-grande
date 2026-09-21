import test from 'node:test';
import assert from 'node:assert/strict';
import { collectLaterem, normalizeLaterem, parseLateremNumber, parseLateremRates } from '../src/laterem.js';
import { createStore } from '../src/store.js';
import { parseSections } from '../src/laterem-sections.js';

test('section selection is explicit and validates unknown CLI flags', () => {
  assert.deepEqual(parseSections([]), ['plumbing']);
  assert.deepEqual(parseSections(['--section', 'tiles,stone,spa,engineering']), ['tiles', 'stone', 'spa', 'engineering']);
  assert.equal(parseSections(['--section', 'all']).length, 5);
  assert.throws(() => parseSections(['--section', 'typo']));
  assert.throws(() => parseSections(['--typo', 'all']));
});

test('section refresh cannot delete plumbing, move an existing product, or change its ID', () => {
  const store = createStore(':memory:');
  try {
    const plumbing = normalizeLaterem(row, 52);
    const tile = normalizeLaterem({ ...row, id: '23', cat_id: '23', category: 'Плитка' }, 52, 'price_1', new Date().toISOString(), 'tiles');
    assert.equal(tile.department, 'Плитка');
    assert.throws(() => normalizeLaterem({ ...row, cat_id: '31' }, 52));
    store.save([plumbing, tile, { ...tile, externalId: 'obsolete' }]);
    const before = store.list();
    const report = { startedAt: new Date().toISOString(), errors: [] };
    store.replaceSource('laterem', [{ ...tile, price: 1 }], report, 'Плитка');
    assert.equal(store.list().length, 2);
    assert.deepEqual(store.list()[0], before[0]);
    assert.equal(store.list()[1].id, before[1].id);
    assert.throws(() => store.replaceSource('laterem', [{ ...tile, externalId: plumbing.externalId }], report, 'Плитка'), /another department/);
    assert.equal(store.list().length, 2);
    store.replaceSource('laterem', [plumbing], report, 'Сантехніка');
    assert.equal(store.list()[1].price, 1);
  } finally { store.close(); }
});

const row = { id: '12', title: 'Змішувач', code_product: 'ABC', category: 'Змішувачі', cat_id: '4', brand: 'Brand', img: 'photo.webp', price_1: '1 033,85', price_opt: '620,31', stock: 2 };
test('Laterem localized prices, currency, retail price, image and stock', () => {
  const product = normalizeLaterem(row, 52);
  assert.equal(product.price, 53760.2);
  assert.equal(product.priceEur, 1033.85);
  assert.equal(product.purchasePriceEur, 620.31);
  assert.equal(product.purchasePrice, 32256.12);
  assert.equal(normalizeLaterem({ ...row, price_opt: undefined }, 52).purchasePrice, null);
  assert.equal(normalizeLaterem({ ...row, price_opt: '' }, 52).purchasePrice, null);
  assert.equal(normalizeLaterem({ ...row, price_opt: '0' }, 52).purchasePrice, null);
  assert.throws(() => normalizeLaterem({ ...row, price_opt: 'invalid' }, 52));
  assert.equal(product.currency, 'UAH');
  assert.equal(product.stock, 'В наявності');
  assert.equal(product.image, 'https://laterem.ua/static/catalog_pro/4/150x150/photo.webp');
  assert.equal(product.externalId, '12');
  assert.equal(product.price_opt, undefined);
  assert.equal(normalizeLaterem({ ...row, stock: 0 }, 52).stock, 'Немає в наявності');
  assert.equal(normalizeLaterem({ ...row, stock: null }, 52).stock, 'Наявність невідома');
  assert.equal(parseLateremNumber('1\u00a0234,56'), 1234.56);
  assert.equal(normalizeLaterem({ ...row, price_1: '0,00' }, 52), null);
  for (const price of ['', '-2', 'NaN', '12,34,56']) assert.throws(() => normalizeLaterem({ ...row, price_1: price }, 52));
  assert.throws(() => normalizeLaterem(row, 0));
});

const page = (currentPage, data, totalItem = 2) => ({ status: true, currentPage, data, totalItem, totalPage: 2 });
const options = { eurUah: 52, sleep: async () => {} };
test('collects every page, accounts for zero prices and rejects partial or repeated pages', async () => {
  const result = await collectLaterem(async (n) => page(n, [{ ...row, id: String(n), price_1: n === 2 ? '0,00' : row.price_1 }]), options);
  assert.equal(result.products.length, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.total, 2);
  await assert.rejects(collectLaterem(async (n) => page(n, [row]), options), /Duplicate/);
  await assert.rejects(collectLaterem(async (n) => page(n, n === 1 ? [row] : []), options), /Incomplete/);
  await assert.rejects(collectLaterem(async (n) => page(n, [{ ...row, id: String(n) }], n === 1 ? 2 : 3), options), /changed/);
  await assert.rejects(collectLaterem(async () => ({ status: false }), options), /Invalid/);
});

test('source refresh preserves IDs and other suppliers; transaction rollback preserves catalog and rate', () => {
  const store = createStore(':memory:');
  try {
    const product = normalizeLaterem(row, 52);
    const report = { startedAt: new Date().toISOString(), eurUah: 52, errors: [] };
    store.save([product, { ...product, externalId: 'old' }, { ...product, sourceId: 'another' }]);
    const id = store.list()[0].id;
    store.replaceSource('laterem', [{ ...product, price: 100 }], report);
    assert.equal(store.list().length, 2);
    assert.equal(store.list()[0].id, id);
    assert.equal(store.list()[0].price, 100);
    assert.deepEqual(store.exchangeRates(), { eurUah: 52, usdUah: null, source: 'laterem', updatedAt: report.startedAt });
    assert.throws(() => store.replaceSource('laterem', [product, product], { ...report, eurUah: 99 }));
    assert.equal(store.list()[0].price, 100);
    assert.deepEqual(store.exchangeRates(), { eurUah: 52, usdUah: null, source: 'laterem', updatedAt: report.startedAt });
  } finally { store.close(); }
});

test('supplier rates identify currency labels and never invent a dollar rate', () => {
  assert.deepEqual(parseLateremRates('EUR UAH 52,10 USD UAH 45.20'), { eurUah: 52.1, usdUah: 45.2 });
  assert.deepEqual(parseLateremRates('USD UAH 45.20 EUR UAH 52.10'), { eurUah: 52.1, usdUah: 45.2 });
  assert.deepEqual(parseLateremRates('UAH 52'), { eurUah: 52 });
  assert.deepEqual(parseLateremRates('UAH 51.9\nUSD 1.16'), { eurUah: 51.9 });
  assert.throws(() => parseLateremRates('USD UAH 45.20'));
  assert.throws(() => parseLateremRates('UAH 45.20 UAH 52.10'));
  assert.throws(() => parseLateremRates('EUR UAH 0'));
});
