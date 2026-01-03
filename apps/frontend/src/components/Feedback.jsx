export default function Feedback({ result, onNext }) {
  const evalInfo = result?.evaluation;

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold">
          {result.correct ? "✅ Poprawnie" : "❌ Błąd"}
        </h3>

        {result.correct && evalInfo?.mode === "lenient" ? (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            Zaliczone w trybie lenient
          </span>
        ) : null}
      </div>

      {!result.correct && result.correctAnswer ? (
  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
    <div className="font-semibold">Poprawna odpowiedź:</div>
    <div className="mt-1">{result.correctAnswer}</div>
  </div>
) : null}


      {result.correct && evalInfo?.mode === "lenient" && Array.isArray(evalInfo?.notes) && evalInfo.notes.length > 0 ? (
        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <div className="font-semibold">Co zostało “odpuszczone”:</div>
          <ul className="mt-2 list-disc pl-5">
            {evalInfo.notes.map((n, idx) => (
              <li key={idx}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 text-sm">
        <span className="font-semibold">Punkty:</span> {result.score}
      </div>

      <button
        onClick={onNext}
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
      >
        Następne ćwiczenie
      </button>
    </div>
  );
}
