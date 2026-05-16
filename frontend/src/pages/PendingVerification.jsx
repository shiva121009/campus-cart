import { useNavigate, useSearchParams } from "react-router-dom";
import WelcomeNavbar from "../components/welcomenavbar";
import { useAuth } from "../context/AuthContext";
import "./PendingVerification.css";

function PendingVerification() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const status = params.get("status") || "pending";
  const reason = params.get("reason");

  const handleLogout = () => {
    logout().then((ok) => ok && navigate("/login"));
  };

  return (
    <div className="pending-page">
      <WelcomeNavbar homePath="/" />
      <main className="pending-card">
        {status === "rejected" ? (
          <>
            <h1>Verification rejected</h1>
            <p>
              {reason ||
                "Your student ID could not be verified. Contact your campus admin."}
            </p>
            <p className="pending-hint">
              You can register again with a clearer ID photo.
            </p>
          </>
        ) : (
          <>
            <h1>Waiting for admin approval</h1>
            <p>
              Your account and college ID are under review. You will be able to
              use CampusCart once an admin approves your registration.
            </p>
            <p className="pending-hint">
              Check back after approval, then log in again.
            </p>
          </>
        )}
        <div className="pending-actions">
          <button type="button" className="pending-btn" onClick={handleLogout}>
            Log out
          </button>
          {status === "rejected" && (
            <button
              type="button"
              className="pending-btn pending-btn-secondary"
              onClick={() => navigate("/register")}
            >
              Register again
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default PendingVerification;
