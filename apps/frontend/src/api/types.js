// Ćwiczenie zwracane z backendu: { exercise: {...} }
export function mapExercise(dto) {
  const e = dto.exercise ?? dto;
  return {
    id: e.id,
    prompt: e.prompt,
    type: e.type || "text",
    // opcjonalnie jeśli chcesz pokazywać solution (na razie backend je zwraca)
    solution: e.solution,
    metadata: e.metadata,
  };
}

// Wynik próby: { attempt: {...} }
export function mapAttemptResult(dto) {
  const a = dto.attempt ?? dto;
  const evaluation = dto.evaluation ?? null;

  // 1) preferuj poprawną odpowiedź z backendu (jeśli dodamy pole)
  const correctAnswerFromApi =
    dto.correctAnswer ??
    evaluation?.correctAnswer ??
    null;

  // 2) fallback: wyciągnij z feedback regexem (bardziej odporne niż split)
  const fallbackFromFeedback = (() => {
    const text = String(a.feedback || "");
    const m = text.match(/Poprawna odpowiedź:\s*"([^"]+)"/i);
    return m?.[1] || "";
  })();

  return {
    correct: Boolean(a.isCorrect),
    score: a.score ?? 0,
    feedback: a.feedback || "",
    evaluation,
    correctAnswer: (correctAnswerFromApi || fallbackFromFeedback || "").toString(),
    // opcjonalnie na przyszłość:
    acceptedAnswers: dto.acceptedAnswers ?? evaluation?.acceptedAnswers ?? null,
  };
}



// Postęp: { stats: {...}, recentAttempts: [...] }
export function mapProgress(dto) {
  const stats = dto.stats ?? {};
  const recentAttempts = dto.recentAttempts ?? [];

  return {
    total: stats.total ?? 0,
    correct: stats.correct ?? 0,
    accuracy: Math.round((stats.accuracy ?? 0) * 100),
    recent: recentAttempts.map((a) => ({
      id: a.id,
      answer: a.answer,
      correct: a.isCorrect,
      score: a.score,
      feedback: a.feedback,
      createdAt: a.createdAt,
      prompt: a.exercise?.prompt ?? "",
      type: a.exercise?.type ?? "",
    })),
  };
}
