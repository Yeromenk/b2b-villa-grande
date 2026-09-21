import {load} from 'cheerio';

const label = (value) => typeof value === 'string' ? value.trim() :
    typeof value?.name === 'string' ? value.name.trim() : '';
const array = (value) => Array.isArray(value) ? value : value ? [value] : [];

function webUrl(value,
                base) {
    if (!value) return '';
    try {
        const url = new URL(value, base);
        return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch {
        return '';
    }
}

export function parseProducts(html,
                              pageUrl,
                              source) {
    const $ = load(html);
    const nodes = [];
    const walk = (value) => {
        if (!value || typeof value !== 'object') return;
        if (array(value['@type'])
            .some((type) => /(^|[/#])Product$/.test(type))) nodes.push(value);
        for (const child of Object.values(value)) if (typeof child === 'object') {
            if (Array.isArray(child)) child.forEach(walk); else walk(child);
        }
    };
    $('script[type="application/ld+json"]')
        .each((_,
               element) => {
            try {
                walk(JSON.parse($(element)
                    .text()));
            } catch { /* Other broken metadata must not hide valid Product blocks. */
            }
        });
    const products = new Map();
    const errors = [];
    for (const node of nodes) {
        try {
            const offer = array(node.offers)
                .find((item) => item.price !== undefined && item.priceCurrency === 'UAH');
            if (!offer) throw new Error('Expected an Offer with an explicit UAH price');
            const rawPrice = String(offer.price)
                .trim();
            if (!/^\d+(\.\d+)?$/.test(rawPrice)) throw new Error('Invalid price');
            const price = Number(rawPrice);
            if (!Number.isFinite(price) || price < 0) throw new Error('Invalid price');
            const name = label(node.name);
            if (!name) throw new Error('Missing product name');
            const article = label(node.sku) || label(node.mpn);
            const sourceUrl = webUrl(node.url, pageUrl) || pageUrl;
            const externalId = article || sourceUrl;
            const image = array(node.image)[0];
            const availability = String(offer.availability || '')
                .split(/[/#]/)
                .pop();
            const stock = availability === 'InStock' || availability === 'LimitedAvailability' ? 'В наявності'
                : availability === 'PreOrder' || availability === 'BackOrder' ? 'Під замовлення'
                    : availability === 'OutOfStock' || availability === 'SoldOut' || availability === 'Discontinued' ?
                        'Немає в наявності' : 'Наявність невідома';
            products.set(externalId, {
                sourceId    : source.id,
                externalId,
                sourceUrl,
                importedAt  : new Date().toISOString(),
                name,
                article,
                price,
                currency    : 'UAH',
                stock,
                brand       : label(node.brand),
                category    : source.category || label(node.category) || 'Інше',
                color       : label(node.color),
                supplier    : source.name,
                segment     : source.segment || 'Не визначено',
                installation: source.installation || '',
                department  : source.department,
                image       : webUrl(typeof image === 'string' ? image : image?.url, pageUrl),
            });
        } catch (error) {
            errors.push(`${label(node.name) || 'Product'}: ${error.message}`);
        }
    }
    if (!nodes.length) errors.push('No JSON-LD Product data found; this site needs a dedicated adapter');
    return {
        products: [...products.values()],
        errors
    };
}
