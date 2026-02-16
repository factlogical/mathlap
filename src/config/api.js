const DEFAULT_API_BASE_URL = "http://localhost:3002";

function normalizeBaseUrl(url) {
  const value = String(url || "").trim();
  const safe = value || DEFAULT_API_BASE_URL;
  return safe.replace(/\/+$/, "");
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL);

export function apiUrl(path) {
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path || ""}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
