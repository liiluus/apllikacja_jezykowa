import { api } from "./clients";

export async function fetchProfile() {
  return api.get("/api/profile"); // -> { profile: { level, language, goal } }
}

export async function updateProfile(patch) {
  return api.patch("/api/profile", patch); // -> { profile: {...} }
}
