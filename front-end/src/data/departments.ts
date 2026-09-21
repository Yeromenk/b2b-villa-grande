import type { ProductDepartment } from "../types/catalog";

export const departments: { slug: string; label: ProductDepartment }[] = [
  { slug: "plumbing", label: "Сантехніка" },
  { slug: "tiles", label: "Плитка" },
  { slug: "stone", label: "Натуральний камінь" },
  { slug: "spa", label: "СПА" },
  { slug: "engineering", label: "Інженерія" },
  { slug: "flooring", label: "Покриття для підлоги" },
  { slug: "panels", label: "Панелі" },
  // { slug: "doors", label: "Двері" },
];
