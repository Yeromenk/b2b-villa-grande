import {setTimeout as delay} from 'node:timers/promises';
import {lateremSections} from './laterem-sections.js';

export function parseLateremNumber(value) {
    const text = String(value ?? '')
        .replace(/[\s\u00a0\u202f]/g, '')
        .replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(text)) throw new Error('Invalid Laterem number');
    const number = Number(text);
    if (!Number.isFinite(number)) throw new Error('Invalid Laterem number');
    return number;
}

export function parseLateremRates(text) {
    const rate = (currency) => {
        const match = text.match(new RegExp(`${currency}\\s*(?:[:=]\\s*)?UAH\\s+([0-9]+(?:[.,][0-9]+)?)`, 'i'));
        return match ? parseLateremNumber(match[1]) : null;
    };
    let eurUah = rate('EUR');
    // Older Laterem navigation contains one EUR rate with only the UAH label.
    const values = [...text.matchAll(/UAH\s+([0-9]+(?:[.,][0-9]+)?)/gi)];
    if (eurUah === null && values.length === 1 && !/USD\s*(?:[:=]\s*)?UAH/i.test(text)) eurUah = parseLateremNumber(values[0][1]);
    if (!(eurUah > 0)) throw new Error('Could not identify the Laterem EUR/UAH rate');
    const usdUah = rate('USD');
    return { eurUah, ...(usdUah > 0 ? { usdUah } : {}) };
}

export function normalizeLaterem(row,
                                 eurUah,
                                 priceField = 'price_1',
                                 importedAt = new Date().toISOString(),
                                 section = 'plumbing') {
    if (!Object.hasOwn(lateremSections, section)) throw new Error('Unknown Laterem section');
    const config = lateremSections[section];
    const otherCategories = Object.values(lateremSections)
                                  .filter((item) => item.category !== '0')
                                  .map((item) => item.category);
    if (section === 'plumbing' ? otherCategories.includes(String(row.cat_id)) :
        String(row.cat_id) !== config.category) throw new Error('Product does not belong to requested section');
    if (!Number.isFinite(eurUah) || eurUah <= 0) throw new Error('Invalid EUR/UAH rate');
    if (!['price_1', 'price_opt', 'onlinePrice'].includes(priceField)) throw new Error('Invalid price field');
    if (!/^\d+$/.test(String(row.id)) || typeof row.title !== 'string' || !row.title.trim()) throw new Error(
        'Missing product ID or title');
    const priceEur = parseLateremNumber(row[priceField]);
    if (priceEur === 0) return null;
    const purchasePriceEur = row.price_opt == null || String(row.price_opt).trim() === ''
        ? null : parseLateremNumber(row.price_opt);
    const quantity = row.stock == null || row.stock === '' ? null : parseLateremNumber(row.stock);
    const image = row.img && /^\d+$/.test(String(row.cat_id))
        ? `https://laterem.ua/static/catalog_pro/${row.cat_id}/150x150/${encodeURIComponent(row.img)}` : '';
    return {
        sourceId    : 'laterem',
        externalId  : String(row.id),
        sourceUrl   : `https://b2b.laterem.ua/#/app/product/${row.id}`,
        importedAt,
        name        : row.title.trim(),
        article     : String(row.code_product || ''),
        brand       : String(row.brand || ''),
        category    : String(row.category || 'Інше'),
        department  : config.department,
        supplier    : 'Laterem',
        section,
        price       : Math.round(priceEur * eurUah * 100) / 100,
        currency    : 'UAH',
        priceEur,
        purchasePriceEur: purchasePriceEur > 0 ? purchasePriceEur : null,
        purchasePrice: purchasePriceEur > 0 ? Math.round(purchasePriceEur * eurUah * 100) / 100 : null,
        eurUah,
        priceField,
        stock       : quantity === null ? 'Наявність невідома' : quantity > 0 ? 'В наявності' : 'Немає в наявності',
        quantity,
        image,
        color       : '',
        segment     : 'Не визначено',
        installation: '',
    };
}

export async function collectLaterem(fetchPage,
                                     {
                                         eurUah,
                                         priceField = 'price_1',
                                         section = 'plumbing',
                                         sleep = delay,
                                         progress = () => {
                                         }
                                     }) {
    const products = new Map();
    const seen = new Set();
    const importedAt = new Date().toISOString();
    let total = null;
    let skipped = 0;
    for (let page = 1; page <= 2000; page++) {
        if (page > 1) await sleep(1000);
        const result = await fetchPage(page);
        if (result.status !== true || !Array.isArray(result.data) || !Number.isInteger(result.totalItem)
            || !Number.isInteger(result.totalPage) || result.totalPage < 1 || result.totalPage > 2000
            || Number(result.currentPage) !== page) throw new Error(`Invalid Laterem response on page ${page}`);
        if (total === null) total = result.totalItem;
        if (total !== result.totalItem) throw new Error('Laterem catalog changed during import; retry');
        for (const row of result.data) {
            if (seen.has(String(row.id))) throw new Error('Duplicate product across pages; retry the import');
            seen.add(String(row.id));
            const product = normalizeLaterem(row, eurUah, priceField, importedAt, section);
            if (product) products.set(product.externalId, product); else skipped++;
        }
        progress({
            page,
            pages   : result.totalPage,
            received: seen.size,
            total
        });
        if (page === result.totalPage) {
            if (seen.size !== total) throw new Error('Incomplete Laterem catalog; existing data was preserved');
            return {
                products: [...products.values()],
                skipped,
                total
            };
        }
        if (!result.data.length) throw new Error('Unexpected empty Laterem page');
    }
    throw new Error('Laterem page limit exceeded');
}
