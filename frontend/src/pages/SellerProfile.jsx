import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaStar, FaCheckCircle, FaBan } from "react-icons/fa";
import Navbar from "../components/navbar";
import Footer from "../components/Shared/Footer";
import ProductCard from "../components/Shared/ProductCard";
import PageHeader from "../components/Shared/PageHeader";
import api from "../api/client";
import { avatarUrl } from "../config";
import { useToast } from "../context/ToastContext";
import "./SellerProfile.css";

function SellerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/api/sellers/${id}`)
      .then((res) => setData(res.data))
      .catch(() => {
        showToast("Seller not found", "error");
        navigate("/home");
      })
      .finally(() => setLoading(false));
  }, [id, navigate, showToast]);

  const handleBlock = () => {
    if (!window.confirm("Block this seller? Their listings will be hidden.")) return;
    api
      .post(`/api/users/${id}/block`)
      .then((res) => showToast(res.data.message, "info"))
      .catch((err) =>
        showToast(err.response?.data?.message || "Failed", "error")
      );
  };

  if (loading) {
    return (
      <div className="page-shell">
        <Navbar />
        <p className="loading-text">Loading…</p>
      </div>
    );
  }

  if (!data) return null;
  const { seller, rating, listings, reviews } = data;

  return (
    <div className="page-shell seller-profile-page">
      <Navbar />
      <main className="page-content">
        <PageHeader kicker="Seller" title={seller.name} />
        <div className="seller-card">
          {seller.avatar && (
            <img src={avatarUrl(seller.avatar)} alt="" className="seller-avatar" />
          )}
          <div className="seller-meta">
            {seller.verification_status === "approved" && (
              <span className="verified-badge">
                <FaCheckCircle aria-hidden /> Verified student
              </span>
            )}
            <p>
              {seller.course || "Campus seller"}
              {seller.session_start_year && seller.session_end_year && (
                <>
                  {" · "}
                  Session {seller.session_start_year}–{seller.session_end_year}
                </>
              )}
            </p>
            <p className="seller-rating">
              <FaStar aria-hidden /> {rating.avg || "—"} ({rating.count} reviews)
            </p>
            {seller.bio && <p className="seller-bio">{seller.bio}</p>}
            <button type="button" className="seller-block-btn" onClick={handleBlock}>
              <FaBan aria-hidden /> Block seller
            </button>
          </div>
        </div>

        {reviews?.length > 0 && (
          <section className="seller-reviews">
            <h3>Recent reviews</h3>
            <ul>
              {reviews.map((r, i) => (
                <li key={i}>
                  {"★".repeat(r.stars)}
                  {r.comment && <span> — {r.comment}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <h3 className="seller-listings-title">Listings</h3>
        <div className="seller-listings-grid">
          {listings.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              onView={(lid) => navigate(`/listing/${lid}`)}
            />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default SellerProfile;
