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
  return {
    correct: a.isCorrect,
    score: a.score ?? 0,
    feedback: a.feedback || "",
    // jeśli chcesz dalej używać correctAnswer w UI:
    correctAnswer: a.feedback?.includes("Poprawna odpowiedź:")
      ? a.feedback.split('Poprawna odpowiedź: "')[1]?.split('"')[0] || ""
      : "",
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
