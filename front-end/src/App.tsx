import { createBrowserRouter, Navigate, RouterProvider, useOutletContext } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import type { AppOutletContext } from "./components/layout/AppLayout";
import { CatalogPage } from "./components/catalog/CatalogPage";
import { OrdersPage } from "./components/orders/OrdersPage";
import { ProfilePage } from "./components/profile/ProfilePage";
import { SpecificationPage } from "./components/specification/SpecificationPage";
import { ErrorPage } from "./pages/ErrorPage";

function OrdersRoute() {
    const { orders, currency, changeOrderStatus, notify } = useOutletContext<AppOutletContext>();
    return <OrdersPage orders={orders} currency={currency} onStatusChange={changeOrderStatus} onNotify={notify} />;
}

function ProfileRoute() {
    const { notify } = useOutletContext<AppOutletContext>();
    return <ProfilePage onNotify={notify} />;
}

function SpecificationRoute() {
    const { cart, currency, createOrder, notify, removeFromCart } = useOutletContext<AppOutletContext>();
    return <SpecificationPage productIds={cart} currency={currency} onRemoveFromCart={removeFromCart} onCreateOrder={createOrder} onNotify={notify} />;
}

const router = createBrowserRouter([
    {
        path: "/",
        element: <AppLayout />,
        errorElement: <ErrorPage code="500" />,
        children: [
            { index: true, element: <Navigate to="/catalog/all" replace /> },
            { path: "catalog/:department", element: <CatalogPage /> },
            { path: "orders", element: <OrdersRoute /> },
            { path: "specification", element: <SpecificationRoute /> },
            { path: "profile", element: <ProfileRoute /> },
            { path: "500", element: <ErrorPage code="500" /> },
            { path: "503", element: <ErrorPage code="503" /> },
            { path: "505", element: <ErrorPage code="505" /> },
            { path: "*", element: <ErrorPage code="404" /> },
        ],
    },
]);

export default function App() {
    return <RouterProvider router={router} />;
}
