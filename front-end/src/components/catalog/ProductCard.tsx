import { ImageOff, Plus } from "lucide-react";
import { useState } from "react";
import type { Product } from "../../types/catalog";
import type { Currency } from "../../types/catalog";
import { formatMoney } from "../../data/exchangeRates";

type ProductCardProps = {
  product: Product;
  onAdd: (id: number) => void;
  currency: Currency;
};

export function ProductCard({ product, onAdd, currency }: ProductCardProps) {
  const [failedImage, setFailedImage] = useState("");
  const metadata = [product.supplier, product.segment !== "Не визначено" ? product.segment : ""].filter(Boolean).join(" · ");
  return (
    <article className="product-card">
      <div className="product-image">
        {product.image && failedImage !== product.image ? <img src={product.image} alt={product.name} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedImage(product.image)} /> : <span className="product-image-placeholder"><ImageOff size={28} aria-hidden="true" />Фото відсутнє</span>}
        <span className={product.stock === "В наявності" ? "stock available" : "stock order"}>
          {product.stock}
        </span>
      </div>
      <div className="product-info">
        <span className="product-brand">{product.brand}</span>
        <h3 title={product.name}>{product.name}</h3>
        <span className="product-category">{product.category}</span>
        <span className="article">{[product.article && `Арт. ${product.article}`, product.color].filter(Boolean).join(" · ")}</span>
        <div className="product-footer">
          <div>
            <strong>{formatMoney(product.price, currency)}{product.unit && <small className="product-price-unit"> / {product.unit}</small>}</strong>
            {product.purchasePrice != null && <span className="product-purchase-price">Закупівля: {formatMoney(product.purchasePrice, currency)}{product.unit && ` / ${product.unit}`}</span>}
            <span className="product-meta">{metadata}</span>
          </div>
          <button className="add-button" onClick={() => onAdd(product.id)} aria-label={`Додати ${product.name}`}>
            <Plus size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
