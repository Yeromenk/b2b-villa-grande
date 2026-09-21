import {createStore} from './store.js';
import {connectLaterem} from './laterem-browser.js';
import {collectLaterem, parseLateremRates} from './laterem.js';
import {lateremSections, parseSections} from './laterem-sections.js';

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--help') {
        console.log('Usage: npm.cmd run import:laterem -- --section <name>\n');
        for (const [key, config] of Object.entries(lateremSections)) console.log(
            `${key.padEnd(12)} ${config.department}`);
        console.log(
            '\nall: refresh all five sections. Comma-separated names are supported. Default: plumbing.\nSign in using .\\open-laterem.ps1 first. Each section is saved separately; other sections are preserved.');
        return;
    }
    const keys = parseSections(args);
    const priceField = process.env.LATEREM_PRICE_FIELD || 'price_1';
    if (!['price_1', 'price_opt', 'onlinePrice'].includes(priceField)) throw new Error('Invalid LATEREM_PRICE_FIELD');
    const browser = await connectLaterem(Number(process.env.LATEREM_BROWSER_PORT || 9222));
    let store;
    try {
        const authorization = await browser.authorization();
        const nav = await browser.evaluate('document.querySelector("nav")?.innerText || ""');
        const rates = parseLateremRates(nav);
        const {eurUah} = rates;
        store = createStore();
        for (const section of keys) {
            const {
                category,
                department
            } = lateremSections[section];
            const report = {
                sourceId : 'laterem',
                section,
                department,
                startedAt: new Date().toISOString(),
                imported : 0,
                errors   : []
            };
            try {
                console.log(`Laterem ${department}: ${priceField}, EUR/UAH ${eurUah}`);
                const result = await collectLaterem(async (page) => {
                    const url = new URL('https://laterem.ua/json/v2/product-page.do/');
                    url.search = new URLSearchParams({
                        lang       : 'uk',
                        pageSize   : '100',
                        currentPage: String(page),
                        orderBy    : 'price',
                        orderTypeBy: '',
                        search     : '',
                        type       : '0',
                        exclusive  : '0',
                        category
                    });
                    const response = await fetch(url, {
                        headers : {
                            Authorization: authorization,
                            Accept       : 'application/json',
                            Referer      : 'https://b2b.laterem.ua/'
                        },
                        redirect: 'error',
                        signal  : AbortSignal.timeout(30000),
                    });
                    if (!response.ok) throw new Error(
                        `Laterem HTTP ${response.status}; sign in again for 401/403, retry later for 429`);
                    try {
                        return await response.json();
                    } catch {
                        throw new Error('Laterem returned a non-JSON response');
                    }
                }, {
                    eurUah,
                    priceField,
                    section,
                    progress: ({
                                   page,
                                   pages,
                                   received,
                                   total
                               }) => {
                        if (page === 1 || page % 10 === 0 || page === pages) console.log(
                            `${section}: page ${page}/${pages}, ${received}/${total}`);
                    },
                });
                Object.assign(report, {
                    imported        : result.products.length,
                    skippedZeroPrice: result.skipped,
                    total           : result.total,
                    ...rates,
                    priceField,
                    finishedAt      : new Date().toISOString()
                });
                store.replaceSource('laterem', result.products, report, department);
                console.log(JSON.stringify(report, null, 2));
            } catch (error) {
                report.imported = 0;
                report.errors.push(error.message);
                report.finishedAt = new Date().toISOString();
                store.record(report);
                console.error(`${section}: ${error.message}. Existing section preserved.`);
                process.exitCode = 1;
            }
        }
    } finally {
        browser.close();
        store?.close();
    }
}

main()
    .catch((error) => {
        console.error(`Laterem import failed: ${error.message}`);
        process.exitCode = 1;
    });
