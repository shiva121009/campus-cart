import { useState } from "react";
import { useNavigate } from "react-router-dom";
import WelcomeNavbar from "../components/welcomenavbar";
import api from "../api/client";
import { useToast } from "../context/ToastContext";
import "./Login.css";

function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const showToast = useToast();

  const requestToken = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post("/api/forgot-password", { email });
      if (res.data.reset_token) setToken(res.data.reset_token);
      showToast(res.data.message, "success");
      setStep(2);
    } catch (err) {
      showToast(err.response?.data?.message || "Request failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post("/api/reset-password", {
        email,
        token,
        new_password: newPassword,
        confirm_password: confirm,
      });
      showToast(res.data.message, "success");
      navigate("/login");
    } catch (err) {
      showToast(err.response?.data?.message || "Reset failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <WelcomeNavbar homePath="/" />
      <div className="login-container auth-panel-form" style={{ maxWidth: 420, margin: "2rem auto" }}>
        <h2 className="login-title">
          {step === 1 ? "Forgot password" : "Set new password"}
        </h2>
        {step === 1 ? (
          <form className="login-form" onSubmit={requestToken}>
            <input
              className="login-input"
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="login-button" disabled={submitting}>
              {submitting ? "Sending…" : "Get reset token"}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={reset}>
            <input
              className="login-input"
              type="text"
              placeholder="Reset token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
            <input
              className="login-input"
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <input
              className="login-input"
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <button type="submit" className="login-button" disabled={submitting}>
              {submitting ? "Saving…" : "Reset password"}
            </button>
          </form>
        )}
        <p className="link-text">
          <button type="button" className="register-link" onClick={() => navigate("/login")}>
            Back to login
          </button>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
