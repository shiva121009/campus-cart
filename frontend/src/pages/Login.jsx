import { useState } from "react";
import { useNavigate } from "react-router-dom";
import WelcomeNavbar from "../components/welcomenavbar";
import api from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const showToast = useToast();
  const { refreshAuth } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await api.post("/api/login", { email, password });

      if (res.data?.user?.name) {
        localStorage.setItem("username", res.data.user.name);
        localStorage.setItem("userId", res.data.user.id);
      }

      await refreshAuth();
      showToast("Welcome back!", "success");
      navigate("/home");
    } catch (err) {
      if (err.response?.data?.is_admin) {
        showToast(
          err.response?.data?.message || "Use admin login instead.",
          "error"
        );
        navigate("/admin/login");
        return;
      }
      const msg =
        err.response?.data?.message || "Invalid email or password";
      if (err.response?.data?.is_suspended) {
        const qs = new URLSearchParams({
          ...(err.response?.data?.message
            ? { reason: err.response.data.message }
            : {}),
        });
        navigate(`/account-restricted?${qs}`);
        return;
      }
      const status = err.response?.data?.verification_status;
      if (status === "pending" || status === "rejected") {
        const qs = new URLSearchParams({
          status,
          ...(err.response?.data?.rejection_reason
            ? { reason: err.response.data.rejection_reason }
            : {}),
        });
        navigate(`/pending-verification?${qs}`);
        return;
      }
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <WelcomeNavbar homePath="/" />

      <div className="auth-layout">
        <div className="auth-panel auth-panel-brand">
          <p className="auth-kicker">Campus marketplace</p>
          <h1 className="auth-headline">Welcome back to CampusCart</h1>
          <p className="auth-lead">
            List items, search with smart suggestions, and checkout with
            students on your campus.
          </p>
        </div>

        <div className="login-container auth-panel-form">
          <h2 className="login-title">Login to Your Account</h2>

          <form className="login-form" onSubmit={handleLogin}>
            <input
              className="login-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              className="login-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              className="login-button"
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Login"}
            </button>
          </form>

          <p className="link-text">
            <button
              type="button"
              className="register-link"
              onClick={() => navigate("/forgot-password")}
            >
              Forgot password?
            </button>
          </p>
          <p className="link-text">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              className="register-link"
              onClick={() => navigate("/register")}
            >
              Register here
            </button>
          </p>
          <p className="link-text admin-entry-link">
            <button
              type="button"
              className="register-link"
              onClick={() => navigate("/admin/login")}
            >
              Admin login →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
