import type { Product } from "../types/catalog";

// Match explicit color words only, never infer from pictures or article numbers.
const colors: [string, RegExp][] = [
  ["Чорний хром", /black chrome|чорн\p{L}* хром/iu],
  ["Хром", /\bchrome\b|(?<!\p{L})хром\p{L}*/iu],
  ["Бронза", /\bbronze\b|(?<!\p{L})бронз\p{L}*/iu],
  ["Мідь", /\bcopper\b|(?<!\p{L})(?:мідн|медн)\p{L}*/iu],
  ["Золото", /\bgold\b|(?<!\p{L})золот\p{L}*/iu],
  ["Латунь", /\bbrass\b|(?<!\p{L})латун\p{L}*/iu],
  ["Нікель", /\b(?:nickel|nichel)\b|(?<!\p{L})(?:нікел|никел)\p{L}*/iu],
  ["Нержавіюча сталь", /stainless steel|(?<!\p{L})(?:нержавіюч|нержавеющ)\p{L}*/iu],
  ["Gun Metal", /\bgun ?metal\b/iu],
  ["Графіт", /\bgraphite\b|(?<!\p{L})(?:графіт|графит)\p{L}*/iu],
  ["Чорний", /\bblack\b|(?<!\p{L})(?:чорн|черн)\p{L}*/iu],
  ["Білий", /\bwhite\b|(?<!\p{L})(?:біл|бел)(?:ий|ый|а|ая|е|ое|і|ые|ого|ої)(?!\p{L})/iu],
  ["Сірий", /\bgr[ae]y\b|(?<!\p{L})(?:сір|сер)(?:ий|ый|а|ая|е|ое|і|ые|ого|ої)(?!\p{L})/iu],
  ["Бежевий", /\bbeige\b|(?<!\p{L})бежев\p{L}*/iu],
  ["Прозорий", /\btransparent\b|(?<!\p{L})(?:прозор|прозрачн)\p{L}*/iu],
  ["Коричневий", /\bbrown\b|(?<!\p{L})(?:коричнев)\p{L}*/iu],
];
export function withCatalogAttributes(product: Product): Product {
  return { ...product, brand: product.brand.replace(/&amp;/g, "&").trim(),
    color: product.color.trim() || colors.find(([, pattern]) => pattern.test(product.name))?.[0] || "" };
}
export const catalogCollator = new Intl.Collator("uk", { sensitivity: "base", numeric: true });
export function filterOptions(products: Product[], key: keyof Product, excluded: string[] = []) {
  const counts = new Map<string, number>();
  for (const product of products) {
    const value = String(product[key] ?? "").trim();
    if (value && !excluded.includes(value)) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts].sort(([a], [b]) => catalogCollator.compare(a, b)).map(([value, count]) => ({ value, count }));
}
