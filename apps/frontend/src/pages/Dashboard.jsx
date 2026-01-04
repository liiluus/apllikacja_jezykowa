import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/clients";
import {
  Target,
  MessageSquare,
  BarChart3,
  ArrowRight,
  User,
  Sparkles,
  Flame,
  Trophy,
  CalendarCheck2,
  Plus,
  Activity,
} from "lucide-react";

const LS_DAILY_GOAL = "dailyGoal";
const GOAL_OPTIONS = [5, 10, 15, 20, 30];

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function Card({ title, icon: Icon, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon ? (
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <div className="text-sm font-semibold text-slate-900">{title}</div>
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-slate-100 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function PillButton({ to, icon: Icon, children, variant = "soft", className = "" }) {
  const base =
    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition";
  const styles =
    variant === "solid"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : "bg-white/70 text-slate-900 ring-1 ring-white/60 hover:bg-white";
  const content = (
    <>
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cx(base, styles, className)}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={cx(base, styles, className)}>
      {content}
    </button>
  );
}

export default function Dashboard() {
  const nav = useNavigate();

  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [weekly, setWeekly] = useState([]);

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
          loadProgress(dailyGoal),
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
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_DAILY_GOAL, String(dailyGoal));

    (async () => {
      try {
        const dto = await loadProgress(dailyGoal);
        setProgress(pickProgress(dto));
      } catch (e) {
        setError(e?.message || "Nie udało się odświeżyć progressu dla nowego celu.");
      }
    })();
  }, [dailyGoal]);

  const computed = useMemo(() => {
    const s = progress?.stats ?? {};

    const total = Number(s.total ?? 0);
    const correct = Number(s.correct ?? 0);

    const accuracyPct = typeof s.accuracy === "number" ? Math.round(s.accuracy * 100) : 0;

    const streakDays = Number(s.streakDays ?? 0);
    const bestStreakDays = Number(s.bestStreakDays ?? 0);

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

    const todayDone = typeof s.todayDone === "boolean" ? s.todayDone : todayTotal >= dailyGoalFromApi;

    const recent5 = Array.isArray(progress?.recentAttempts) ? progress.recentAttempts.slice(0, 5) : [];

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

  const canContinue = Boolean(computed.lastAttempt);

  return (
    <div className="space-y-6">
      {/* Header / hero */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600">
        <div className="px-6 py-7 sm:px-8 sm:py-9">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-[220px]">
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Dashboard
              </h1>
              <p className="mt-2 max-w-xl text-sm text-white/85">
                Podsumowanie Twojej nauki — statystyki, streak, plan dzienny i aktywność.
              </p>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <PillButton to="/exercise" icon={Target}>
                Nowe ćwiczenie
              </PillButton>
              <PillButton to="/ai" icon={MessageSquare}>
                AI Asystent
              </PillButton>
              <PillButton to="/progress" icon={BarChart3}>
                Postęp
              </PillButton>

              <button
                type="button"
                onClick={continueLastExercise}
                disabled={!canContinue}
                className={cx(
                  "ml-0 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition sm:ml-2",
                  canContinue
                    ? "bg-white/85 text-slate-900 hover:bg-white"
                    : "bg-white/30 text-white/70 cursor-not-allowed"
                )}
                title={!canContinue ? "Brak wcześniejszych prób" : "Wróć do ostatniego ćwiczenia"}
              >
                <ArrowRight className="h-4 w-4" />
                Kontynuuj ostatnie ćwiczenie
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-white/85">Ładowanie...</div>
          ) : null}
          {error ? <div className="mt-4 text-sm text-rose-100">{error}</div> : null}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Profil */}
        <Card title="Twój profil nauki" icon={User}>
          <div className="space-y-1">
            <Row label="Język" value={language} />
            <Row label="Poziom" value={level} />
            <Row label="Cel" value={goal} />
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Sparkles className="mt-0.5 h-4 w-4 text-slate-500" />
            <span>Tip: poziom możesz zmieniać w czacie i w ćwiczeniach.</span>
          </div>
        </Card>

        {/* Statystyki */}
        <Card
          title="Statystyki"
          icon={BarChart3}
          right={
            <div className="flex items-center gap-2">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                Skuteczność: {computed.accuracyPct}%
              </div>
            </div>
          }
        >
          <div className="space-y-1">
            <Row label="Wszystkie próby" value={String(computed.total)} />
            <Row label="Poprawne" value={String(computed.correct)} />
            <Row label="Skuteczność" value={`${computed.accuracyPct}%`} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Flame className="h-4 w-4 text-orange-500" />
                Streak
              </div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{computed.streakDays} dni</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Trophy className="h-4 w-4 text-amber-500" />
                Rekord
              </div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{computed.bestStreakDays} dni</div>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-600">
            Streak rośnie, jeśli robisz przynajmniej 1 próbę dziennie.
          </div>
        </Card>

        {/* Plan dzienny */}
        <Card
          title="Plan dzienny"
          icon={CalendarCheck2}
          right={
            <select
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {GOAL_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g} prób / dzień
                </option>
              ))}
            </select>
          }
        >
          <div className="space-y-1">
            <Row label="Dziś zrobione" value={`${computed.todayTotal}`} />
            <Row label="Zostało" value={`${computed.todayRemaining}`} />
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
              <span>Postęp</span>
              <span className="font-semibold">{computed.todayPct}%</span>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className={cx(
                  "h-2 rounded-full transition-all",
                  computed.todayDone ? "bg-emerald-500" : "bg-indigo-600"
                )}
                style={{ width: `${computed.todayPct}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => nav("/exercise")}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" />
                Zrób kolejne
              </button>

              {computed.todayDone ? (
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  Cel dzienny zrobiony ✅
                </div>
              ) : null}
            </div>

            <div className="mt-3 text-xs text-slate-600">
              Liczymy z attemptów (czyli realnych rozwiązań).
            </div>
          </div>
        </Card>

        {/* Ostatnie aktywności */}
        <div className="lg:col-span-2">
          <Card title="Ostatnie aktywności" icon={Activity}>
            {computed.recent5.length === 0 ? (
              <div className="text-sm text-slate-600">
                Brak ostatnich prób — zrób pierwsze ćwiczenie 🙂
              </div>
            ) : (
              <div className="space-y-2">
                {computed.recent5.map((a, idx) => (
                  <div
                    key={a?.id || idx}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="text-sm text-slate-700">
                      <div className="text-xs text-slate-500">
                        {a?.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                      </div>
                      <div className="mt-1 font-semibold">
                        {a?.isCorrect ? "✅ Poprawnie" : "❌ Błędnie"}
                        {typeof a?.score === "number" ? (
                          <span className="ml-2 text-xs font-medium text-slate-500">
                            (score: {a.score})
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-right text-xs text-slate-500">
                      {a?.exercise?.type ? <div>typ: {a.exercise.type}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {computed.lastAttempt?.exercise?.prompt ? (
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Ostatnie ćwiczenie:</span>{" "}
                {computed.lastAttempt.exercise.prompt.slice(0, 120)}
                {computed.lastAttempt.exercise.prompt.length > 120 ? "..." : ""}
              </div>
            ) : null}
          </Card>
        </div>

        {/* Weekly chart */}
        <Card title="Aktywność (ostatnie 7 dni)" icon={BarChart3}>
          {chart.arr.length === 0 ? (
            <div className="text-sm text-slate-600">Brak danych do wykresu.</div>
          ) : (
            <>
              <div className="flex h-40 items-end gap-3">
                {chart.arr.map((d) => {
                  const total = Number(d?.total ?? 0);
                  const correct = Number(d?.correct ?? 0);
                  const h = Math.round((total / chart.max) * 120);

                  const label = String(d?.date || "").slice(5);
                  const tooltip = `${d?.date}: ${total} prób, ${correct} poprawnych`;

                  return (
                    <div key={d.date} className="flex-1 text-center" title={tooltip}>
                      <div className="mx-auto w-full max-w-[48px]">
                        <div
                          className="w-full rounded-xl bg-indigo-600"
                          style={{ height: Math.max(6, h) }}
                        />
                      </div>
                      <div className="mt-2 text-[10px] text-slate-500">{label}</div>
                      <div className="text-xs font-semibold text-slate-900">{total}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 text-xs text-slate-600">
                Słupek = liczba prób danego dnia.
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
