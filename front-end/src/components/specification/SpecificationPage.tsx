import { Download, Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { products as productCatalog } from "../../data/products";
import type { Product } from "../../types/catalog";
import type { OrderItem } from "../../types/orders";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { formatMoney } from "../../data/exchangeRates";
import type { Currency } from "../../types/catalog";

type SpecificationPageProps = {
  productIds: number[];
  onCreateOrder: (data: { client: string; address: string; items: OrderItem[]; total: number }) => void;
  onNotify: (message: string) => void;
  currency: Currency;
  onRemoveFromCart: (id: number) => void;
};

type SpecificationItem = {
  product: Product;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  discount: number;
};

const formatPrice = (value: number) => formatMoney(value, "UAH");

function downloadFile(filename: string, content: string) {
  try {
    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

function buildProposal(title: string, items: SpecificationItem[]) {
  const rows = items.map(({ product, quantity, salePrice, discount }) => {
    const finalPrice = salePrice * (1 - discount / 100);
    return `<tr><td>${product.article}</td><td>${product.name}</td><td>${quantity}</td><td>${formatPrice(finalPrice)}</td><td>${formatPrice(finalPrice * quantity)}</td></tr>`;
  }).join("");
  const total = items.reduce((sum, item) => sum + item.salePrice * (1 - item.discount / 100) * item.quantity, 0);

  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;color:#17212b;padding:40px}h1{color:#1c4845}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{text-align:left;padding:12px;border-bottom:1px solid #dce3e5}th{background:#e9f1ef}.total{text-align:right;font-size:20px;font-weight:bold;margin-top:24px}</style></head><body><h1>Villa Grande</h1><p>Комерційна пропозиція</p><h2>${title}</h2><table><thead><tr><th>Артикул</th><th>Товар</th><th>К-сть</th><th>Ціна</th><th>Сума</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Разом: ${formatPrice(total)}</p></body></html>`;
}

export function SpecificationPage({ productIds, onCreateOrder, onNotify, currency, onRemoveFromCart }: SpecificationPageProps) {
  const initialItems = useMemo(() => Array.from(new Set(productIds)).map((id) => {
    const product = productCatalog.find((item) => item.id === id);
    return product ? { product, quantity: productIds.filter((productId) => productId === id).length, purchasePrice: Math.round(product.price * 0.7), salePrice: product.price, discount: 0 } : null;
  }).filter((item): item is SpecificationItem => item !== null), [productIds]);
  const [items, setItems] = useState<SpecificationItem[]>(initialItems);
  const [client, setClient] = useState("");
  const [address, setAddress] = useState("");
  const [removeId, setRemoveId] = useState<number | null>(null);

  function updateItem(id: number, patch: Partial<SpecificationItem>) {
    setItems((current) => current.map((item) => item.product.id === id ? { ...item, ...patch } : item));
  }

  function removeItem(id: number) {
    setItems((current) => current.filter((item) => item.product.id !== id));
    onRemoveFromCart(id);
    onNotify("Товар видалено зі специфікації");
  }

  function downloadItem(item: SpecificationItem) {
    const downloaded = downloadFile(`KP-${item.product.article}.html`, buildProposal(item.product.name, [item]));
    onNotify(downloaded ? "КП для товару завантажується" : "Не вдалося завантажити КП. Спробуйте ще раз.");
  }

  const purchaseTotal = items.reduce((sum, item) => sum + item.purchasePrice * item.quantity, 0);
  const saleTotal = items.reduce((sum, item) => sum + item.salePrice * (1 - item.discount / 100) * item.quantity, 0);

  function createOrder() {
    if (!client.trim() || !address.trim() || items.length === 0) return;
    const orderItems: OrderItem[] = items.map((item) => {
      const price = item.salePrice * (1 - item.discount / 100);
      return { name: item.product.name, article: item.product.article, quantity: item.quantity, price: item.salePrice, total: price * item.quantity, image: item.product.image, purchasePrice: item.purchasePrice, discount: item.discount, discountedPrice: price };
    });
    onCreateOrder({ client: client.trim(), address: address.trim(), items: orderItems, total: saleTotal });
  }

  return (
    <>
      <header className="page-header">
        <div><span className="eyebrow">РОБОЧИЙ ДОКУМЕНТ</span><h1>Специфікація об&apos;єкта</h1><p className="page-description">Налаштуйте ціни, знижки та сформуйте комерційну пропозицію.</p></div>
        <div className="specification-count">{items.length} позицій</div>
      </header>
      {items.length === 0 ? <div className="empty-state specification-empty"><Trash2 size={28} /><h3>Специфікація порожня</h3><p>Додайте товари з каталогу, щоб сформувати пропозицію.</p></div> : <>
        <section className="customer-details specification-table-wrap">
          <div className="specification-table-heading"><div><h2>Дані замовника</h2><span>Заповніть перед створенням замовлення</span></div></div>
          <div className="customer-details-form"><label>Ім&apos;я замовника<input value={client} onChange={(event) => setClient(event.target.value)} placeholder="Наприклад, Олена Коваль" /></label><label>Адреса об&apos;єкта<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Місто, вулиця, номер будинку" /></label></div>
        </section>
        <section className="specification-table-wrap">
          <div className="specification-table-heading"><div><h2>Товари в пропозиції</h2><span>Закупівельна ціна доступна тільки менеджеру</span></div></div>
          <div className="specification-table-scroll"><table className="specification-table"><thead><tr><th>Товар</th><th>К-сть</th><th>Ціна закупівлі</th><th>Ціна продажу</th><th>Знижка</th><th>До оплати</th><th aria-label="Дії" /></tr></thead><tbody>
            {items.map((item) => {
              const finalPrice = item.salePrice * (1 - item.discount / 100);
              return <tr key={item.product.id}><td><div className="spec-product"><img src={item.product.image} alt="" /><div><strong>{item.product.name}</strong><span>{item.product.brand} · Арт. {item.product.article}</span></div></div></td><td><div className="quantity-control"><button onClick={() => updateItem(item.product.id, { quantity: Math.max(1, item.quantity - 1) })} aria-label="Зменшити кількість"><Minus size={14} /></button><strong>{item.quantity}</strong><button onClick={() => updateItem(item.product.id, { quantity: item.quantity + 1 })} aria-label="Збільшити кількість"><Plus size={14} /></button></div></td><td><span className="readonly-price">{formatMoney(item.purchasePrice, currency)}</span></td><td><span className="readonly-price">{formatMoney(item.salePrice, currency)}</span></td><td><label className="discount-input"><input type="number" min="0" max="100" value={item.discount} onChange={(event) => updateItem(item.product.id, { discount: Math.min(100, Math.max(0, Number(event.target.value))) })} /> %</label></td><td><strong className="final-price">{formatMoney(finalPrice * item.quantity, currency)}</strong><span className="unit-price">{formatMoney(finalPrice, currency)} / од.</span></td><td><div className="spec-actions"><button className="download-row-button" onClick={() => downloadItem(item)} title="Завантажити КП для товару"><Download size={16} /></button><button className="remove-row-button" onClick={() => setRemoveId(item.product.id)} title="Видалити товар"><Trash2 size={16} /></button></div></td></tr>;
            })}
          </tbody></table></div>
        </section>
        <section className="specification-summary"><div><span>Закупівельна вартість</span><strong>{formatMoney(purchaseTotal, currency)}</strong></div><div><span>Вартість для клієнта</span><strong className="summary-total">{formatMoney(saleTotal, currency)}</strong></div><button className="secondary-button" onClick={() => { const downloaded = downloadFile("Komertsiina-propozytsiia.html", buildProposal("Специфікація об'єкта", items)); onNotify(downloaded ? "Повна КП завантажується" : "Не вдалося завантажити КП. Спробуйте ще раз."); }}><Download size={17} />Завантажити КП</button><button className="primary-button" disabled={!client.trim() || !address.trim()} onClick={createOrder}><Plus size={17} />Зробити замовлення</button></section>
        {removeId !== null && <ConfirmDialog title="Видалити товар?" message="Позиція буде прибрана зі специфікації." confirmLabel="Видалити" onCancel={() => setRemoveId(null)} onConfirm={() => { removeItem(removeId); setRemoveId(null); }} />}
      </>}
    </>
  );
}

