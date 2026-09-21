import type { Order } from "../types/orders";
import type { Currency } from "../types/catalog";
import type { PdfImage } from "./orderPdf";
import { exchangeRates } from "../data/exchangeRates";

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let fonts: Promise<[string, string]> | undefined;
function loadFonts() {
  fonts ??= Promise.all(["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"].map(async (name) => {
    const response = await fetch(import.meta.env.BASE_URL + "fonts/" + name, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Не вдалося завантажити шрифт для PDF. Спробуйте ще раз.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  })).then(([regular, bold]): [string, string] => [regular, bold]).catch((error) => { fonts = undefined; throw error; });
  return fonts;
}

async function loadImage(path: string): Promise<PdfImage | null> {
  try {
    const response = await fetch(path, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) return null;
    const bitmap = await createImageBitmap(await response.blob());
    try {
      if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 30000000) return null;
      const scale = Math.min(1, 400 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return { data: canvas.toDataURL("image/jpeg", 0.85), width: canvas.width, height: canvas.height };
    } finally { bitmap.close(); }
  } catch { return null; }
}

export async function downloadOrder(order: Order, currency: Currency = "UAH") {
  const eurUah = exchangeRates.eurUah;
  const items = order.items ?? [];
  const images: (PdfImage | null)[] = items.map(() => null);
  let index = 0;
  const workers = Array.from({ length: Math.min(6, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      const item = items[current];
      if (!item.image) continue;
      const path = item.lineId
        ? "/api/orders/" + encodeURIComponent(order.id) + "/items/" + encodeURIComponent(item.lineId) + "/image"
        : item.productId ? "/api/products/" + item.productId + "/image" : null;
      if (path) images[current] = await loadImage(path);
    }
  });
  const [[regularFont, boldFont], { buildOrderPdf }] = await Promise.all([loadFonts(), import("./orderPdf"), Promise.all(workers)]);
  const doc = buildOrderPdf(order, { regularFont, boldFont, images, currency, eurUah });
  await doc.save("Propozytsiia-" + order.id.replace(/[^a-zA-Z0-9_-]/g, "_") + ".pdf", { returnPromise: true });
  return { missingImages: items.filter((item, index) => item.image && !images[index]).length };
}

export function downloadOrders(orders: Order[]) {
  const cell = (value: unknown) => { let text = String(value ?? ""); if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };
  const rows = [["Номер", "Дата", "Клієнт", "Адреса", "Статус", "Позицій", "Сума UAH"], ...orders.map((order) => [order.id, order.date, order.client, order.object, order.status, order.itemCount, order.total])];
  download("orders.csv", "\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n"), "text/csv;charset=utf-8");
}
