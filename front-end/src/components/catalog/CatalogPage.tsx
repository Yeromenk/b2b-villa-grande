import {ChevronDown, RefreshCw, Search, SlidersHorizontal} from "lucide-react";
import {useMemo, useState} from "react";
import {useNavigation, useOutletContext, useParams} from "react-router-dom";
import {CatalogSkeleton} from "./CatalogSkeleton";
import {FilterPanel} from "./FilterPanel";
import {ProductCard} from "./ProductCard";
import {defaultFilters} from "../../types/catalog";
import type {CatalogFilters} from "../../types/catalog";
import type {AppOutletContext} from "../layout/AppLayout";
import {filterOptions} from "../../utils/catalogAttributes";
import {departments} from "../../data/departments";

export function CatalogPage() {
    const {
        addToCart,
        currency,
        products,
        productsLoading,
        productsError,
        reloadProducts
    } = useOutletContext<AppOutletContext>();
    const {department: departmentParam = "all"} = useParams();
    const navigation = useNavigation();
    const department = departments.find((item) => item.slug === departmentParam)?.label ?? "all";
    const [activeCategory, setActiveCategory] = useState("Усі товари");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("Рекомендовані");
    const [filters, setFilters] = useState<CatalogFilters>(defaultFilters);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [allCategoriesOpen, setAllCategoriesOpen] = useState(false);
    const [pagination, setPagination] = useState({key: "", page: 1});
    const [previousDepartment, setPreviousDepartment] = useState(department);
    if (previousDepartment !== department) {
        setPreviousDepartment(department);
        setActiveCategory("Усі товари");
        setFilters(defaultFilters);
    }
    const paginationKey = JSON.stringify([activeCategory, department, filters, search, sort]);
    const setCurrentPage = (page: number) => setPagination({key: paginationKey, page});
    const pageSize = 24;
    const departmentProducts = useMemo(() => products.filter((product) => department === "all" || (product.department ?? "Сантехніка") === department), [department, products]);
    const currentCategories = useMemo(() => [{
        value: "Усі товари",
        count: departmentProducts.length
    }, ...filterOptions(departmentProducts, "category")], [departmentProducts]);
    const shownCategories = allCategoriesOpen ? currentCategories : currentCategories.filter((category, index) => index < 6 || category.value === activeCategory);
    const categoryProducts = useMemo(() => departmentProducts.filter((product) => activeCategory === "Усі товари" || product.category === activeCategory), [departmentProducts, activeCategory]);
    const chooseCategory = (category: string) => {
        setActiveCategory(category);
        // Keep valid selections, but never leave an invisible, incompatible filter active.
        const available = departmentProducts.filter((product) => category === "Усі товари" || product.category === category);
        setFilters((previous) => {
            const next = {...previous};
            for (const key of ["brand", "color", "supplier", "installation", "stock", "segment"] as const) {
                if (!available.some((product) => product[key] === previous[key])) Object.assign(next, {[key]: defaultFilters[key]});
            }
            return next;
        });
    };
    const filteredProducts = useMemo(() => {
        const result = categoryProducts.filter((product) => {
            const query = search.toLowerCase().trim();
            return (!query || [product.name, product.article, product.brand].some((value) => value.toLowerCase().includes(query)))
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
    }, [categoryProducts, filters, search, sort]);
    const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
        const defaults: Record<string, string> = {
            stock: "Всі",
            segment: "Всі",
            brand: "Всі бренди",
            color: "Всі кольори",
            supplier: "Всі постачальники",
            installation: "Всі типи"
        };
        return defaults[key] !== undefined ? value !== defaults[key] : Boolean(value);
    }).length;
    const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
    const currentPage = pagination.key === paginationKey ? Math.min(pagination.page, pageCount) : 1;
    const pageNumbers = useMemo(() => {
        const pages = new Set<number>();

        pages.add(1);
        pages.add(pageCount);

        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
            if (i >= 1 && i <= pageCount) {
                pages.add(i);
            }
        }

        return Array.from(pages).sort((a, b) => a - b);
    }, [currentPage, pageCount]);

    const visibleProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const loading = productsLoading || navigation.state === "loading";


    return <>
        <header className="topbar">
            <div><span className="eyebrow">КАТАЛОГ ТОВАРІВ</span><h1>Підбір матеріалів</h1></div>
            <div className="header-context">{department === "all" ? "Всі товари" : department}</div>
        </header>
        <section className="toolbar">
            <button className="filter-button" onClick={reloadProducts} disabled={productsLoading} title="Оновити каталог" aria-label="Оновити каталог"><RefreshCw size={18}/></button>
            <div className="search-box"><Search size={19}/><input value={search}
                                                                  onChange={(event) => setSearch(event.target.value)}
                                                                  placeholder="Пошук за назвою, артикулом або брендом..."/>
            </div>
            <button className="filter-button" onClick={() => setIsFilterOpen((open) => !open)}><SlidersHorizontal
                size={17}/>Фільтри{activeFilterCount > 0 && <b>{activeFilterCount}</b>}</button>
        </section>
        <section className="category-browser" aria-label="Категорії товарів">
            <div className="category-browser-heading">
                <span>Категорії <small>{currentCategories.length - 1}</small></span>{currentCategories.length > 6 &&
                <button className="category-expand" aria-expanded={allCategoriesOpen} aria-controls="catalog-categories"
                        onClick={() => setAllCategoriesOpen((open) => !open)}>{allCategoriesOpen ? "Згорнути" : "Усі категорії"}<ChevronDown
                    size={17} className={allCategoriesOpen ? "is-open" : ""}/></button>}</div>
            <div className="category-tabs" id="catalog-categories">{shownCategories.map(({value, count}) => <button
                key={value} className={activeCategory === value ? "selected" : ""}
                aria-pressed={activeCategory === value} onClick={() => chooseCategory(value)}>
                <span>{value}</span><small>{count.toLocaleString("uk-UA")}</small></button>)}</div>
        </section>
        {isFilterOpen &&
            <FilterPanel products={categoryProducts} category={activeCategory} resultCount={filteredProducts.length}
                         filters={filters} onChange={setFilters} onReset={() => setFilters(defaultFilters)}
                         onClose={() => setIsFilterOpen(false)}/>}
        <div className="content-heading">
            <div>
                <h2>{activeCategory !== "Усі товари" ? activeCategory : department === "all" ? "Усі товари" : department}</h2>
                <span>Показано <strong>{Math.min(visibleProducts.length, filteredProducts.length)}</strong> з <strong>{filteredProducts.length}</strong> позицій</span>
            </div>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option>Рекомендовані</option>
                <option>Ціна: від низької</option>
                <option>Ціна: від високої</option>
            </select></div>
        {loading ? <CatalogSkeleton/> :
            <div className="product-grid">{visibleProducts.map((product) => <ProductCard key={product.id}
                                                                                         product={product}
                                                                                         currency={currency}
                                                                                         onAdd={addToCart}/>)}</div>}
        {productsError && <div className="empty-state" role="alert"><p>{productsError}</p>
            <button onClick={reloadProducts}>Повторити</button>
        </div>}
        {!loading && !productsError && filteredProducts.length === 0 &&
            <div className="empty-state"><h3>{products.length ? "Нічого не знайдено" : "Каталог поки порожній"}</h3>
                <p>{products.length ? "Спробуйте змінити пошук або послабити фільтри." : "Товари з’являться після першого імпорту."}</p>
            </div>}
        {!loading && filteredProducts.length > 0 && (
            <nav className="pagination" aria-label="Сторінки каталогу">

                <button
                    className="pagination-arrow"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    title="Перша сторінка"
                >
                    ««
                </button>


                <button
                    className="pagination-arrow"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                >
                    Назад
                </button>


                <div className="pagination-pages">
                    {pageNumbers.map((page, index) => (
                        <span key={page}>
                    {index > 0 && page - pageNumbers[index - 1] > 1 && (
                        <span className="pagination-ellipsis" aria-hidden="true">…</span>
                    )}
                            <button
                                className={page === currentPage ? "current" : ""}
                                aria-current={page === currentPage ? "page" : undefined}
                                onClick={() => setCurrentPage(page)}
                            >
                        {page}
                    </button>
                </span>
                    ))}
                </div>


                <button
                    className="pagination-arrow"
                    disabled={currentPage === pageCount}
                    onClick={() => setCurrentPage(currentPage + 1)}
                >
                    Далі
                </button>


                <button
                    className="pagination-arrow"
                    disabled={currentPage === pageCount}
                    onClick={() => setCurrentPage(pageCount)}
                    title="Остання сторінка"
                >
                    »»
                </button>
            </nav>
        )}
    </>;
}
