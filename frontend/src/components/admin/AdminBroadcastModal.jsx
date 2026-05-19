import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import api from "../../api/client";
import "./AdminNotifyModal.css";

const CATEGORIES = [
  { value: "info", label: "Info — campus update" },
  { value: "warning", label: "Warning — important reminder" },
];

const AUDIENCES = [
  { value: "all_students", label: "All students (non-admin)" },
  { value: "approved", label: "Verified students only" },
  { value: "pending", label: "Pending verification only" },
  { value: "rejected", label: "Rejected verification only" },
];

function AdminBroadcastModal({ onClose, onSubmit, submitting }) {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("info");
  const [audience, setAudience] = useState("all_students");
  const [recipientCount, setRecipientCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    setLoadingCount(true);
    setPreviewError(false);
    api
      .get("/api/admin/broadcast/preview", { params: { audience } })
      .then((res) => setRecipientCount(res.data.recipients_count ?? 0))
      .catch((err) => {
        setRecipientCount(null);
        if (err.response?.status === 404) setPreviewError(true);
      })
      .finally(() => setLoadingCount(false));
  }, [audience]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    const label =
      AUDIENCES.find((a) => a.value === audience)?.label || audience;
    const ok = window.confirm(
      `Send this message to ${recipientCount ?? "?"} user(s)?\n\nAudience: ${label}\n\n"${trimmed.slice(0, 120)}${trimmed.length > 120 ? "…" : ""}"`
    );
    if (!ok) return;
    onSubmit({ message: trimmed, category, audience });
  };

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="admin-modal admin-notify-modal admin-broadcast-modal"
        role="dialog"
        aria-labelledby="admin-broadcast-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="admin-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes />
        </button>

        <h2 id="admin-broadcast-title" className="admin-modal-title">
          Broadcast message
        </h2>
        <p className="admin-modal-sub">
          Send one message to many students. Each user sees it on their home
          dashboard notification panel.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="admin-modal-label" htmlFor="broadcast-audience">
            Audience
          </label>
          <select
            id="broadcast-audience"
            className="admin-modal-select"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>

          <p
            className={`admin-broadcast-recipients${previewError ? " is-error" : ""}`}
            aria-live="polite"
          >
            {loadingCount
              ? "Counting recipients…"
              : previewError
                ? "Broadcast API not found — stop all python run.py processes, start one backend, then reload."
                : recipientCount != null
                  ? `${recipientCount} user${recipientCount === 1 ? "" : "s"} will receive this message`
                  : "Could not load recipient count"}
          </p>

          <label className="admin-modal-label" htmlFor="broadcast-category">
            Message type
          </label>
          <select
            id="broadcast-category"
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

          <label className="admin-modal-label" htmlFor="broadcast-message">
            Message
          </label>
          <textarea
            id="broadcast-message"
            className="admin-modal-textarea"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Campus maintenance this weekend — marketplace pickup may be delayed."
            maxLength={2000}
            required
          />

          <p className="admin-modal-hint">
            Use for announcements, policy updates, or holidays. For account
            restrictions, notify individual users from the Users page.
          </p>

          <div className="admin-modal-actions">
            <button
              type="button"
              className="admin-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn-approve"
              disabled={
                submitting ||
                !message.trim() ||
                loadingCount ||
                recipientCount === 0
              }
            >
              {submitting ? "Sending…" : "Send broadcast"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminBroadcastModal;
