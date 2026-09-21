import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProductImage} from '../src/product-images.js';

test('PDF images use stored supplier URLs and preserve image bytes', async () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const image = await loadProductImage({image: 'https://laterem.ua/static/test.jpg'}, async (url, origin, redirects, options) => {
        assert.equal(url, 'https://laterem.ua/static/test.jpg');
        assert.equal(origin, 'https://laterem.ua');
        assert.equal(redirects, 0);
        assert.deepEqual(options, {binary: true});
        return {status: 200, headers: {'content-type': 'image/jpeg; charset=binary'}, body: bytes};
    });
    assert.equal(image.contentType, 'image/jpeg');
    assert.deepEqual(image.body, bytes);
});

test('PDF image requests reject missing images, other hosts, HTML and failed downloads', async () => {
    const noFetch = async () => { assert.fail('Disallowed image must not be fetched'); };
    for (const image of ['', 'http://laterem.ua/a.jpg', 'https://localhost/a.jpg', 'https://laterem.ua.attacker.test/a.jpg', 'https://user:pass@laterem.ua/a.jpg']) {
        await assert.rejects(loadProductImage({image}, noFetch));
    }
    await assert.rejects(loadProductImage({image: 'https://ceramamarket.com/a.jpg'}, async () => ({status: 200, headers: {'content-type': 'text/html'}, body: Buffer.from('<html>')})), /недоступне/);
    await assert.rejects(loadProductImage({image: 'https://ceramamarket.com/a.jpg'}, async () => { throw new Error('Timeout'); }), /завантажити/);
});
