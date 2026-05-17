import { useEffect, useState } from "react";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import "../../components/admin/AdminLayout.css";

function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const showToast = useToast();

  const load = () => {
    setLoading(true);
    api
      .get("/api/admin/reports")
      .then((res) => setReports(res.data || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = (id, status) => {
    api
      .post(`/api/admin/reports/${id}/status`, { status })
      .then(() => {
        showToast("Report updated", "success");
        load();
        window.dispatchEvent(new Event("campuscart:refresh-admin-stats"));
      })
      .catch((err) =>
        showToast(err.response?.data?.message || "Failed", "error")
      );
  };

  const pending = reports.filter((r) => r.status === "pending").length;
  const filtered =
    statusFilter === "all"
      ? reports
      : reports.filter((r) => r.status === statusFilter);

  return (
    <div>
      <h1 className="admin-page-title">Listing reports</h1>
      <p className="admin-page-lead">
        Review flagged listings from students.
        {pending > 0 && (
          <>
            {" "}
            <strong>{pending}</strong> open report{pending > 1 ? "s" : ""}.
          </>
        )}
      </p>

      <div className="admin-filter-bar">
        <label htmlFor="report-status-filter">Show</label>
        <select
          id="report-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="pending">Pending (default)</option>
          <option value="reviewed">Reviewed</option>
          <option value="dismissed">Dismissed</option>
          <option value="all">All statuses</option>
        </select>
        <span className="admin-filter-count">
          {filtered.length} of {reports.length}
        </span>
      </div>

      {loading ? (
        <p className="admin-panel-empty">Loading reports…</p>
      ) : filtered.length === 0 ? (
        <p className="admin-panel-empty">No reports match this filter.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Reporter</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.post_title}</td>
                  <td>{r.reporter_name}</td>
                  <td className="admin-report-reason">{r.reason}</td>
                  <td>
                    <span className={`admin-badge ${r.status}`}>{r.status}</span>
                  </td>
                  <td>{r.created_at}</td>
                  <td className="admin-actions-cell">
                    {r.status === "pending" && (
                      <>
                        <button
                          type="button"
                          className="admin-btn admin-btn-approve"
                          onClick={() => updateStatus(r.id, "reviewed")}
                        >
                          Reviewed
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-reject"
                          onClick={() => updateStatus(r.id, "dismissed")}
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminReports;
