import { useEffect, useState } from "react";
import { api } from "../api/clients";
import Feedback from "../components/Feedback";
import { mapExercise, mapAttemptResult } from "../api/types";

export default function ExercisePage() {
  const [exercise, setExercise] = useState(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // UI controls
  const [type, setType] = useState("translate"); // translate | fill_blank
  const [topic, setTopic] = useState("daily"); // free text

  async function loadExercise(opts = {}) {
    setLoading(true);
    setError("");
    setResult(null);
    setAnswer("");

    try {
      const dto = await api.post("/api/exercises/ai-generate", {
        type: opts.type ?? type,
        topic: (opts.topic ?? topic).trim() || "daily",
      });

      // backend może zwracać {exercise:{...}} albo {...}
      const ex = dto?.exercise ?? dto;

      if (!ex?.id || !ex?.prompt) {
        throw new Error("Nieprawidłowa odpowiedź API (brak id/prompt).");
      }

      setExercise(mapExercise(ex));
    } catch (e) {
      setError(e.message || "Błąd podczas generowania ćwiczenia");
      setExercise(null);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!answer.trim() || !exercise?.id) return;

    setLoading(true);
    setError("");

    try {
      const dto = await api.post("/api/attempts", {
        exerciseId: exercise.id,
        answer: answer.trim(),
      });
      setResult(mapAttemptResult(dto));
    } catch (e) {
      setError(e.message || "Błąd podczas sprawdzania odpowiedzi");
    } finally {
      setLoading(false);
    }
  }

  // auto-load first exercise on page entry
  useEffect(() => {
    loadExercise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Ćwiczenia</h2>
            <p className="mt-1 text-sm text-slate-500">
              Generuj zadania i sprawdzaj odpowiedzi
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
            <label className="grid gap-2">
              <span className="text-xs font-medium text-slate-500">Typ</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={loading}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
              >
                <option value="translate">Tłumaczenie (PL→EN)</option>
                <option value="fill_blank">Uzupełnij lukę</option>
              </select>
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className="text-xs font-medium text-slate-500">Temat</span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="np. travel / work / daily / food"
                disabled={loading}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
              />
            </label>

            <div className="flex flex-wrap gap-3 md:col-span-3">
              <button
                type="button"
                onClick={() => loadExercise({ type, topic })}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? "..." : "Generuj"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setExercise(null);
                  setResult(null);
                  setAnswer("");
                  setError("");
                }}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                Wyczyść
              </button>
            </div>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && <p className="mt-4 text-sm text-slate-500">Ładowanie...</p>}
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

        {!exercise && !loading && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">
              Kliknij <span className="font-semibold text-slate-900">Generuj</span>, aby dostać ćwiczenie.
            </p>
          </div>
        )}

        {exercise && (
          <div className="mt-6 space-y-4">
            {/* Meta */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                  Typ: <span className="font-semibold text-slate-900">{exercise.type}</span>
                </span>

                {topic ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                    Temat: <span className="font-semibold text-slate-900">{topic}</span>
                  </span>
                ) : null}
              </div>
            </div>

            {/* Prompt */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 text-sm font-semibold text-slate-900">Polecenie</div>
              <p className="text-sm text-slate-700">{exercise.prompt}</p>
            </div>

            {/* Answer / Actions */}
            {!result && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="grid gap-2">
                  <span className="text-xs font-medium text-slate-500">Twoja odpowiedź</span>
                  <textarea
                    rows={4}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Twoja odpowiedź..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </label>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={submitAnswer}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
                  >
                    Sprawdź
                  </button>

                  <button
                    type="button"
                    onClick={() => loadExercise({ type, topic })}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Następne
                  </button>
                </div>
              </div>
            )}

            {/* Feedback (bez zmian w funkcjonalności) */}
            {result && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <Feedback result={result} onNext={() => loadExercise({ type, topic })} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
