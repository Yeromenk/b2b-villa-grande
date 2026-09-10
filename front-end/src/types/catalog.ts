export type StockStatus = "В наявності" | "Під замовлення";
export type PriceSegment = "Бюджет" | "Медіум" | "Преміум";
export type ProductDepartment = "Сантехніка" | "Двері";
export type Currency = "UAH" | "EUR";

export type Product = {
  id: number;
  name: string;
  brand: string;
  article: string;
  category: string;
  price: number;
  stock: StockStatus;
  color: string;
  supplier: string;
  segment: PriceSegment;
  installation: string;
  image: string;
  department?: ProductDepartment;
};

export type CatalogFilters = {
  stock: StockStatus | "Всі";
  brand: string;
  color: string;
  supplier: string;
  segment: PriceSegment | "Всі";
  installation: string;
  minPrice: string;
  maxPrice: string;
};

export const defaultFilters: CatalogFilters = {
  stock: "Всі",
  brand: "Всі бренди",
  color: "Всі кольори",
  supplier: "Всі постачальники",
  segment: "Всі",
  installation: "Всі типи",
  minPrice: "",
  maxPrice: "",
};
