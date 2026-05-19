import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBox,
  FaClipboardList,
  FaShoppingCart,
  FaUserCircle,
  FaPlus,
} from "react-icons/fa";
import Navbar from "../components/navbar";
import Footer from "../components/Shared/Footer";
import PageHeader from "../components/Shared/PageHeader";
import api from "../api/client";
import { avatarUrl } from "../config";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import "./Profile.css";

const CURRENT_YEAR = new Date().getFullYear();
const SESSION_YEARS = Array.from(
  { length: CURRENT_YEAR - 2014 + 8 },
  (_, i) => 2015 + i
);

function formatSession(start, end) {
  if (start && end) return `${start} – ${end}`;
  return null;
}

const QUICK_LINKS = [
  { to: "/youritems", label: "Your Items", icon: FaBox },
  { to: "/yourorders", label: "Your Orders", icon: FaClipboardList },
  { to: "/yourcart", label: "Your Cart", icon: FaShoppingCart },
  { to: "/additem", label: "Add Item", icon: FaPlus },
];

function Profile() {
  const showToast = useToast();
  const { refreshAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    bio: "",
    course: "",
    year_of_study: "",
    session_start_year: "",
    session_end_year: "",
    hostel_or_location: "",
    interests: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const loadProfile = () =>
    api.get("/api/profile").then((res) => {
      const u = res.data;
      setProfile(u);
      setForm({
        name: u.name || "",
        phone: u.phone || "",
        bio: u.bio || "",
        course: u.course || "",
        year_of_study: u.year_of_study || "",
        session_start_year: u.session_start_year
          ? String(u.session_start_year)
          : "",
        session_end_year: u.session_end_year ? String(u.session_end_year) : "",
        hostel_or_location: u.hostel_or_location || "",
        interests: u.interests || "",
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    });

  useEffect(() => {
    loadProfile()
      .catch(() => showToast("Could not load profile", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  const interestTags = useMemo(() => {
    return form.interests
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }, [form.interests]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (
        name === "session_start_year" &&
        next.session_end_year &&
        Number(next.session_end_year) < Number(value)
      ) {
        next.session_end_year = "";
      }
      return next;
    });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("avatar", file);
    setUploadingAvatar(true);
    api
      .post("/api/profile/avatar", fd)
      .then((res) => {
        setProfile(res.data.profile);
        showToast("Profile photo updated", "success");
        refreshAuth();
      })
      .catch((err) =>
        showToast(err.response?.data?.message || "Upload failed", "error")
      )
      .finally(() => setUploadingAvatar(false));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    api
      .put("/api/profile", form)
      .then(async (res) => {
        setProfile(res.data.profile);
        showToast(res.data?.message || "Profile saved", "success");
        await refreshAuth();
        localStorage.setItem(
          "username",
          res.data?.profile?.name || form.name
        );
        setForm((prev) => ({
          ...prev,
          current_password: "",
          new_password: "",
          confirm_password: "",
        }));
      })
      .catch((err) =>
        showToast(err.response?.data?.message || "Update failed", "error")
      )
      .finally(() => setSaving(false));
  };

  const completeness = profile?.completeness ?? 0;
  const stats = profile?.stats || {};
  const avatarSrc = avatarUrl(profile?.avatar);
  const sessionLabel = formatSession(
    profile?.session_start_year,
    profile?.session_end_year
  );

  return (
    <div className="page-shell profile-page">
      <Navbar />
      <main className="page-content profile-container">
        <PageHeader
          kicker="Account"
          title="Your Profile"
          subtitle="Personalize your campus marketplace presence."
        />

        {loading ? (
          <p className="profile-loading">Loading profile…</p>
        ) : (
          <>
            <section className="profile-hero">
              <div className="profile-avatar-wrap">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="profile-avatar-img" />
                ) : (
                  <FaUserCircle className="profile-avatar-placeholder" />
                )}
                <label className="profile-avatar-upload">
                  {uploadingAvatar ? "Uploading…" : "Change photo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                    hidden
                  />
                </label>
              </div>
              <div className="profile-hero-info">
                <h2>{form.name || "Student"}</h2>
                <p className="profile-hero-email">{profile?.email}</p>
                {sessionLabel && (
                  <p className="profile-hero-meta profile-hero-session">
                    Academic session {sessionLabel}
                  </p>
                )}
                {profile?.member_since && (
                  <p className="profile-hero-meta">
                    Member since {profile.member_since}
                  </p>
                )}
                <div className="profile-complete-wrap">
                  <div className="profile-complete-header">
                    <span>Profile strength</span>
                    <strong>{completeness}%</strong>
                  </div>
                  <div className="profile-complete-bar">
                    <div
                      className="profile-complete-fill"
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="profile-stats-grid">
              <div className="profile-stat-card">
                <span className="profile-stat-value">
                  {stats.listings_count ?? 0}
                </span>
                <span className="profile-stat-label">Listings</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-value">
                  {stats.orders_count ?? 0}
                </span>
                <span className="profile-stat-label">Orders</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-value">
                  {stats.cart_count ?? 0}
                </span>
                <span className="profile-stat-label">In cart</span>
              </div>
            </div>

            <nav className="profile-quick-links" aria-label="Quick links">
              {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} className="profile-quick-link">
                  <Icon aria-hidden />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>

            <form className="profile-card" onSubmit={handleSubmit}>
              <section className="profile-section">
                <h2 className="profile-section-title">Account (read-only)</h2>
                <div className="profile-readonly-grid">
                  <div>
                    <span className="profile-label">University roll no.</span>
                    <p>{profile?.student_id || "—"}</p>
                  </div>
                  <div>
                    <span className="profile-label">Verification</span>
                    <p>
                      <span
                        className={`profile-status profile-status--${profile?.verification_status}`}
                      >
                        {profile?.verification_status === "approved"
                          ? "Verified"
                          : profile?.verification_status}
                      </span>
                    </p>
                  </div>
                </div>
              </section>

              <section className="profile-section">
                <h2 className="profile-section-title">Personal details</h2>
                <div className="profile-fields">
                  <label className="profile-field">
                    Full name
                    <input
                      name="name"
                      value={form.name}
                      onChange={onChange}
                      required
                    />
                  </label>
                  <label className="profile-field">
                    Phone
                    <input
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={onChange}
                      required
                    />
                  </label>
                  <label className="profile-field profile-field--full">
                    About you
                    <textarea
                      name="bio"
                      value={form.bio}
                      onChange={onChange}
                      rows={3}
                      maxLength={500}
                      placeholder="Short intro for buyers and sellers…"
                    />
                  </label>
                </div>
              </section>

              <section className="profile-section">
                <h2 className="profile-section-title">Campus info</h2>
                <div className="profile-fields">
                  <label className="profile-field">
                    Course / branch
                    <input
                      name="course"
                      value={form.course}
                      onChange={onChange}
                      placeholder="e.g. B.Tech CSE"
                    />
                  </label>
                  <label className="profile-field">
                    Year of study
                    <input
                      name="year_of_study"
                      value={form.year_of_study}
                      onChange={onChange}
                      placeholder="e.g. 2nd year"
                    />
                  </label>
                  <label className="profile-field">
                    Session from
                    <select
                      name="session_start_year"
                      value={form.session_start_year}
                      onChange={onChange}
                    >
                      <option value="">Select year</option>
                      {SESSION_YEARS.map((y) => (
                        <option key={y} value={String(y)}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="profile-field">
                    Session to
                    <select
                      name="session_end_year"
                      value={form.session_end_year}
                      onChange={onChange}
                    >
                      <option value="">Select year</option>
                      {SESSION_YEARS.filter(
                        (y) =>
                          !form.session_start_year ||
                          y >= Number(form.session_start_year)
                      ).map((y) => (
                        <option key={y} value={String(y)}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                  {form.session_start_year && form.session_end_year && (
                    <p className="profile-session-preview profile-field--full">
                      Your batch: {form.session_start_year} – {form.session_end_year}
                    </p>
                  )}
                  <label className="profile-field profile-field--full">
                    Hostel / campus location
                    <input
                      name="hostel_or_location"
                      value={form.hostel_or_location}
                      onChange={onChange}
                      placeholder="e.g. Block B, North campus"
                    />
                  </label>
                </div>
              </section>

              <section className="profile-section">
                <h2 className="profile-section-title">Interests</h2>
                <p className="profile-hint">
                  Comma-separated — helps personalize search (e.g. electronics,
                  books, sports).
                </p>
                <label className="profile-field profile-field--full">
                  Your interests
                  <input
                    name="interests"
                    value={form.interests}
                    onChange={onChange}
                    placeholder="electronics, textbooks, furniture"
                  />
                </label>
                {interestTags.length > 0 && (
                  <div className="profile-interest-chips">
                    {interestTags.map((tag) => (
                      <span key={tag} className="profile-interest-chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <section className="profile-section">
                <h2 className="profile-section-title">Change password</h2>
                <p className="profile-hint">
                  Leave blank to keep current password.
                </p>
                <div className="profile-fields">
                  <label className="profile-field">
                    Current password
                    <input
                      name="current_password"
                      type="password"
                      value={form.current_password}
                      onChange={onChange}
                      autoComplete="current-password"
                    />
                  </label>
                  <label className="profile-field">
                    New password
                    <input
                      name="new_password"
                      type="password"
                      value={form.new_password}
                      onChange={onChange}
                      autoComplete="new-password"
                    />
                  </label>
                  <label className="profile-field">
                    Confirm new password
                    <input
                      name="confirm_password"
                      type="password"
                      value={form.confirm_password}
                      onChange={onChange}
                      autoComplete="new-password"
                    />
                  </label>
                </div>
              </section>

              <button
                type="submit"
                className="profile-save-btn"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
            </form>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default Profile;
