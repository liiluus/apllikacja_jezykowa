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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Postęp</h2>
            <p className="mt-1 text-sm text-slate-500">Podsumowanie prób i skuteczności</p>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && <p className="mt-4 text-sm text-slate-500">Ładowanie...</p>}
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

        {data && (
          <>
            {/* Stats */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat label="Wszystkie próby" value={data.total} />
              <Stat label="Poprawne" value={data.correct} />
              <Stat label="Skuteczność" value={`${data.accuracy}%`} />
            </div>

            {/* Recent attempts */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-slate-900">Ostatnie próby</div>

              {data.recent.length === 0 ? (
                <p className="text-sm text-slate-500">Brak prób — zrób pierwsze ćwiczenie 🙂</p>
              ) : (
                <ul className="space-y-2">
                  {data.recent.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">{a.prompt}</div>
                          <div className="mt-1 text-sm text-slate-700">
                            <span className="text-slate-500">Odpowiedź:</span>{" "}
                            <span className="font-medium">{a.answer}</span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                              a.correct
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200",
                            ].join(" ")}
                          >
                            {a.correct ? "✓ poprawnie" : "✗ błędnie"}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}
