/** API base — same host/port as before; change here only if backend URL changes */
export const API_BASE = "http://localhost:5000";

export function uploadUrl(filename) {
  if (!filename) return null;
  if (filename.startsWith("http")) return filename;
  return `${API_BASE}/static/uploads/${filename}`;
}

export function avatarUrl(filename) {
  if (!filename) return null;
  if (filename.startsWith("http")) return filename;
  return `${API_BASE}/static/uploads/avatars/${filename}`;
}

export const CATEGORIES = [
  { value: "", label: "All" },
  { value: "Stationary", label: "Stationary" },
  { value: "Electronics", label: "Electronics" },
  { value: "Furniture", label: "Furniture" },
  { value: "Clothing", label: "Clothing" },
  { value: "Sports", label: "Sports" },
  { value: "Others", label: "Others" },
];
