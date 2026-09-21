import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { buildOrderPdf } from "../src/utils/orderPdf.ts";
import type { Order } from "../src/types/orders.ts";

const regularFont = readFileSync(new URL("../public/fonts/NotoSans-Regular.ttf", import.meta.url)).toString("base64");
const boldFont = readFileSync(new URL("../public/fonts/NotoSans-Bold.ttf", import.meta.url)).toString("base64");
const image = { data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4XmOQ8XD9DwAC1gGpM+kUUAAAAABJRU5ErkJggg==", width: 1, height: 1 };
const order: Order = { id: "VG-123", date: "20.09.2026", time: "12:00", client: "Олена Коваль", object: "Київ, вулиця Тестова, 1", itemCount: 1, status: "Нове", total: 2700,
  items: [{ name: "Змішувач для умивальника", article: "ABC-1", quantity: 3, price: 1000, discount: 10, discountedPrice: 900, total: 2700, purchasePrice: 678.91 }] };
const options = { regularFont, boldFont, images: [image], currency: "UAH" as const, eurUah: 50 };

test("A4 PDF contains Cyrillic customer text, customer prices, photo and total, without purchase prices", async () => {
  const doc = buildOrderPdf(order, options);
  const bytes = new Uint8Array(doc.output("arraybuffer"));
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 5)), "%PDF-");
  const pdf = await getDocument({ data: bytes, useSystemFonts: false }).promise;
  try {
    assert.equal(pdf.numPages, 1);
    const page = await pdf.getPage(1);
    assert.ok(Math.abs(page.view[2] - 595.28) < 0.1);
    assert.ok(Math.abs(page.view[3] - 841.89) < 0.1);
    const text = (await page.getTextContent()).items.map((item) => "str" in item ? item.str : "").join(" ");
    for (const value of ["Пропозиція", "Олена Коваль", "Змішувач", "1 000,00", "10%", "900,00", "2 700,00", "Вартість без знижки", "3 000,00", "Ваша економія", "300,00", "Загальна вартість"]) assert.ok(text.includes(value), value);
    assert.ok(!text.includes("678,91"));
    assert.ok(!text.includes("закуп"));
    const ops = await page.getOperatorList();
    assert.ok(ops.fnArray.includes(OPS.paintImageXObject) || ops.fnArray.includes(OPS.paintInlineImageXObject));
  } finally { await pdf.cleanup(); }
});

test("large proposals repeat table headers on A4 pages and display the total once", async () => {
  const items = Array.from({ length: 45 }, (_, index) => ({ ...order.items![0], name: `Товар ${index + 1}: ${"Довга назва українською мовою ".repeat(4)}` }));
  const doc = buildOrderPdf({ ...order, items, itemCount: 45, total: 121500 }, { ...options, images: [] });
  const pdf = await getDocument({ data: new Uint8Array(doc.output("arraybuffer")) }).promise;
  try {
    assert.ok(pdf.numPages > 1);
    let fullText = "";
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index);
      const text = (await page.getTextContent()).items.map((item) => "str" in item ? item.str : "").join(" ");
      assert.ok(text.includes(`${index} / ${pdf.numPages}`));
      if (text.includes("Товар")) assert.ok(text.includes("Найменування товару"));
      fullText += text;
    }
    assert.equal(fullText.match(/Загальна вартість/g)?.length, 1);
    assert.ok(fullText.includes("121 500,00"));
    assert.ok(fullText.includes("Товар 45"));
  } finally { await pdf.cleanup(); }
});

test("EUR proposals use one captured rate and reject an unavailable rate", async () => {
  assert.throws(() => buildOrderPdf(order, { ...options, currency: "EUR", eurUah: null }), /курс EUR/);
  const doc = buildOrderPdf(order, { ...options, currency: "EUR", images: [] });
  const pdf = await getDocument({ data: new Uint8Array(doc.output("arraybuffer")) }).promise;
  try {
    const text = (await (await pdf.getPage(1)).getTextContent()).items.map((item) => "str" in item ? item.str : "").join(" ");
    assert.ok(text.includes("18,00"));
    assert.ok(text.includes("20,00"));
    assert.ok(text.includes("10%"));
    assert.ok(text.includes("6,00 EUR"));
    assert.ok(text.includes("54,00 EUR"));
    assert.ok(text.includes("1 EUR = 50.00 грн"));
  } finally { await pdf.cleanup(); }
});

test("zero and full discounts remain explicit without exposing purchase prices", async () => {
  for (const discount of [0, 100]) {
    const total = discount === 100 ? 0 : 3000;
    const item = { ...order.items![0], discount, discountedPrice: discount === 100 ? 0 : 1000, total };
    const pdf = await getDocument({ data: new Uint8Array(buildOrderPdf({ ...order, total, items: [item] }, { ...options, images: [] }).output("arraybuffer")) }).promise;
    try {
      const text = (await (await pdf.getPage(1)).getTextContent()).items.map((item) => "str" in item ? item.str : "").join(" ");
      assert.ok(text.includes(`${discount}%`));
      assert.equal(text.includes("Ваша економія"), discount === 100);
      assert.ok(!text.includes("678,91"));
    } finally { await pdf.cleanup(); }
  }
});
