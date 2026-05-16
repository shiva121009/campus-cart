import { useRef } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ProductCard from "./ProductCard";
import "./CategoryScrollRow.css";

function CategoryScrollRow({
  title,
  sectionId,
  items,
  onView,
  onAddToCart,
  badge,
}) {
  const trackRef = useRef(null);

  const scroll = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const amount = Math.min(track.clientWidth * 0.85, 320);
    track.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (!items?.length) return null;

  return (
    <section
      className="category-row"
      id={sectionId}
      aria-labelledby={`${sectionId}-heading`}
    >
      <div className="category-row-header">
        <h3 className="category-row-title" id={`${sectionId}-heading`}>
          {title}
          <span className="category-row-count">{items.length}</span>
        </h3>
        <div className="category-row-nav" aria-hidden={items.length <= 3}>
          <button
            type="button"
            className="category-scroll-btn"
            onClick={() => scroll("left")}
            aria-label={`Scroll ${title} left`}
          >
            <FaChevronLeft />
          </button>
          <button
            type="button"
            className="category-scroll-btn"
            onClick={() => scroll("right")}
            aria-label={`Scroll ${title} right`}
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      <div className="category-scroll-outer">
        <div
          className="category-scroll-track"
          ref={trackRef}
          role="list"
          aria-label={`${title} listings`}
        >
          {items.map((item) => (
            <div className="category-scroll-item" key={item.id} role="listitem">
              <ProductCard
                item={item}
                badge={badge}
                onView={onView}
                onAddToCart={onAddToCart}
                compact
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CategoryScrollRow;
