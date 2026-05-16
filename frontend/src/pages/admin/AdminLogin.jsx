import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaShieldAlt } from "react-icons/fa";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import "../Login.css";
import "./AdminAuth.css";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const showToast = useToast();
  const { refreshAuth, isAdmin, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user?.id && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [loading, user, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post("/api/admin/login", { email, password });
      if (res.data?.user?.name) {
        localStorage.setItem("username", res.data.user.name);
        localStorage.setItem("userId", res.data.user.id);
      }
      await refreshAuth();
      showToast("Welcome, admin!", "success");
      navigate("/admin");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Admin login failed",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-auth-page">
      <div className="admin-auth-card">
        <div className="admin-auth-icon" aria-hidden>
          <FaShieldAlt />
        </div>
        <h1>Admin Login</h1>
        <p className="admin-auth-lead">
          Sign in to manage verifications, users, listings, and orders.
        </p>

        <form className="admin-auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
            required
          />
          <button type="submit" className="admin-auth-btn" disabled={submitting}>
            {submitting ? "Signing in…" : "Login as admin"}
          </button>
        </form>

        <p className="admin-auth-links">
          No admin account?{" "}
          <button type="button" onClick={() => navigate("/admin/register")}>
            Create admin account
          </button>
        </p>
        <p className="admin-auth-links muted">
          <button type="button" onClick={() => navigate("/login")}>
            Student login
          </button>
          {" · "}
          <button type="button" onClick={() => navigate("/")}>
            Home
          </button>
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;
