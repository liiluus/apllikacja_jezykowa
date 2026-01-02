import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

export default function Feedback({ result, onNext }) {
  const isCorrect = result.correct;

  return (
    <div
      className={[
        "rounded-2xl border p-5 shadow-sm",
        isCorrect
          ? "border-emerald-200 bg-emerald-50"
          : "border-rose-200 bg-rose-50",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        {isCorrect ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        ) : (
          <XCircle className="h-6 w-6 text-rose-600" />
        )}

        <h3
          className={[
            "text-lg font-semibold",
            isCorrect ? "text-emerald-800" : "text-rose-800",
          ].join(" ")}
        >
          {isCorrect ? "Poprawnie" : "Błąd"}
        </h3>
      </div>

      {/* Correct answer (only if wrong) */}
      {!isCorrect && (
        <div className="mt-3 text-sm text-rose-900">
          <div className="font-medium">Poprawna odpowiedź:</div>
          <div className="mt-1 rounded-lg border border-rose-200 bg-white px-3 py-2">
            {result.correctAnswer}
          </div>
        </div>
      )}

      {/* Score */}
      <div className="mt-4 text-sm text-slate-700">
        <span className="font-medium">Punkty:</span>{" "}
        <span className="font-semibold">{result.score}</span>
      </div>

      {/* Action */}
      <div className="mt-4">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Następne ćwiczenie
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
