import {randomUUID} from 'node:crypto';

export function orderError(message,
                           status = 400) {
    return Object.assign(new Error(message), {status});
}

const money = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function text(value,
              label,
              required = true,
              max = 500) {
    if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw orderError(
        `Некоректне поле: ${label}`);
    return value.trim();
}

function number(value,
                label,
                min,
                max) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw orderError(
        `Некоректне поле: ${label}`);
    return value;
}

export function orderDraft(input,
                           existing = null,
                           findProduct = () => null) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw orderError('Очікується об’єкт замовлення');
    const client = text(input.client, 'клієнт');
    const object = text(input.address, 'адреса');
    const status = existing ? input.status : 'Нове';
    if (!['Нове', 'В роботі', 'Готово', 'Скасовано'].includes(status)) throw orderError('Некоректний статус');
    if (!Array.isArray(input.items) || !input.items.length || input.items.length > 500) throw orderError(
        'Замовлення має містити від 1 до 500 позицій');
    const seen = new Set();
    const items = input.items.map((item) => {
        if (!item || typeof item !== 'object') throw orderError('Некоректна позиція');
        let snapshot;
        if (existing) {
            snapshot = existing.items.find((line) => line.lineId === item.lineId);
            if (!snapshot || seen.has(item.lineId)) throw orderError('Невідома або повторна позиція');
            seen.add(item.lineId);
        } else {
            if (!Number.isSafeInteger(item.productId) || item.productId <= 0 ||
                seen.has(item.productId)) throw orderError('Некоректний або повторний товар');
            const product = findProduct(item.productId);
            if (!product) throw orderError('Товар більше не доступний у каталозі. Оновіть специфікацію.');
            seen.add(item.productId);
            snapshot = {
                lineId    : randomUUID(),
                productId : product.id,
                name      : product.name,
                article   : product.article,
                image     : product.image,
                supplier  : product.supplier,
                unit      : product.unit || '',
                sourceId  : product.sourceId,
                externalId: product.externalId
            };
        }
        const quantity = number(item.quantity, 'кількість', 0.001, 1000000);
        const price = money(number(item.price, 'ціна', 0, 100000000));
        const discount = number(item.discount ?? 0, 'знижка', 0, 100);
        const purchasePrice = item.purchasePrice == null ? null :
            money(number(item.purchasePrice, 'закупівельна ціна', 0, 100000000));
        const discountedPrice = money(price * (1 - discount / 100));
        return {
            ...snapshot,
            quantity,
            price,
            discount,
            purchasePrice,
            discountedPrice,
            total: money(discountedPrice * quantity)
        };
    });
    const total = money(items.reduce((sum,
                                      item) => sum + item.total, 0));
    if (total > 1000000000000) throw orderError('Завелика сума замовлення');
    return {
        client,
        object,
        status,
        items,
        itemCount: items.length,
        total,
        currency : 'UAH'
    };
}
