import axios from "axios";
import { API_BASE } from "../config";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const path = window.location.pathname;

    if (
      status === 401 &&
      !path.startsWith("/login") &&
      !path.startsWith("/register") &&
      !path.startsWith("/admin/login") &&
      !path.startsWith("/admin/register")
    ) {
      window.location.href = path.startsWith("/admin")
        ? "/admin/login"
        : "/login";
      return Promise.reject(error);
    }

    if (
      status === 403 &&
      data?.is_suspended &&
      !path.startsWith("/admin") &&
      !path.startsWith("/account-restricted")
    ) {
      const qs = new URLSearchParams({
        ...(data.message ? { reason: data.message } : {}),
      });
      window.location.href = `/account-restricted?${qs}`;
      return Promise.reject(error);
    }

    if (
      status === 403 &&
      data?.verification_status &&
      !path.startsWith("/admin") &&
      !path.startsWith("/pending-verification")
    ) {
      const qs = new URLSearchParams({
        status: data.verification_status,
        ...(data.rejection_reason ? { reason: data.rejection_reason } : {}),
      });
      window.location.href = `/pending-verification?${qs}`;
    }

    return Promise.reject(error);
  }
);

export default api;
