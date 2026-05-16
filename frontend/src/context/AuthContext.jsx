import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(() => {
    return api
      .get("/api/me")
      .then((res) => {
        setUser(res.data);
        return res.data;
      })
      .catch(() => {
        setUser(null);
        return null;
      });
  }, []);

  useEffect(() => {
    refreshAuth().finally(() => setLoading(false));
  }, [refreshAuth]);

  const logout = () => {
    const confirmed = window.confirm("Do you want to logout?");
    if (!confirmed) {
      return Promise.resolve(false);
    }
    return api.post("/api/logout").then(() => {
      setUser(null);
      localStorage.removeItem("username");
      localStorage.removeItem("userId");
      return true;
    });
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user?.id),
    isAdmin: Boolean(user?.is_admin),
    isVerified:
      user?.verified === true || user?.verification_status === "approved",
    verificationStatus: user?.verification_status,
    refreshAuth,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
