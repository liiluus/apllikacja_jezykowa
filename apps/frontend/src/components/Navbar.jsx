import { Link, useNavigate } from "react-router-dom";
import { clearSession, getUser } from "../utils/auth";

export default function Navbar() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");
  const user = getUser();

  return (
    <div
      style={{
        padding: 12,
        borderBottom: "1px solid #ddd",
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/exercise">Ćwiczenia</Link>
      <Link to="/progress">Postęp</Link>
      <Link to="/ai">AI Asystent</Link>

      <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
        {token ? (
          <>
            <span style={{ opacity: 0.7 }}>{user?.email}</span>
            <button
              onClick={() => {
                clearSession();
                nav("/login");
              }}
            >
              Wyloguj
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </div>
  );
}
