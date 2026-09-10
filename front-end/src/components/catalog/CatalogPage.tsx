import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigation, useOutletContext, useParams } from "react-router-dom";
import { CatalogSkeleton } from "./CatalogSkeleton";
import { FilterPanel } from "./FilterPanel";
import { ProductCard } from "./ProductCard";
import { categories, doorCategories, products } from "../../data/products";
import { defaultFilters } from "../../types/catalog";
import type { CatalogFilters } from "../../types/catalog";
import type { AppOutletContext } from "../layout/AppLayout";

export function CatalogPage() {
  const { addToCart, currency } = useOutletContext<AppOutletContext>();
  const { department: departmentParam = "all" } = useParams();
  const navigation = useNavigation();
  const department = departmentParam === "doors" ? "Двері" : departmentParam === "plumbing" ? "Сантехніка" : "all";
  const [activeCategory, setActiveCategory] = useState("Усі товари");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("Рекомендовані");
  const [filters, setFilters] = useState<CatalogFilters>(defaultFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const departmentProducts = useMemo(() => products.filter((product) => department === "all" || (product.department ?? "Сантехніка") === department), [department]);
  const currentCategories = department === "Двері" ? doorCategories : categories;
  const filteredProducts = useMemo(() => {
    const result = departmentProducts.filter((product) => {
      const query = search.toLowerCase().trim();
      return (activeCategory === "Усі товари" || activeCategory === "Усі двері" || product.category === activeCategory)
        && (!query || [product.name, product.article, product.brand].some((value) => value.toLowerCase().includes(query)))
        && (filters.stock === "Всі" || product.stock === filters.stock)
        && (filters.brand === "Всі бренди" || product.brand === filters.brand)
        && (filters.color === "Всі кольори" || product.color === filters.color)
        && (filters.supplier === "Всі постачальники" || product.supplier === filters.supplier)
        && (filters.segment === "Всі" || product.segment === filters.segment)
        && (filters.installation === "Всі типи" || product.installation === filters.installation)
        && (!filters.minPrice || product.price >= Number(filters.minPrice))
        && (!filters.maxPrice || product.price <= Number(filters.maxPrice));
    });
    return [...result].sort((first, second) => sort === "Ціна: від низької" ? first.price - second.price : sort === "Ціна: від високої" ? second.price - first.price : first.id - second.id);
  }, [activeCategory, departmentProducts, filters, search, sort]);
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    const defaults: Record<string, string> = { stock: "Всі", segment: "Всі", brand: "Всі бренди", color: "Всі кольори", supplier: "Всі постачальники", installation: "Всі типи" };
    return defaults[key] !== undefined ? value !== defaults[key] : Boolean(value);
  }).length;
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const loading = navigation.state === "loading";

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, department, filters, search, sort]);

  return <>
    <header className="topbar"><div><span className="eyebrow">КАТАЛОГ ТОВАРІВ</span><h1>Підбір матеріалів</h1></div><div className="header-context">{department === "all" ? "Всі товари" : department}</div></header>
    <section className="toolbar"><div className="search-box"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Пошук за назвою, артикулом або брендом..." /></div><button className="filter-button" onClick={() => setIsFilterOpen((open) => !open)}><SlidersHorizontal size={17} />Фільтри{activeFilterCount > 0 && <b>{activeFilterCount}</b>}</button></section>
    {isFilterOpen && <FilterPanel products={departmentProducts} filters={filters} onChange={setFilters} onReset={() => setFilters(defaultFilters)} onClose={() => setIsFilterOpen(false)} />}
    <div className="content-heading"><div><h2>{department === "all" ? "Усі товари" : department}</h2><span>Показано <strong>{Math.min(visibleProducts.length, filteredProducts.length)}</strong> з <strong>{filteredProducts.length}</strong> позицій</span></div><select value={sort} onChange={(event) => setSort(event.target.value)}><option>Рекомендовані</option><option>Ціна: від низької</option><option>Ціна: від високої</option></select></div>
    <div className="category-tabs">{currentCategories.map((category) => <button key={category} className={activeCategory === category ? "selected" : ""} onClick={() => setActiveCategory(category)}>{category}</button>)}</div>
    {loading ? <CatalogSkeleton /> : <div className="product-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} currency={currency} onAdd={addToCart} />)}</div>}
    {!loading && filteredProducts.length === 0 && <div className="empty-state"><h3>Нічого не знайдено</h3><p>Спробуйте змінити пошук або послабити фільтри.</p></div>}
    {!loading && filteredProducts.length > 0 && <nav className="pagination" aria-label="Сторінки каталогу"><button className="pagination-arrow" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Назад</button><div className="pagination-pages">{Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => <button key={page} className={page === currentPage ? "current" : ""} onClick={() => setCurrentPage(page)}>{page}</button>)}</div><button className="pagination-arrow" disabled={currentPage === pageCount} onClick={() => setCurrentPage((page) => page + 1)}>Далі</button></nav>}
  </>;
}
