import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import api from "../../api/client";
import "./AdminGlobalSearch.css";

function AdminGlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const t = setTimeout(() => {
      api
        .get("/api/admin/search", { params: { q: q.trim() } })
        .then((res) => setResults(res.data))
        .catch(() => setResults({ users: [], listings: [], orders: [] }))
        .finally(() => setLoading(false));
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const hasResults =
    results &&
    (results.users?.length || results.listings?.length || results.orders?.length);

  const go = (path) => {
    setOpen(false);
    setQ("");
    setResults(null);
    navigate(path);
  };

  return (
    <div className="admin-global-search" ref={wrapRef}>
      <FaSearch className="admin-global-search-icon" aria-hidden />
      <input
        type="search"
        className="admin-global-search-input"
        placeholder="Search users, listings, orders…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-label="Admin search"
        autoComplete="off"
      />
      {open && q.trim().length >= 2 && (
        <div className="admin-global-search-dropdown" role="listbox">
          {loading && <p className="admin-global-search-hint">Searching…</p>}
          {!loading && !hasResults && (
            <p className="admin-global-search-hint">No matches for “{q.trim()}”</p>
          )}
          {!loading && results?.users?.length > 0 && (
            <section>
              <h4>Users</h4>
              <ul>
                {results.users.map((u) => (
                  <li key={`u-${u.id}`}>
                    <button type="button" onClick={() => go("/admin/users")}>
                      <strong>{u.name}</strong>
                      <small>{u.email}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!loading && results?.listings?.length > 0 && (
            <section>
              <h4>Listings</h4>
              <ul>
                {results.listings.map((p) => (
                  <li key={`p-${p.id}`}>
                    <button type="button" onClick={() => go("/admin/listings")}>
                      <strong>{p.title}</strong>
                      <small>
                        ₹{p.price} · {p.category}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!loading && results?.orders?.length > 0 && (
            <section>
              <h4>Orders</h4>
              <ul>
                {results.orders.map((o) => (
                  <li key={`o-${o.id}`}>
                    <button type="button" onClick={() => go("/admin/orders")}>
                      <strong>{o.post_title}</strong>
                      <small>
                        {o.buyer_name} · {o.status}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminGlobalSearch;
