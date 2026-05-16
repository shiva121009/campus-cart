import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/navbar";
import Footer from "../components/Shared/Footer";
import PageHeader from "../components/Shared/PageHeader";
import EmptyState from "../components/Shared/EmptyState";
import CardSkeleton from "../components/Shared/CardSkeleton";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import { useToast } from "../context/ToastContext";
import "./YourCart.css";

function YourCart() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const showToast = useToast();

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/yourcart`, { withCredentials: true })
      .then((res) => setCartItems(res.data))
      .catch((err) =>
        console.error("Failed to load cart:", err.response?.data || err.message)
      )
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = (id) => {
    axios
      .post(
        `${API_BASE}/api/yourcart/remove`,
        { post_id: id },
        { withCredentials: true }
      )
      .then(() => {
        setCartItems((prev) => prev.filter((item) => item.id !== id));
        showToast("Removed from cart", "info");
      })
      .catch((err) =>
        console.error(
          "Failed to remove from cart:",
          err.response?.data || err.message
        )
      );
  };

  const handleCheckout = (itemId) => {
    navigate(`/checkout/${itemId}`);
  };

  return (
    <div className="page-shell cart-page">
      <Navbar />
      <main className="page-content cart-container">
        <PageHeader
          kicker="Shopping"
          title="Your Cart"
          subtitle="Review items before checkout with the seller."
        />

        {loading ? (
          <div className="listings-grid">
            <CardSkeleton count={3} />
          </div>
        ) : cartItems.length === 0 ? (
          <EmptyState
            title="Your cart is empty"
            message="Browse the dashboard and add items you want to buy."
            actionLabel="Go to Dashboard"
            onAction={() => navigate("/home")}
          />
        ) : (
          <div className="cart-grid">
            {cartItems.map((item) => (
              <article key={item.id} className="cart-item-card">
                <div className="item-details">
                  <h3>{item.title}</h3>
                  <p className="cart-item-desc">{item.description}</p>
                  <p className="cart-item-price">
                    <strong>Price:</strong> ₹{item.price}
                  </p>
                  {item.image && (
                    <img src={item.image} alt={item.title} className="cart-item-img" />
                  )}
                </div>

                <div className="item-actions">
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="action-button remove-button"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCheckout(item.id)}
                    className="action-button checkout-button"
                  >
                    Checkout
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default YourCart;
