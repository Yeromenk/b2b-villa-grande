export function OrdersSkeleton() {
  return <div className="orders-skeleton" aria-label="Завантаження замовлень"><div className="skeleton-summary-row">{Array.from({ length: 3 }, (_, index) => <div className="skeleton-block" key={index} />)}</div><div className="skeleton-table"><div className="skeleton-table-head" />{Array.from({ length: 5 }, (_, index) => <div className="skeleton-table-row" key={index}><span /><span /><span /><span /></div>)}</div></div>;
}
