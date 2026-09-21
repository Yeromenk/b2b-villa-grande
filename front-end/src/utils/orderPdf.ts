import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { Order } from "../types/orders";

export type PdfImage = { data: string; width: number; height: number };
export type PdfOptions = {
  regularFont: string;
  boldFont: string;
  images: (PdfImage | null)[];
  currency: "UAH" | "EUR";
  eurUah: number | null;
};

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function buildOrderPdf(order: Order, options: PdfOptions) {
  if (options.currency === "EUR" && !(options.eurUah && options.eurUah > 0)) {
    throw new Error("Не вдалося отримати курс EUR. Оберіть гривню або оновіть каталог.");
  }
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true, putOnlyUsedFonts: true });
  doc.addFileToVFS("NotoSans-Regular.ttf", options.regularFont);
  doc.addFileToVFS("NotoSans-Bold.ttf", options.boldFont);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  doc.setFont("NotoSans");
  doc.setProperties({ title: `Пропозиція ${order.id} — ${order.client}`, author: "Villa Grande", subject: "Комерційна пропозиція" });

  const left = 14;
  const right = 196;
  const divisor = options.currency === "EUR" ? options.eurUah! : 1;
  const money = (value: number) => (value / divisor).toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u00a0/g, " ");
  const label = options.currency === "EUR" ? "EUR" : "грн";
  function brand(y: number) {
    doc.setFont("NotoSans", "bold").setFontSize(12).setTextColor(28, 72, 69);
    doc.text("VILLA GRANDE", left, y);
    doc.setDrawColor(216, 163, 93).setLineWidth(0.7).line(left, y + 4, right, y + 4);
  }
  brand(19);
  doc.setFontSize(23).text("Пропозиція", left, 37);
  doc.setFont("NotoSans", "normal").setFontSize(9).setTextColor(99, 113, 116);
  doc.text(`№ ${order.id}  ·  ${order.date}`, left, 44);
  let y = 54;
  for (const [name, value] of [["Замовник", order.client], ["Об’єкт", order.object]]) {
    doc.setFont("NotoSans", "bold").setFontSize(9).setTextColor(28, 72, 69);
    doc.text(`${name}:`, left, y);
    doc.setFont("NotoSans", "normal").setTextColor(48, 68, 71);
    const lines = doc.splitTextToSize(value, 154) as string[];
    doc.text(lines, left + 28, y);
    y += Math.max(1, lines.length) * 4.5 + 3;
  }
  doc.setFontSize(8).setTextColor(99, 113, 116);
  doc.text(options.currency === "EUR"
    ? `Ціни для покупця з урахуванням знижки · EUR · 1 EUR = ${options.eurUah!.toFixed(2)} грн`
    : "Ціни для покупця з урахуванням знижки · UAH", left, y);
  y += 6;

  const items = order.items ?? [];
  let endY = y;
  autoTable(doc, {
    startY: y,
    margin: { left, right: 14, top: 31, bottom: 22 },
    theme: "grid",
    rowPageBreak: "avoid",
    showHead: "everyPage",
    styles: { font: "NotoSans", fontSize: 8, cellPadding: 2, textColor: [48, 68, 71], lineColor: [224, 231, 231], lineWidth: 0.15, valign: "middle", overflow: "linebreak" },
    headStyles: { fillColor: [28, 72, 69], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
    bodyStyles: { minCellHeight: 27 },
    alternateRowStyles: { fillColor: [248, 250, 249] },
    columnStyles: { 0: { cellWidth: 8, halign: "center" }, 1: { cellWidth: 23, halign: "center" }, 2: { cellWidth: 43 }, 3: { cellWidth: 16, halign: "center" }, 4: { cellWidth: 24, halign: "right" }, 5: { cellWidth: 17, halign: "center" }, 6: { cellWidth: 26, halign: "right" }, 7: { cellWidth: 25, halign: "right" } },
    head: [["№", "Фото", "Найменування товару", "К-сть", `До знижки, ${label}`, "Знижка", `Зі знижкою, ${label}`, `Сума, ${label}`]],
    body: items.map((item, index) => [
      String(index + 1), options.images[index] ? "" : "Фото\nвідсутнє",
      [item.name, item.article && `Арт. ${item.article}`].filter(Boolean).join("\n"),
      `${item.quantity.toLocaleString("uk-UA")} ${item.unit || "од."}`,
      money(item.price), `${(item.discount ?? 0).toLocaleString("uk-UA")}%`,
      money(item.discountedPrice ?? round(item.price * (1 - (item.discount ?? 0) / 100))), money(item.total),
    ]),
    didDrawCell(data) {
      if (data.section !== "body" || data.column.index !== 1) return;
      const image = options.images[data.row.index];
      if (!image) return;
      const scale = Math.min((data.cell.width - 4) / image.width, (data.cell.height - 4) / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      doc.addImage(image.data, "JPEG", data.cell.x + (data.cell.width - width) / 2, data.cell.y + (data.cell.height - height) / 2, width, height);
    },
    didDrawPage(data) {
      if (data.pageNumber > 1) {
        brand(17);
        doc.setFont("NotoSans", "normal").setFontSize(8).setTextColor(99, 113, 116);
        doc.text(`Пропозиція № ${order.id}`, right, 17, { align: "right" });
      }
      endY = data.cursor?.y ?? endY;
    },
  });
  const subtotal = round(items.reduce((sum, item) => sum + round(item.price * item.quantity), 0));
  const total = order.total ?? round(items.reduce((sum, item) => sum + item.total, 0));
  const saving = round(Math.max(0, subtotal - total));
  const summaryHeight = saving > 0 ? 37 : 19;
  if (endY + 7 + summaryHeight > 275) { doc.addPage(); brand(17); endY = 31; }
  doc.setFillColor(233, 241, 239).roundedRect(left, endY + 7, 182, summaryHeight, 2, 2, "F");
  if (saving > 0) {
    doc.setFont("NotoSans", "normal").setFontSize(9).setTextColor(48, 68, 71);
    doc.text("Вартість без знижки", left + 5, endY + 15);
    doc.text(`${money(subtotal)} ${label}`, right - 5, endY + 15, { align: "right" });
    doc.text("Ваша економія", left + 5, endY + 23);
    doc.text(`${money(saving)} ${label}`, right - 5, endY + 23, { align: "right" });
  }
  doc.setFont("NotoSans", "bold").setFontSize(11).setTextColor(28, 72, 69);
  doc.text("Загальна вартість", left + 5, endY + summaryHeight);
  doc.setFontSize(14).text(`${money(total)} ${label}`, right - 5, endY + summaryHeight, { align: "right" });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(224, 231, 231).setLineWidth(0.2).line(left, 280, right, 280);
    doc.setFont("NotoSans", "normal").setFontSize(8).setTextColor(99, 113, 116);
    doc.text("Villa Grande · Комерційна пропозиція", left, 286);
    doc.text(`${page} / ${pages}`, right, 286, { align: "right" });
  }
  return doc;
}
