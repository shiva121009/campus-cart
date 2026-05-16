import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import WelcomeNavbar from "../components/welcomenavbar";
import { API_BASE } from "../config";
import { useToast } from "../context/ToastContext";
import "./Login.css";
import "./Register.css";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [idCard, setIdCard] = useState(null);
  const [idPreview, setIdPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const showToast = useToast();

  useEffect(() => {
    if (!idCard) {
      setIdPreview(null);
      return;
    }
    const url = URL.createObjectURL(idCard);
    setIdPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [idCard]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast("Passwords do not match!", "error");
      return;
    }
    if (!idCard) {
      showToast("Upload your university ID card photo", "error");
      return;
    }

    setSubmitting(true);
    const form = new FormData();
    form.append("name", name);
    form.append("email", email);
    form.append("phone", phone);
    form.append("student_id", studentId.trim());
    form.append("password", password);
    form.append("confirmPassword", confirmPassword);
    form.append("id_card", idCard);

    axios
      .post(`${API_BASE}/api/register`, form, { withCredentials: true })
      .then((res) => {
        showToast(
          res.data?.message ||
            "Submitted for verification. You can log in after admin approval.",
          "success"
        );
        navigate("/login");
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          "Registration failed. Please try again.";
        showToast(errorMessage, "error");
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="register-page">
      <WelcomeNavbar homePath="/" />
      <div className="auth-layout">
        <div className="auth-panel auth-panel-brand">
          <p className="auth-kicker">Student verification</p>
          <h1 className="auth-headline">Join CampusCart</h1>
          <p className="auth-lead">
            Sign up with your university roll number and a clear photo of your
            college ID card. An admin will manually verify your account before
            you can buy or sell on campus.
          </p>
          <ul className="register-steps">
            <li>Fill in your details</li>
            <li>Upload ID card photo</li>
            <li>Wait for admin approval</li>
            <li>Log in and start using CampusCart</li>
          </ul>
        </div>

        <div className="register-container auth-panel-form">
          <h2 className="register-title">Student Registration</h2>
          <div className="register-notice" role="note">
            Manual verification required — you cannot log in until an admin
            approves your roll number and ID.
          </div>
          <form onSubmit={handleSubmit} className="register-form">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="register-input"
              required
            />
            <input
              type="email"
              placeholder="Email (any personal email)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="register-input"
              required
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="register-input"
              required
            />
            <input
              type="text"
              placeholder="University roll number"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="register-input"
              required
              minLength={4}
              autoComplete="off"
            />
            <label className="register-file-label">
              University ID card photo (PNG, JPG, WEBP — max 5 MB)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="register-file"
                onChange={(e) => setIdCard(e.target.files?.[0] || null)}
                required
              />
            </label>
            {idPreview && (
              <img
                src={idPreview}
                alt="ID preview"
                className="register-id-preview"
              />
            )}
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="register-input"
              required
              minLength={6}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="register-input"
              required
            />
            <button
              type="submit"
              className="register-button"
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit for verification"}
            </button>
            <p className="link-text">
              Already have an account?{" "}
              <button
                type="button"
                className="login-link"
                onClick={() => navigate("/login")}
              >
                Login here
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Register;
