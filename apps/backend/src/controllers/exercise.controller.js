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
      solution: true,
      metadata: true,
      createdAt: true,
    },
  });

  return res.status(201).json({ exercise });
}

export async function nextExercise(req, res) {
  const userId = req.user.userId;

  const profile = await prisma.profile.findUnique({ where: { userId } });
  const level = profile?.level ?? "A1";
  const language = profile?.language ?? "en";

  const templates = await prisma.exerciseTemplate.findMany({
    where: { level, language },
    take: 50,
  });

  if (templates.length === 0) {
    return res.status(404).json({ error: "No exercise templates for this profile" });
  }

  const template = templates[Math.floor(Math.random() * templates.length)];

  const exercise = await prisma.exercise.create({
    data: {
      userId,
      type: template.type,
      prompt: template.prompt,
      solution: template.solution,
      metadata: template.metadata,
    },
    select: {
      id: true,
      type: true,
      prompt: true,
      metadata: true,
      createdAt: true,
    },
  });

  // zwracamy "na płasko" (id/prompt na wierzchu)
  return res.status(201).json(exercise);
}
