import { prisma } from "../db/prisma.js";

function normalize(s) {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function createAttempt(req, res) {
  const userId = req.user.userId;
  const { exerciseId, answer } = req.body || {};

  if (!exerciseId || typeof exerciseId !== "string") {
    return res.status(400).json({ error: "exerciseId is required" });
  }
  if (typeof answer !== "string") {
    return res.status(400).json({ error: "answer must be a string" });
  }

  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) return res.status(404).json({ error: "exercise not found" });

  // zabezpieczenie: user nie powinien robić attempt do cudzych ćwiczeń
  if (exercise.userId !== userId) {
    return res.status(403).json({ error: "forbidden" });
  }

  const correct = normalize(answer) === normalize(exercise.solution);
  const score = correct ? 100 : 0;
  const feedback = correct
    ? "Poprawnie ✅"
    : `Nie do końca. Poprawna odpowiedź: "${exercise.solution}"`;

  const attempt = await prisma.attempt.create({
    data: {
      userId,
      exerciseId,
      answer,
      isCorrect: correct,
      score,
      feedback,
    },
    select: {
      id: true,
      exerciseId: true,
      answer: true,
      isCorrect: true,
      score: true,
      feedback: true,
      createdAt: true,
    },
  });

  return res.status(201).json({ attempt });
}
