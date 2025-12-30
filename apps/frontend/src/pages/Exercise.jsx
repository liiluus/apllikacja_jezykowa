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
    <div style={{ maxWidth: 800, margin: "40px auto" }}>
      <h2>Ćwiczenia</h2>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16,
          padding: 12,
          border: "1px solid #eee",
          borderRadius: 8,
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Typ</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={loading}
          >
            <option value="translate">Tłumaczenie (PL→EN)</option>
            <option value="fill_blank">Uzupełnij lukę</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 220 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Temat</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="np. travel / work / daily / food"
            disabled={loading}
          />
        </label>

        <button
          type="button"
          onClick={() => loadExercise({ type, topic })}
          disabled={loading}
          style={{ height: 36, marginTop: 18 }}
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
          style={{ height: 36, marginTop: 18 }}
        >
          Wyczyść
        </button>
      </div>

      {loading && <p>Ładowanie...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!exercise && !loading && (
        <p style={{ opacity: 0.7 }}>
          Kliknij <strong>Generuj</strong>, aby dostać ćwiczenie.
        </p>
      )}

      {exercise && (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Typ: <strong>{exercise.type}</strong>
              {topic ? (
                <>
                  {" "}
                  • Temat: <strong>{topic}</strong>
                </>
              ) : null}
            </div>
          </div>

          <p>
            <strong>Polecenie:</strong>
          </p>
          <p>{exercise.prompt}</p>

          {!result && (
            <>
              <textarea
                rows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Twoja odpowiedź..."
                style={{ width: "100%", marginTop: 12 }}
              />

              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button onClick={submitAnswer} disabled={loading}>
                  Sprawdź
                </button>
                <button
                  type="button"
                  onClick={() => loadExercise({ type, topic })}
                  disabled={loading}
                >
                  Następne
                </button>
              </div>
            </>
          )}

          {result && <Feedback result={result} onNext={() => loadExercise({ type, topic })} />}
        </>
      )}
    </div>
  );
}
