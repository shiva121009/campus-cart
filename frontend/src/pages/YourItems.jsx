import { useEffect, useState } from "react";
import api from "../api/client";
import Navbar from "../components/navbar";
import Footer from "../components/Shared/Footer";
import PageHeader from "../components/Shared/PageHeader";
import EmptyState from "../components/Shared/EmptyState";
import CardSkeleton from "../components/Shared/CardSkeleton";
import { useNavigate } from "react-router-dom";
import { uploadUrl } from "../config";
import { useToast } from "../context/ToastContext";
import "./YourItems.css";

function YourItems() {
  const [yourItems, setYourItems] = useState([]);
  const [messagesMap, setMessagesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const showToast = useToast();

  useEffect(() => {
    api
      .get("/api/youritems")
      .then((res) => setYourItems(res.data))
      .catch((err) => console.error("Fetch listings error:", err))
      .finally(() => setLoading(false));

    api
      .get("/api/messages-for-youritems")
      .then((res) => {
        const map = {};
        res.data.forEach((item) => {
          map[item.post_id] = item.messages;
        });
        setMessagesMap(map);
        window.dispatchEvent(new Event("campuscart:refresh-badges"));
      })
      .catch((err) => console.error("Fetch messages error:", err));
  }, []);

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    api
      .delete(`/api/listings/${id}`)
      .then(() => {
        setYourItems((prev) => prev.filter((item) => item.id !== id));
        showToast("Item deleted", "info");
      })
      .catch((err) => console.error("Delete failed:", err));
  };

  const handleEdit = (id) => {
    navigate(`/additem/${id}`);
  };

  const handleMarkSold = (id) => {
    api
      .post(`/api/listings/${id}/sold`)
      .then(() => {
        setYourItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, is_sold: true, status: "sold" } : i))
        );
        showToast("Marked as sold", "success");
      })
      .catch((err) =>
        showToast(err.response?.data?.message || "Failed", "error")
      );
  };

  return (
    <div className="page-shell your-items-page">
      <Navbar />
      <main className="page-content your-items-container">
        <PageHeader
          kicker="Selling"
          title="Your Listed Items"
          subtitle="Manage listings and respond to buyer messages."
        />

        {loading ? (
          <div className="listings-grid">
            <CardSkeleton count={3} />
          </div>
        ) : yourItems.length > 0 ? (
          <div className="items-grid">
            {yourItems.map((item) => (
              <article key={item.id} className="item-card">
                {item.image && (
                  <img
                    src={uploadUrl(item.image)}
                    alt={item.title}
                    className="item-card-image"
                  />
                )}
                <h3>{item.title}</h3>
                <p className="item-card-desc">{item.description}</p>
                <p className="item-card-price">
                  <strong>Price:</strong> ₹{item.price}
                  {item.is_sold && <span className="item-sold-tag"> · Sold</span>}
                </p>

                <div className="button-container">
                  {!item.is_sold && (
                    <button
                      type="button"
                      onClick={() => handleMarkSold(item.id)}
                      className="edit-button"
                    >
                      Mark sold
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleEdit(item.id)}
                    className="edit-button"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>

                {messagesMap[item.id]?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate(`/viewmessages/${item.id}`)}
                    className="messages-button"
                  >
                    <span>Buyer Messages</span>
                    <span className="item-msg-badge">
                      {messagesMap[item.id].length}
                    </span>
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No listings yet"
            message="List your first item and reach students on campus."
            actionLabel="Add Item"
            onAction={() => navigate("/additem")}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default YourItems;
