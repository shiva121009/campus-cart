import { FaTimes } from "react-icons/fa";
import "./AdminModals.css";

function AdminOrderModal({ order, onClose, onStatusChange }) {
  if (!order) return null;

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-labelledby="admin-order-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-modal-header">
          <h2 id="admin-order-modal-title">Order #{order.id}</h2>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </header>
        <div className="admin-modal-body">
          <p>
            <strong>Item:</strong> {order.post_title} (₹{order.post_price})
          </p>
          <p>
            <strong>Buyer:</strong> {order.buyer_name}
          </p>
          <p>
            <strong>Phone:</strong> {order.buyer_phone || "—"}
          </p>
          <p>
            <strong>Email:</strong> {order.buyer_email || "—"}
          </p>
          <p>
            <strong>Address:</strong> {order.address || "—"}
          </p>
          <p>
            <strong>Seller:</strong> {order.seller_name}
            {order.seller_email ? ` (${order.seller_email})` : ""}
          </p>
          {order.message && (
            <p className="admin-modal-message">
              <strong>Message:</strong> {order.message}
            </p>
          )}
          <p>
            <strong>Status:</strong>{" "}
            <span className={`admin-badge ${order.status}`}>{order.status}</span>
          </p>
          <p>
            <strong>Date:</strong> {order.timestamp}
          </p>
        </div>
        <footer className="admin-modal-footer">
          {order.status === "waiting" && (
            <>
              <button
                type="button"
                className="admin-btn admin-btn-approve"
                onClick={() => onStatusChange(order.id, "confirmed")}
              >
                Confirm order
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-reject"
                onClick={() => onStatusChange(order.id, "canceled")}
              >
                Cancel
              </button>
            </>
          )}
          <button type="button" className="admin-btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

export default AdminOrderModal;
