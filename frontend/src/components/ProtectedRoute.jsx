import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute() {
  const { user, loading, isVerified } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <p>Loading…</p>
      </div>
    );
  }

  if (!user?.id) {
    return <Navigate to="/login" replace />;
  }

  if (user.is_suspended) {
    const qs = new URLSearchParams();
    return <Navigate to="/account-restricted" replace />;
  }

  if (!isVerified) {
    const qs = new URLSearchParams({
      status: user.verification_status || "pending",
      ...(user.rejection_reason ? { reason: user.rejection_reason } : {}),
    });
    return <Navigate to={`/pending-verification?${qs}`} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
