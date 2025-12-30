import { prisma } from "../db/prisma.js";
import { openai } from "../ai/openaiClient.js";

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

export async function aiGenerateExercise(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { type = "translate", topic = "daily", level } = req.body || {};

    // poziom bierzemy z profilu jeśli nie podano w body
    const profile = await prisma.profile.findUnique({ where: { userId } });
    const userLevel = level || profile?.level || "A1";
    const language = profile?.language || "en";

    const prompt = `
Wygeneruj jedno krótkie ćwiczenie językowe.
Język docelowy: ${language}
Poziom: ${userLevel}
Typ: ${type} (np. translate / fill_blank)
Temat: ${topic}

Zwróć JSON w formacie:
{
  "prompt": "...",
  "solution": "...",
  "type": "${type}"
}

Bez dodatkowego tekstu, tylko JSON.
`.trim();

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
      max_output_tokens: 200,
    });

    const text = response.output_text || "";

    // próbujemy sparsować JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: text,
      });
    }

    if (!data?.prompt || !data?.solution) {
      return res.status(500).json({
        error: "AI JSON missing fields",
        raw: data,
      });
    }

    const exercise = await prisma.exercise.create({
      data: {
        userId,
        type: data.type || type,
        prompt: data.prompt,
        solution: data.solution,
        metadata: { topic, level: userLevel, source: "ai" },
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

    return res.status(201).json(exercise);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI exercise generation failed" });
  }
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
