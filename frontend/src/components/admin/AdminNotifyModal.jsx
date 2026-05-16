import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import "./AdminNotifyModal.css";

const CATEGORIES = [
  { value: "info", label: "Info — general update" },
  { value: "warning", label: "Warning — policy reminder" },
  { value: "restriction", label: "Restriction — serious notice" },
];

function AdminNotifyModal({ user, onClose, onSubmit, submitting }) {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("info");
  const [suspend, setSuspend] = useState(false);

  useEffect(() => {
    setMessage("");
    setCategory("info");
    setSuspend(false);
  }, [user]);

  if (!user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ message: message.trim(), category, suspend });
  };

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal admin-notify-modal"
        role="dialog"
        aria-labelledby="admin-notify-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>

        <h2 id="admin-notify-title" className="admin-modal-title">
          Send dashboard notification
        </h2>
        <p className="admin-modal-sub">
          To: {user.name} ({user.email})
        </p>

        <form onSubmit={handleSubmit}>
          <label className="admin-modal-label" htmlFor="notify-category">
            Message type
          </label>
          <select
            id="notify-category"
            className="admin-modal-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <label className="admin-modal-label" htmlFor="notify-message">
            Message
          </label>
          <textarea
            id="notify-message"
            className="admin-modal-textarea"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write any message: listing removed, policy warning, verification issue, etc."
            maxLength={2000}
            required
          />

          <label className="admin-modal-check">
            <input
              type="checkbox"
              checked={suspend}
              onChange={(e) => setSuspend(e.target.checked)}
            />
            <span>
              <strong>Suspend account</strong> — student cannot log in until you clear
              notifications
            </span>
          </label>

          <p className="admin-modal-hint">
            Appears on the student dashboard notification panel. Email:{" "}
            <a href="mailto:support@campuscart.edu">support@campuscart.edu</a>
          </p>

          <div className="admin-modal-actions">
            <button type="button" className="admin-btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn-approve"
              disabled={submitting || !message.trim()}
            >
              {submitting ? "Sending…" : "Send to dashboard"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminNotifyModal;
