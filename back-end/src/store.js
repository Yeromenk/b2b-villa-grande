import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {createOrderStore} from './orders-store.js';

export function createStore(path = process.env.DATABASE_PATH || resolve('data/catalog.sqlite')) {
    if (path !== ':memory:') mkdirSync(dirname(path), {recursive: true});
    const db = new DatabaseSync(path);
    db.exec(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      external_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      UNIQUE(source_id, external_id)
    );
    CREATE TABLE IF NOT EXISTS import_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      report TEXT NOT NULL
    );`);
    return {
        ...createOrderStore(db),
        exchangeRates() {
            const row = db.prepare(
                "SELECT report FROM import_runs WHERE json_extract(report, '$.eurUah') > 0 AND json_array_length(json_extract(report, '$.errors')) = 0 ORDER BY id DESC LIMIT 1")
                          .get();
            if (!row) return null;
            const report = JSON.parse(row.report);
            return {eurUah: report.eurUah, usdUah: report.usdUah ?? null,
                source: !report.sourceId || report.sourceId.startsWith('laterem') ? 'laterem' : report.sourceId,
                updatedAt: report.finishedAt || report.startedAt};
        },
        replaceSource(sourceId,
                      products,
                      report,
                      department = null) {
            if (products.some((product) => product.sourceId !== sourceId)) throw new Error('Source mismatch');
            if (department !== null && (!department || products.some((product) => product.department !== department))) throw new Error('Department mismatch');
            const upsert = db.prepare(`INSERT INTO products(source_id, external_id, payload)
                                       VALUES (?, ?, ?)
                                       ON CONFLICT(source_id, external_id) DO UPDATE SET payload = excluded.payload`);
            db.exec('BEGIN');
            try {
                db.exec(
                    'CREATE TEMP TABLE IF NOT EXISTS imported_ids (id TEXT PRIMARY KEY); DELETE FROM imported_ids;');
                const remember = db.prepare('INSERT INTO imported_ids(id) VALUES (?)');
                for (const product of products) {
                    if (department !== null) {
                        const existing = db.prepare('SELECT payload FROM products WHERE source_id = ? AND external_id = ?').get(sourceId, product.externalId);
                        if (existing && JSON.parse(existing.payload).department !== department) throw new Error('Product already belongs to another department');
                    }
                    upsert.run(sourceId, product.externalId, JSON.stringify(product));
                    remember.run(product.externalId);
                }
                db.prepare(
                    'DELETE FROM products WHERE source_id = ? AND (? IS NULL OR json_extract(payload, \'$.department\') = ?) AND external_id NOT IN (SELECT id FROM imported_ids)')
                  .run(sourceId, department, department);
                db.prepare('INSERT INTO import_runs(started_at, report) VALUES (?, ?)')
                  .run(report.startedAt, JSON.stringify(report));
                db.exec('COMMIT');
            } catch (error) {
                db.exec('ROLLBACK');
                throw error;
            }
        },
        list() {
            return db.prepare('SELECT id, payload FROM products ORDER BY id')
                     .all()
                     .map(({
                               id,
                               payload
                           }) => ({
                         ...JSON.parse(payload),
                         id
                     }));
        },
        save(products) {
            const statement = db.prepare(`INSERT INTO products(source_id, external_id, payload)
                                          VALUES (?, ?, ?)
                                          ON CONFLICT(source_id, external_id) DO UPDATE SET payload = excluded.payload`);
            db.exec('BEGIN');
            try {
                for (const product of products) statement.run(product.sourceId, product.externalId,
                    JSON.stringify(product));
                db.exec('COMMIT');
            } catch (error) {
                db.exec('ROLLBACK');
                throw error;
            }
        },
        updatePurchasePrices(sourceId,
                             prices,
                             report) {
            const select = db.prepare('SELECT payload FROM products WHERE source_id = ? AND external_id = ?');
            const update = db.prepare('UPDATE products SET payload = ? WHERE source_id = ? AND external_id = ?');
            let updated = 0;
            db.exec('BEGIN');
            try {
                for (const price of prices) {
                    const row = select.get(sourceId, price.externalId);
                    if (!row) continue;
                    const product = JSON.parse(row.payload);
                    update.run(JSON.stringify({...product,
                        purchasePriceEur: price.purchasePriceEur,
                        purchasePrice: price.purchasePrice,
                        purchasePriceUpdatedAt: report.finishedAt}), sourceId, price.externalId);
                    updated++;
                }
                db.prepare('INSERT INTO import_runs(started_at, report) VALUES (?, ?)')
                  .run(report.startedAt, JSON.stringify({...report, updated}));
                db.exec('COMMIT');
                return updated;
            } catch (error) {
                db.exec('ROLLBACK');
                throw error;
            }
        },
        record(report) {
            db.prepare('INSERT INTO import_runs(started_at, report) VALUES (?, ?)')
              .run(report.startedAt, JSON.stringify(report));
        },
        close() {
            db.close();
        },
    };
}
