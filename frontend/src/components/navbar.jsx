import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  FaBars,
  FaTimes,
  FaShoppingCart,
  FaHome,
  FaBox,
  FaPlus,
  FaClipboardList,
  FaShieldAlt,
  FaUser,
} from "react-icons/fa";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./Shared/ThemeToggle";
import "./navbar.css";

function Navbar() {
  const { user, isAdmin, logout: authLogout } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [buyerMessageCount, setBuyerMessageCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshCounts = () => {
    if (!user?.id) {
      setCartCount(0);
      setBuyerMessageCount(0);
      return;
    }

    api
      .get("/api/yourcart")
      .then((res) => setCartCount(res.data?.length || 0))
      .catch(() => setCartCount(0));

    api
      .get("/api/messages-for-youritems")
      .then((res) => {
        const total = (res.data || []).reduce(
          (sum, row) => sum + (row.messages?.length || 0),
          0
        );
        setBuyerMessageCount(total);
      })
      .catch(() => setBuyerMessageCount(0));
  };

  useEffect(() => {
    refreshCounts();
    const onRefresh = () => refreshCounts();
    window.addEventListener("campuscart:refresh-badges", onRefresh);
    window.addEventListener("focus", onRefresh);
    return () => {
      window.removeEventListener("campuscart:refresh-badges", onRefresh);
      window.removeEventListener("focus", onRefresh);
    };
  }, [location.pathname, user?.id]);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    authLogout().then((ok) => ok && navigate("/login"));
  };

  const navItems = [
    { to: "/home", label: "Dashboard", icon: FaHome },
    {
      to: "/youritems",
      label: "Your Items",
      icon: FaBox,
      badge: buyerMessageCount,
    },
    { to: "/additem", label: "Add Item", icon: FaPlus },
    {
      to: "/yourcart",
      label: "Your Cart",
      icon: FaShoppingCart,
      badge: cartCount,
    },
    { to: "/yourorders", label: "Your Orders", icon: FaClipboardList },
    { to: "/profile", label: "Profile", icon: FaUser },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: FaShieldAlt }] : []),
  ];

  return (
    <nav className="navbar">
      <div className="navbar-row">
        <div className="navbar-left">
          <button
            type="button"
            className="navbar-brand"
            onClick={() => navigate("/home")}
          >
            CampusCart
          </button>
          {user && (
            <button
              type="button"
              className="user-badge"
              onClick={() => navigate("/profile")}
              title="Your profile"
            >
              {user.name}
            </button>
          )}
        </div>

        <div className={`navbar-center ${menuOpen ? "is-open" : ""}`}>
          {navItems.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeMenu}
            >
              <Icon className="nav-link-icon" aria-hidden />
              <span className="nav-link-label">{label}</span>
              {badge > 0 && (
                <span className="nav-link-badge" title={`${badge} total`}>
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        <div className="navbar-right">
          <ThemeToggle />
          <button
            type="button"
            className="nav-icon-btn nav-cart-btn"
            onClick={() => navigate("/yourcart")}
            aria-label={`Cart, ${cartCount} items`}
          >
            <FaShoppingCart />
            {cartCount > 0 && (
              <span className="nav-icon-btn-badge">{cartCount}</span>
            )}
          </button>
          <button type="button" className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
          <button
            type="button"
            className="navbar-toggle"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
