import { Minus, Plus, Trash2 } from "lucide-react";
import type { OrderItem } from "../../types/orders";
import type { Currency } from "../../types/catalog";
import { formatMoney } from "../../data/exchangeRates";

type OrderItemCardProps = {
  item: OrderItem;
  onUpdate: (patch: { quantity?: number; discount?: number }) => void;
  onRemove: () => void;
  currency: Currency;
};

const formatPrice = (value: number, currency: Currency) => formatMoney(value, currency);

export function OrderItemCard({ item, onUpdate, onRemove, currency }: OrderItemCardProps) {
  const purchasePrice = item.purchasePrice ?? Math.round(item.price * 0.7);
  const discount = item.discount ?? 0;
  const discountedSalePrice = item.discountedPrice ?? item.price * (1 - discount / 100);

  return (
    <article className="order-item-card">
      {item.image && <img className="order-item-image" src={item.image} alt={item.name} />}
      <div className="order-item-content">
        <div className="order-item-heading"><div><strong>{item.name}</strong><span>Арт. {item.article}</span></div><div className="order-item-heading-actions"><div className="order-item-total"><small>Сума позиції</small><strong>{formatPrice(discountedSalePrice * item.quantity, currency)}</strong></div><button className="order-item-remove" onClick={onRemove} title="Видалити товар із замовлення" aria-label="Видалити товар із замовлення"><Trash2 size={16} /></button></div></div>
        <div className="order-item-fields">
          <div className="order-item-field quantity-field"><span>Кількість</span><div className="quantity-control"><button className="quantity-button" onClick={() => onUpdate({ quantity: Math.max(1, item.quantity - 1) })} aria-label="Зменшити кількість"><Minus size={14} /></button><strong>{item.quantity}</strong><button className="quantity-button" onClick={() => onUpdate({ quantity: item.quantity + 1 })} aria-label="Збільшити кількість"><Plus size={14} /></button></div></div>
          <div className="order-item-field"><span>Ціна продажу</span><strong>{formatPrice(item.price, currency)}</strong></div>
          <div className="order-item-field discount-field"><span>Знижка клієнта</span><label className="discount-input"><input type="number" min="0" max="100" value={discount} onChange={(event) => onUpdate({ discount: Math.min(100, Math.max(0, Number(event.target.value))) })} /> <em>%</em></label></div>
          <div className="order-item-field highlighted-field"><span>Ціна зі знижкою</span><strong className="discounted-item-price">{formatPrice(discountedSalePrice, currency)}</strong></div>
          <div className="order-item-field purchase-field"><span>Ціна покупки</span><strong>{formatPrice(purchasePrice, currency)}</strong></div>
        </div>
      </div>
    </article>
  );
}
