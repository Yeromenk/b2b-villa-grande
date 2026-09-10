import { Plus } from "lucide-react";
import type { Product } from "../../types/catalog";
import type { Currency } from "../../types/catalog";
import { formatMoney } from "../../data/exchangeRates";

type ProductCardProps = {
  product: Product;
  onAdd: (id: number) => void;
  currency: Currency;
};

export function ProductCard({ product, onAdd, currency }: ProductCardProps) {
  return (
    <article className="product-card">
      <div className="product-image">
        <img src={product.image} alt={product.name} />
        <span className={product.stock === "В наявності" ? "stock available" : "stock order"}>
          {product.stock}
        </span>
      </div>
      <div className="product-info">
        <span className="product-brand">{product.brand}</span>
        <h3>{product.name}</h3>
        <span className="article">Арт. {product.article} · {product.color}</span>
        <div className="product-footer">
          <div>
            <strong>{formatMoney(product.price, currency)}</strong>
            <span className="product-meta">{product.segment} · {product.supplier}</span>
          </div>
          <button className="add-button" onClick={() => onAdd(product.id)} aria-label={`Додати ${product.name}`}>
            <Plus size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
