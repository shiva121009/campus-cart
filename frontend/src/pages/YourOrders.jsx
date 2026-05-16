import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/navbar";
import Footer from "../components/Shared/Footer";
import PageHeader from "../components/Shared/PageHeader";
import EmptyState from "../components/Shared/EmptyState";
import CardSkeleton from "../components/Shared/CardSkeleton";
import { FaImage } from "react-icons/fa";
import { uploadUrl, API_BASE } from "../config";
import { useToast } from "../context/ToastContext";
import "./YourOrders.css";

function YourOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/yourorders`, { withCredentials: true })
      .then((res) => setOrders(res.data))
      .catch(() => showToast("Failed to load orders.", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  return (
    <div className="page-shell orders-page">
      <Navbar />
      <main className="page-content orders-container">
        <PageHeader
          kicker="Purchases"
          title="Your Orders"
          subtitle="Track checkout requests and seller responses."
        />

        {loading ? (
          <div className="orders-grid orders-grid--loading">
            <CardSkeleton count={3} />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            message="Items you checkout will appear here with their status."
          />
        ) : (
          <div className="orders-grid">
            {orders.map((order) => (
              <article key={order.id} className="order-card">
                <div className="order-card-media">
                  {order.post_image ? (
                    <img
                      src={uploadUrl(order.post_image)}
                      alt={order.post_title}
                      className="order-image"
                    />
                  ) : (
                    <div
                      className="order-image order-image--placeholder"
                      aria-hidden
                    >
                      <FaImage />
                    </div>
                  )}
                  <span
                    className={`order-status-pill status-${order.status}`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="order-card-body">
                  <h3 className="order-title">{order.post_title}</h3>
                  <p className="order-price">₹{order.post_price}</p>

                  {order.status === "confirmed" && order.seller_info && (
                    <div className="seller-info">
                      <h4>Seller contact</h4>
                      <p>
                        <strong>Name:</strong> {order.seller_info.name}
                      </p>
                      <p>
                        <strong>Email:</strong> {order.seller_info.email}
                      </p>
                      {order.seller_info.phone && (
                        <p>
                          <strong>Phone:</strong> {order.seller_info.phone}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <p className="order-timestamp">
                  {new Date(order.timestamp).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default YourOrders;
