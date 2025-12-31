import { useEffect, useState } from "react";
import { api } from "../api/clients";
import { fetchProfile, updateProfile } from "../api/profile";
import Feedback from "../components/Feedback";
import { mapExercise, mapAttemptResult } from "../api/types";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LS_EXERCISE_PREFS = "exercisePrefs";

export default function ExercisePage() {
  const [exercise, setExercise] = useState(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // UI controls (local fallback)
  const [type, setType] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_EXERCISE_PREFS) || "{}").type || "translate";
    } catch {
      return "translate";
    }
  });

  const [topic, setTopic] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_EXERCISE_PREFS) || "{}").topic || "daily";
    } catch {
      return "daily";
    }
  });

  const [level, setLevel] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_EXERCISE_PREFS) || "{}").level || "A1";
    } catch {
      return "A1";
    }
  });

  // 1) Przy wejściu: pobierz level z profilu i ustaw w UI
  useEffect(() => {
    (async () => {
      try {
        const p = await fetchProfile();
        const profLevel = String(p?.level || "").toUpperCase();
        if (LEVELS.includes(profLevel)) setLevel(profLevel);
      } catch {
        // jak nie ma endpointu /api/profile lub tokena, to zostaje localStorage
      }
    })();
  }, []);

  // 2) Zapis UI prefs lokalnie
  useEffect(() => {
    localStorage.setItem(LS_EXERCISE_PREFS, JSON.stringify({ type, topic, level }));
  }, [type, topic, level]);

  // 3) Jeśli user zmienia level w UI: zapisujemy to do profilu w DB
  async function onChangeLevel(nextLevel) {
    setLevel(nextLevel);
    try {
      await updateProfile({ level: nextLevel });
    } catch (e) {
      // nie blokujemy UI, ale pokażemy info
      setError(e.message || "Nie udało się zapisać poziomu w profilu.");
    }
  }

  async function loadExercise(opts = {}) {
    setLoading(true);
    setError("");
    setResult(null);
    setAnswer("");

    try {
      // A) Jeśli przyszliśmy z czatu
      const lastId = localStorage.getItem("lastExerciseId");
      if (lastId) {
        try {
          const dto = await api.get(`/api/exercises/${lastId}`);
          localStorage.removeItem("lastExerciseId");

          const ex = dto?.exercise ?? dto;
          if (!ex?.id || !ex?.prompt) throw new Error("Brak id/prompt");

          // ustaw UI na podstawie ćwiczenia
          if (ex.type) setType(ex.type);
          if (ex?.metadata?.topic) setTopic(ex.metadata.topic);
          if (ex?.metadata?.level) {
            const exLevel = String(ex.metadata.level).toUpperCase();
            if (LEVELS.includes(exLevel)) setLevel(exLevel);
          }

          setExercise(mapExercise(ex));
          return;
        } catch {
          localStorage.removeItem("lastExerciseId");
        }
      }

      // B) Normalnie generujemy nowe
      const dto = await api.post("/api/exercises/ai-generate", {
        type: opts.type ?? type,
        topic: (opts.topic ?? topic).trim() || "daily",
        level: (opts.level ?? level) || "A1",
      });

      const ex = dto?.exercise ?? dto;
      if (!ex?.id || !ex?.prompt) throw new Error("Nieprawidłowa odpowiedź API (brak id/prompt).");

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

  // auto-load
  useEffect(() => {
    loadExercise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "40px auto" }}>
      <h2>Ćwiczenia</h2>

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
          <select value={type} onChange={(e) => setType(e.target.value)} disabled={loading}>
            <option value="translate">Tłumaczenie (PL→EN)</option>
            <option value="fill_blank">Uzupełnij lukę</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6, minWidth: 120 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Poziom</span>
          <select value={level} onChange={(e) => onChangeLevel(e.target.value)} disabled={loading}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
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
          onClick={() => loadExercise({ type, topic, level })}
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
            localStorage.removeItem("lastExerciseId");
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
              Typ: <strong>{exercise.type}</strong> • Poziom: <strong>{level}</strong>
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
                <button type="button" onClick={() => loadExercise({ type, topic, level })} disabled={loading}>
                  Następne
                </button>
              </div>
            </>
          )}

          {result && <Feedback result={result} onNext={() => loadExercise({ type, topic, level })} />}
        </>
      )}
    </div>
  );
}
