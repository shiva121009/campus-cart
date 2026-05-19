import { useRef } from "react";
import { FaChevronLeft, FaChevronRight, FaMagic } from "react-icons/fa";
import ProductCard from "./ProductCard";
import "./SimilarItemsCarousel.css";
import "./CardSkeleton.css";

function SimilarItemsCarousel({
  items = [],
  loading = false,
  category = "",
  onView,
  onAddToCart,
  onBrowseCategory,
}) {
  const trackRef = useRef(null);

  const scroll = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.min(360, el.clientWidth * 0.85);
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  const showSection = loading || items.length > 0;
  if (!showSection) return null;

  return (
    <section className="similar-carousel" aria-labelledby="similar-items-heading">
      <div className="similar-carousel-header">
        <div className="similar-carousel-heading">
          <span className="similar-carousel-icon" aria-hidden>
            <FaMagic />
          </span>
          <div>
            <h2 id="similar-items-heading">You might also like</h2>
            <p className="similar-carousel-sub">
              Smart picks based on this listing — powered by semantic similarity
            </p>
          </div>
        </div>
        <div className="similar-carousel-actions">
          {category && onBrowseCategory && (
            <button
              type="button"
              className="similar-carousel-browse"
              onClick={() => onBrowseCategory(category)}
            >
              More in {category}
            </button>
          )}
          <div className="similar-carousel-nav" aria-hidden={loading}>
            <button
              type="button"
              className="similar-carousel-nav-btn"
              onClick={() => scroll(-1)}
              aria-label="Scroll similar items left"
              disabled={loading}
            >
              <FaChevronLeft />
            </button>
            <button
              type="button"
              className="similar-carousel-nav-btn"
              onClick={() => scroll(1)}
              aria-label="Scroll similar items right"
              disabled={loading}
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      <div className="similar-carousel-track-wrap">
        <div
          ref={trackRef}
          className="similar-carousel-track"
          role="list"
          aria-busy={loading}
        >
          {loading &&
            Array.from({ length: 4 }, (_, i) => (
              <div key={`sk-${i}`} className="similar-carousel-item similar-carousel-item--skeleton">
                <div className="similar-skeleton-card skeleton-shimmer" />
              </div>
            ))}
          {!loading &&
            items.map((s) => (
              <div key={s.id} className="similar-carousel-item" role="listitem">
                <ProductCard
                  item={s}
                  compact
                  badge={s.category === category ? "Same category" : "Similar"}
                  onView={onView}
                  onAddToCart={onAddToCart}
                />
              </div>
            ))}
        </div>
      </div>

      {!loading && items.length > 0 && (
        <p className="similar-carousel-hint">Swipe or use arrows to see more</p>
      )}
    </section>
  );
}

export default SimilarItemsCarousel;
