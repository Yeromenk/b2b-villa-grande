import { ClipboardList, Download, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import type { Order, OrderStatus, UpdateOrderInput } from "../../types/orders";
import type { Currency } from "../../types/catalog";
import { OrderDetailPage } from "./OrderDetailPage";
import { OrdersSkeleton } from "./OrdersSkeleton";
import { downloadOrders } from "../../utils/orderDocuments";

type Props = { orders: Order[]; loading: boolean; error: string; onReload: () => void; onSave: (id: string, input: UpdateOrderInput) => Promise<Order>; onNotify: (message: string) => void; currency: Currency };
export function OrdersPage({ orders, loading, error, onReload, onSave, onNotify, currency }: Props) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<OrderStatus | "Всі">("Всі");
  const selected = params.get("order");
  if (loading) return <OrdersSkeleton />;
  if (error) return <div className="empty-state" role="alert"><h2>Не вдалося завантажити замовлення</h2><p>{error}</p><button onClick={onReload}>Повторити</button></div>;
  if (selected) {
    const order = orders.find((item) => item.id === selected);
    return order ? <OrderDetailPage key={order.id} order={order} onBack={() => setParams({})} onSave={onSave} onNotify={onNotify} currency={currency} /> : <div className="empty-state"><h2>Замовлення не знайдено</h2><button onClick={() => setParams({})}>До списку</button></div>;
  }
  const visible = orders.filter((order) => (status === "Всі" || order.status === status) && [order.id, order.client, order.object].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())));
  return <>
    <header className="page-header"><div><span className="eyebrow">РОБОЧИЙ РОЗДІЛ</span><h1>Замовлення</h1><p className="page-description">Збережені замовлення та їхній поточний статус.</p></div></header>
    <section className="orders-summary"><div><span>Усього замовлень</span><strong>{orders.length}</strong></div></section>
    <section className="orders-toolbar"><div className="search-box"><Search size={18} /><input aria-label="Пошук замовлень" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Номер, клієнт або адреса…" /></div><select aria-label="Фільтр статусу" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>{["Всі", "Нове", "В роботі", "Готово", "Скасовано"].map((value) => <option key={value}>{value}</option>)}</select><button className="secondary-button" onClick={onReload} aria-label="Оновити замовлення"><RefreshCw size={17} /></button><button className="secondary-button" disabled={!visible.length} onClick={() => downloadOrders(visible)}><Download size={16} />Експорт CSV</button></section>
    {!visible.length ? <div className="empty-state orders-empty"><ClipboardList size={28} /><h3>{orders.length ? "Нічого не знайдено" : "Замовлень ще немає"}</h3><p>Створіть замовлення зі специфікації.</p><Link to="/specification">Відкрити специфікацію</Link></div> : <section className="orders-table-wrap"><div className="orders-table-heading"><h2>Замовлення</h2><span>{visible.length} записів</span></div><div className="orders-table-scroll"><table className="orders-table"><thead><tr><th>Номер</th><th>Дата</th><th>Клієнт / об&apos;єкт</th><th>Позицій</th><th>Статус</th><th aria-label="Дії" /></tr></thead><tbody>{visible.map((order) => <tr key={order.id}><td><strong className="order-id">{order.id}</strong></td><td>{order.date}<span className="table-subtext">{order.time}</span></td><td><strong>{order.client}</strong><span className="table-subtext">{order.object}</span></td><td>{order.itemCount}</td><td><span className={`order-status status-${order.status === "В роботі" ? "progress" : order.status === "Готово" ? "ready" : order.status === "Нове" ? "new" : "cancelled"}`}>{order.status}</span></td><td><button className="row-action" onClick={() => setParams({ order: order.id })}>Переглянути</button></td></tr>)}</tbody></table></div></section>}
  </>;
}
