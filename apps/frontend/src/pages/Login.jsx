import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, setSession } from "../utils/auth";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const data = await login(email, password);
      setSession({ token: data.token, user: data.user });
      nav("/dashboard");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h2>Logowanie</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="hasło" type="password" />
        <button disabled={loading}>{loading ? "..." : "Zaloguj"}</button>
        {err && <p style={{ color: "crimson" }}>{err}</p>}
      </form>
      <p>
        Nie masz konta? <Link to="/register">Rejestracja</Link>
      </p>
    </div>
  );
}
