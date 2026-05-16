import { useState } from "react";
import { FaEye, FaShoppingCart, FaImage, FaCheck } from "react-icons/fa";
import { uploadUrl } from "../../config";
import "./ProductCard.css";

function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return price;
  return n.toLocaleString("en-IN");
}

function ProductCard({
  item,
  onView,
  onAddToCart,
  badge,
  showActions = true,
  compact = false,
}) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const src = uploadUrl(item.image);

  const handleView = () => onView?.(item.id);

  const handleAddToCart = (e) => {
    e?.stopPropagation();
    if (justAdded) return;
    onAddToCart?.(item.id);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <article
      className={`product-card ${compact ? "product-card--compact" : ""} ${justAdded ? "is-added" : ""}`}
    >
      <div className="card-image-wrap">
        {badge && <span className="card-badge">{badge}</span>}
        <span className="card-price-tag">₹{formatPrice(item.price)}</span>

        {!imgError && src ? (
          <>
            {!imgLoaded && <div className="card-image-shimmer" aria-hidden />}
            <img
              src={src}
              alt={item.title}
              className={`card-image ${imgLoaded ? "is-loaded" : ""}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <div className="card-image-placeholder" aria-hidden>
            <FaImage />
          </div>
        )}

        <div className="card-image-overlay" aria-hidden>
          <button
            type="button"
            className="card-overlay-btn"
            onClick={handleView}
            aria-label={`View ${item.title}`}
          >
            <FaEye /> View
          </button>
          {showActions && onAddToCart && (
            <button
              type="button"
              className={`card-overlay-btn card-overlay-btn--cart ${justAdded ? "is-success" : ""}`}
              onClick={handleAddToCart}
              disabled={justAdded}
              aria-label={justAdded ? "Added to cart" : `Add ${item.title} to cart`}
            >
              {justAdded ? (
                <>
                  <FaCheck /> Added
                </>
              ) : (
                <>
                  <FaShoppingCart /> Add
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        className="card-body card-body--clickable"
        onClick={handleView}
        aria-label={`View details for ${item.title}`}
      >
        {item.category && (
          <span className="category-pill">{item.category}</span>
        )}
        <h3 className="card-title">{item.title}</h3>
      </button>

      {showActions && (
        <div className="card-actions">
          <button
            type="button"
            onClick={handleView}
            className="card-button view-button"
          >
            <FaEye aria-hidden /> View
          </button>
          {onAddToCart && (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={justAdded}
              className={`card-button cart-button ${justAdded ? "is-success" : ""}`}
            >
              {justAdded ? (
                <>
                  <FaCheck aria-hidden /> Added!
                </>
              ) : (
                <>
                  <FaShoppingCart aria-hidden /> Cart
                </>
              )}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default ProductCard;
