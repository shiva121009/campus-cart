import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBell,
  FaBellSlash,
  FaChevronDown,
  FaChevronUp,
  FaEnvelope,
  FaExclamationTriangle,
  FaInfoCircle,
  FaShieldAlt,
} from "react-icons/fa";
import api from "../../api/client";
import "./DashboardNotifications.css";

const CATEGORY_META = {
  info: { label: "Info", icon: FaInfoCircle, className: "notif-info" },
  warning: { label: "Warning", icon: FaExclamationTriangle, className: "notif-warning" },
  restriction: { label: "Restriction", icon: FaShieldAlt, className: "notif-restriction" },
};

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

function DashboardNotifications() {
  const [open, setOpen] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/api/notifications")
      .then((res) => {
        setEnabled(res.data.notifications_enabled !== false);
        setItems(res.data.notifications || []);
        setUnread(res.data.unread_count || 0);
        if ((res.data.unread_count || 0) > 0) setOpen(true);
      })
      .catch(() => {
        setItems([]);
        setUnread(0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener("campuscart:refresh-notifications", onRefresh);
    window.addEventListener("focus", onRefresh);
    const poll = window.setInterval(load, 45000);
    return () => {
      window.removeEventListener("campuscart:refresh-notifications", onRefresh);
      window.removeEventListener("focus", onRefresh);
      window.clearInterval(poll);
    };
  }, [load]);

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    api
      .put("/api/notifications/preferences", { enabled: next })
      .catch(() => setEnabled(!next));
  };

  const markRead = (id) => {
    api.post(`/api/notifications/${id}/read`).then(() => load());
  };

  const markAllRead = () => {
    api.post("/api/notifications/read-all").then(() => load());
  };

  if (!enabled && items.length === 0) return null;

  return (
    <section className={`dash-notif ${open ? "is-open" : "is-collapsed"}`}>
      <header className="dash-notif-header">
        <button
          type="button"
          className="dash-notif-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <FaBell className="dash-notif-bell" aria-hidden />
          <span>Campus notifications</span>
          {unread > 0 && (
            <span className="dash-notif-badge">{unread}</span>
          )}
          {open ? <FaChevronUp aria-hidden /> : <FaChevronDown aria-hidden />}
        </button>

        <div className="dash-notif-controls">
          <label className="dash-notif-switch" title="Show notifications on dashboard">
            <input
              type="checkbox"
              checked={enabled}
              onChange={toggleEnabled}
            />
            <span className="dash-notif-switch-ui" />
            <span className="dash-notif-switch-label">On</span>
          </label>
          {unread > 0 && (
            <button type="button" className="dash-notif-link-btn" onClick={markAllRead}>
              Mark all read
            </button>
          )}
        </div>
      </header>

      {open && enabled && (
        <div className="dash-notif-body">
          {loading ? (
            <p className="dash-notif-empty">Loading notifications…</p>
          ) : items.length === 0 ? (
            <p className="dash-notif-empty">
              No messages from admin yet. Important campus updates will appear here.
            </p>
          ) : (
            <ul className="dash-notif-list">
              {items.map((n) => {
                const meta = CATEGORY_META[n.category] || CATEGORY_META.info;
                const Icon = meta.icon;
                return (
                  <li
                    key={n.id}
                    className={`dash-notif-item ${meta.className} ${n.read ? "is-read" : ""}`}
                  >
                    <div className="dash-notif-item-head">
                      <Icon aria-hidden />
                      <span className="dash-notif-cat">{meta.label}</span>
                      <time dateTime={n.created_at}>{formatWhen(n.created_at)}</time>
                    </div>
                    <p className="dash-notif-msg">{n.message}</p>
                    {n.applies_suspend && (
                      <p className="dash-notif-suspend-tag">Account restriction applied</p>
                    )}
                    {!n.read && (
                      <button
                        type="button"
                        className="dash-notif-link-btn"
                        onClick={() => markRead(n.id)}
                      >
                        Mark as read
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="dash-notif-footer">
            Questions? <Link to="/contact">Contact support</Link>
            {" · "}
            <a href="mailto:support@campuscart.edu">
              <FaEnvelope aria-hidden /> support@campuscart.edu
            </a>
          </p>
        </div>
      )}

      {open && !enabled && (
        <p className="dash-notif-paused">
          <FaBellSlash aria-hidden /> Notifications are turned off. Toggle &quot;On&quot; to
          see admin messages.
        </p>
      )}
    </section>
  );
}

export default DashboardNotifications;
