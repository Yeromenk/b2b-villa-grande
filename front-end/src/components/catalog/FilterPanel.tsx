import { RotateCcw, SlidersHorizontal, X } from "lucide-react";
import type { CatalogFilters, Product } from "../../types/catalog";

type FilterPanelProps = {
  products: Product[];
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  onReset: () => void;
  onClose: () => void;
};

const uniqueValues = (products: Product[], key: keyof Product) => [
  `Всі ${key === "brand" ? "бренди" : key === "color" ? "кольори" : key === "supplier" ? "постачальники" : "типи"}`,
  ...Array.from(new Set(products.map((product) => String(product[key])))),
];

export function FilterPanel({
  products,
  filters,
  onChange,
  onReset,
  onClose,
}: FilterPanelProps) {
  const update = <Key extends keyof CatalogFilters>(
    key: Key,
    value: CatalogFilters[Key],
  ) => onChange({ ...filters, [key]: value });

  return (
    <aside className="filter-panel" aria-label="Фільтри каталогу">
      <div className="filter-panel-header">
        <div>
          <span className="eyebrow">ТОЧНИЙ ПОШУК</span>
          <h2>Фільтри</h2>
        </div>
        <button className="close-button" onClick={onClose} aria-label="Закрити фільтри">
          <X size={18} />
        </button>
      </div>

      <div className="filter-group">
        <label htmlFor="stock">Наявність</label>
        <select id="stock" value={filters.stock} onChange={(event) => update("stock", event.target.value as CatalogFilters["stock"])}>
          <option>Всі</option>
          <option>В наявності</option>
          <option>Під замовлення</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="segment">Ціновий сегмент</label>
        <select id="segment" value={filters.segment} onChange={(event) => update("segment", event.target.value as CatalogFilters["segment"])}>
          <option>Всі</option>
          <option>Бюджет</option>
          <option>Медіум</option>
          <option>Преміум</option>
        </select>
      </div>

      <div className="filter-row">
        <div className="filter-group">
          <label htmlFor="minPrice">Ціна від</label>
          <input id="minPrice" type="number" min="0" placeholder="0 ₴" value={filters.minPrice} onChange={(event) => update("minPrice", event.target.value)} />
        </div>
        <div className="filter-group">
          <label htmlFor="maxPrice">Ціна до</label>
          <input id="maxPrice" type="number" min="0" placeholder="Без ліміту" value={filters.maxPrice} onChange={(event) => update("maxPrice", event.target.value)} />
        </div>
      </div>

      <div className="filter-group">
        <label htmlFor="brand">Бренд</label>
        <select id="brand" value={filters.brand} onChange={(event) => update("brand", event.target.value)}>
          {uniqueValues(products, "brand").map((value) => <option key={value}>{value}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="color">Колір / покриття</label>
        <select id="color" value={filters.color} onChange={(event) => update("color", event.target.value)}>
          {uniqueValues(products, "color").map((value) => <option key={value}>{value}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="supplier">Постачальник</label>
        <select id="supplier" value={filters.supplier} onChange={(event) => update("supplier", event.target.value)}>
          {uniqueValues(products, "supplier").map((value) => <option key={value}>{value}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="installation">Тип монтажу</label>
        <select id="installation" value={filters.installation} onChange={(event) => update("installation", event.target.value)}>
          {uniqueValues(products, "installation").map((value) => <option key={value}>{value}</option>)}
        </select>
      </div>

      <div className="filter-actions">
        <button className="reset-button" onClick={onReset}>
          <RotateCcw size={15} />
          Скинути все
        </button>
        <button className="apply-button" onClick={onClose}>
          <SlidersHorizontal size={15} />
          Показати товари
        </button>
      </div>
    </aside>
  );
}
