import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {createStore} from './store.js';
import {createHash} from 'node:crypto';
import {orderDraft, orderError} from './orders.js';
import {loadProductImage} from './product-images.js';

async function readJson(request) {
    if (!request.headers['content-type']?.startsWith('application/json')) throw orderError(
        'Потрібен Content-Type application/json', 415);
    if (request.headers.origin && new URL(request.headers.origin).host !== request.headers.host) throw orderError(
        'Недозволене джерело запиту', 403);
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > 1000000) throw orderError('Замовлення завелике', 413);
        chunks.push(chunk);
    }
    try {
        return JSON.parse(Buffer.concat(chunks)
                                .toString('utf8'));
    } catch {
        throw orderError('Некоректний JSON');
    }
}

export function createApi(store) {
    return createServer(async (request,
                               response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        const send = (status,
                      body) => {
            response.writeHead(status);
            response.end(JSON.stringify(body));
        };
        try {
            const url = new URL(request.url, 'http://localhost');
            const imageMatch = url.pathname.match(/^\/api\/orders\/(VG-\d+)\/items\/([a-zA-Z0-9-]+)\/image$/);
            const productImageMatch = url.pathname.match(/^\/api\/products\/(\d+)\/image$/);
            if (request.method === 'GET' && (imageMatch || productImageMatch)) {
                const item = imageMatch
                    ? store.getOrder(imageMatch[1])?.items.find((item) => item.lineId === imageMatch[2])
                    : store.getProduct(Number(productImageMatch[1]));
                if (!item) throw orderError('Товар не знайдено', 404);
                const image = await loadProductImage(item);
                response.writeHead(200, {'Content-Type': image.contentType, 'Cache-Control': 'private, max-age=3600'});
                return response.end(image.body);
            }
            if (url.pathname === '/api/orders' && request.method === 'GET') return send(200,
                {orders: store.listOrders()});
            if (url.pathname === '/api/orders' && request.method === 'POST') {
                const input = await readJson(request);
                if (typeof input?.requestId !== 'string' ||
                    !/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId)) throw orderError('Некоректний ID запиту');
                const {
                    requestId,
                    ...data
                } = input;
                const fingerprint = createHash('sha256')
                    .update(JSON.stringify(data))
                    .digest('hex');
                const existing = store.findOrderRequest(requestId, fingerprint);
                if (existing) return send(200, {order: existing});
                const draft = orderDraft(input, null, (id) => store.getProduct(id));
                return send(201, {order: store.createOrder(draft, requestId, fingerprint)});
            }
            const orderMatch = url.pathname.match(/^\/api\/orders\/(VG-\d+)$/);
            if (orderMatch && request.method === 'GET') {
                const order = store.getOrder(orderMatch[1]);
                if (!order) throw orderError('Замовлення не знайдено', 404);
                return send(200, {order});
            }
            if (orderMatch && request.method === 'PATCH') {
                const input = await readJson(request);
                if (!Number.isSafeInteger(input?.revision) || input.revision < 1) throw orderError(
                    'Некоректна версія замовлення');
                const previous = store.getOrder(orderMatch[1]);
                if (!previous) throw orderError('Замовлення не знайдено', 404);
                const draft = orderDraft(input, previous);
                return send(200, {order: store.updateOrder(previous.id, input.revision, draft)});
            }
            if (request.method !== 'GET') return send(405, {error: 'Method not allowed'});
            if (url.pathname === '/api/health') return send(200, {status: 'ok'});
            if (url.pathname === '/api/products') return send(200, {
                products: store.list(),
                exchangeRates: store.exchangeRates()
            });
            return send(404, {error: 'Not found'});
        } catch (error) {
            if (error.status) return send(error.status, {error: error.message});
            console.error(error);
            send(500, {error: 'Internal server error'});
        }
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const store = createStore();
    const server = createApi(store);
    const port = Number(process.env.PORT || 3001);
    server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Catalog API listening on port ${port}`));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => {
        store.close();
        process.exit(0);
    }));
}
