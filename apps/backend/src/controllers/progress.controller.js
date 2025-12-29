import { prisma } from "../db/prisma.js";

export async function getProgress(req, res) {
  const userId = req.user.userId;

  const total = await prisma.attempt.count({ where: { userId } });
  const correct = await prisma.attempt.count({ where: { userId, isCorrect: true } });

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
        select: { type: true, prompt: true }
      }
    },
  });

  res.json({
    stats: { total, correct, accuracy },
    recentAttempts,
  });
}
