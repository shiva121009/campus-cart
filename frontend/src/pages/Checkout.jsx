import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/navbar";
import Footer from "../components/Shared/Footer";
import { API_BASE, uploadUrl } from "../config";
import { useToast } from "../context/ToastContext";
import "./Checkout.css";

function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [buyer, setBuyer] = useState({
    name: "",
    phone: "",
    address: "",
    message: "",
  });
  const showToast = useToast();

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/listings/${id}`, { withCredentials: true })
      .then((res) => {
        const data = res.data;
        setItem({
          ...data,
          image: uploadUrl(data.image),
        });
      })
      .catch((err) => {
        console.error("Failed to load item:", err);
        showToast("Item not found", "error");
        navigate("/yourcart");
      })
      .finally(() => setLoading(false));
  }, [id, navigate, showToast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBuyer((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!buyer.name || !buyer.phone || !buyer.address) {
      showToast("Please fill in all required fields.", "error");
      return;
    }
    axios
      .post(
        `${API_BASE}/api/checkout`,
        {
          post_id: id,
          name: buyer.name,
          phone: buyer.phone,
          address: buyer.address,
          message: buyer.message,
        },
        { withCredentials: true }
      )
      .then(() => {
        showToast(
          "Message sent to seller. Please wait for their response.",
          "success"
        );
        setFormSubmitted(true);
      })
      .catch((err) => {
        console.error("Checkout error:", err.response?.data || err.message);
        showToast("Failed to send message.", "error");
      });
  };

  if (loading) {
    return (
      <div className="page-shell checkout-page">
        <Navbar />
        <p className="loading-text">Loading checkout…</p>
      </div>
    );
  }
  if (!item) return null;

  return (
    <div className="page-shell checkout-page">
      <Navbar />
      <main className="page-content checkout-container">
        <div className="checkout-card item-details-card">
          <h2 className="card-title">Item Details</h2>
          <span className="checkout-category-pill">{item.category}</span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <p>
            <strong>Price:</strong> ₹{item.price}
          </p>
          {item.image && <img src={item.image} alt={item.title} />}
        </div>

        <div className="checkout-card buyer-form-card">
          <h2 className="card-title">Your Contact Info</h2>
          <form onSubmit={handleSendMessage} className="checkout-form">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={buyer.name}
              onChange={handleChange}
              disabled={formSubmitted}
              required
              className="form-control"
            />
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={buyer.phone}
              onChange={handleChange}
              disabled={formSubmitted}
              required
              className="form-control"
            />
            <textarea
              name="address"
              placeholder="Delivery Address"
              value={buyer.address}
              onChange={handleChange}
              disabled={formSubmitted}
              required
              className="form-control form-textarea"
            />
            <textarea
              name="message"
              placeholder="Optional message to the seller..."
              value={buyer.message}
              onChange={handleChange}
              disabled={formSubmitted}
              className="form-control form-textarea"
            />
            <button
              type="submit"
              disabled={formSubmitted}
              className="submit-button"
            >
              {formSubmitted
                ? "Message Sent. Await Reply."
                : "Send Message to Seller"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Checkout;
