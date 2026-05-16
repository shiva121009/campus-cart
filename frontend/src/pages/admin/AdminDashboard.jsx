import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import "../../components/admin/AdminLayout.css";

function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .get("/api/admin/stats")
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  }, []);

  const cards = stats
    ? [
        { label: "Total users", value: stats.users_total },
        { label: "Pending verifications", value: stats.users_pending },
        { label: "Approved users", value: stats.users_approved },
        { label: "Listings", value: stats.listings_total },
        { label: "Orders", value: stats.orders_total },
        { label: "Orders waiting", value: stats.orders_waiting },
      ]
    : [];

  return (
    <div>
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="admin-page-lead">
        Overview of CampusCart activity.{" "}
        {stats?.users_pending > 0 && (
          <Link to="/admin/verifications">
            {stats.users_pending} ID(s) need review →
          </Link>
        )}
      </p>
      <nav className="admin-quick-links" aria-label="Admin sections">
        <Link to="/admin/verifications">ID verifications</Link>
        <Link to="/admin/users">Users</Link>
        <Link to="/admin/listings">Listings</Link>
        <Link to="/admin/orders">Orders</Link>
        <Link to="/home">Open marketplace</Link>
      </nav>
      <div className="admin-stats-grid">
        {cards.map(({ label, value }) => (
          <div key={label} className="admin-stat-card">
            <div className="admin-stat-value">{value ?? "—"}</div>
            <div className="admin-stat-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
