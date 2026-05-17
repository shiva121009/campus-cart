import { FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";
import "./AdminModals.css";

function AdminReportModal({ report, onClose, onUpdate }) {
  if (!report) return null;

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-labelledby="admin-report-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-modal-header">
          <h2 id="admin-report-modal-title">Report #{report.id}</h2>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </header>
        <div className="admin-modal-body">
          <p>
            <strong>Listing:</strong> {report.post_title}
          </p>
          <p>
            <strong>Reporter:</strong> {report.reporter_name}
          </p>
          <p>
            <strong>Reason:</strong> {report.reason}
          </p>
          <p>
            <strong>Date:</strong> {report.created_at}
          </p>
          {report.post_id && (
            <p>
              <Link to={`/view/${report.post_id}`} target="_blank" rel="noreferrer">
                View listing on marketplace →
              </Link>
            </p>
          )}
        </div>
        <footer className="admin-modal-footer">
          <button
            type="button"
            className="admin-btn admin-btn-approve"
            onClick={() => onUpdate(report.id, "reviewed")}
          >
            Mark reviewed
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-reject"
            onClick={() => onUpdate(report.id, "dismissed")}
          >
            Dismiss
          </button>
          <button type="button" className="admin-btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

export default AdminReportModal;
