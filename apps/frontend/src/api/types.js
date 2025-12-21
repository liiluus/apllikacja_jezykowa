// Ćwiczenie zwracane z backendu
export function mapExercise(dto) {
  return {
    id: dto.id,
    prompt: dto.prompt,
    type: dto.type || "text",
  };
}

// Wynik próby
export function mapAttemptResult(dto) {
  return {
    correct: dto.correct,
    correctAnswer: dto.correctAnswer || "",
    score: dto.score ?? 0,
  };
}

// Postęp
export function mapProgress(dto) {
  return {
    total: dto.total ?? 0,
    correct: dto.correct ?? 0,
    accuracy: dto.accuracy ?? 0,
    recent: dto.recent ?? [],
  };
}
