import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FaHeart,
  FaShareAlt,
  FaFlag,
  FaCheckCircle,
  FaStar,
  FaComment,
} from "react-icons/fa";
import Navbar from "../components/navbar";
import Footer from "../components/Shared/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import SimilarItemsCarousel from "../components/Shared/SimilarItemsCarousel";
import api from "../api/client";
import { uploadUrl } from "../config";
import { useToast } from "../context/ToastContext";
import { pushRecentlyViewed } from "../utils/recentlyViewed";
import "./View.css";

function View() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatBody, setChatBody] = useState("");
  const [ratingStars, setRatingStars] = useState(5);
  const showToast = useToast();

  const loadListing = () =>
    api.get(`/api/listings/${id}`).then((res) => {
      const data = res.data;
      const images = [
        data.image,
        ...(data.extra_images || []),
      ].filter(Boolean);
      setItem({ ...data, images });
      pushRecentlyViewed(data);
      return data;
    });

  useEffect(() => {
    setSimilarLoading(true);
    setSimilar([]);
    loadListing()
      .then(() =>
        api
          .get(`/api/listings/${id}/similar`)
          .then((res) => setSimilar(res.data || []))
          .catch(() => setSimilar([]))
          .finally(() => setSimilarLoading(false))
      )
      .catch(() => {
        showToast("Listing not found", "error");
        navigate("/home");
      })
      .finally(() => setLoading(false));
  }, [id, navigate, showToast]);

  const toggleWishlist = () => {
    api.post("/api/wishlist/toggle", { post_id: item.id }).then((res) => {
      setItem((prev) => ({ ...prev, in_wishlist: res.data.in_wishlist }));
      showToast(res.data.message, "success");
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast("Link copied", "success");
      }
    } catch {
      showToast("Could not share", "error");
    }
  };

  const handleReport = () => {
    const reason = window.prompt("Why are you reporting this listing?");
    if (!reason) return;
    api
      .post(`/api/listings/${id}/report`, { reason })
      .then((res) => showToast(res.data.message, "success"))
      .catch((err) =>
        showToast(err.response?.data?.message || "Failed", "error")
      );
  };

  const handleAddToCart = () => {
    if (!item?.id) return;
    addToCart(item.id);
  };

  const addToCart = (postId) => {
    api
      .post("/api/yourcart/add", { post_id: postId })
      .then((res) => {
        showToast(res.data.message, "success");
        window.dispatchEvent(new Event("campuscart:refresh-badges"));
      })
      .catch((err) =>
        showToast(err.response?.data?.message || "Failed", "error")
      );
  };

  const browseCategory = (cat) => {
    if (!cat) return;
    sessionStorage.setItem("campuscart:home-category", cat);
    navigate("/home");
  };

  const markSold = () => {
    api.post(`/api/listings/${id}/sold`).then(() => {
      showToast("Marked as sold", "success");
      navigate("/youritems");
    });
  };

  const loadMessages = () => {
    api
      .get(`/api/listings/${id}/messages`)
      .then((res) => setMessages(res.data || []))
      .catch(() => setMessages([]));
  };

  const sendMessage = (e) => {
    e.preventDefault();
    api
      .post(`/api/listings/${id}/messages`, { body: chatBody })
      .then(() => {
        setChatBody("");
        loadMessages();
      })
      .catch((err) =>
        showToast(err.response?.data?.message || "Failed", "error")
      );
  };

  const submitRating = () => {
    api
      .post(`/api/sellers/${item.seller_id}/rate`, {
        post_id: item.id,
        stars: ratingStars,
      })
      .then((res) => showToast(res.data.message, "success"))
      .catch((err) =>
        showToast(err.response?.data?.message || "Failed", "error")
      );
  };

  if (loading) {
    return (
      <div className="page-shell view-page">
        <Navbar />
        <p className="loading-text">Loading item…</p>
      </div>
    );
  }

  if (!item) return null;

  const gallery = (item.images || [item.image]).map((f) => uploadUrl(f)).filter(Boolean);
  const sold = item.is_sold || item.status === "sold";

  return (
    <div className="page-shell view-page">
      <Navbar />
      <main className="page-content view-container">
        <div className="image-column">
          {gallery.length ? (
            <>
              <img
                src={gallery[activeImage]}
                alt={item.title}
                className="product-image"
              />
              {gallery.length > 1 && (
                <div className="view-thumbs">
                  {gallery.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      className={i === activeImage ? "active" : ""}
                      onClick={() => setActiveImage(i)}
                    >
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="product-image product-image--empty" />
          )}
        </div>

        <div className="details-column">
          {sold && <span className="view-sold-badge">Sold</span>}
          <span className="product-category">{item.category}</span>
          <h2 className="product-title">{item.title}</h2>
          <p className="product-price">
            ₹{Number(item.price).toLocaleString("en-IN")}
            {item.negotiable && <small className="view-negotiable"> · Negotiable</small>}
          </p>
          <p className="view-meta">
            {item.condition} · {item.pickup_location || "Campus pickup"}
            {item.view_count > 0 && ` · ${item.view_count} views`}
          </p>
          <p className="product-description">{item.description}</p>

          <div className="view-seller-row">
            <Link to={`/seller/${item.seller_id}`} className="view-seller-link">
              {item.seller_name}
              {item.seller_verified && (
                <FaCheckCircle className="view-verified-icon" title="Verified" />
              )}
            </Link>
            {item.seller_rating?.count > 0 && (
              <span className="view-seller-rating">
                <FaStar aria-hidden /> {item.seller_rating.avg} ({item.seller_rating.count})
              </span>
            )}
          </div>

          <div className="view-actions">
            {!sold && !item.is_owner && (
              <button type="button" onClick={handleAddToCart} className="add-to-cart-button">
                Add to Cart
              </button>
            )}
            <button
              type="button"
              className="view-icon-btn"
              onClick={toggleWishlist}
              aria-pressed={item.in_wishlist}
            >
              <FaHeart className={item.in_wishlist ? "is-active" : ""} /> Wishlist
            </button>
            <button type="button" className="view-icon-btn" onClick={handleShare}>
              <FaShareAlt /> Share
            </button>
            {!item.is_owner && (
              <button type="button" className="view-icon-btn" onClick={handleReport}>
                <FaFlag /> Report
              </button>
            )}
            {item.is_owner && !sold && (
              <button type="button" className="view-icon-btn" onClick={markSold}>
                Mark sold
              </button>
            )}
            {!item.is_owner && !sold && (
              <button
                type="button"
                className="view-icon-btn"
                onClick={() => {
                  setChatOpen((o) => !o);
                  if (!chatOpen) loadMessages();
                }}
              >
                <FaComment /> Message seller
              </button>
            )}
          </div>

          {chatOpen && (
            <section className="view-chat">
              <ul className="view-chat-list">
                {messages.map((m) => (
                  <li key={m.id} className={m.is_mine ? "mine" : ""}>
                    <strong>{m.sender_name}</strong>: {m.body}
                  </li>
                ))}
              </ul>
              <form onSubmit={sendMessage} className="view-chat-form">
                <input
                  value={chatBody}
                  onChange={(e) => setChatBody(e.target.value)}
                  placeholder="Ask about this item…"
                  required
                />
                <button type="submit">Send</button>
              </form>
            </section>
          )}

          {!item.is_owner && !sold && (
            <div className="view-rate">
              <label>
                Rate seller:{" "}
                <select
                  value={ratingStars}
                  onChange={(e) => setRatingStars(Number(e.target.value))}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} stars
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={submitRating}>
                Submit rating
              </button>
            </div>
          )}
        </div>
      </main>

      <SimilarItemsCarousel
        items={similar}
        loading={similarLoading}
        category={item?.category || ""}
        onView={(lid) => navigate(`/listing/${lid}`)}
        onAddToCart={addToCart}
        onBrowseCategory={browseCategory}
      />

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

export default View;
