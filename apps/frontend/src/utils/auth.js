import { api } from "../api/clients";

export async function login(email, password) {
  return api.post("/api/auth/login", { email, password });
}

export async function register(email, password) {
  return api.post("/api/auth/register", { email, password });
}

export function setSession({ token, user }) {
  localStorage.setItem("token", token);
  if (user) localStorage.setItem("user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}
