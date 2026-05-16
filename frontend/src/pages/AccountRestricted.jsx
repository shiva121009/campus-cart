import { useNavigate, useSearchParams } from "react-router-dom";
import { FaEnvelope, FaShieldAlt } from "react-icons/fa";
import WelcomeNavbar from "../components/welcomenavbar";
import { useAuth } from "../context/AuthContext";
import "./AccountRestricted.css";

function AccountRestricted() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const reason =
    params.get("reason") ||
    "Your account has been restricted by a campus administrator.";

  const handleLogout = () => {
    logout().then((ok) => ok && navigate("/login"));
  };

  return (
    <div className="restricted-page">
      <WelcomeNavbar homePath="/" />
      <main className="restricted-card">
        <FaShieldAlt className="restricted-icon" aria-hidden />
        <h1>Account restricted</h1>
        <p className="restricted-message">{reason}</p>
        <p className="restricted-hint">
          Contact campus admin or email support to resolve this.
        </p>
        <p className="restricted-email">
          <FaEnvelope aria-hidden />{" "}
          <a href="mailto:support@campuscart.edu">support@campuscart.edu</a>
        </p>
        <div className="restricted-actions">
          <button type="button" className="restricted-btn" onClick={handleLogout}>
            Log out
          </button>
          <button
            type="button"
            className="restricted-btn restricted-btn-secondary"
            onClick={() => navigate("/contact")}
          >
            Contact support
          </button>
        </div>
      </main>
    </div>
  );
}

export default AccountRestricted;
