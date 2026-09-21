import {fetchPage, validateUrl} from './fetch-page.js';
import {orderError} from './orders.js';

// The client supplies only a stored item ID, never an arbitrary image URL.
export async function loadProductImage(item, fetcher = fetchPage) {
    if (!item?.image) throw orderError('Фото відсутнє', 404);
    let url;
    try { url = validateUrl(item.image); }
    catch { throw orderError('Непідтримувана адреса фото', 400); }
    if (!['https://laterem.ua', 'https://ceramamarket.com'].includes(url.origin)) {
        throw orderError('Непідтримуване джерело фото', 400);
    }
    let result;
    try { result = await fetcher(url.href, url.origin, 0, {binary: true}); }
    catch { throw orderError('Не вдалося завантажити фото', 502); }
    const contentType = result.headers['content-type']?.split(';')[0].trim().toLowerCase();
    if (result.status !== 200 || !['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
        throw orderError('Фото недоступне', 502);
    }
    return {contentType, body: result.body};
}
