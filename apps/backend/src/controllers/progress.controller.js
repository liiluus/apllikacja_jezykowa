import { prisma } from "../db/prisma.js";

export async function getProgress(req, res) {
  const userId = req.user.userId;

  const total = await prisma.attempt.count({ where: { userId } });
  const correct = await prisma.attempt.count({
    where: { userId, isCorrect: true },
  });

  const accuracy = total === 0 ? 0 : correct / total;

  const recentAttempts = await prisma.attempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      exerciseId: true,
      answer: true,
      isCorrect: true,
      score: true,
      feedback: true,
      createdAt: true,
      exercise: {
        select: { type: true, prompt: true },
      },
    },
  });

  const lastAttempt = recentAttempts[0] ?? null;

  res.json({
    stats: { total, correct, accuracy },
    recentAttempts,
    lastAttempt, 
  });
}

export async function getWeeklyProgress(req, res) {
  const userId = req.user.userId;

  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - 6);
  start.setUTCHours(0, 0, 0, 0);

  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
      createdAt: { gte: start },
    },
    select: {
      createdAt: true,
      isCorrect: true,
    },
  });

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, total: 0, correct: 0 });
  }

  const byDate = new Map(days.map((d) => [d.date, d]));

  for (const a of attempts) {
    const key = new Date(a.createdAt).toISOString().slice(0, 10);
    const row = byDate.get(key);
    if (!row) continue;
    row.total += 1;
    if (a.isCorrect) row.correct += 1;
  }

  res.json({ days });
}