import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/clients";

const LS_DAILY_GOAL = "dailyGoal";
const GOAL_OPTIONS = [5, 10, 15, 20, 30];

export default function Dashboard() {
  const nav = useNavigate();

  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [weekly, setWeekly] = useState([]);

  // NOWE: cel dzienny z localStorage
  const [dailyGoal, setDailyGoal] = useState(() => {
    const v = Number(localStorage.getItem(LS_DAILY_GOAL));
    return Number.isFinite(v) && v > 0 ? v : 10;
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function pickProfile(dto) {
    return dto?.profile ?? dto?.data?.profile ?? dto?.user?.profile ?? dto ?? null;
  }

  function pickProgress(dto) {
    if (!dto) return null;
    if (dto.stats) return dto;
    if (dto.progress?.stats) return dto.progress;
    if (dto.data?.stats) return dto.data;
    return dto;
  }

  function pickWeekly(dto) {
    const days = dto?.days ?? dto?.data?.days ?? dto?.weekly?.days ?? [];
    return Array.isArray(days) ? days : [];
  }

  // helper: ładowanie progressu pod dany dailyGoal
  async function loadProgress(goal) {
    const g = Number(goal);
    return api.get(`/api/progress?dailyGoal=${encodeURIComponent(g)}`);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");

      try {
        const [p, pr, wk] = await Promise.allSettled([
          api.get("/api/profile"),
          loadProgress(dailyGoal), // <-- ważne: progress pod cel
          api.get("/api/progress/weekly"),
        ]);

        if (p.status === "fulfilled") setProfile(pickProfile(p.value));
        if (pr.status === "fulfilled") setProgress(pickProgress(pr.value));
        if (wk.status === "fulfilled") setWeekly(pickWeekly(wk.value));

        if (pr.status === "rejected") {
          setError("Nie udało się pobrać danych dashboardu. Sprawdź czy API działa.");
        }
      } catch (e) {
        setError(e?.message || "Błąd ładowania dashboardu");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NOWE: jak user zmieni cel dzienny -> zapisz i przeładuj progress
  useEffect(() => {
    localStorage.setItem(LS_DAILY_GOAL, String(dailyGoal));

    (async () => {
      try {
        const dto = await loadProgress(dailyGoal);
        setProgress(pickProgress(dto));
      } catch (e) {
        // nie rozwalaj UI, tylko pokaż błąd
        setError(e?.message || "Nie udało się odświeżyć progressu dla nowego celu.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyGoal]);

  const computed = useMemo(() => {
    const s = progress?.stats ?? {};

    const total = Number(s.total ?? 0);
    const correct = Number(s.correct ?? 0);

    const accuracyPct =
      typeof s.accuracy === "number" ? Math.round(s.accuracy * 100) : 0;

    const streakDays = Number(s.streakDays ?? 0);
    const bestStreakDays = Number(s.bestStreakDays ?? 0);

    // plan dzienny (backend policzy wg dailyGoal z query)
    const dailyGoalFromApi = Number(s.dailyGoal ?? dailyGoal);
    const todayTotal = Number(s.todayTotal ?? 0);
    const todayRemaining =
      typeof s.todayRemaining === "number"
        ? Number(s.todayRemaining)
        : Math.max(0, dailyGoalFromApi - todayTotal);

    const todayPct =
      typeof s.todayPct === "number"
        ? Number(s.todayPct)
        : dailyGoalFromApi > 0
        ? Math.min(100, Math.round((todayTotal / dailyGoalFromApi) * 100))
        : 0;

    const todayDone =
      typeof s.todayDone === "boolean"
        ? s.todayDone
        : todayTotal >= dailyGoalFromApi;

    const recent5 = Array.isArray(progress?.recentAttempts)
      ? progress.recentAttempts.slice(0, 5)
      : [];

    const lastAttempt = progress?.lastAttempt ?? null;

    return {
      total,
      correct,
      accuracyPct,
      streakDays,
      bestStreakDays,
      recent5,
      lastAttempt,
      dailyGoal: dailyGoalFromApi,
      todayTotal,
      todayRemaining,
      todayPct,
      todayDone,
    };
  }, [progress, dailyGoal]);

  const level = (profile?.level && String(profile.level).toUpperCase()) || "—";
  const language = profile?.language || "—";
  const goal = profile?.goal || "general";

  function continueLastExercise() {
    const exId = computed.lastAttempt?.exerciseId;
    if (!exId) return;
    localStorage.setItem("lastExerciseId", exId);
    nav("/exercise");
  }

  const chart = useMemo(() => {
    const arr = Array.isArray(weekly) ? weekly : [];
    const max = arr.reduce((m, d) => Math.max(m, Number(d?.total ?? 0)), 0);
    return { arr, max: max || 1 };
  }, [weekly]);

  return (
    <div style={{ maxWidth: 900, margin: "32px auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <span style={{ opacity: 0.7, fontSize: 12 }}>
          Podsumowanie Twojej nauki
        </span>
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

        <button
          type="button"
          onClick={continueLastExercise}
          disabled={!computed.lastAttempt}
          style={{ padding: "10px 12px", marginLeft: "auto" }}
          title={!computed.lastAttempt ? "Brak wcześniejszych prób" : "Wróć do ostatniego ćwiczenia"}
        >
          ⏩ Kontynuuj ostatnie ćwiczenie
        </button>
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
          <Row label="Wszystkie próby" value={String(computed.total)} />
          <Row label="Poprawne" value={String(computed.correct)} />
          <Row label="Skuteczność" value={`${computed.accuracyPct}%`} />
          <Row label="Streak" value={`${computed.streakDays} dni`} />
          <Row label="Rekord" value={`${computed.bestStreakDays} dni`} />
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Streak rośnie, jeśli robisz przynajmniej 1 próbę dziennie.
          </div>
        </Card>

        {/* PLAN DZIENNY */}
        <Card title="Plan dzienny">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Cel:</span>
            <select
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              style={{ padding: "6px 8px" }}
            >
              {GOAL_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g} prób / dzień
                </option>
              ))}
            </select>
          </div>

          <Row label="Dziś zrobione" value={`${computed.todayTotal}`} />
          <Row label="Zostało" value={`${computed.todayRemaining}`} />

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
              Postęp: {computed.todayPct}%
            </div>

            <div style={{ height: 10, background: "#eee", borderRadius: 999 }}>
              <div
                style={{
                  height: 10,
                  width: `${computed.todayPct}%`,
                  background: computed.todayDone ? "#16a34a" : "#4f46e5",
                  borderRadius: 999,
                }}
              />
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={() => nav("/exercise")} style={{ padding: "10px 12px" }}>
                ➕ Zrób kolejne
              </button>

              {computed.todayDone && (
                <span style={{ alignSelf: "center", fontSize: 12, opacity: 0.8 }}>
                  Cel dzienny zrobiony ✅
                </span>
              )}
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Liczymy z attemptów (czyli realnych rozwiązań).
            </div>
          </div>
        </Card>

        <Card title="Ostatnie aktywności">
          {computed.recent5.length === 0 ? (
            <div style={{ fontSize: 14, opacity: 0.7 }}>
              Brak ostatnich prób — zrób pierwsze ćwiczenie 🙂
            </div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {computed.recent5.map((a, idx) => (
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

          {computed.lastAttempt?.exercise?.prompt ? (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Ostatnie ćwiczenie: {computed.lastAttempt.exercise.prompt.slice(0, 80)}
              {computed.lastAttempt.exercise.prompt.length > 80 ? "..." : ""}
            </div>
          ) : null}
        </Card>

        <Card title="Aktywność (ostatnie 7 dni)">
          {chart.arr.length === 0 ? (
            <div style={{ opacity: 0.7 }}>Brak danych do wykresu.</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", height: 140 }}>
                {chart.arr.map((d) => {
                  const total = Number(d?.total ?? 0);
                  const correct = Number(d?.correct ?? 0);
                  const h = Math.round((total / chart.max) * 110);

                  const label = String(d?.date || "").slice(5);
                  const tooltip = `${d?.date}: ${total} prób, ${correct} poprawnych`;

                  return (
                    <div key={d.date} style={{ flex: 1, textAlign: "center" }} title={tooltip}>
                      <div
                        style={{
                          height: h,
                          minHeight: 4,
                          borderRadius: 6,
                          background: "#4f46e5",
                        }}
                      />
                      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 6 }}>{label}</div>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{total}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                Słupek = liczba prób danego dnia. Najedź myszką na słupek, żeby zobaczyć szczegóły.
              </div>
            </>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 18, opacity: 0.8, fontSize: 12 }}>
        Jeśli streak = 0, to normalne gdy dziś nie było żadnej próby.
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
