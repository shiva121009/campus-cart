import { useEffect, useState } from "react";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import "../../components/admin/AdminLayout.css";

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const showToast = useToast();

  const load = () => {
    api
      .get("/api/admin/orders")
      .then((res) => setOrders(res.data || []))
      .catch(() => setOrders([]));
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = (id, status) => {
    api
      .post(`/api/admin/orders/${id}/status`, { status })
      .then(() => {
        showToast("Status updated", "success");
        load();
      })
      .catch(() => showToast("Update failed", "error"));
  };

  return (
    <div>
      <h1 className="admin-page-title">Orders</h1>
      <p className="admin-page-lead">All checkout messages across the marketplace.</p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Buyer</th>
              <th>Seller</th>
              <th>Status</th>
              <th>Date</th>
              <th>Update</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  {o.post_title}
                  <br />
                  <small>₹{o.post_price}</small>
                </td>
                <td>
                  {o.buyer_name}
                  <br />
                  <small>{o.buyer_phone}</small>
                </td>
                <td>{o.seller_name}</td>
                <td>
                  <span className={`admin-badge ${o.status}`}>{o.status}</span>
                </td>
                <td>{o.timestamp}</td>
                <td>
                  <select
                    value={o.status}
                    onChange={(e) => setStatus(o.id, e.target.value)}
                  >
                    <option value="waiting">waiting</option>
                    <option value="confirmed">confirmed</option>
                    <option value="canceled">canceled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminOrders;
