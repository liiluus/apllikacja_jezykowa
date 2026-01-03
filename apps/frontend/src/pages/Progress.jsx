import { useEffect, useState } from "react";
import { api } from "../api/clients";
import { mapProgress } from "../api/types";
import { BarChart3, CheckCircle2, XCircle, Activity } from "lucide-react";

function Card({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

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
    <div className="space-y-4">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600">
        <div className="px-6 py-7 sm:px-8 sm:py-9">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Postęp
          </h1>
          <p className="mt-2 text-sm text-white/85">
            Podsumowanie prób i ostatnie odpowiedzi.
          </p>
          {loading ? <div className="mt-4 text-sm text-white/85">Ładowanie...</div> : null}
          {error ? <div className="mt-4 text-sm text-rose-100">{error}</div> : null}
        </div>
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Stat label="Wszystkie próby" value={data.total} />
            <Stat label="Poprawne" value={data.correct} />
            <Stat label="Skuteczność" value={`${data.accuracy}%`} />
          </div>

          <Card title="Ostatnie próby" icon={Activity}>
            {data.recent.length === 0 ? (
              <div className="text-sm text-slate-600">Brak prób.</div>
            ) : (
              <div className="space-y-3">
                {data.recent.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {a.prompt}
                        </div>
                        <div className="mt-2 text-sm text-slate-700">
                          <span className="font-semibold">Odpowiedź:</span> {a.answer}
                        </div>
                      </div>

                      <div
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold ${
                          a.correct
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {a.correct ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {a.correct ? "poprawnie" : "błędnie"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
