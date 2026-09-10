import { ArrowLeft, Download, MapPin, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { OrderItemCard } from "./OrderItemCard";
import type { Order, OrderStatus } from "../../types/orders";
import type { Currency } from "../../types/catalog";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { formatMoney } from "../../data/exchangeRates";

type OrderDetailPageProps = {
  order: Order;
  onBack: () => void;
  onStatusChange: (status: OrderStatus) => void;
  onNotify: (message: string) => void;
  currency: Currency;
};

export function OrderDetailPage({ order, onBack, onStatusChange, onNotify, currency }: OrderDetailPageProps) {
  const [items, setItems] = useState(order.items ?? []);
  const [removeArticle, setRemoveArticle] = useState<string | null>(null);

  const totals = useMemo(() => items.reduce((result, item) => {
    const purchasePrice = item.purchasePrice ?? Math.round(item.price * 0.7);
    const salePrice = item.discountedPrice ?? item.price * (1 - (item.discount ?? 0) / 100);
    return {
      purchase: result.purchase + purchasePrice * item.quantity,
      sale: result.sale + salePrice * item.quantity,
    };
  }, { purchase: 0, sale: 0 }), [items]);

  function updateItem(article: string, patch: { quantity?: number; discount?: number }) {
    setItems((current) => current.map((item) => {
      if (item.article !== article) return item;
      const discount = patch.discount ?? item.discount ?? 0;
      const discountedPrice = (item.price ?? 0) * (1 - discount / 100);
      return { ...item, ...patch, discount, discountedPrice, total: discountedPrice * (patch.quantity ?? item.quantity) };
    }));
  }

  return (
    <>
      <button className="back-button" onClick={onBack}><ArrowLeft size={17} />Назад до замовлень</button>
      <header className="page-header order-detail-header">
        <div><span className="eyebrow">ДЕТАЛІ ЗАМОВЛЕННЯ</span><h1>{order.id}</h1><p className="page-description">Створено {order.date} о {order.time}</p></div>
        <select className={`order-status-select status-${order.status === "В роботі" ? "progress" : order.status === "Готово" ? "ready" : order.status === "Нове" ? "new" : "cancelled"}`} value={order.status} onChange={(event) => onStatusChange(event.target.value as OrderStatus)}><option>Нове</option><option>В роботі</option><option>Готово</option><option>Скасовано</option></select>
      </header>
      <section className="order-detail-meta"><div><UserRound size={18} /><span><small>Замовник</small><strong>{order.client}</strong></span></div><div><MapPin size={18} /><span><small>Адреса об&apos;єкта</small><strong>{order.object}</strong></span></div><div><span><small>Позицій</small><strong>{order.itemCount}</strong></span></div></section>
      <section className="orders-table-wrap order-items-detail"><div className="orders-table-heading"><div><h2>Позиції замовлення</h2><span>Знижка застосовується до ціни продажу</span></div><button className="secondary-button" onClick={() => onNotify("КП замовлення готується до завантаження")}><Download size={16} />Завантажити</button></div><div className="order-items-list">{items.map((item) => <OrderItemCard key={item.article} item={item} currency={currency} onUpdate={(patch) => updateItem(item.article, patch)} onRemove={() => setRemoveArticle(item.article)} />)}</div><div className="order-totals"><div><span>Загальна ціна покупки</span><strong>{formatMoney(totals.purchase, currency)}</strong></div><div className="order-sale-total"><span>Загальна ціна продажу</span><strong>{formatMoney(totals.sale, currency)}</strong></div></div></section>
      {removeArticle && <ConfirmDialog title="Видалити товар?" message="Позиція буде видалена з цього замовлення." confirmLabel="Видалити" onCancel={() => setRemoveArticle(null)} onConfirm={() => { setItems((current) => current.filter((item) => item.article !== removeArticle)); setRemoveArticle(null); onNotify("Товар видалено із замовлення"); }} />}
    </>
  );
}
