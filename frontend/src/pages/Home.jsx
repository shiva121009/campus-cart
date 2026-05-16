import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/Shared/Footer";
import CategoryScrollRow from "../components/Shared/CategoryScrollRow";
import CardSkeleton from "../components/Shared/CardSkeleton";
import EmptyState from "../components/Shared/EmptyState";
import {
  FaSearch,
  FaStar,
  FaTimes,
  FaPlus,
  FaShoppingCart,
  FaShieldAlt,
  FaUsers,
} from "react-icons/fa";
import api from "../api/client";
import { CATEGORIES } from "../config";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import DashboardNotifications from "../components/Shared/DashboardNotifications";
import "./Home.css";

function groupListingsByCategory(items) {
  const buckets = Object.fromEntries(
    CATEGORIES.filter((c) => c.value).map((c) => [c.value, []])
  );
  const extra = [];

  for (const item of items) {
    const key = item.category || "";
    if (buckets[key]) buckets[key].push(item);
    else extra.push(item);
  }

  const groups = CATEGORIES.filter((c) => c.value)
    .map((c) => ({
      label: c.label,
      value: c.value,
      items: buckets[c.value],
    }))
    .filter((g) => g.items.length > 0);

  if (extra.length) {
    groups.push({ label: "More items", value: "more", items: extra });
  }

  return groups;
}

function Home() {
  const [suggestedItems, setSuggestedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const navigate = useNavigate();
  const showToast = useToast();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "there";

  const loadAllListings = () =>
    api
      .get("/api/listings")
      .then((res) => setSuggestedItems(res.data || []))
      .catch(() => setSuggestedItems([]));

  useEffect(() => {
    loadAllListings().finally(() => setLoading(false));
  }, []);

  const runSearch = (q, cat) => {
    setSearching(true);
    api
      .get("/api/search", { params: { q, category: cat } })
      .then((res) => {
        setSuggestedItems(res.data);
        setSearchPerformed(true);
      })
      .catch((err) => console.error(err))
      .finally(() => setSearching(false));
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    runSearch(searchTerm, category);
  };

  const handleCategoryChip = (value) => {
    setCategory(value);
    if (searchTerm.trim()) {
      setSearchPerformed(true);
      runSearch(searchTerm, value);
      return;
    }
    document
      .getElementById(`category-${value}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const categoryGroups = useMemo(
    () => groupListingsByCategory(suggestedItems),
    [suggestedItems]
  );

  const clearSearch = () => {
    setSearchPerformed(false);
    setSearchTerm("");
    setCategory("");
    loadAllListings();
  };

  const handleAddToCart = (itemId) => {
    api
      .post("/api/yourcart/add", { post_id: itemId })
      .then((res) => {
        showToast(res.data.message || "Added to cart", "success");
        window.dispatchEvent(new Event("campuscart:refresh-badges"));
      })
      .catch((err) => console.error(err));
  };

  return (
    <div className="page-shell home-page">
      <Navbar />

      <DashboardNotifications />

      <section className="home-hero" aria-label="Welcome">
        <div className="home-hero-inner">
          <div className="home-hero-content">
            <span className="home-hero-badge">
              <FaStar aria-hidden /> Smart recommendations
            </span>
            <p className="home-hero-greeting">Hi, {firstName}</p>
            <h1 className="home-hero-title">Your campus marketplace</h1>
            <p className="home-hero-lead">
              Buy and sell with verified students — textbooks, gadgets, and
              more, right on campus.
            </p>
            <div className="home-hero-actions">
              <button
                type="button"
                className="home-hero-btn home-hero-btn--primary"
                onClick={() => navigate("/additem")}
              >
                <FaPlus aria-hidden /> Sell an item
              </button>
              <button
                type="button"
                className="home-hero-btn home-hero-btn--ghost"
                onClick={() => navigate("/yourcart")}
              >
                <FaShoppingCart aria-hidden /> Your cart
              </button>
            </div>
          </div>
          <ul className="home-hero-stats" aria-label="Highlights">
            <li>
              <FaShieldAlt className="home-hero-stat-icon" aria-hidden />
              <span>
                <strong>Verified</strong>
                <small>Student-only trades</small>
              </span>
            </li>
            <li>
              <FaStar className="home-hero-stat-icon" aria-hidden />
              <span>
                <strong>Smart picks</strong>
                <small>Personalized for you</small>
              </span>
            </li>
            <li>
              <FaUsers className="home-hero-stat-icon" aria-hidden />
              <span>
                <strong>On campus</strong>
                <small>Meet nearby sellers</small>
              </span>
            </li>
          </ul>
        </div>
      </section>

      <div className="home-search-bar">
        <form className="home-search-form" onSubmit={handleSearch}>
          <div className="home-search-input-wrap">
            <FaSearch className="home-search-icon" aria-hidden />
            <input
              type="search"
              placeholder="Search textbooks, gadgets, furniture…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="home-search-input"
              aria-label="Search listings"
            />
            {searchTerm && (
              <button
                type="button"
                className="home-search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="home-search-select"
            aria-label="Category"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value || "all"} value={c.value}>
                {c.value ? c.label : "All categories"}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="home-search-submit"
            disabled={searching}
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        <div className="home-category-row" role="group" aria-label="Categories">
          {CATEGORIES.filter((c) => c.value).map((c) => (
            <button
              key={c.value}
              type="button"
              className={`home-category-pill ${category === c.value ? "active" : ""}`}
              onClick={() => handleCategoryChip(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <main className="page-content home-main">
        <section className="listings-section">
          <div className="listings-header">
            <h2 className="listings-title">
              {searchPerformed ? "Search results" : "Browse by category"}
              {!loading && suggestedItems.length > 0 && (
                <span className="listings-count"> ({suggestedItems.length})</span>
              )}
            </h2>
            {searchPerformed && (
              <button
                type="button"
                className="listings-clear-btn"
                onClick={clearSearch}
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="listings-by-category">
            {loading || searching ? (
              <div className="category-skeleton-stack">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="category-skeleton-row">
                    <div className="category-skeleton-title skeleton-shimmer" />
                    <div className="category-skeleton-track">
                      <CardSkeleton count={4} />
                    </div>
                  </div>
                ))}
              </div>
            ) : categoryGroups.length > 0 ? (
              categoryGroups.map((group) => (
                <CategoryScrollRow
                  key={group.value}
                  title={group.label}
                  sectionId={`category-${group.value}`}
                  items={group.items}
                  badge={searchPerformed ? "Match" : undefined}
                  onView={(id) => navigate(`/listing/${id}`)}
                  onAddToCart={handleAddToCart}
                />
              ))
            ) : (
              <EmptyState
                title={
                  searchPerformed ? "No items found" : "No listings yet"
                }
                message={
                  searchPerformed
                    ? "Try another keyword or category."
                    : "Be the first to sell something on campus."
                }
                actionLabel={searchPerformed ? "Clear search" : undefined}
                onAction={searchPerformed ? clearSearch : undefined}
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;
