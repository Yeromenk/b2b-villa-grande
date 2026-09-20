import { RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useMemo } from "react";
import type { CatalogFilters, Product } from "../../types/catalog";
import { defaultFilters } from "../../types/catalog";
import { filterOptions } from "../../utils/catalogAttributes";
import { FilterSelect } from "./FilterSelect";

type FilterPanelProps = {
  products: Product[]; category: string; resultCount: number; filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void; onReset: () => void; onClose: () => void;
};
export function FilterPanel({ products, category, resultCount, filters, onChange, onReset, onClose }: FilterPanelProps) {
  const fields = useMemo(() => [
    { key: "brand" as const, label: "Бренд", options: filterOptions(products, "brand") },
    { key: "color" as const, label: "Колір / покриття", options: filterOptions(products, "color") },
    { key: "stock" as const, label: "Наявність", options: filterOptions(products, "stock") },
    { key: "segment" as const, label: "Ціновий сегмент", options: filterOptions(products, "segment", ["Не визначено"]) },
    { key: "supplier" as const, label: "Постачальник", options: filterOptions(products, "supplier") },
    { key: "installation" as const, label: "Тип монтажу", options: filterOptions(products, "installation") },
  ].filter((field) => field.options.length > (field.key === "supplier" ? 1 : 0)), [products]);
  return <aside className="filter-panel" aria-label="Фільтри каталогу">
    <div className="filter-panel-header"><div><span className="eyebrow">{category}</span><h2>Уточніть вибір</h2></div><button className="close-button" onClick={onClose} aria-label="Закрити фільтри"><X size={18} /></button></div>
    {fields.map(({ key, label, options }) => <FilterSelect key={`${category}-${key}`} label={label} value={filters[key]} allLabel={defaultFilters[key]} options={options} onChange={(value) => onChange({ ...filters, [key]: value })} />)}
    <div className="filter-row">
      <div className="filter-group"><label htmlFor="minPrice">Ціна від, ₴</label><input id="minPrice" type="number" min="0" placeholder="0" value={filters.minPrice} onChange={(event) => onChange({ ...filters, minPrice: event.target.value })} /></div>
      <div className="filter-group"><label htmlFor="maxPrice">Ціна до, ₴</label><input id="maxPrice" type="number" min="0" placeholder="Без ліміту" value={filters.maxPrice} onChange={(event) => onChange({ ...filters, maxPrice: event.target.value })} /></div>
    </div>
    <div className="filter-actions"><button className="reset-button" onClick={onReset}><RotateCcw size={16} />Скинути все</button><button className="apply-button" onClick={onClose}><SlidersHorizontal size={16} />Показати {resultCount.toLocaleString("uk-UA")} товарів</button></div>
  </aside>;
}
