import { prisma } from "../db/prisma.js";
import { openai } from "../ai/openaiClient.js";

const ALLOWED_LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
const ALLOWED_TYPES = new Set(["translate", "fill_blank", "multiple_choice"]);

function normalizeLevel(x) {
  if (!x) return null;
  const up = String(x).trim().toUpperCase();
  return ALLOWED_LEVELS.has(up) ? up : null;
}

function normalizeType(x) {
  if (!x) return "translate";
  const t = String(x).trim().toLowerCase();
  return ALLOWED_TYPES.has(t) ? t : "translate";
}

function clampTopic(x) {
  const t = (x ?? "daily").toString().trim();
  return t.length ? t.slice(0, 40) : "daily";
}

function makeStubExercise({ level = "A1", type = "translate" } = {}) {
  if (type === "translate") {
    return {
      type,
      prompt: "Przetłumacz na angielski: „Mam samochód.”",
      solution: "I have a car.",
      metadata: { level, topic: "daily" },
    };
  }

  if (type === "multiple_choice") {
    return {
      type,
      prompt: "Wybierz poprawne tłumaczenie: „Jestem głodny.”",
      solution: "B",
      metadata: {
        level,
        topic: "daily",
        options: [
          "A) I am happy.",
          "B) I am hungry.",
          "C) I am tired.",
          "D) I am angry.",
        ],
      },
    };
  }

  return {
    type,
    prompt: "Uzupełnij zdanie: I ___ a car.",
    solution: "have",
    metadata: { level, topic: "grammar" },
  };
}

function safeParseJson(text) {
  const raw = (text || "").trim();

  // 1) spróbuj normalnie
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {}

  // 2) spróbuj wyciąć pierwszy blok {...} jeśli model dodał coś extra
  const m = raw.match(/\{[\s\S]*\}/);
  if (m?.[0]) {
    try {
      return { ok: true, value: JSON.parse(m[0]) };
    } catch {}
  }

  return { ok: false, raw };
}

function isValidOptions(arr) {
  if (!Array.isArray(arr) || arr.length !== 4) return false;
  return arr.every((x) => typeof x === "string" && x.trim().length > 0);
}

function normalizeChoiceLetter(x) {
  const s = (x ?? "").toString().trim().toUpperCase();
  if (["A", "B", "C", "D"].includes(s)) return s;
  // czasem ktoś wpisze "A)" albo "B."
  const first = s[0];
  if (["A", "B", "C", "D"].includes(first)) return first;
  return "";
}

/**
 * POST /api/exercises/ai-generate
 * Body: { type, topic, level }
 * Zwraca exercise "na płasko"
 */
export async function aiGenerateExercise(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const body = req.body || {};
    const type = normalizeType(body.type);
    const topic = clampTopic(body.topic);
    const requestedLevel = normalizeLevel(body.level);

    const profile = await prisma.profile.findUnique({ where: { userId } });
    const userLevel = requestedLevel || normalizeLevel(profile?.level) || "A1";
    const language = profile?.language || "en";

    // ---------- PROMPTY ZALEŻNE OD TYPU ----------
    let prompt = "";

    if (type === "multiple_choice") {
      prompt = `
Wygeneruj jedno krótkie ćwiczenie typu multiple_choice (ABCD).
Język docelowy: ${language}
Poziom: ${userLevel}
Temat: ${topic}

Zwróć WYŁĄCZNIE JSON w formacie:
{
  "type": "multiple_choice",
  "prompt": "treść pytania (jedno zdanie)",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "solution": "A"|"B"|"C"|"D"
}

Zasady:
- options MUSI mieć 4 elementy
- solution MUSI być jedną literą A/B/C/D
- Bez markdown i bez dodatkowego tekstu.
`.trim();
    } else {
      // translate / fill_blank
      prompt = `
Wygeneruj jedno krótkie ćwiczenie językowe.
Język docelowy: ${language}
Poziom: ${userLevel}
Typ: ${type} (translate / fill_blank)
Temat: ${topic}

Zwróć WYŁĄCZNIE JSON w formacie:
{
  "prompt": "...",
  "solution": "...",
  "type": "${type}"
}

Bez dodatkowego tekstu i bez markdown.
`.trim();
    }

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
      max_output_tokens: 260,
    });

    const text = (response.output_text || "").trim();
    const parsed = safeParseJson(text);

    if (!parsed.ok) {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: parsed.raw,
      });
    }

    const data = parsed.value;

    // ---------- WALIDACJA ----------
    if (type === "multiple_choice") {
      const options = data?.options;
      const sol = normalizeChoiceLetter(data?.solution);

      if (!data?.prompt || !isValidOptions(options) || !sol) {
        // fallback: stub, żeby user nie widział błędu co chwilę
        const stub = makeStubExercise({ level: userLevel, type: "multiple_choice" });

        const exercise = await prisma.exercise.create({
          data: {
            userId,
            type: "multiple_choice",
            prompt: stub.prompt,
            solution: stub.solution,
            metadata: { topic, level: userLevel, source: "ai_fallback", options: stub.metadata.options },
          },
          select: { id: true, type: true, prompt: true, solution: true, metadata: true, createdAt: true },
        });

        return res.status(201).json(exercise);
      }

      const exercise = await prisma.exercise.create({
        data: {
          userId,
          type: "multiple_choice",
          prompt: String(data.prompt).slice(0, 2000),
          solution: sol, // "A"/"B"/"C"/"D"
          metadata: {
            topic,
            level: userLevel,
            source: "ai",
            options: options.map((x) => String(x).slice(0, 300)),
          },
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
    }

    // translate / fill_blank
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
        prompt: String(data.prompt).slice(0, 2000),
        solution: String(data.solution).slice(0, 2000),
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
    return res.status(500).json({
      error: "AI exercise generation failed",
      details: err?.message || String(err),
    });
  }
}

export async function getExerciseById(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const exercise = await prisma.exercise.findFirst({
      where: { id, userId },
      select: {
        id: true,
        type: true,
        prompt: true,
        solution: true,
        metadata: true,
        createdAt: true,
      },
    });

    if (!exercise) {
      return res.status(404).json({ error: "Exercise not found" });
    }

    return res.json({ exercise });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to fetch exercise",
      details: err?.message || String(err),
    });
  }
}

export async function generateExercise(req, res) {
  const userId = req.user.userId;
  const { type = "translate" } = req.body || {};

  const profile = await prisma.profile.findUnique({ where: { userId } });
  const level = profile?.level ?? "A1";

  const stub = makeStubExercise({ level, type: normalizeType(type) });

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
    return res.status(404).json({
      error: "No exercise templates for this profile",
    });
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

  return res.status(201).json(exercise);
}
