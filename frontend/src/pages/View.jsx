import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/navbar";
import Footer from "../components/Shared/Footer";
import { API_BASE, uploadUrl } from "../config";
import { useToast } from "../context/ToastContext";
import "./View.css";

function View() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/listings/${id}`, {
        withCredentials: true,
      })
      .then((res) => {
        const data = res.data;
        setItem({
          ...data,
          image: uploadUrl(data.image),
        });
      })
      .catch((err) => {
        console.error("Error fetching listing:", err);
        showToast("Listing not found", "error");
        navigate("/home");
      })
      .finally(() => setLoading(false));
  }, [id, navigate, showToast]);

  const handleAddToCart = () => {
    if (!item?.id) {
      showToast("Item information is not available yet.", "error");
      return;
    }

    axios
      .post(
        `${API_BASE}/api/yourcart/add`,
        { post_id: item.id },
        { withCredentials: true }
      )
      .then((res) => showToast(res.data.message, "success"))
      .catch((err) => {
        const errorMessage =
          err.response?.data?.message || "Failed to add item to cart.";
        showToast(errorMessage, "error");
        console.error("Failed to add to cart:", err);
      });
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

  return (
    <div className="page-shell view-page">
      <Navbar />
      <main className="page-content view-container">
        <div className="image-column">
          {item.image ? (
            <img src={item.image} alt={item.title} className="product-image" />
          ) : (
            <div className="product-image product-image--empty" />
          )}
        </div>

        <div className="details-column">
          <span className="product-category">{item.category}</span>
          <h2 className="product-title">{item.title}</h2>
          <p className="product-price">₹{item.price}</p>
          <p className="product-description">{item.description}</p>

          <button
            type="button"
            onClick={handleAddToCart}
            className="add-to-cart-button"
          >
            Add to Cart
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default View;
