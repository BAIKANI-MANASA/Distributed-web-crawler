import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("crawler_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function register(payload) {
  const { data } = await api.post("/api/auth/register", payload);
  return data;
}

export async function login(payload) {
  const { data } = await api.post("/api/auth/login", payload);
  window.localStorage.setItem("crawler_token", data.access_token);
  window.localStorage.setItem("crawler_user", JSON.stringify(data.user));
  return data;
}

export async function logout() {
  try {
    await api.post("/api/auth/logout");
  } finally {
    window.localStorage.removeItem("crawler_token");
    window.localStorage.removeItem("crawler_user");
  }
}

export async function me() {
  const { data } = await api.get("/api/auth/me");
  window.localStorage.setItem("crawler_user", JSON.stringify(data));
  return data;
}

export async function search(query, page = 1, pageSize = 10, domain = "") {
  const { data } = await api.get("/api/search", { params: { query, page, page_size: pageSize, domain: domain || undefined } });
  return data;
}

export async function suggestions(q) {
  const { data } = await api.get("/api/suggestions", { params: { q } });
  return data.suggestions || [];
}

export async function queueCrawl(url, depth = 1) {
  const { data } = await api.post("/api/crawl", { url, depth });
  return data;
}

export async function stopCrawler() {
  const { data } = await api.post("/api/crawl/stop");
  return data;
}

export async function stats() {
  const { data } = await api.get("/api/stats");
  return data;
}

export async function health() {
  const { data } = await api.get("/api/health");
  return data;
}

export async function profileSummary() {
  const { data } = await api.get("/api/profile/summary");
  return data;
}

export async function updateProfile(payload) {
  const { data } = await api.put("/api/profile", payload);
  window.localStorage.setItem("crawler_user", JSON.stringify(data));
  return data;
}

export async function uploadAvatar(file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/api/profile/avatar", form, { headers: { "Content-Type": "multipart/form-data" } });
  window.localStorage.setItem("crawler_user", JSON.stringify(data));
  return data;
}

export async function favorites() {
  const { data } = await api.get("/api/favorites");
  return data;
}

export async function addFavorite(payload) {
  const { data } = await api.post("/api/favorites", payload);
  return data;
}

export async function removeFavorite(id) {
  const { data } = await api.delete(`/api/favorites/${id}`);
  return data;
}

export async function removeFavoriteByUrl(url) {
  const { data } = await api.delete("/api/favorites", { params: { url } });
  return data;
}

export async function searchHistory() {
  const { data } = await api.get("/api/history");
  return data;
}

export async function removeHistory(id) {
  const { data } = await api.delete(`/api/history/${id}`);
  return data;
}

export async function adminUsers() {
  const { data } = await api.get("/api/admin/users");
  return data;
}

export async function deleteIndexedPages() {
  const { data } = await api.delete("/api/admin/indexed-pages");
  return data;
}

export default api;
