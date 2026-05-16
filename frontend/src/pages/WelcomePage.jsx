import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaTags, FaShoppingBag } from "react-icons/fa";
import WelcomeNavbar from "../components/welcomenavbar";
import { useAuth } from "../context/AuthContext";
import "./WelcomePage.css";

function WelcomePage() {
  const navigate = useNavigate();
  const { user, loading, isVerified, isAdmin } = useAuth();

  useEffect(() => {
    if (loading || !user?.id) return;
    if (!isVerified) {
      const qs = new URLSearchParams({
        status: user.verification_status || "pending",
        ...(user.rejection_reason ? { reason: user.rejection_reason } : {}),
      });
      navigate(`/pending-verification?${qs}`, { replace: true });
      return;
    }
    navigate(isAdmin ? "/admin" : "/home", { replace: true });
  }, [loading, user, isVerified, isAdmin, navigate]);

  const features = [
    {
      icon: FaTags,
      title: "List in minutes",
      text: "Post textbooks, gadgets, and dorm essentials with photos.",
    },
    {
      icon: FaSearch,
      title: "Smart search",
      text: "Find items faster with semantic search and suggestions.",
    },
    {
      icon: FaShoppingBag,
      title: "Cart & checkout",
      text: "Message sellers and track orders in one place.",
    },
  ];

  return (
    <div className="welcome-page">
      <WelcomeNavbar />

      <main className="welcome-main">
        <div className="welcome-hero-card">
          <p className="welcome-kicker">Student marketplace</p>
          <h1 className="welcome-title">Welcome to CampusCart</h1>
          <p className="welcome-subtitle">
            Buy and sell textbooks, gadgets, and essentials with people on your
            campus—safely and locally.
          </p>

          <div className="welcome-actions">
            <button
              type="button"
              className="welcome-btn welcome-btn-primary"
              onClick={() => navigate("/login")}
            >
              Log in
            </button>
            <button
              type="button"
              className="welcome-btn welcome-btn-secondary"
              onClick={() => navigate("/register")}
            >
              Create account
            </button>
            <button
              type="button"
              className="welcome-btn welcome-btn-admin"
              onClick={() => navigate("/admin/login")}
            >
              Admin portal
            </button>
          </div>

          <ul className="welcome-features" aria-label="Highlights">
            <li>List items in minutes</li>
            <li>Smart search &amp; suggestions</li>
            <li>Cart &amp; checkout in one place</li>
          </ul>
        </div>

        <div className="welcome-feature-grid">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="welcome-feature-card">
              <span className="welcome-feature-icon" aria-hidden>
                <Icon />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}

export default WelcomePage;
