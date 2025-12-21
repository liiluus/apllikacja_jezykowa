export default function Feedback({ result, onNext }) {
  return (
    <div style={{ marginTop: 24, padding: 16, border: "1px solid #ddd" }}>
      <h3>{result.correct ? "✅ Poprawnie" : "❌ Błąd"}</h3>

      {!result.correct && (
        <p>
          <strong>Poprawna odpowiedź:</strong><br />
          {result.correctAnswer}
        </p>
      )}

      <p><strong>Punkty:</strong> {result.score}</p>

      <button onClick={onNext} style={{ marginTop: 12 }}>
        Następne ćwiczenie
      </button>
    </div>
  );
}
