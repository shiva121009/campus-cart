import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  FaChartBar,
  FaIdCard,
  FaUsers,
  FaBox,
  FaClipboardList,
  FaHome,
  FaSignOutAlt,
  FaFlag,
} from "react-icons/fa";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import AdminGlobalSearch from "./AdminGlobalSearch";
import "./AdminLayout.css";

const links = [
  { to: "/admin", label: "Dashboard", icon: FaChartBar, end: true },
  { to: "/admin/verifications", label: "Verify students", icon: FaIdCard, badgeKey: "pending" },
  { to: "/admin/users", label: "Users", icon: FaUsers },
  { to: "/admin/listings", label: "Listings", icon: FaBox },
  { to: "/admin/orders", label: "Orders", icon: FaClipboardList },
  { to: "/admin/reports", label: "Reports", icon: FaFlag, badgeKey: "reports" },
];

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout: authLogout, user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);

  const refreshPending = () =>
    api
      .get("/api/admin/stats")
      .then((res) => {
        setPendingCount(res.data?.users_pending || 0);
        setReportsCount(res.data?.reports_pending || 0);
      })
      .catch(() => {
        setPendingCount(0);
        setReportsCount(0);
      });

  useEffect(() => {
    refreshPending();
    const onRefresh = () => refreshPending();
    window.addEventListener("campuscart:refresh-admin-stats", onRefresh);
    return () =>
      window.removeEventListener("campuscart:refresh-admin-stats", onRefresh);
  }, [location.pathname]);

  const handleLogout = () => {
    authLogout().then((ok) => ok && navigate("/admin/login"));
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-title">CampusCart</span>
          <span className="admin-brand-sub">Admin · {user?.name}</span>
        </div>
        <nav className="admin-nav">
          {links.map(({ to, label, icon: Icon, end, badgeKey }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `admin-nav-link${isActive ? " active" : ""}`
              }
            >
              <Icon aria-hidden />
              <span>{label}</span>
              {badgeKey === "pending" && pendingCount > 0 && (
                <span className="admin-nav-badge">{pendingCount}</span>
              )}
              {badgeKey === "reports" && reportsCount > 0 && (
                <span className="admin-nav-badge">{reportsCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-nav-link admin-nav-btn"
            onClick={() => navigate("/home")}
          >
            <FaHome aria-hidden />
            <span>Marketplace</span>
          </button>
          <button
            type="button"
            className="admin-nav-link admin-nav-btn admin-logout"
            onClick={handleLogout}
          >
            <FaSignOutAlt aria-hidden />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-main-toolbar">
          <AdminGlobalSearch />
        </div>
        <Outlet context={{ refreshPending }} />
      </main>
    </div>
  );
}

export default AdminLayout;
