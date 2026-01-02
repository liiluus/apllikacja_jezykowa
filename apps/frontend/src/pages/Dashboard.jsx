import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/clients";
import {
  Target,
  MessageSquare,
  BarChart3,
  ArrowRightCircle,
  User,
  Activity,
  Flame,
  Trophy,
  CalendarCheck,
  Plus,
} from "lucide-react";

const LS_DAILY_GOAL = "dailyGoalAttempts"; 

function dayKeyUTC(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10); 
}

export default function Dashboard() {
  const nav = useNavigate();

  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [weekly, setWeekly] = useState([]); 

  const [dailyGoal, setDailyGoal] = useState(() => {
    const v = Number(localStorage.getItem(LS_DAILY_GOAL) || 5);
    return Number.isFinite(v) && v > 0 ? v : 5;
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

  useEffect(() => {
    localStorage.setItem(LS_DAILY_GOAL, String(dailyGoal));
  }, [dailyGoal]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");

      try {
        const [p, pr, wk] = await Promise.allSettled([
          api.get("/api/profile"),
          api.get("/api/progress"),
          api.get("/api/progress/weekly"),
        ]);

        if (p.status === "fulfilled") setProfile(pickProfile(p.value));
        if (pr.status === "fulfilled") setProgress(pickProgress(pr.value));
        if (wk.status === "fulfilled") setWeekly(pickWeekly(wk.value));

        if (pr.status === "rejected") {
          setError("Nie udało się pobrać danych dashboardu. Sprawdź czy backend działa.");
        }
      } catch (e) {
        setError(e?.message || "Błąd ładowania dashboardu");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const computed = useMemo(() => {
    const s = progress?.stats ?? {};

    const total = Number(s.total ?? 0);
    const correct = Number(s.correct ?? 0);
    const accuracyPct = typeof s.accuracy === "number" ? Math.round(s.accuracy * 100) : 0;

    const streakDays = Number(s.streakDays ?? 0);
    const bestStreakDays = Number(s.bestStreakDays ?? 0);

    const recent5 = Array.isArray(progress?.recentAttempts) ? progress.recentAttempts.slice(0, 5) : [];
    const lastAttempt = progress?.lastAttempt ?? null;

    return { total, correct, accuracyPct, streakDays, bestStreakDays, recent5, lastAttempt };
  }, [progress]);

  const chart = useMemo(() => {
    const arr = Array.isArray(weekly) ? weekly : [];
    const max = arr.reduce((m, d) => Math.max(m, Number(d?.total ?? 0)), 0);
    return { arr, max: max || 1 };
  }, [weekly]);

  const daily = useMemo(() => {
    const today = dayKeyUTC();
    const todayRow = chart.arr.find((d) => String(d?.date) === today);
    const done = Number(todayRow?.total ?? 0);
    const remaining = Math.max(dailyGoal - done, 0);
    const pct = dailyGoal <= 0 ? 0 : Math.min(100, Math.round((done / dailyGoal) * 100));
    const doneFlag = done >= dailyGoal && dailyGoal > 0;
    return { today, done, remaining, pct, doneFlag };
  }, [chart.arr, dailyGoal]);

  const level = (profile?.level && String(profile.level).toUpperCase()) || "—";
  const language = profile?.language || "—";
  const goal = profile?.goal || "general";

  function continueLastExercise() {
    const exId = computed.lastAttempt?.exerciseId;
    if (!exId) return;
    localStorage.setItem("lastExerciseId", exId);
    nav("/exercise");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Podsumowanie Twojej nauki</p>
          </div>

          <button
            type="button"
            onClick={continueLastExercise}
            disabled={!computed.lastAttempt}
            title={!computed.lastAttempt ? "Brak wcześniejszych prób" : "Wróć do ostatniego ćwiczenia"}
            className={[
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition",
              computed.lastAttempt
                ? "border-slate-200 bg-white hover:bg-slate-50"
                : "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed",
            ].join(" ")}
          >
            <ArrowRightCircle className="h-4 w-4" />
            Kontynuuj ostatnie ćwiczenie
          </button>
        </div>

        {/* Loading / Error */}
        {loading && <p className="mt-4 text-sm text-slate-500">Ładowanie...</p>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {/* Quick actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/exercise">
            <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition">
              <Target className="h-4 w-4" />
              Nowe ćwiczenie
            </button>
          </Link>

          <Link to="/ai">
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 transition">
              <MessageSquare className="h-4 w-4" />
              AI Asystent
            </button>
          </Link>

          <Link to="/progress">
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 transition">
              <BarChart3 className="h-4 w-4" />
              Postęp
            </button>
          </Link>
        </div>

        {/* Cards grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Profile */}
          <Card
            title={
              <span className="inline-flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                Twój profil nauki
              </span>
            }
          >
            <Row label="Język" value={language} />
            <Row label="Poziom" value={level} />
            <Row label="Cel" value={goal} />
            <p className="mt-3 text-xs text-slate-500">
              Tip: poziom możesz zmieniać w czacie i w ćwiczeniach.
            </p>
          </Card>

          {/* Stats */}
          <Card
            title={
              <span className="inline-flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-600" />
                Statystyki
              </span>
            }
          >
            <Row label="Wszystkie próby" value={String(computed.total)} />
            <Row label="Poprawne" value={String(computed.correct)} />
            <Row label="Skuteczność" value={`${computed.accuracyPct}%`} />

            <div className="mt-3 grid grid-cols-2 gap-3">
              <MiniStat
                icon={<Flame className="h-4 w-4 text-orange-500" />}
                label="Streak"
                value={`${computed.streakDays} dni`}
              />
              <MiniStat
                icon={<Trophy className="h-4 w-4 text-amber-500" />}
                label="Rekord"
                value={`${computed.bestStreakDays} dni`}
              />
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Streak rośnie, jeśli robisz przynajmniej 1 próbę dziennie.
            </p>
          </Card>

          {/* Daily plan */}
          <Card
            title={
              <span className="inline-flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-indigo-600" />
                Plan dzienny
              </span>
            }
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-600">Cel</div>

              <select
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {[1, 3, 5, 10, 15].map((v) => (
                  <option key={v} value={v}>
                    {v} prób / dzień
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 space-y-2">
              <Row label="Dziś zrobione" value={String(daily.done)} />
              <Row label="Zostało" value={String(daily.remaining)} />
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Postęp: {daily.pct}%</span>
                {daily.doneFlag ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CalendarCheck className="h-4 w-4" />
                    Cel zrobiony
                  </span>
                ) : null}
              </div>

              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${daily.pct}%` }}
                />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Link to="/exercise">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition">
                    <Plus className="h-4 w-4" />
                    Zrób kolejne
                  </button>
                </Link>
                <span className="text-xs text-slate-500">Liczymy z attemptów (czyli realnych rozwiązań).</span>
              </div>
            </div>
          </Card>

          {/* Recent */}
          <Card
            title={
              <span className="inline-flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-600" />
                Ostatnie aktywności
              </span>
            }
          >
            {computed.recent5.length === 0 ? (
              <p className="text-sm text-slate-500">Brak ostatnich prób — zrób pierwsze ćwiczenie 🙂</p>
            ) : (
              <ul className="space-y-2">
                {computed.recent5.map((a, idx) => (
                  <li
                    key={a?.id || idx}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="text-xs text-slate-500">
                      {a?.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={a?.isCorrect ? "text-emerald-600" : "text-rose-600"}>
                        {a?.isCorrect ? "✓" : "✕"}
                      </span>
                      {typeof a?.score === "number" ? (
                        <span className="text-xs text-slate-600">(score: {a.score})</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {computed.lastAttempt?.exercise?.prompt ? (
              <p className="mt-3 text-xs text-slate-500">
                Ostatnie ćwiczenie:{" "}
                <span className="font-medium text-slate-700">
                  {String(computed.lastAttempt.exercise.prompt).slice(0, 90)}
                  {String(computed.lastAttempt.exercise.prompt).length > 90 ? "..." : ""}
                </span>
              </p>
            ) : null}
          </Card>

          {/* Weekly chart */}
          <Card
            title={
              <span className="inline-flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
                Aktywność (ostatnie 7 dni)
              </span>
            }
          >
            {chart.arr.length === 0 ? (
              <p className="text-sm text-slate-500">Brak danych do wykresu.</p>
            ) : (
              <>
                <div className="mt-2 flex h-40 items-end gap-2">
                  {chart.arr.map((d) => {
                    const total = Number(d?.total ?? 0);
                    const correct = Number(d?.correct ?? 0);

                    const height = Math.round((total / chart.max) * 120);
                    const label = String(d?.date || "").slice(5); // MM-DD
                    const tooltip = `${d?.date}: ${total} prób, ${correct} poprawnych`;

                    return (
                      <div key={d.date} className="flex-1 text-center" title={tooltip}>
                        <div
                          className="mx-auto w-full rounded-lg bg-indigo-600/90"
                          style={{ height: Math.max(height, 4) }}
                        />
                        <div className="mt-2 text-[10px] text-slate-500">{label}</div>
                        <div className="text-xs font-semibold text-slate-700">{total}</div>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Słupek = liczba prób danego dnia (attemptów). Najedź myszką na słupek, żeby zobaczyć szczegóły.
                </p>
              </>
            )}
          </Card>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Jeśli streak = 0, to normalne gdy dziś nie było żadnej próby.
        </p>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-slate-900">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-slate-100 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function MiniStat({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
