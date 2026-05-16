import { useNavigate } from "react-router-dom";
import ThemeToggle from "./Shared/ThemeToggle";
import "./welcomenavbar.css";

function WelcomeNavbar({ homePath = "/login" }) {
  const navigate = useNavigate();

  return (
    <nav className="welcome-nav" aria-label="Main">
      <button
        type="button"
        className="welcome-nav-brand"
        onClick={() => navigate("/")}
      >
        CampusCart
      </button>
      <div className="welcome-nav-actions">
        <ThemeToggle />
        <button
          type="button"
          className="welcome-nav-btn"
          onClick={() => navigate(homePath)}
        >
          Home
        </button>
        <button
          type="button"
          className="welcome-nav-btn"
          onClick={() => navigate("/contact")}
        >
          Contact
        </button>
      </div>
    </nav>
  );
}

export default WelcomeNavbar;
