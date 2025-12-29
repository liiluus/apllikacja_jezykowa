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

  async function loadExercise() {
    setLoading(true);
    setError("");
    setResult(null);
    setAnswer("");
    try {
      // const dto = await api.post("/api/exercises/generate");
      const dto = await api.post("/api/exercises/next");
      setExercise(mapExercise(dto));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) return;

    setLoading(true);
    setError("");
    try {
      const dto = await api.post("/api/attempts", {
        exerciseId: exercise.id,
        answer,
      });
      setResult(mapAttemptResult(dto));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExercise();
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: "40px auto" }}>
      <h2>Ćwiczenie</h2>

      {loading && <p>Ładowanie...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {exercise && (
        <>
          <p><strong>Polecenie:</strong></p>
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

              <button
                onClick={submitAnswer}
                disabled={loading}
                style={{ marginTop: 12 }}
              >
                Sprawdź
              </button>
            </>
          )}

          {result && (
            <Feedback result={result} onNext={loadExercise} />
          )}
        </>
      )}
    </div>
  );
}
