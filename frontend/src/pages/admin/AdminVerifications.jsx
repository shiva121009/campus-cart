import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StudentIdImage from "./StudentIdImage";
import "../../components/admin/AdminLayout.css";

function AdminVerifications() {
  const { refreshPending } = useOutletContext() || {};
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/api/admin/pending-users")
      .then((res) => setUsers(res.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const removeUser = (u) => {
    const ok = window.confirm(
      `Delete "${u.name}" permanently? Use this for fake IDs or inappropriate signups.`
    );
    if (!ok) return;
    api
      .delete(`/api/admin/users/${u.id}`)
      .then(() => {
        showToast("User deleted", "success");
        load();
        refreshPending?.();
      })
      .catch((err) =>
        showToast(err.response?.data?.message || "Delete failed", "error")
      );
  };

  const verify = (userId, action) => {
    let reason;
    if (action === "reject") {
      reason =
        window.prompt(
          "Reason for rejection (shown to student):",
          "ID photo unclear or roll number mismatch"
        ) || "Verification failed";
    }
    api
      .post(`/api/admin/users/${userId}/verify`, { action, reason })
      .then(() => {
        showToast(
          action === "approve"
            ? "Student approved — they can log in now"
            : "Student rejected",
          "success"
        );
        load();
        refreshPending?.();
      })
      .catch((err) => {
        showToast(err.response?.data?.message || "Action failed", "error");
      });
  };

  return (
    <div>
      <h1 className="admin-page-title">Student verification</h1>
      <p className="admin-page-lead">
        Manually review each signup: check the university roll number matches the
        ID card photo, then approve or reject.
      </p>

      {loading && <p>Loading pending students…</p>}
      {!loading && users.length === 0 && (
        <p className="admin-page-lead">No students waiting for verification.</p>
      )}

      <div className="admin-card-grid">
        {users.map((u) => (
          <article key={u.id} className="admin-verify-card">
            <h3>{u.name}</h3>
            <dl className="admin-verify-details">
              <div>
                <dt>Email</dt>
                <dd>{u.email}</dd>
              </div>
              <div>
                <dt>University roll no.</dt>
                <dd className="admin-roll-no">{u.student_id}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{u.phone}</dd>
              </div>
            </dl>
            <p className="admin-verify-meta">ID card photo:</p>
            <StudentIdImage userId={u.id} />
            <div className="admin-verify-actions">
              <button
                type="button"
                className="admin-btn admin-btn-approve"
                onClick={() => verify(u.id, "approve")}
              >
                Approve student
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-reject"
                onClick={() => verify(u.id, "reject")}
              >
                Reject
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-delete-user"
                onClick={() => removeUser(u)}
              >
                Delete account
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default AdminVerifications;
