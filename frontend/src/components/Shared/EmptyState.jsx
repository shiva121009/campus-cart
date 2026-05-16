import { FaBoxOpen } from "react-icons/fa";
import "./EmptyState.css";

function EmptyState({ title, message, actionLabel, onAction, icon: Icon = FaBoxOpen }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden>
        <Icon />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {message && <p className="empty-state-message">{message}</p>}
      {actionLabel && onAction && (
        <button type="button" className="empty-state-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
