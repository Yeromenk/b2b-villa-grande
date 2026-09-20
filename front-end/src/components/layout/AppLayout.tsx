import {
    ClipboardList,
    ChevronDown,
    LayoutDashboard,
    Package,
    ShoppingCart,
    UserRound,
    Bath,
    DoorClosed,
    Grid,
    Lightbulb,
    Armchair,
    Boxes, Sparkles, Wrench, LayoutGrid, SquareStack
} from "lucide-react";
import {NavLink, Outlet, useLocation, useNavigate} from "react-router-dom";
import {useEffect, useState} from "react";
import {LoadingBar} from "../ui/LoadingBar";
import {Toast} from "../ui/Toast";
import {useOrders} from "../../hooks/useOrders";
import {useProducts} from "../../hooks/useProducts";
import {exchangeRates} from "../../data/exchangeRates";
import {departments} from "../../data/departments";
import type {CreateOrderInput, Order, UpdateOrderInput} from "../../types/orders";
import type {Currency, Product} from "../../types/catalog";

import {useProfile, profileInitials} from "../../hooks/useProfile";
import type {Profile} from "../../hooks/useProfile";

export type AppOutletContext = {
    profile: Profile;
    saveProfile: (profile: Profile) => void;
    products: Product[];
    productsLoading: boolean;
    productsError: string;
    reloadProducts: () => void;
    cart: number[];
    currency: Currency;
    orders: Order[];
    addToCart: (id: number) => void;
    removeFromCart: (id: number) => void;
    setCurrency: (currency: Currency) => void;
    createOrder: (data: CreateOrderInput, requestId: string) => Promise<void>;
    saveOrder: (id: string, data: UpdateOrderInput) => Promise<Order>;
    ordersLoading: boolean;
    ordersError: string;
    reloadOrders: () => void;
    notify: (message: string) => void;
};

const navClass = ({isActive}: { isActive: boolean }) => `nav-item ${isActive ? "active" : ""}`;

export function AppLayout() {
    const {profile, saveProfile} = useProfile();
    const {products, productsLoading, productsError, reloadProducts} = useProducts();
    const navigate = useNavigate();
    const location = useLocation();
    const [catalogExpanded, setCatalogExpanded] = useState(true);
    const [cart, setCart] = useState<number[]>([]);
    const [currency, setCurrency] = useState<Currency>("UAH");
    const {orders, ordersLoading, ordersError, reloadOrders, saveNewOrder, saveOrder} = useOrders();
    const [toast, setToast] = useState("");
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const goOnline = () => setIsOffline(false);
        const goOffline = () => setIsOffline(true);
        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);
        return () => {
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
        };
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

    async function createOrder(data: CreateOrderInput, requestId: string) {
        const nextOrder = await saveNewOrder(data, requestId);
        setCart([]);
        navigate(`/orders?order=${nextOrder.id}`);
        notify(`Замовлення ${nextOrder.id} збережено`);
    }

    const context: AppOutletContext = {
        profile,
        saveProfile,
        products,
        productsLoading,
        productsError,
        reloadProducts,
        cart,
        currency,
        orders,
        ordersLoading,
        ordersError,
        reloadOrders,
        saveOrder,
        addToCart,
        removeFromCart,
        setCurrency,
        createOrder,
        notify
    };

    function getDepartmentIcon(slug: string) {
        switch (slug) {
            case "plumbing":
            case "santehnika":
                return <Bath size={15}/>;
            case "doors":
            case "dveri":
                return <DoorClosed size={15}/>;
            case "tiles":
                return <Grid size={15}/>;
            case "lighting":
                return <Lightbulb size={15}/>;
            case "furniture":
                return <Armchair size={15}/>;
            case "spa":
            case "wellness":
                return <Sparkles size={15}/>;
            case "engineering":
            case "inzheneriya":
                return <Wrench size={15}/>;
            case "panels":
            case "paneli":
                return <LayoutGrid size={15}/>;
            case "flooring":
            case "pokrytiya-dlya-polov":
                return <SquareStack size={15}/>;
            default:
                return <Package size={15}/>;
        }
    }

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="brand">
                    <div className="brand-mark">VG</div>
                    <div><strong>Villa Grande</strong><span>Internal Office</span></div>
                </div>
                <nav className="main-nav">
                    <button
                        className={`nav-item catalog-toggle ${location.pathname.startsWith("/catalog") ? "active" : ""}`}
                        onClick={() => {
                            setCatalogExpanded((expanded) => !expanded);
                            navigate("/catalog/all");
                        }}><LayoutDashboard size={19}/><span>Каталог товарів</span><ChevronDown
                        className={catalogExpanded ? "chevron-open" : ""} size={16}/></button>
                    {catalogExpanded && (
                        <div className="catalog-submenu">
                            <NavLink to="/catalog/all" className={({isActive}) => isActive ? "selected" : ""}>
                                <Boxes size={15}/>
                                <span>Всі товари</span>
                                <b>{products.length}</b>
                            </NavLink>

                            {departments.map(({slug, label}) => (
                                <NavLink
                                    key={slug}
                                    to={`/catalog/${slug}`}
                                    className={({isActive}) => isActive ? "selected" : ""}
                                >
                                    {getDepartmentIcon(slug)}
                                    <span>{label}</span>
                                    <b>{products.filter((product) => (product.department ?? "Сантехніка") === label).length}</b>
                                </NavLink>
                            ))}
                        </div>
                    )}
                    <NavLink to="/orders" className={navClass}><ClipboardList
                        size={19}/><span>Замовлення</span></NavLink>
                    <NavLink to="/specification" className={navClass}><ShoppingCart
                        size={19}/><span>Специфікації</span>{cart.length > 0 && <b>{cart.length}</b>}</NavLink>
                </nav>
                <div className="sidebar-bottom">
                    <div className="sidebar-exchange-rates">
                        <span>КУРС ПОСТАЧАЛЬНИКА</span><strong>EUR <b>{exchangeRates.eurUah === null ? "Не вказано" : `UAH ${exchangeRates.eurUah.toFixed(2)}`}</b></strong><small>{exchangeRates.source === "laterem" ? "Laterem" : exchangeRates.source || "Джерело не вказано"}{exchangeRates.updatedAt && ` · ${new Date(exchangeRates.updatedAt).toLocaleDateString("uk-UA")}`} ·
                        останній імпорт</small></div>
                    <div className="currency-sidebar-switcher">
                        <button className={currency === "UAH" ? "selected" : ""} onClick={() => setCurrency("UAH")}>₴
                            UAH
                        </button>
                        <button disabled={exchangeRates.eurUah === null}
                                title={exchangeRates.eurUah === null ? "Курс EUR ще не завантажено" : "Перерахунок за курсом останнього імпорту"}
                                className={currency === "EUR" ? "selected" : ""} onClick={() => setCurrency("EUR")}>€
                            EUR
                        </button>
                    </div>
                    <div className="workspace-label">РОБОЧИЙ ПРОФІЛЬ</div>
                    <NavLink to="/profile" className={({isActive}) => `user-card ${isActive ? "active" : ""}`}>
                        <div className="avatar">{profileInitials(profile)}</div>
                        <div><strong>{profile.firstName} {profile.lastName}</strong><span>Менеджер</span></div>
                        <UserRound size={16}/></NavLink></div>
            </aside>
            <main className="main-content">{isOffline &&
                <div className="offline-banner" role="status"><span>Немає підключення до мережі. Показані останні доступні дані.</span>
                    <button onClick={() => window.location.reload()}>Повторити</button>
                </div>}<Outlet context={context}/></main>
            <LoadingBar/>
            {toast && <Toast message={toast} onClose={() => setToast("")}/>}
        </div>
    );
}
