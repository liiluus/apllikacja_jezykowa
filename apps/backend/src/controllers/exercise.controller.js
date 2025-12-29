import { prisma } from "../db/prisma.js";

function makeStubExercise({ level = "A1", type = "translate" } = {}) {
  if (type === "translate") {
    return {
      type,
      prompt: "Przetłumacz na angielski: „Mam samochód.”",
      solution: "I have a car.",
      metadata: { level, topic: "daily" },
    };
  }

  return {
    type,
    prompt: "Uzupełnij zdanie: I ___ a car.",
    solution: "have",
    metadata: { level, topic: "grammar" },
  };
}

export async function generateExercise(req, res) {
  const userId = req.user.userId;
  const { type = "translate" } = req.body || {};

  const profile = await prisma.profile.findUnique({ where: { userId } });
  const level = profile?.level ?? "A1";

  const stub = makeStubExercise({ level, type });

  const exercise = await prisma.exercise.create({
    data: {
      userId,
      type: stub.type,
      prompt: stub.prompt,
      solution: stub.solution,
      metadata: stub.metadata,
    },
    select: {
      id: true,
      type: true,
      prompt: true,
      solution: true,   // na stub OK; później możemy to ukryć
      metadata: true,
      createdAt: true,
    },
  });

  return res.status(201).json({ exercise });
}