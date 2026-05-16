import { useEffect, useState } from "react";
import api from "../../api/client";
import { uploadUrl } from "../../config";
import { useToast } from "../../context/ToastContext";
import "../../components/admin/AdminLayout.css";

function AdminListings() {
  const [listings, setListings] = useState([]);
  const showToast = useToast();

  const load = () => {
    api
      .get("/api/admin/listings")
      .then((res) => setListings(res.data || []))
      .catch(() => setListings([]));
  };

  useEffect(() => {
    load();
  }, []);

  const remove = (id) => {
    if (!window.confirm("Delete this listing permanently?")) return;
    api
      .delete(`/api/admin/listings/${id}`)
      .then(() => {
        showToast("Listing deleted", "success");
        load();
      })
      .catch(() => showToast("Delete failed", "error"));
  };

  return (
    <div>
      <h1 className="admin-page-title">Listings</h1>
      <p className="admin-page-lead">Moderate all marketplace posts.</p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Title</th>
              <th>Category</th>
              <th>Price</th>
              <th>Seller</th>
              <th>Posted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {listings.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.image ? (
                    <img
                      src={uploadUrl(p.image)}
                      alt=""
                      className="admin-listing-thumb"
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td>{p.title}</td>
                <td>{p.category}</td>
                <td>₹{p.price}</td>
                <td>
                  {p.seller_name}
                  <br />
                  <small>{p.seller_email}</small>
                </td>
                <td>{p.timestamp}</td>
                <td>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    onClick={() => remove(p.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminListings;
