import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/clients";

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function pickProfile(dto) {
    return dto?.profile ?? dto?.data?.profile ?? dto?.user?.profile ?? dto ?? null;
  }

  // ✅ WAŻNE: dopasowane do Twojego backendu:
  // GET /api/progress -> { stats: {...}, recentAttempts: [...] }
  function pickProgress(dto) {
    if (!dto) return null;

    // jeśli dostaliśmy już poprawny shape
    if (dto.stats && typeof dto.stats === "object") return dto;

    // fallback: ktoś owinął w {progress: ...}
    if (dto.progress?.stats) return dto.progress;

    // fallback: ktoś owinął w {data: ...}
    if (dto.data?.stats) return dto.data;

    // ostatecznie: spróbuj potraktować dto jako stats
    // (gdyby endpoint zwracał same pola total/correct/accuracy)
    if (
      typeof dto.total === "number" ||
      typeof dto.correct === "number" ||
      typeof dto.accuracy === "number"
    ) {
      return { stats: dto, recentAttempts: [] };
    }

    return dto;
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [p, pr] = await Promise.allSettled([
          api.get("/api/profile"),
          api.get("/api/progress"),
        ]);

        if (p.status === "fulfilled") setProfile(pickProfile(p.value));
        if (pr.status === "fulfilled") setProgress(pickProgress(pr.value));

        if (p.status === "rejected" && pr.status === "rejected") {
          setError("Nie udało się pobrać danych dashboardu. Sprawdź czy API działa.");
        }
      } catch (e) {
        setError(e?.message || "Błąd ładowania dashboardu");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    // ✅ czytamy z progress.stats (bo tak zwraca backend)
    const s = progress?.stats ?? progress ?? {};

    const total =
      s?.totalAttempts ??
      s?.attemptsTotal ??
      s?.total ??
      0;

    const correct =
      s?.correctAttempts ??
      s?.correct ??
      s?.correctTotal ??
      0;

    // backend: accuracy to 0..1
    // UI: pokażemy %
    let accuracyPct = 0;
    if (typeof s?.accuracy === "number") {
      accuracyPct = Math.round(s.accuracy * 100);
    } else if (total > 0) {
      accuracyPct = Math.round((correct / total) * 100);
    }

    const recent =
      progress?.recentAttempts ??
      s?.recentAttempts ??
      progress?.lastAttempts ??
      progress?.attempts ??
      [];

    const recent5 = Array.isArray(recent) ? recent.slice(0, 5) : [];

    return { total, correct, accuracyPct, recent5 };
  }, [progress]);

  const level = (profile?.level && String(profile.level).toUpperCase()) || "—";
  const language = profile?.language || "—";
  const goal = profile?.goal || "general";

  return (
    <div style={{ maxWidth: 900, margin: "32px auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <span style={{ opacity: 0.7, fontSize: 12 }}>Podsumowanie Twojej nauki</span>
      </div>

      {loading && <p style={{ marginTop: 12 }}>Ładowanie...</p>}
      {error && <p style={{ marginTop: 12, color: "crimson" }}>{error}</p>}

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link to="/exercise">
          <button style={{ padding: "10px 12px" }}>🎯 Nowe ćwiczenie</button>
        </Link>

        <Link to="/ai">
          <button style={{ padding: "10px 12px" }}>💬 AI Asystent</button>
        </Link>

        <Link to="/progress">
          <button style={{ padding: "10px 12px" }}>📊 Postęp</button>
        </Link>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        <Card title="Twój profil nauki">
          <Row label="Język" value={language} />
          <Row label="Poziom" value={level} />
          <Row label="Cel" value={goal} />
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Tip: poziom możesz zmieniać w czacie i w ćwiczeniach.
          </div>
        </Card>

        <Card title="Statystyki">
          <Row label="Wszystkie próby" value={String(stats.total)} />
          <Row label="Poprawne" value={String(stats.correct)} />
          <Row label="Skuteczność" value={`${stats.accuracyPct}%`} />
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Te dane pochodzą z Twoich rozwiązań ćwiczeń.
          </div>
        </Card>

        <Card title="Ostatnie aktywności">
          {stats.recent5.length === 0 ? (
            <div style={{ fontSize: 14, opacity: 0.7 }}>
              Brak ostatnich prób — zrób pierwsze ćwiczenie 🙂
            </div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {stats.recent5.map((a, idx) => (
                <li key={a?.id || idx} style={{ marginBottom: 6 }}>
                  <span style={{ opacity: 0.75 }}>
                    {a?.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                  </span>
                  {" — "}
                  <strong>{a?.isCorrect ? "✅" : "❌"}</strong>
                  {typeof a?.score === "number" ? ` (score: ${a.score})` : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 14, background: "#fff" }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        padding: "6px 0",
        borderBottom: "1px dashed #eee",
      }}
    >
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
