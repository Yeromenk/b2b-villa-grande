import { ClipboardList, ChevronDown, LayoutDashboard, Package, ShoppingCart, SlidersHorizontal, UserRound } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LoadingBar } from "../ui/LoadingBar";
import { Toast } from "../ui/Toast";
import { orders as initialOrders } from "../../data/orders";
import { products } from "../../data/products";
import { exchangeRates } from "../../data/exchangeRates";
import type { Order, OrderStatus } from "../../types/orders";
import type { Currency } from "../../types/catalog";

export type AppOutletContext = {
  cart: number[];
  currency: Currency;
  orders: Order[];
  addToCart: (id: number) => void;
  removeFromCart: (id: number) => void;
  setCurrency: (currency: Currency) => void;
  createOrder: (data: { client: string; address: string; items: NonNullable<Order["items"]>; total: number }) => void;
  changeOrderStatus: (orderId: string, status: OrderStatus) => void;
  notify: (message: string) => void;
};

const navClass = ({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? "active" : ""}`;

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [catalogExpanded, setCatalogExpanded] = useState(true);
  const [cart, setCart] = useState<number[]>([]);
  const [currency, setCurrency] = useState<Currency>("UAH");
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [toast, setToast] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  function notify(message: string) {
    setToast(message);
  }

  function addToCart(id: number) {
    setCart((current) => [...current, id]);
    const product = products.find((item) => item.id === id);
    notify(`${product?.name ?? "Товар"} додано у специфікацію`);
  }

  function removeFromCart(id: number) {
    setCart((current) => current.filter((productId) => productId !== id));
    notify("Товар видалено зі специфікації");
  }

  function createOrder(data: { client: string; address: string; items: NonNullable<Order["items"]>; total: number }) {
    const now = new Date();
    const nextOrder: Order = {
      id: `VG-${String(orders.length + 249).padStart(4, "0")}`,
      date: new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "long", year: "numeric" }).format(now),
      time: new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit" }).format(now),
      client: data.client,
      object: data.address,
      itemCount: data.items.reduce((sum, item) => sum + item.quantity, 0),
      status: "Готово",
      items: data.items,
      total: data.total,
    };
    setOrders((current) => [nextOrder, ...current]);
    setCart([]);
    navigate("/orders");
    notify("Замовлення створено та готове до роботи");
  }

  function changeOrderStatus(orderId: string, status: OrderStatus) {
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
    notify(`Статус замовлення змінено: ${status}`);
  }

  const context: AppOutletContext = { cart, currency, orders, addToCart, removeFromCart, setCurrency, createOrder, changeOrderStatus, notify };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">VG</div><div><strong>Villa Grande</strong><span>Internal Office</span></div></div>
        <nav className="main-nav">
          <button className={`nav-item catalog-toggle ${location.pathname.startsWith("/catalog") ? "active" : ""}`} onClick={() => { setCatalogExpanded((expanded) => !expanded); navigate("/catalog/all"); }}><LayoutDashboard size={19} /><span>Каталог товарів</span><ChevronDown className={catalogExpanded ? "chevron-open" : ""} size={16} /></button>
          {catalogExpanded && <div className="catalog-submenu">
            <NavLink to="/catalog/all" className={({ isActive }) => isActive ? "selected" : ""}><Package size={15} />Всі товари <b>{products.length}</b></NavLink>
            <NavLink to="/catalog/plumbing" className={({ isActive }) => isActive ? "selected" : ""}><SlidersHorizontal size={15} />Сантехніка <b>{products.filter((product) => (product.department ?? "Сантехніка") === "Сантехніка").length}</b></NavLink>
            <NavLink to="/catalog/doors" className={({ isActive }) => isActive ? "selected" : ""}><Package size={15} />Двері <b>{products.filter((product) => product.department === "Двері").length}</b></NavLink>
          </div>}
          <NavLink to="/orders" className={navClass}><ClipboardList size={19} /><span>Замовлення</span></NavLink>
          <NavLink to="/specification" className={navClass}><ShoppingCart size={19} /><span>Специфікації</span>{cart.length > 0 && <b>{cart.length}</b>}</NavLink>
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-exchange-rates"><span>КУРС ВАЛЮТ</span><strong>EUR <b>UAH {exchangeRates.eurUah}</b></strong><strong>USD <b>UAH {exchangeRates.usdUah}</b></strong></div><div className="currency-sidebar-switcher"><button className={currency === "UAH" ? "selected" : ""} onClick={() => setCurrency("UAH")}>₴ UAH</button><button className={currency === "EUR" ? "selected" : ""} onClick={() => setCurrency("EUR")}>€ EUR</button></div><div className="workspace-label">РОБОЧИЙ ПРОФІЛЬ</div><NavLink to="/profile" className={({ isActive }) => `user-card ${isActive ? "active" : ""}`}><div className="avatar">ОК</div><div><strong>Олексій К.</strong><span>Менеджер</span></div><UserRound size={16} /></NavLink></div>
      </aside>
      <main className="main-content">{isOffline && <div className="offline-banner" role="status"><span>Немає підключення до мережі. Показані останні доступні дані.</span><button onClick={() => window.location.reload()}>Повторити</button></div>}<Outlet context={context} /></main>
      <LoadingBar />
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
