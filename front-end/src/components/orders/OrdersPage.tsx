import { ClipboardList, Download, Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { Order, OrderStatus } from "../../types/orders";
import type { Currency } from "../../types/catalog";
import { OrderDetailPage } from "./OrderDetailPage";
import { OrdersSkeleton } from "./OrdersSkeleton";

type OrdersPageProps = {
  orders: Order[];
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onNotify: (message: string) => void;
  currency: Currency;
};

export function OrdersPage({ orders, onStatusChange, onNotify, currency }: OrdersPageProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.setTimeout(() => setIsLoading(false), 400);
  }, []);

  if (selectedOrder) {
    const currentOrder = orders.find((order) => order.id === selectedOrder.id) ?? selectedOrder;
    return <OrderDetailPage order={currentOrder} currency={currency} onBack={() => setSelectedOrder(null)} onStatusChange={(status) => onStatusChange(currentOrder.id, status)} onNotify={onNotify} />;
  }

  if (isLoading) return <><header className="page-header"><div><span className="eyebrow">РОБОЧИЙ РОЗДІЛ</span><h1>Замовлення</h1></div></header><OrdersSkeleton /></>;

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">РОБОЧИЙ РОЗДІЛ</span>
          <h1>Замовлення</h1>
          <p className="page-description">Історія та поточний статус комерційних пропозицій.</p>
        </div>
      </header>

      <section className="orders-summary">
        <div><span>Усього замовлень</span><strong>{orders.length}</strong></div>
      </section>

      <section className="orders-toolbar">
        <div className="search-box"><Search size={18} /><input placeholder="Пошук за номером, клієнтом або об'єктом..." /></div>
        <button className="secondary-button" onClick={() => onNotify("Експорт замовлень буде доступний після підключення бази даних")}><Download size={16} />Експорт</button>
      </section>

      {orders.length === 0 ? <div className="empty-state orders-empty"><ClipboardList size={28} /><h3>Замовлень ще немає</h3><p>Створені замовлення з&apos;являться тут.</p><button className="primary-button" onClick={() => onNotify("Додайте товари у специфікацію, щоб створити замовлення")}>Створити перше замовлення</button></div> : <section className="orders-table-wrap">
        <div className="orders-table-heading"><div><h2>Архів замовлень</h2><span>{orders.length} записів</span></div></div>
        <div className="orders-table-scroll">
          <table className="orders-table">
            <thead><tr><th>Номер</th><th>Дата</th><th>Час</th><th>Клієнт / об'єкт</th><th>Кількість позицій</th><th>Статус</th><th aria-label="Дії" /></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><strong className="order-id">{order.id}</strong></td>
                  <td className="muted-cell">{order.date}</td>
                  <td className="order-time">{order.time}</td>
                  <td><strong>{order.client}</strong><span className="table-subtext">{order.object}</span></td>
                  <td><span className="items-count"><ClipboardList size={15} />{order.itemCount} позицій</span></td>
                  <td><span className={`order-status status-${order.status === "В роботі" ? "progress" : order.status === "Готово" ? "ready" : order.status === "Нове" ? "new" : "cancelled"}`}>{order.status}</span></td>
                  <td><button className="row-action" onClick={() => setSelectedOrder(order)}>Переглянути</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>}
    </>
  );
}
