const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, { method = "GET", body, headers } = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  delete: (path) => request(path, { method: "DELETE" }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
};
