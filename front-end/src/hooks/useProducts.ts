import {useCallback, useEffect, useState} from "react";
import type {Product} from "../types/catalog";
import {updateExchangeRates} from "../data/exchangeRates";
import {withCatalogAttributes} from "../utils/catalogAttributes";

export function useProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setLoading] = useState(true);
    const [productsError, setError] = useState("");
    const [revision, setRevision] = useState(0);
    const reloadProducts = useCallback(() => setRevision((value) => value + 1), []);
    useEffect(() => {
        window.addEventListener("focus", reloadProducts);
        return () => window.removeEventListener("focus", reloadProducts);
    }, [reloadProducts]);
    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            setLoading(true);
            setError("");
            try {
                const response = await fetch("/api/products", {signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])});
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                if (!Array.isArray(data.products)) throw new Error("Invalid catalog response");
                if (!controller.signal.aborted) {
                    updateExchangeRates(data.exchangeRates);
                    setProducts(data.products.map(withCatalogAttributes));
                }
            } catch {
                if (!controller.signal.aborted) setError("Не вдалося завантажити товари. Перевірте підключення до сервера та повторіть спробу.");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        void load();
        return () => controller.abort();
    }, [revision]);
    return {products, productsLoading, productsError, reloadProducts};
}
