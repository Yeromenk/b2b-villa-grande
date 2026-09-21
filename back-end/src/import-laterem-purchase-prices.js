import {setTimeout as delay} from 'node:timers/promises';
import {createStore} from './store.js';
import {connectLaterem} from './laterem-browser.js';
import {parseLateremNumber, parseLateremRates} from './laterem.js';
import {lateremSections, parseSections} from './laterem-sections.js';

const sections = parseSections(process.argv.slice(2).length ? process.argv.slice(2) : ['--section', 'all']);
const startedAt = new Date().toISOString();
const browser = await connectLaterem(Number(process.env.LATEREM_BROWSER_PORT || 9222));
let store;

async function fetchPage(authorization, category, page) {
    const url = new URL('https://laterem.ua/json/v2/product-page.do/');
    url.search = new URLSearchParams({lang: 'uk', pageSize: '100', currentPage: String(page),
        orderBy: 'price', orderTypeBy: '', search: '', type: '0', exclusive: '0', category});
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(url, {headers: {Authorization: authorization, Accept: 'application/json',
                Referer: 'https://b2b.laterem.ua/'}, redirect: 'error', signal: AbortSignal.timeout(30000)});
            if (!response.ok) throw new Error(`Laterem HTTP ${response.status}`);
            const result = await response.json();
            if (result.status !== true || !Array.isArray(result.data) || Number(result.currentPage) !== page ||
                !Number.isSafeInteger(result.totalPage) || result.totalPage < 1 || result.totalPage > 2000) {
                throw new Error('Invalid Laterem response');
            }
            return result;
        } catch (error) {
            lastError = error;
            if (attempt < 3) await delay(attempt * 1000);
        }
    }
    throw new Error(`${lastError.message} on page ${page}`);
}

try {
    const authorization = await browser.authorization();
    const nav = await browser.evaluate('document.querySelector("nav")?.innerText || ""');
    const {eurUah} = parseLateremRates(nav);
    store = createStore();
    let updatedTotal = 0;
    let receivedTotal = 0;
    for (const section of sections) {
        const prices = new Map();
        const {category, department} = lateremSections[section];
        let expectedItems;
        let totalPages;
        for (let page = 1; totalPages === undefined || page <= totalPages; page++) {
            const result = await fetchPage(authorization, category, page);
            totalPages ??= result.totalPage;
            expectedItems ??= result.totalItem;
            if (result.totalPage !== totalPages || result.totalItem !== expectedItems) {
                throw new Error(`Laterem ${section} catalog changed during update; retry`);
            }
            for (const row of result.data) {
                if (!/^\d+$/.test(String(row.id)) || row.price_opt == null || String(row.price_opt).trim() === '') continue;
                const purchasePriceEur = parseLateremNumber(row.price_opt);
                if (purchasePriceEur <= 0) continue;
                prices.set(String(row.id), {externalId: String(row.id), purchasePriceEur,
                    purchasePrice: Math.round(purchasePriceEur * eurUah * 100) / 100});
            }
            if (page === 1 || page % 10 === 0 || page === totalPages) {
                console.log(`${section}: page ${page}/${totalPages}, purchase prices ${prices.size}`);
            }
        }
        const finishedAt = new Date().toISOString();
        const updated = store.updatePurchasePrices('laterem', [...prices.values()], {
            sourceId: 'laterem-purchase-prices', section, department, startedAt, finishedAt,
            errors: [], pages: totalPages, listed: expectedItems, received: prices.size, eurUah});
        updatedTotal += updated;
        receivedTotal += prices.size;
        console.log(`${section}: updated ${updated} existing products`);
    }
    console.log(JSON.stringify({sections, updated: updatedTotal, received: receivedTotal, eurUah}, null, 2));
} finally {
    browser.close();
    store?.close();
}
