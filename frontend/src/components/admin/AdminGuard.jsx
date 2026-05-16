import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function AdminGuard() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="admin-loading">
        <p>Checking admin access…</p>
      </div>
    );
  }

  if (!user?.id) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

export default AdminGuard;
