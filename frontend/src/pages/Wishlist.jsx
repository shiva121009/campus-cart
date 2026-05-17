import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHeart,
  FaShoppingCart,
  FaEye,
  FaImage,
  FaTrashAlt,
} from "react-icons/fa";
import Navbar from "../components/navbar";
import Footer from "../components/Shared/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import PageHeader from "../components/Shared/PageHeader";
import EmptyState from "../components/Shared/EmptyState";
import CardSkeleton from "../components/Shared/CardSkeleton";
import api from "../api/client";
import { uploadUrl } from "../config";
import { useToast } from "../context/ToastContext";
import "./Wishlist.css";

function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return price;
  return n.toLocaleString("en-IN");
}

function WishlistItem({ item, onView, onRemove, onAddToCart, removing }) {
  const sold = item.is_sold || item.status === "sold";
  const src = uploadUrl(item.image);

  return (
    <article className={`wishlist-card ${sold ? "wishlist-card--sold" : ""}`}>
      <button
        type="button"
        className="wishlist-card-remove"
        onClick={() => onRemove(item.id)}
        disabled={removing}
        aria-label={`Remove ${item.title} from wishlist`}
      >
        <FaTrashAlt aria-hidden />
      </button>

      <button
        type="button"
        className="wishlist-card-media"
        onClick={() => onView(item.id)}
        aria-label={`View ${item.title}`}
      >
        {src ? (
          <img src={src} alt="" className="wishlist-card-image" />
        ) : (
          <div className="wishlist-card-image wishlist-card-image--empty" aria-hidden>
            <FaImage />
          </div>
        )}
        {sold && <span className="wishlist-card-sold">Sold</span>}
        <span className="wishlist-card-price">₹{formatPrice(item.price)}</span>
      </button>

      <div className="wishlist-card-body">
        {item.category && <span className="wishlist-card-category">{item.category}</span>}
        <h3 className="wishlist-card-title">
          <button type="button" onClick={() => onView(item.id)}>
            {item.title}
          </button>
        </h3>
        {item.pickup_location && (
          <p className="wishlist-card-location">Pickup: {item.pickup_location}</p>
        )}
        {item.seller_verified && (
          <span className="wishlist-card-verified">Verified seller</span>
        )}
      </div>

      <div className="wishlist-card-actions">
        <button
          type="button"
          className="wishlist-btn wishlist-btn--view"
          onClick={() => onView(item.id)}
        >
          <FaEye aria-hidden /> View
        </button>
        {!sold && (
          <button
            type="button"
            className="wishlist-btn wishlist-btn--cart"
            onClick={() => onAddToCart(item.id)}
          >
            <FaShoppingCart aria-hidden /> Add to cart
          </button>
        )}
      </div>
    </article>
  );
}

function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const navigate = useNavigate();
  const showToast = useToast();

  const loadWishlist = useCallback(() => {
    setLoading(true);
    return api
      .get("/api/wishlist")
      .then((res) => setItems(res.data || []))
      .catch(() => {
        setItems([]);
        showToast("Could not load wishlist", "error");
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const handleRemove = (id) => {
    setRemovingId(id);
    api
      .post("/api/wishlist/toggle", { post_id: id })
      .then((res) => {
        setItems((prev) => prev.filter((i) => i.id !== id));
        showToast(res.data.message || "Removed from wishlist", "info");
      })
      .catch((err) =>
        showToast(err.response?.data?.message || "Could not remove", "error")
      )
      .finally(() => setRemovingId(null));
  };

  const handleAddToCart = (id) => {
    api
      .post("/api/yourcart/add", { post_id: id })
      .then((res) => {
        showToast(res.data.message || "Added to cart", "success");
        window.dispatchEvent(new Event("campuscart:refresh-badges"));
      })
      .catch((err) =>
        showToast(err.response?.data?.message || "Could not add to cart", "error")
      );
  };

  const availableCount = items.filter((i) => !i.is_sold && i.status !== "sold").length;

  return (
    <div className="page-shell wishlist-page">
      <Navbar />
      <main className="page-content wishlist-container">
        <PageHeader
          kicker="Saved items"
          title="Your wishlist"
          subtitle="Items you saved for later. Remove anytime or add them to your cart when ready."
        />

        {!loading && items.length > 0 && (
          <div className="wishlist-toolbar">
            <p className="wishlist-count">
              <FaHeart className="wishlist-count-icon" aria-hidden />
              <span>
                <strong>{items.length}</strong> saved
                {availableCount < items.length && (
                  <span className="wishlist-count-muted">
                    {" "}
                    · {availableCount} still available
                  </span>
                )}
              </span>
            </p>
            <button
              type="button"
              className="wishlist-browse-btn"
              onClick={() => navigate("/home")}
            >
              Browse more
            </button>
          </div>
        )}

        {loading ? (
          <div className="wishlist-grid wishlist-grid--loading">
            <CardSkeleton count={6} />
          </div>
        ) : items.length > 0 ? (
          <div className="wishlist-grid">
            {items.map((item) => (
              <WishlistItem
                key={item.id}
                item={item}
                removing={removingId === item.id}
                onView={(id) => navigate(`/listing/${id}`)}
                onRemove={handleRemove}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Wishlist is empty"
            message="When you find something you like, tap the heart on a listing to save it here."
            actionLabel="Browse listings"
            onAction={() => navigate("/home")}
          />
        )}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

export default Wishlist;

