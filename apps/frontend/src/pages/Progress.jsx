import { useEffect, useState } from "react";
import { api } from "../api/clients";
import { mapProgress } from "../api/types";

export default function ProgressPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadProgress() {
    setLoading(true);
    setError("");
    try {
      const dto = await api.get("/api/progress");
      setData(mapProgress(dto));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProgress();
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "40px auto" }}>
      <h2>Postęp</h2>

      {loading && <p>Ładowanie...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {data && (
        <>
          <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
            <Stat label="Wszystkie próby" value={data.total} />
            <Stat label="Poprawne" value={data.correct} />
            <Stat label="Skuteczność" value={`${data.accuracy}%`} />
          </div>

          <h3>Ostatnie próby</h3>
          <ul>
            {data.recent.map((a) => (
              <li key={a.id} style={{ marginBottom: 12 }}>
                <strong>{a.prompt}</strong><br />
                Odpowiedź: {a.answer}<br />
                Wynik: {a.correct ? "✓ poprawnie" : "✗ błędnie"}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: 16 }}>
      <div style={{ fontSize: 12, opacity: 0.6 }}>{label}</div>
      <div style={{ fontSize: 24 }}>{value}</div>
    </div>
  );
}
