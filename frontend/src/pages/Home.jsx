import { useCallback, useEffect, useMemo, useState } from "react";
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
import ListingFilters from "../components/ListingFilters";
import MobileBottomNav from "../components/MobileBottomNav";
import ProductCard from "../components/Shared/ProductCard";
import { getRecentlyViewed } from "../utils/recentlyViewed";
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
  const [sort, setSort] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [trending, setTrending] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [recent, setRecent] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const navigate = useNavigate();
  const showToast = useToast();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "there";

  const filterParams = useCallback(
    () => ({
      sort,
      ...(minPrice ? { min_price: minPrice } : {}),
      ...(maxPrice ? { max_price: maxPrice } : {}),
      ...(category ? { category } : {}),
    }),
    [sort, minPrice, maxPrice, category]
  );

  const loadAllListings = useCallback(() => {
    setSearching(true);
    return api
      .get("/api/listings", { params: filterParams() })
      .then((res) => setSuggestedItems(res.data || []))
      .catch(() => {
        setSuggestedItems([]);
        showToast("Could not load listings", "error");
      })
      .finally(() => setSearching(false));
  }, [filterParams, showToast]);

  const runSearch = useCallback(
    (q, cat) => {
      const query = (q || "").trim();
      if (!query) {
        setSearchPerformed(false);
        return loadAllListings();
      }
      setSearching(true);
      return api
        .get("/api/search", {
          params: {
            q: query,
            category: cat || category,
            sort,
            ...(minPrice ? { min_price: minPrice } : {}),
            ...(maxPrice ? { max_price: maxPrice } : {}),
          },
        })
        .then((res) => {
          setSuggestedItems(res.data || []);
          setSearchPerformed(true);
        })
        .catch(() => {
          setSuggestedItems([]);
          showToast("Search failed", "error");
        })
        .finally(() => setSearching(false));
    },
    [category, sort, minPrice, maxPrice, loadAllListings, showToast]
  );

  useEffect(() => {
    setLoading(true);
    api
      .get("/api/listings", { params: { sort: "newest" } })
      .then((res) => setSuggestedItems(res.data || []))
      .catch(() => setSuggestedItems([]))
      .finally(() => setLoading(false));
    api
      .get("/api/trending")
      .then((res) => setTrending(res.data || []))
      .catch(() => setTrending([]));
    setRecent(getRecentlyViewed());
  }, []);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .get("/api/search/autocomplete", { params: { q: searchTerm } })
        .then((res) => setSuggestions(res.data || []))
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const handleSearch = (e) => {
    e?.preventDefault();
    setShowAutocomplete(false);
    runSearch(searchTerm, category);
  };

  const handleCategoryChip = (value) => {
    const next = category === value ? "" : value;
    setCategory(next);
    setSearchPerformed(false);
    if (searchTerm.trim()) {
      runSearch(searchTerm, next);
      return;
    }
    setSearching(true);
    api
      .get("/api/listings", {
        params: {
          sort,
          ...(next ? { category: next } : {}),
          ...(minPrice ? { min_price: minPrice } : {}),
          ...(maxPrice ? { max_price: maxPrice } : {}),
        },
      })
      .then((res) => setSuggestedItems(res.data || []))
      .catch(() => setSuggestedItems([]))
      .finally(() => setSearching(false));
    if (next) {
      window.setTimeout(() => {
        document
          .getElementById(`category-${next}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleCategorySelect = (e) => {
    const value = e.target.value;
    setCategory(value);
    setSearchPerformed(false);
    if (!searchTerm.trim()) {
      setSearching(true);
      api
        .get("/api/listings", {
          params: {
            sort,
            category: value || undefined,
            ...(minPrice ? { min_price: minPrice } : {}),
            ...(maxPrice ? { max_price: maxPrice } : {}),
          },
        })
        .then((res) => setSuggestedItems(res.data || []))
        .catch(() => setSuggestedItems([]))
        .finally(() => setSearching(false));
    }
  };

  const categoryGroups = useMemo(
    () => groupListingsByCategory(suggestedItems),
    [suggestedItems]
  );

  const clearSearch = () => {
    setSearchPerformed(false);
    setSearchTerm("");
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");
    setShowAutocomplete(false);
    setSearching(true);
    api
      .get("/api/listings", { params: { sort: "newest" } })
      .then((res) => setSuggestedItems(res.data || []))
      .catch(() => setSuggestedItems([]))
      .finally(() => setSearching(false));
  };

  const handleAddToCart = (itemId) => {
    api
      .post("/api/yourcart/add", { post_id: itemId })
      .then((res) => {
        showToast(res.data.message || "Added to cart", "success");
        window.dispatchEvent(new Event("campuscart:refresh-badges"));
      })
      .catch((err) =>
        showToast(err.response?.data?.message || "Could not add to cart", "error")
      );
  };

  const pickSuggestion = (s) => {
    setSearchTerm(s.title);
    setSuggestions([]);
    setShowAutocomplete(false);
    setSearchPerformed(true);
    runSearch(s.title, category);
  };

  const busy = loading || searching;
  const showTrending = !searchPerformed && trending.length > 0 && !busy;
  const showRecent = !searchPerformed && recent.length > 0 && !busy;

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
              Buy and sell with verified students — textbooks, gadgets, and more,
              right on campus.
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
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowAutocomplete(true);
              }}
              onFocus={() => setShowAutocomplete(true)}
              onBlur={() => window.setTimeout(() => setShowAutocomplete(false), 150)}
              className="home-search-input"
              aria-label="Search listings"
              autoComplete="off"
            />
            {searchTerm && (
              <button
                type="button"
                className="home-search-clear"
                onClick={() => {
                  setSearchTerm("");
                  setSuggestions([]);
                }}
                aria-label="Clear search"
              >
                <FaTimes />
              </button>
            )}
            {showAutocomplete && suggestions.length > 0 && (
              <ul className="home-autocomplete" role="listbox">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button type="button" onMouseDown={() => pickSuggestion(s)}>
                      <span>{s.title}</span>
                      <small>{s.category}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <select
            value={category}
            onChange={handleCategorySelect}
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
            disabled={busy}
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
        {showTrending && (
          <section className="home-carousel-section">
            <h2 className="home-section-title">Trending now</h2>
            <div className="home-carousel-track">
              {trending.slice(0, 10).map((item) => (
                <div key={item.id} className="home-carousel-item">
                  <ProductCard
                    item={item}
                    compact
                    showActions={false}
                    badge="Hot"
                    onView={(lid) => navigate(`/listing/${lid}`)}
                    onAddToCart={handleAddToCart}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {showRecent && (
          <section className="home-carousel-section">
            <h2 className="home-section-title">Recently viewed</h2>
            <div className="home-carousel-track">
              {recent.slice(0, 8).map((item) => (
                <div key={item.id} className="home-carousel-item">
                  <ProductCard
                    item={item}
                    compact
                    showActions={false}
                    onView={(lid) => navigate(`/listing/${lid}`)}
                    onAddToCart={handleAddToCart}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="listings-section">
          <div className="listings-header">
            <h2 className="listings-title">
              {searchPerformed ? "Search results" : "Browse by category"}
              {!busy && suggestedItems.length > 0 && (
                <span className="listings-count"> ({suggestedItems.length})</span>
              )}
            </h2>
            {(searchPerformed || category || minPrice || maxPrice) && (
              <button
                type="button"
                className="listings-clear-btn"
                onClick={clearSearch}
              >
                Clear filters
              </button>
            )}
          </div>

          <ListingFilters
            sort={sort}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onChange={({ sort: s, minPrice: mn, maxPrice: mx }) => {
              if (s !== undefined) setSort(s);
              if (mn !== undefined) setMinPrice(mn);
              if (mx !== undefined) setMaxPrice(mx);
            }}
            onApply={() =>
              searchPerformed ? runSearch(searchTerm, category) : loadAllListings()
            }
          />

          <div className="listings-by-category">
            {busy ? (
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
                title={searchPerformed ? "No items found" : "No listings yet"}
                message={
                  searchPerformed
                    ? "Try another keyword or category."
                    : "Be the first to sell something on campus."
                }
                actionLabel={searchPerformed || category ? "Clear filters" : "Sell an item"}
                onAction={
                  searchPerformed || category
                    ? clearSearch
                    : () => navigate("/additem")
                }
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

export default Home;
