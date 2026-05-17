import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaUsers,
  FaIdCard,
  FaBox,
  FaClipboardList,
  FaFlag,
  FaSyncAlt,
  FaExclamationCircle,
  FaCheckCircle,
  FaBan,
  FaShoppingBag,
} from "react-icons/fa";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import AdminDashboardChart from "../../components/admin/AdminDashboardChart";
import AdminOrderModal from "../../components/admin/AdminOrderModal";
import AdminReportModal from "../../components/admin/AdminReportModal";
import "./AdminDashboard.css";
import "../../components/admin/AdminLayout.css";

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderModal, setOrderModal] = useState(null);
  const [reportModal, setReportModal] = useState(null);
  const showToast = useToast();

  const loadFromLegacyApis = () =>
    Promise.all([
      api.get("/api/admin/stats"),
      api.get("/api/admin/orders"),
      api.get("/api/admin/pending-users"),
      api.get("/api/admin/reports"),
    ]).then(([statsRes, ordersRes, pendingRes, reportsRes]) => {
      const s = statsRes.data || {};
      const orders = ordersRes.data || [];
      const pending = pendingRes.data || [];
      const reports = (reportsRes.data || []).filter((r) => r.status === "pending");
      return {
        stats: {
          users_total: s.users_total ?? 0,
          users_pending: s.users_pending ?? 0,
          users_approved: s.users_approved ?? 0,
          users_suspended: s.users_suspended ?? 0,
          listings_total: s.listings_total ?? 0,
          listings_sold: s.listings_sold ?? 0,
          listings_available: Math.max(
            0,
            (s.listings_total ?? 0) - (s.listings_sold ?? 0)
          ),
          orders_total: s.orders_total ?? 0,
          orders_waiting: s.orders_waiting ?? 0,
          orders_confirmed: orders.filter((o) => o.status === "confirmed").length,
          reports_pending: s.reports_pending ?? reports.length,
        },
        inbox: [],
        chart: null,
        pending_verifications: pending.slice(0, 10).map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          student_id: u.student_id,
        })),
        waiting_orders: orders.filter((o) => o.status === "waiting").slice(0, 10),
        recent_orders: orders.slice(0, 6),
        pending_reports: reports.slice(0, 10).map((r) => ({
          id: r.id,
          post_id: r.post_id,
          post_title: r.post_title,
          reporter_name: r.reporter_name,
          reason: r.reason,
          created_at: r.created_at,
        })),
      };
    });

  const load = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      api
        .get("/api/admin/dashboard")
        .then((res) => setData(res.data))
        .catch((err) => {
          if (err.response?.status === 404) {
            return loadFromLegacyApis().then(setData);
          }
          setData(null);
          showToast("Could not load dashboard", "error");
          return null;
        })
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
          window.dispatchEvent(new Event("campuscart:refresh-admin-stats"));
        });
    },
    [showToast]
  );

  useEffect(() => {
    load();
  }, [load]);

  const verifyUser = (userId, action) => {
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
        load(true);
      })
      .catch((err) =>
        showToast(err.response?.data?.message || "Failed", "error")
      );
  };

  const setOrderStatus = (id, status) => {
    api
      .post(`/api/admin/orders/${id}/status`, { status })
      .then(() => {
        showToast("Order updated", "success");
        setOrderModal(null);
        load(true);
      })
      .catch(() => showToast("Update failed", "error"));
  };

  const updateReport = (id, status) => {
    api
      .post(`/api/admin/reports/${id}/status`, { status })
      .then(() => {
        showToast("Report updated", "success");
        setReportModal(null);
        load(true);
      })
      .catch((err) =>
        showToast(err.response?.data?.message || "Failed", "error")
      );
  };

  const handleInboxAction = (item) => {
    if (item.type === "verification") {
      verifyUser(item.user_id, "approve");
      return;
    }
    if (item.type === "order" && item.order) {
      setOrderModal(item.order);
      return;
    }
    if (item.type === "report") {
      const full = data?.pending_reports?.find((r) => r.id === item.id);
      setReportModal(
        full || {
          id: item.id,
          post_id: item.post_id,
          post_title: item.title,
          reporter_name: item.subtitle,
          reason: item.meta,
          created_at: "",
        }
      );
    }
  };

  const inboxTypeLabel = { verification: "ID", order: "Order", report: "Report" };
  const inboxTypeClass = {
    verification: "inbox-type--verify",
    order: "inbox-type--order",
    report: "inbox-type--report",
  };

  const stats = data?.stats;
  const pending = stats?.users_pending || 0;
  const waitingOrders = stats?.orders_waiting || 0;
  const pendingReports = stats?.reports_pending || 0;

  const statCards = stats
    ? [
        {
          label: "Total users",
          value: stats.users_total,
          icon: FaUsers,
          to: "/admin/users",
          tone: "primary",
        },
        {
          label: "Pending ID review",
          value: stats.users_pending,
          icon: FaIdCard,
          to: "/admin/verifications",
          tone: pending > 0 ? "warn" : "default",
        },
        {
          label: "Approved students",
          value: stats.users_approved,
          icon: FaCheckCircle,
          to: "/admin/users",
          tone: "success",
        },
        {
          label: "Active listings",
          value: stats.listings_available,
          icon: FaBox,
          to: "/admin/listings",
          tone: "primary",
        },
        {
          label: "Items sold",
          value: stats.listings_sold,
          icon: FaShoppingBag,
          to: "/admin/listings",
          tone: "default",
        },
        {
          label: "Orders waiting",
          value: stats.orders_waiting,
          icon: FaClipboardList,
          to: "/admin/orders",
          tone: waitingOrders > 0 ? "warn" : "default",
        },
        {
          label: "Suspended users",
          value: stats.users_suspended,
          icon: FaBan,
          to: "/admin/users",
          tone: stats.users_suspended > 0 ? "danger" : "default",
        },
        {
          label: "Open reports",
          value: stats.reports_pending,
          icon: FaFlag,
          to: "/admin/reports",
          tone: pendingReports > 0 ? "danger" : "default",
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="admin-dashboard">
        <p className="admin-dashboard-loading">Loading dashboard…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-dashboard">
        <p className="admin-dashboard-loading">Dashboard unavailable.</p>
        <button type="button" className="admin-btn admin-btn-approve" onClick={() => load()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div>
          <h1 className="admin-page-title">Admin dashboard</h1>
          <p className="admin-page-lead">
            CampusCart overview — users, listings, orders, and moderation.
          </p>
        </div>
        <button
          type="button"
          className="admin-dashboard-refresh"
          onClick={() => load(true)}
          disabled={refreshing}
        >
          <FaSyncAlt className={refreshing ? "is-spinning" : ""} aria-hidden />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {(pending > 0 || waitingOrders > 0 || pendingReports > 0) && (
        <div className="admin-alerts" role="status">
          {pending > 0 && (
            <Link to="/admin/verifications" className="admin-alert admin-alert--warn">
              <FaExclamationCircle aria-hidden />
              <span>
                <strong>{pending}</strong> student ID{pending > 1 ? "s" : ""} awaiting
                verification
              </span>
            </Link>
          )}
          {waitingOrders > 0 && (
            <Link to="/admin/orders" className="admin-alert admin-alert--info">
              <FaClipboardList aria-hidden />
              <span>
                <strong>{waitingOrders}</strong> order{waitingOrders > 1 ? "s" : ""} need
                attention
              </span>
            </Link>
          )}
          {pendingReports > 0 && (
            <Link to="/admin/reports" className="admin-alert admin-alert--danger">
              <FaFlag aria-hidden />
              <span>
                <strong>{pendingReports}</strong> listing report
                {pendingReports > 1 ? "s" : ""} to review
              </span>
            </Link>
          )}
        </div>
      )}

      <div className="admin-stats-grid admin-dashboard-stats">
        {statCards.map(({ label, value, icon: Icon, to, tone }) => (
          <Link key={label} to={to} className={`admin-stat-card admin-stat-card--${tone}`}>
            <Icon className="admin-stat-icon" aria-hidden />
            <div className="admin-stat-value">{value ?? 0}</div>
            <div className="admin-stat-label">{label}</div>
          </Link>
        ))}
      </div>

      {data.chart && <AdminDashboardChart chart={data.chart} />}

      <nav className="admin-quick-links" aria-label="Quick actions">
        <Link to="/admin/verifications">Verify students</Link>
        <Link to="/admin/users">Manage users</Link>
        <Link to="/admin/listings">All listings</Link>
        <Link to="/admin/orders">All orders</Link>
        <Link to="/admin/reports">Reports</Link>
        <Link to="/home">Open marketplace</Link>
      </nav>

      <section className="admin-panel admin-inbox-panel">
        <div className="admin-panel-head">
          <h2>Action inbox</h2>
          <span className="admin-inbox-count">
            {(data.inbox?.length || 0) > 0
              ? `${data.inbox.length} item${data.inbox.length > 1 ? "s" : ""}`
              : "All clear"}
          </span>
        </div>
        {data.inbox?.length ? (
          <ul className="admin-inbox-list">
            {data.inbox.map((item) => (
              <li key={`${item.type}-${item.id}`} className="admin-inbox-item">
                <span
                  className={`admin-inbox-type ${inboxTypeClass[item.type] || ""}`}
                >
                  {inboxTypeLabel[item.type]}
                </span>
                <div className="admin-inbox-main">
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                  {item.meta && <span className="admin-inbox-meta">{item.meta}</span>}
                </div>
                <div className="admin-inbox-actions">
                  {item.type === "verification" && (
                    <>
                      <button
                        type="button"
                        className="admin-btn admin-btn-approve"
                        onClick={() => verifyUser(item.user_id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-reject"
                        onClick={() => verifyUser(item.user_id, "reject")}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {item.type === "order" && (
                    <button
                      type="button"
                      className="admin-btn admin-btn-approve"
                      onClick={() => handleInboxAction(item)}
                    >
                      Review
                    </button>
                  )}
                  {item.type === "report" && (
                    <button
                      type="button"
                      className="admin-btn admin-btn-approve"
                      onClick={() => handleInboxAction(item)}
                    >
                      Review
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="admin-panel-empty">No pending actions — you&apos;re caught up.</p>
        )}
      </section>

      <div className="admin-dashboard-panels">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>Recent orders</h2>
            <Link to="/admin/orders">View all →</Link>
          </div>
          {data.recent_orders?.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Buyer</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.recent_orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        {o.post_title}
                        <br />
                        <small>₹{o.post_price}</small>
                      </td>
                      <td>{o.buyer_name}</td>
                      <td>
                        <span className={`admin-badge ${o.status}`}>{o.status}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn-message"
                          onClick={() => setOrderModal(o)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-panel-empty">No orders yet.</p>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>Pending verifications</h2>
            <Link to="/admin/verifications">Review all →</Link>
          </div>
          {data.pending_verifications?.length ? (
            <ul className="admin-mini-list">
              {data.pending_verifications.map((u) => (
                <li key={u.id}>
                  <div>
                    <strong>{u.name}</strong>
                    <small>{u.email}</small>
                  </div>
                  <div className="admin-inbox-actions">
                    <span className="admin-roll-no">{u.student_id || "—"}</span>
                    <button
                      type="button"
                      className="admin-btn admin-btn-approve"
                      onClick={() => verifyUser(u.id, "approve")}
                    >
                      Approve
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-panel-empty">No pending ID submissions.</p>
          )}
        </section>

        <section className="admin-panel admin-panel--wide">
          <div className="admin-panel-head">
            <h2>Listing reports</h2>
            <Link to="/admin/reports">Manage reports →</Link>
          </div>
          {data.pending_reports?.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Listing</th>
                    <th>Reporter</th>
                    <th>Reason</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.pending_reports.map((r) => (
                    <tr key={r.id}>
                      <td>{r.post_title}</td>
                      <td>{r.reporter_name}</td>
                      <td className="admin-report-reason">{r.reason}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn-approve"
                          onClick={() => setReportModal(r)}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-panel-empty">No open reports.</p>
          )}
        </section>
      </div>

      {orderModal && (
        <AdminOrderModal
          order={orderModal}
          onClose={() => setOrderModal(null)}
          onStatusChange={setOrderStatus}
        />
      )}
      {reportModal && (
        <AdminReportModal
          report={reportModal}
          onClose={() => setReportModal(null)}
          onUpdate={updateReport}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
