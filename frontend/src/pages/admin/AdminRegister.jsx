import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaShieldAlt } from "react-icons/fa";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import "../Login.css";
import "./AdminAuth.css";

function AdminRegister() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const showToast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/admin/register", {
        name,
        email,
        phone,
        password,
        confirmPassword,
        admin_secret: adminSecret,
      });
      showToast("Admin account created! Please log in.", "success");
      navigate("/admin/login");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Admin registration failed",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-auth-page">
      <div className="admin-auth-card admin-auth-card-wide">
        <div className="admin-auth-icon" aria-hidden>
          <FaShieldAlt />
        </div>
        <h1>Create Admin Account</h1>
        <p className="admin-auth-lead">
          Campus administrators only. You need the secret key from{" "}
          <code>backend/run.py</code> (ADMIN_SECRET).
        </p>

        <form className="admin-auth-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="login-input"
            required
          />
          <input
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
            minLength={6}
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="login-input"
            required
          />
          <input
            type="password"
            placeholder="Admin secret key"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            className="login-input"
            required
            autoComplete="off"
          />
          <button type="submit" className="admin-auth-btn" disabled={submitting}>
            {submitting ? "Creating…" : "Create admin account"}
          </button>
        </form>

        <p className="admin-auth-links">
          Already have an account?{" "}
          <button type="button" onClick={() => navigate("/admin/login")}>
            Admin login
          </button>
        </p>
        <p className="admin-auth-links muted">
          <button type="button" onClick={() => navigate("/register")}>
            Student signup
          </button>
        </p>
      </div>
    </div>
  );
}

export default AdminRegister;
