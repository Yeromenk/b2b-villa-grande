import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCeramaPage, collectCerama } from '../src/ceramamarket.js';

const fixture = (price = '1 234.<span>50</span>', dimension = 'грн/м2', next = '') => `
  ${next}<a href="https://ceramamarket.com/plutka/keramogranit">Керамограніт</a>
  <div class="products-list"><div class="product-card">
    <a class="product-card__title" href="https://ceramamarket.com/plutka/keramogranit/tile">Tile &amp; more</a>
    <span class="like-btn" data-id="42"></span><div class="product-card__old-price">2000</div>
    <div class="product-card__price">${price}</div><div class="product-card__dimension">${dimension}</div>
    <div class="product-card__warning">В наявності</div>
    <div class="product-card__producer"><span class="producer__name">Brand</span></div>
    <div class="product-card__collection product-card__producer"><span class="producer__name">Collection</span></div>
    <div class="product-card__img"><img src="/image.webp"></div>
  </div></div>`;
test('Ceramamarket preserves current UAH price, unit, stable ID and category without inventing SKU', () => {
  const { products } = parseCeramaPage(fixture(), 'tiles');
  assert.equal(products[0].price, 1234.5);
  assert.equal(products[0].unit, 'м²');
  assert.equal(products[0].category, 'Керамограніт');
  assert.equal(products[0].brand, 'Brand');
  assert.equal(products[0].name, 'Tile & more');
  assert.equal(products[0].article, '');
  assert.equal(products[0].sourceId, 'ceramamarket');
  assert.equal(products[0].externalId, '42');
  assert.equal(products[0].stock, 'В наявності');
  assert.equal(parseCeramaPage(fixture('0'), 'tiles').skipped, 1);
  assert.throws(() => parseCeramaPage(fixture('bad'), 'tiles'), /price/);
  assert.throws(() => parseCeramaPage(fixture('1', 'EUR/м2'), 'tiles'), /UAH/);
  assert.throws(() => parseCeramaPage(fixture(), 'plumbing'), /another section/);
  const missingLink = fixture().replace('href="https://ceramamarket.com/plutka/keramogranit/tile"', 'href=""');
  const unclassified = parseCeramaPage(missingLink, 'tiles').products[0];
  assert.equal(unclassified.category, 'Інше');
  assert.equal(unclassified.externalId, '42');
  assert.equal(unclassified.price, 1234.5);
});
test('Ceramamarket fails closed for blocked robots, missing cards and bad pagination', async () => {
  await assert.rejects(collectCerama('tiles', { fetcher: async () => ({ status: 200, body: 'User-agent: *\nDisallow: /' }), sleep: async () => {} }), /Disallowed/);
  assert.throws(() => parseCeramaPage('<html>Login required</html>', 'tiles'), /No product/);
  assert.throws(() => parseCeramaPage(fixture('1', 'грн/шт', '<link rel="next" href="https://example.com/page=2">'), 'tiles'), /Unexpected/);
  const urls = [];
  const result = await collectCerama('tiles', { sleep: async () => {}, fetcher: async (url) => {
    urls.push(url); return { status: 200, body: url.endsWith('robots.txt') ? 'User-agent: *' : fixture() };
  } });
  assert.equal(result.products.length, 1);
  assert.match(urls[1], /on_page=150&page=1/);
});
