import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/navbar";
import Footer from "../components/Shared/Footer";
import PageHeader from "../components/Shared/PageHeader";
import CardSkeleton from "../components/Shared/CardSkeleton";
import { API_BASE, uploadUrl } from "../config";
import { useToast } from "../context/ToastContext";
import "./ViewMessages.css";

function ViewMessages() {
  const { postId } = useParams();
  const [messages, setMessages] = useState([]);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  useEffect(() => {
    const fetchMessageData = async () => {
      try {
        const messagesRequest = axios.get(
          `${API_BASE}/api/messages-for-youritems/${postId}`,
          { withCredentials: true }
        );
        const itemRequest = axios.get(
          `${API_BASE}/api/listings/${postId}`,
          { withCredentials: true }
        );
        const markSeenRequest = axios.post(
          `${API_BASE}/api/messages/mark-seen`,
          { post_id: postId },
          { withCredentials: true }
        );
        const [messagesResponse, itemResponse] = await Promise.all([
          messagesRequest,
          itemRequest,
          markSeenRequest,
        ]);
        setMessages(messagesResponse.data);
        const itemData = itemResponse.data;
        setItem({
          ...itemData,
          image: uploadUrl(itemData.image),
        });
        window.dispatchEvent(new Event("campuscart:refresh-badges"));
      } catch (err) {
        console.error("Failed to load message data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessageData();
  }, [postId]);

  const handleUpdateStatus = (messageId, newStatus) => {
    axios
      .post(
        `${API_BASE}/api/orders/${messageId}/update_status`,
        { status: newStatus },
        { withCredentials: true }
      )
      .then(() => {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === messageId ? { ...msg, status: newStatus } : msg
          )
        );
        showToast(`Order has been ${newStatus}.`, "success");
      })
      .catch((err) => {
        console.error("Status update failed:", err);
        showToast("Failed to update status.", "error");
      });
  };

  return (
    <div className="page-shell messages-page">
      <Navbar />
      <main className="page-content">
        <PageHeader
          kicker="Inbox"
          title="Buyer Messages"
          subtitle="Review inquiries and confirm or cancel orders."
        />
        <div className="page-container messages-layout">
          <div className="column item-preview-column">
            <h2 className="column-title">Item Preview</h2>
            {loading ? (
              <CardSkeleton count={1} />
            ) : item ? (
              <div className="item-preview-card">
                {item.image && <img src={item.image} alt={item.title} />}
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <p>
                  <strong>Price:</strong> ₹{item.price}
                </p>
              </div>
            ) : (
              <p className="info-text">Item not found.</p>
            )}
          </div>

          <div className="column messages-column">
            <h2 className="column-title">Messages</h2>
            {loading ? (
              <p className="info-text">Loading messages…</p>
            ) : messages.length === 0 ? (
              <p className="info-text">No messages for this item.</p>
            ) : (
              <div className="messages-list">
                {messages.map((msg) => (
                  <article key={msg.id} className="message-card">
                    <p>
                      <strong>Name:</strong> {msg.name}
                    </p>
                    <p>
                      <strong>Phone:</strong> {msg.phone}
                    </p>
                    <p>
                      <strong>Address:</strong> {msg.address}
                    </p>
                    {msg.message && (
                      <p>
                        <strong>Message:</strong> {msg.message}
                      </p>
                    )}
                    <p className="message-timestamp">
                      <strong>Time:</strong>{" "}
                      {new Date(msg.timestamp).toLocaleString()}
                    </p>

                    <div className="message-status">
                      <p>
                        <strong>Status:</strong>
                        <span
                          className={`status-badge status-${msg.status}`}
                        >
                          {msg.status}
                        </span>
                      </p>
                    </div>
                    {msg.status === "waiting" && (
                      <div className="action-buttons">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(msg.id, "confirmed")
                          }
                          className="confirm-button"
                        >
                          Confirm Order
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(msg.id, "canceled")
                          }
                          className="cancel-button"
                        >
                          Cancel Order
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default ViewMessages;
