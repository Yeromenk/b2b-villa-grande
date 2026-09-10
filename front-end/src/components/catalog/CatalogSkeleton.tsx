export function CatalogSkeleton() {
  return <div className="product-grid catalog-skeleton" aria-label="Завантаження каталогу">
    {Array.from({ length: 6 }, (_, index) => <article className="skeleton-card" key={index}><div className="skeleton-image" /><div className="skeleton-line skeleton-brand" /><div className="skeleton-line skeleton-title" /><div className="skeleton-line skeleton-price" /></article>)}
  </div>;
}
