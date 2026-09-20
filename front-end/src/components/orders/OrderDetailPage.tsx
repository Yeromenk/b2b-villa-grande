import { ArrowLeft, Download, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { OrderItemCard } from "./OrderItemCard";
import type { Order, OrderItem, OrderStatus, UpdateOrderInput } from "../../types/orders";
import type { Currency } from "../../types/catalog";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { formatMoney } from "../../data/exchangeRates";
import { downloadOrder } from "../../utils/orderDocuments";

type Props = { order: Order; onBack: () => void; onSave: (id: string, input: UpdateOrderInput) => Promise<Order>; onNotify: (message: string) => void; currency: Currency };
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function OrderDetailPage({ order, onBack, onSave, onNotify, currency }: Props) {
  const [draft, setDraft] = useState(order);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const downloadRef = useRef(false);
  const [error, setError] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const savingRef = useRef(false);
  const blocker = useBlocker(dirty || saving);
  useEffect(() => {
    if (!dirty && !saving) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);
  const statusClass = { "Нове": "new", "В роботі": "progress", "Готово": "ready", "Скасовано": "cancelled" }[draft.status];
  const items = draft.items ?? [];
  const total = round(items.reduce((sum, item) => sum + item.total, 0));
  const purchaseKnown = items.every((item) => item.purchasePrice != null);
  const purchase = items.reduce((sum, item) => sum + (item.purchasePrice ?? 0) * item.quantity, 0);
  function change(patch: Partial<Order>) { setDraft((current) => ({ ...current, ...patch })); setDirty(true); }
  function updateItem(lineId: string, patch: Partial<OrderItem>) {
    change({ items: items.map((item) => {
      if (item.lineId !== lineId) return item;
      const next = { ...item, ...patch };
      next.discountedPrice = round(next.price * (1 - (next.discount ?? 0) / 100));
      next.total = round(next.discountedPrice * next.quantity);
      return next;
    }) });
  }
  async function save() {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setError("");
    try {
      const saved = await onSave(draft.id, { client: draft.client, address: draft.object, status: draft.status, items, revision: draft.revision ?? 1 });
      setDraft(saved); setDirty(false); onNotify("Зміни збережено");
    } catch (error) { setError(error instanceof Error ? error.message : "Не вдалося зберегти зміни"); }
    finally { savingRef.current = false; setSaving(false); }
  }
  async function exportPdf() {
    if (downloadRef.current) return;
    downloadRef.current = true;
    setDownloading(true);
    setError("");
    try {
      const { missingImages } = await downloadOrder(draft, currency);
      onNotify(missingImages ? `PDF завантажено. Недоступні фото: ${missingImages}.` : "Пропозицію завантажено у PDF");
    } catch (error) { setError(error instanceof Error ? error.message : "Не вдалося створити PDF. Спробуйте ще раз."); }
    finally { downloadRef.current = false; setDownloading(false); }
  }
  return <>
    <button className="back-button" onClick={onBack} disabled={saving}><ArrowLeft size={17} />Назад до замовлень</button>
    <fieldset className="order-editor-fieldset" disabled={saving}>
      <header className="page-header order-detail-header"><div><span className="eyebrow">ДЕТАЛІ ЗАМОВЛЕННЯ</span><h1>{draft.id}</h1><p className="page-description">Створено {draft.date} о {draft.time}</p></div><label className="order-status-field"><span>Статус замовлення</span><select aria-label="Статус замовлення" className={`order-status-select status-${statusClass}`} value={draft.status} onChange={(event) => change({ status: event.target.value as OrderStatus })}>{["Нове", "В роботі", "Готово", "Скасовано"].map((status) => <option key={status}>{status}</option>)}</select></label></header>
      <section className="customer-details specification-table-wrap"><div className="customer-details-form"><label>Замовник<input value={draft.client} onChange={(event) => change({ client: event.target.value })} maxLength={500} /></label><label>Адреса об&apos;єкта<input value={draft.object} onChange={(event) => change({ object: event.target.value })} maxLength={500} /></label></div></section>
      <section className="orders-table-wrap order-items-detail"><div className="orders-table-heading"><div><h2>Позиції замовлення</h2><span>{items.length} позицій · ціни зафіксовані у замовленні</span></div><button className="secondary-button" disabled={dirty || downloading} title={dirty ? "Спочатку збережіть зміни" : "Завантажити пропозицію у PDF, формат A4"} onClick={() => void exportPdf()}><Download size={16} />{downloading ? "Формуємо PDF…" : "Завантажити PDF"}</button></div>
        <div className="order-items-list">{items.map((item) => <OrderItemCard key={item.lineId} item={item} currency={currency} onUpdate={(patch) => updateItem(item.lineId!, patch)} onRemove={() => setRemoveId(item.lineId!)} />)}</div>
        <div className="order-totals"><div><span>Закупівельна вартість</span><strong>{purchaseKnown ? formatMoney(purchase, currency) : "Не вказано для всіх позицій"}</strong></div><div className="order-sale-total"><span>Разом для клієнта</span><strong>{formatMoney(total, currency)}</strong></div></div>
      </section>
      <div className="order-save-bar"><span role="status">{saving ? "Зберігаємо…" : dirty ? "Є незбережені зміни" : "Усі зміни збережено"}</span><button className="primary-button" disabled={!dirty || !items.length || !draft.client.trim() || !draft.object.trim()} onClick={() => void save()}><Save size={17} />Зберегти зміни</button></div>
      {!items.length && <p role="alert">Додайте хоча б одну позицію або скасуйте видалення, повернувшись без збереження.</p>}
      {error && <p className="order-save-error" role="alert">{error}</p>}
    </fieldset>
    {removeId !== null && <ConfirmDialog title="Видалити товар?" message="Позицію буде видалено після збереження змін." confirmLabel="Видалити" onCancel={() => setRemoveId(null)} onConfirm={() => { change({ items: items.filter((item) => item.lineId !== removeId) }); setRemoveId(null); }} />}
    {blocker.state === "blocked" && <ConfirmDialog title="Вийти без збереження?" message="Зміни в цьому замовленні ще не збережено." confirmLabel="Вийти" onCancel={() => blocker.reset()} onConfirm={() => { if (!saving) blocker.proceed(); }} />}
  </>;
}
