import {orderError} from './orders.js';

export function createOrderStore(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS orders
             (
                 id          INTEGER PRIMARY KEY AUTOINCREMENT,
                 request_key TEXT    NOT NULL UNIQUE,
                 fingerprint TEXT    NOT NULL,
                 revision    INTEGER NOT NULL DEFAULT 1,
                 payload     TEXT    NOT NULL
             )`);
    const decode = (row) => row ? JSON.parse(row.payload) : null;
    const numericId = (id) => /^VG-\d+$/.test(id) ? Number(id.slice(3)) : -1;
    return {
        findOrderRequest(requestKey,
                         fingerprint) {
            const row = db.prepare('SELECT payload, fingerprint FROM orders WHERE request_key = ?')
                          .get(requestKey);
            if (row && row.fingerprint !== fingerprint) throw orderError(
                'Цей запит уже використано для іншого замовлення', 409);
            return decode(row);
        },
        listOrders() {
            return db.prepare('SELECT payload FROM orders ORDER BY id DESC')
                     .all()
                     .map(decode);
        },
        getOrder(id) {
            return decode(db.prepare('SELECT payload FROM orders WHERE id = ?')
                            .get(numericId(id)));
        },
        createOrder(draft,
                    requestKey,
                    fingerprint) {
            db.exec('BEGIN IMMEDIATE');
            try {
                const previous = db.prepare('SELECT fingerprint, payload FROM orders WHERE request_key = ?')
                                   .get(requestKey);
                if (previous) {
                    if (previous.fingerprint !== fingerprint) throw orderError(
                        'Цей запит уже використано для іншого замовлення', 409);
                    db.exec('COMMIT');
                    return decode(previous);
                }
                const result = db.prepare('INSERT INTO orders(request_key, fingerprint, payload) VALUES (?, ?, ?)')
                                 .run(requestKey, fingerprint, '{}');
                const createdAt = new Date().toISOString();
                const date = new Date(createdAt);
                const order = {
                    ...draft,
                    id       : `VG-${String(result.lastInsertRowid)
                        .padStart(6, '0')}`,
                    revision : 1,
                    createdAt,
                    updatedAt: createdAt,
                    date     : new Intl.DateTimeFormat('uk-UA', {
                        day     : '2-digit',
                        month   : 'long',
                        year    : 'numeric',
                        timeZone: 'Europe/Kyiv'
                    }).format(date),
                    time     : new Intl.DateTimeFormat('uk-UA', {
                        hour    : '2-digit',
                        minute  : '2-digit',
                        timeZone: 'Europe/Kyiv'
                    }).format(date)
                };
                db.prepare('UPDATE orders SET payload = ? WHERE id = ?')
                  .run(JSON.stringify(order), result.lastInsertRowid);
                db.exec('COMMIT');
                return order;
            } catch (error) {
                db.exec('ROLLBACK');
                throw error;
            }
        },
        updateOrder(id,
                    revision,
                    draft) {
            const previous = decode(db.prepare('SELECT payload FROM orders WHERE id = ?')
                                      .get(numericId(id)));
            if (!previous) throw orderError('Замовлення не знайдено', 404);
            const order = {
                ...previous, ...draft,
                revision : revision + 1,
                updatedAt: new Date().toISOString()
            };
            const result = db.prepare(
                'UPDATE orders SET payload = ?, revision = revision + 1 WHERE id = ? AND revision = ?')
                             .run(JSON.stringify(order), numericId(id), revision);
            if (!result.changes) throw orderError(
                'Замовлення змінено в іншому вікні. Поверніться до списку й оновіть його.', 409);
            return order;
        },
        getProduct(id) {
            const row = db.prepare('SELECT id, payload FROM products WHERE id = ?')
                          .get(id);
            return row ? {
                ...JSON.parse(row.payload),
                id: row.id
            } : null;
        },
    };
}
