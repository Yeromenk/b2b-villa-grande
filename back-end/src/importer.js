import robotsParser from 'robots-parser';
import {setTimeout as delay} from 'node:timers/promises';
import {fetchPage, userAgent, validateUrl} from './fetch-page.js';
import {parseProducts} from './parser.js';

export function validateSources(sources) {
    if (!Array.isArray(sources) || !sources.length) throw new Error('Configure at least one source');
    const ids = new Set();
    for (const source of sources) {
        if (!source.id || typeof source.id !== 'string' || ids.has(source.id)) throw new Error(
            'Source IDs must be unique nonempty strings');
        ids.add(source.id);
        if (typeof source.name !== 'string' || !source.name.trim()) throw new Error('Source name is required');
        if (!['Сантехніка', 'Двері'].includes(source.department)) throw new Error('Invalid source department');
        if (source.segment && !['Бюджет', 'Медіум', 'Преміум'].includes(source.segment)) throw new Error(
            'Invalid segment');
        const origin = validateUrl(source.origin).origin;
        if (origin !== source.origin) throw new Error('Source origin must contain only scheme and hostname');
        if (!Array.isArray(source.urls) || !source.urls.length || source.urls.length > 100) throw new Error(
            'Provide 1–100 product URLs per source');
        source.urls.forEach((url) => validateUrl(url, origin));
    }
}

export async function runImport(sources,
                                store,
                                fetcher = fetchPage,
                                sleep = delay) {
    validateSources(sources);
    const report = {
        startedAt: new Date().toISOString(),
        imported : 0,
        errors   : []
    };
    for (const source of sources) {
        try {
            const robotsUrl = `${source.origin}/robots.txt`;
            const response = await fetcher(robotsUrl, source.origin);
            if (response.status !== 404 && response.status !== 200) throw new Error(
                `robots.txt returned HTTP ${response.status}`);
            const robots = robotsParser(robotsUrl, response.status === 404 ? '' : response.body);
            const interval = Math.max(1000, (robots.getCrawlDelay(userAgent) || 0) * 1000);
            if (interval > 60_000) throw new Error('Crawl delay exceeds 60 seconds; use a dedicated scheduled adapter');
            for (const url of [...new Set(source.urls)]) {
                try {
                    if (robots.isAllowed(url, userAgent) === false) throw new Error('Disallowed by robots.txt');
                    await sleep(interval);
                    // No automatic product redirects: their robots policy must be checked before requesting them.
                    const page = await fetcher(url, source.origin, 3);
                    if (page.status !== 200) throw new Error(`HTTP ${page.status}`);
                    const result = parseProducts(page.body, page.url || url, source);
                    store.save(result.products);
                    report.imported += result.products.length;
                    result.errors.forEach((error) => report.errors.push({
                        sourceId: source.id,
                        url,
                        error
                    }));
                } catch (error) {
                    report.errors.push({
                        sourceId: source.id,
                        url,
                        error   : error.message
                    });
                }
            }
        } catch (error) {
            report.errors.push({
                sourceId: source.id,
                error   : error.message
            });
        }
    }
    report.finishedAt = new Date().toISOString();
    store.record(report);
    return report;
}
