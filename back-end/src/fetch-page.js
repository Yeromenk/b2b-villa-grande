import https from 'node:https';
import {lookup} from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

export const userAgent = 'VillaGrandeBot';

export function validateUrl(input,
                            origin) {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new Error(
        'Only public HTTPS URLs on port 443 are allowed');
    if (origin && url.origin !== origin) throw new Error('URL must belong to the configured source origin');
    url.hash = '';
    return url;
}

export function isPublicAddress(address) {
    const parsed = ipaddr.process(address);
    return parsed.range() === 'unicast';
}

export async function fetchPage(input,
                                origin,
                                redirects = 0,
                                {binary = false} = {}) {
    const url = validateUrl(input, origin);
    const addresses = await lookup(url.hostname.replace(/^\[|\]$/g, ''), {all: true});
    if (!addresses.length || addresses.some(({address}) => !isPublicAddress(address))) throw new Error(
        'Private or reserved network address blocked');
    const pinned = addresses[0];
    const response = await new Promise((resolve,
                                        reject) => {
        const request = https.get(url, {
            headers: {
                'User-Agent'     : userAgent,
                Accept           : binary ? 'image/png,image/jpeg,image/webp' : 'text/html,text/plain',
                'Accept-Encoding': 'identity'
            },
            lookup : (_host,
                      options,
                      callback) => options.all ? callback(null, [pinned]) :
                callback(null, pinned.address, pinned.family),
        }, (res) => {
            const chunks = [];
            let size = 0;
            res.on('data', (chunk) => {
                size += chunk.length;
                if (size > 3_000_000) request.destroy(new Error('Response exceeds 3 MB')); else chunks.push(chunk);
            });
            res.on('error', reject);
            res.on('end', () => resolve({
                status : res.statusCode,
                headers: res.headers,
                body   : binary ? Buffer.concat(chunks) : Buffer.concat(chunks).toString('utf8')
            }));
        });
        const timer = setTimeout(() => request.destroy(new Error('Request timed out')), 15_000);
        request.on('close', () => clearTimeout(timer));
        request.on('error', reject);
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirects >= 3 || !response.headers.location) throw new Error('Invalid or excessive redirects');
        return fetchPage(new URL(response.headers.location, url).href, origin, redirects + 1, {binary});
    }
    return {
        ...response,
        url: url.href
    };
}
