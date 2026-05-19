import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import AdminNotifyModal from "../../components/admin/AdminNotifyModal";
import AdminBroadcastModal from "../../components/admin/AdminBroadcastModal";
import "../../components/admin/AdminLayout.css";

function statusBadge(status, suspended) {
  if (suspended) {
    return <span className="admin-badge suspended">suspended</span>;
  }
  const s = status || "pending";
  return <span className={`admin-badge ${s}`}>{s}</span>;
}

function AdminUsers() {
  const { refreshPending } = useOutletContext() || {};
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notifyUser, setNotifyUser] = useState(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [broadcastSubmitting, setBroadcastSubmitting] = useState(false);
  const showToast = useToast();

  const load = () => {
    api
      .get("/api/admin/users")
      .then((res) => setUsers(res.data || []))
      .catch(() => setUsers([]));
  };

  useEffect(() => {
    load();
  }, []);

  const verify = (userId, action) => {
    let reason;
    if (action === "reject") {
      reason =
        window.prompt("Rejection reason (shown to student):") ||
        "Verification failed";
    }
    api
      .post(`/api/admin/users/${userId}/verify`, { action, reason })
      .then(() => {
        showToast(`User ${action}d`, "success");
        load();
        refreshPending?.();
      })
      .catch((err) =>
        showToast(err.response?.data?.message || "Failed", "error")
      );
  };

  const postNotify = (userId, body) =>
    api
      .post(`/api/admin/users/${userId}/notify`, body)
      .catch((err) => {
        if (err.response?.status !== 404) throw err;
        return api.post(`/api/admin/notify/${userId}`, body);
      });

  const sendBroadcast = ({ message, category, audience }) => {
    setBroadcastSubmitting(true);
    api
      .post("/api/admin/broadcast", { message, category, audience })
      .then((res) => {
        showToast(res.data.message || "Broadcast sent", "success");
        setBroadcastOpen(false);
        load();
      })
      .catch((err) =>
        showToast(
          err.response?.data?.message ||
            (err.response?.status === 404
              ? "Broadcast API missing — restart backend (python run.py)"
              : "Broadcast failed"),
          "error"
        )
      )
      .finally(() => setBroadcastSubmitting(false));
  };

  const sendNotify = ({ message, category, suspend }) => {
    if (!notifyUser) return;
    setSubmitting(true);
    postNotify(notifyUser.id, { message, category, suspend })
      .then((res) => {
        showToast(res.data.message || "Notification sent", "success");
        setNotifyUser(null);
        load();
      })
      .catch((err) =>
        showToast(
          err.response?.data?.message ||
            (err.response?.status === 404
              ? "Notify API not found — stop all python run.py processes, start one backend, open http://localhost:5000/api/health"
              : "Failed to send"),
          "error"
        )
      )
      .finally(() => setSubmitting(false));
  };

  const clearNotifications = (u) => {
    const ok = window.confirm(
      `Clear all admin notifications and reactivate "${u.name}"?`
    );
    if (!ok) return;
    postNotify(u.id, { clear: true })
      .then(() => {
        showToast("Notifications cleared", "success");
        load();
      })
      .catch((err) =>
        showToast(err.response?.data?.message || "Failed", "error")
      );
  };

  const removeUser = (u) => {
    if (u.is_admin) {
      showToast("Administrator accounts cannot be deleted", "error");
      return;
    }
    const ok = window.confirm(
      `Permanently delete "${u.name}" (${u.email})?\n\nThis cannot be undone.`
    );
    if (!ok) return;

    api
      .delete(`/api/admin/users/${u.id}`)
      .then(() => {
        showToast("User deleted", "success");
        load();
        refreshPending?.();
      })
      .catch((err) =>
        showToast(err.response?.data?.message || "Delete failed", "error")
      );
  };

  const q = search.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (statusFilter !== "all" && u.verification_status !== statusFilter) {
      return false;
    }
    if (!q) return true;
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.student_id || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <h1 className="admin-page-title">Users</h1>
      <p className="admin-page-lead">
        Send dashboard notifications (info, warning, or restriction). Students see
        them on their home page with a bell toggle.
      </p>
      <div className="admin-filter-bar admin-filter-bar--users">
        <button
          type="button"
          className="admin-btn admin-btn-message admin-broadcast-toolbar-btn"
          onClick={() => setBroadcastOpen(true)}
        >
          Broadcast to all
        </button>
        <input
          type="search"
          placeholder="Search name, email, roll no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search users"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="admin-filter-count">
          {filtered.length} of {users.length}
        </span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Roll no.</th>
              <th>Status</th>
              <th>Unread</th>
              <th>Listings</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.name}
                  {u.is_admin && " (admin)"}
                </td>
                <td>{u.email}</td>
                <td>{u.student_id || "-"}</td>
                <td>{statusBadge(u.verification_status, u.is_suspended)}</td>
                <td>{u.unread_notifications > 0 ? u.unread_notifications : "-"}</td>
                <td>{u.listings_count}</td>
                <td className="admin-actions-cell">
                  {!u.is_admin && (
                    <>
                      <button
                        type="button"
                        className="admin-btn admin-btn-message"
                        onClick={() => setNotifyUser(u)}
                      >
                        Notify
                      </button>
                      {(u.unread_notifications > 0 || u.is_suspended) && (
                        <button
                          type="button"
                          className="admin-btn"
                          onClick={() => clearNotifications(u)}
                        >
                          Clear
                        </button>
                      )}
                    </>
                  )}
                  {u.verification_status === "pending" && !u.is_admin && (
                    <>
                      <button
                        type="button"
                        className="admin-btn admin-btn-approve"
                        onClick={() => verify(u.id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-reject"
                        onClick={() => verify(u.id, "reject")}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {!u.is_admin && (
                    <button
                      type="button"
                      className="admin-btn admin-btn-delete-user"
                      onClick={() => removeUser(u)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {notifyUser && (
        <AdminNotifyModal
          user={notifyUser}
          onClose={() => setNotifyUser(null)}
          onSubmit={sendNotify}
          submitting={submitting}
        />
      )}
      {broadcastOpen && (
        <AdminBroadcastModal
          onClose={() => setBroadcastOpen(false)}
          onSubmit={sendBroadcast}
          submitting={broadcastSubmitting}
        />
      )}
    </div>
  );
}

export default AdminUsers;
