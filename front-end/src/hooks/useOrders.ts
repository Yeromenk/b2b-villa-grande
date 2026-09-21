import {useCallback, useEffect, useRef, useState} from "react";
import type {CreateOrderInput, Order, UpdateOrderInput} from "../types/orders";

async function request(path: string, method = "GET", body?: unknown, signal?: AbortSignal) {
    const response = await fetch(path, {
        method,
        headers: body ? {"Content-Type": "application/json"} : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000)
    });
    const data = await response.json().catch(() => {
        throw new Error(response.ok
            ? "Некоректна відповідь сервера замовлень"
            : `Сервер замовлень недоступний (HTTP ${response.status}). Перевірте, чи запущено backend, і спробуйте ще раз.`);
    });
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
}

export function useOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [ordersLoading, setLoading] = useState(true);
    const [ordersError, setError] = useState("");
    const [revision, setRevision] = useState(0);
    const mutation = useRef(0);
    const reloadOrders = useCallback(() => {
        setLoading(true);
        setError("");
        setRevision((value) => value + 1);
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        const startedAt = mutation.current;
        request("/api/orders", "GET", undefined, controller.signal).then((data) => {
            if (!Array.isArray(data.orders)) throw new Error("Некоректна відповідь сервера");
            if (!controller.signal.aborted && startedAt === mutation.current) setOrders(data.orders);
        }).catch((error: unknown) => {
            if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Не вдалося завантажити замовлення");
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, [revision]);

    async function saveNewOrder(input: CreateOrderInput, requestId: string): Promise<Order> {
        const {order} = await request("/api/orders", "POST", {...input, requestId});
        mutation.current++;
        setError("");
        setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)]);
        return order;
    }

    async function saveOrder(id: string, input: UpdateOrderInput): Promise<Order> {
        const {order} = await request(`/api/orders/${encodeURIComponent(id)}`, "PATCH", input);
        mutation.current++;
        setError("");
        setOrders((current) => current.map((item) => item.id === id ? order : item));
        return order;
    }

    return {orders, ordersLoading, ordersError, reloadOrders, saveNewOrder, saveOrder};
}
