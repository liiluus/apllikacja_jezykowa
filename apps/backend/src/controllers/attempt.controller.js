import { prisma } from "../db/prisma.js";

function normalize(s) {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeChoiceLetter(x) {
  const s = (x ?? "").toString().trim().toUpperCase();
  if (["A", "B", "C", "D"].includes(s)) return s;
  const first = s[0];
  if (["A", "B", "C", "D"].includes(first)) return first;
  return "";
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

  if (exercise.userId !== userId) {
    return res.status(403).json({ error: "forbidden" });
  }

  let correct = false;

  // ✅ NOWE: multiple_choice
  if (exercise.type === "multiple_choice") {
    const userPick = normalizeChoiceLetter(answer);
    const sol = normalizeChoiceLetter(exercise.solution);
    correct = userPick && sol && userPick === sol;
  } else {
    correct = normalize(answer) === normalize(exercise.solution);
  }

  const score = correct ? 100 : 0;

  let feedback = "";
  if (exercise.type === "multiple_choice") {
    const sol = normalizeChoiceLetter(exercise.solution) || exercise.solution;
    feedback = correct ? "Poprawnie ✅" : `Nie do końca. Poprawna odpowiedź: "${sol}"`;
  } else {
    feedback = correct
      ? "Poprawnie ✅"
      : `Nie do końca. Poprawna odpowiedź: "${exercise.solution}"`;
  }

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
