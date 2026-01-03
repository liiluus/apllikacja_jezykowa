import { prisma } from "../db/prisma.js";
import { openai } from "../ai/openaiClient.js";

const ALLOWED_LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
const ALLOWED_TYPES = new Set(["translate", "translate_en_pl", "fill_blank", "multiple_choice"]);

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

function safeStr(x, max = 2000) {
  return String(x ?? "").toString().trim().slice(0, max);
}

function safeParseJson(text) {
  const raw = (text || "").trim();

  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {}

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
  const first = s[0];
  if (["A", "B", "C", "D"].includes(first)) return first;
  return "";
}

function hasExactlyOneBlank(sentence) {
  const m = String(sentence || "").match(/____/g);
  return m && m.length === 1;
}

const BAD_MISSING = new Set([
  "travel",
  "place",
  "thing",
  "something",
  "somewhere",
  "location",
  "spot",
  "destination",
]);

function isGoodMissing(x) {
  const t = String(x || "").trim().toLowerCase();
  if (!t) return false;
  if (t.length < 2) return false;
  if (BAD_MISSING.has(t)) return false;
  if (/[()]/.test(t)) return false;
  return true;
}

function isGoodHint(x) {
  const t = String(x || "").trim();
  if (!t) return false;
  if (t.length > 40) return false;
  if (/[()]/.test(t)) return false;
  return true;
}

function normalizeSolutions(base, maybeArr) {
  const baseSolution = safeStr(base, 2000);
  const extraSolutions = Array.isArray(maybeArr)
    ? maybeArr
        .filter((x) => typeof x === "string" && x.trim())
        .map((x) => safeStr(x, 2000))
    : [];

  if (!extraSolutions.length) return undefined;

  const uniq = Array.from(new Set([baseSolution, ...extraSolutions]));
  return uniq.length ? uniq : undefined;
}

function makeStubExercise({ level = "A1", type = "translate", language = "en" } = {}) {
  // translate PL->EN
  if (type === "translate") {
    const sourceText = "Mam samochód.";
    const solution = "I have a car.";
    return {
      type,
      prompt: `Przetłumacz na ${language.toUpperCase()}: „${sourceText}”`,
      solution,
      metadata: {
        level,
        topic: "daily",
        source: "stub",
        sourceText,
        direction: "pl_en",
        solutions: [solution],
      },
    };
  }

  // translate EN->PL
  if (type === "translate_en_pl") {
    const sourceText = "I have a car.";
    const solution = "Mam samochód.";
    return {
      type,
      prompt: `Przetłumacz na PL: „${sourceText}”`,
      solution,
      metadata: {
        level,
        topic: "daily",
        source: "stub",
        sourceText,
        direction: "en_pl",
        solutions: [solution],
      },
    };
  }

  if (type === "multiple_choice") {
    return {
      type,
      prompt: 'Wybierz poprawne tłumaczenie: „Jestem głodny.”',
      solution: "B",
      metadata: {
        level,
        topic: "daily",
        source: "stub",
        options: [
          "A) I am happy.",
          "B) I am hungry.",
          "C) I am tired.",
          "D) I am angry.",
        ],
      },
    };
  }

  // fill_blank
  const sentence = "I ____ a car.";
  const missing = "have";
  const hint = "mieć";
  return {
    type,
    prompt: `Uzupełnij lukę: ${sentence}\nPodpowiedź (PL): ${hint}`,
    solution: missing,
    metadata: {
      level,
      topic: "grammar",
      source: "stub",
      sentence,
      missing,
      hint,
      solutions: [missing],
    },
  };
}


/**
 * POST /api/exercises/ai-generate
 * Body: { type, topic, level }
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
    } else if (type === "translate") {
      prompt = `
Wygeneruj jedno krótkie ćwiczenie typu translate (PL → ${language.toUpperCase()}).
Poziom: ${userLevel}
Temat: ${topic}

Zwróć WYŁĄCZNIE JSON:
{
  "type": "translate",
  "sourceText": "jedno zdanie po polsku",
  "solution": "poprawne tłumaczenie w ${language.toUpperCase()} (1 zdanie)",
  "solutions": ["alternatywne poprawne tłumaczenia (opcjonalnie)"]
}

Zasady:
- sourceText MUSI być po polsku i NIE może być puste
- solution NIE może być puste
- solutions opcjonalne; jeśli podasz, to solution MUSI być jedną z opcji
- Bez markdown i bez dodatkowego tekstu.
`.trim();
    } else if (type === "translate_en_pl") {
      prompt = `
Wygeneruj jedno krótkie ćwiczenie typu translate (${language.toUpperCase()} → PL).
Poziom: ${userLevel}
Temat: ${topic}

Zwróć WYŁĄCZNIE JSON:
{
  "type": "translate_en_pl",
  "sourceText": "jedno zdanie w ${language.toUpperCase()}",
  "solution": "poprawne tłumaczenie po polsku (1 zdanie)",
  "solutions": ["alternatywne poprawne tłumaczenia po polsku (opcjonalnie)"]
}

Zasady:
- sourceText MUSI być w ${language.toUpperCase()} i NIE może być puste
- solution MUSI być po polsku i NIE może być puste
- solutions opcjonalne; jeśli podasz, to solution MUSI być jedną z opcji
- Bez markdown i bez dodatkowego tekstu.
`.trim();
    } else {
      prompt = `
Wygeneruj jedno krótkie ćwiczenie typu fill_blank.
Język docelowy: ${language}
Poziom: ${userLevel}
Temat: ${topic}

Zwróć WYŁĄCZNIE JSON:
{
  "type": "fill_blank",
  "sentence": "Zdanie w języku docelowym z DOKŁADNIE jedną luką: ____",
  "missing": "konkretne słowo/fraza do luki",
  "hint": "podpowiedź po polsku (1-2 słowa)",
  "solutions": ["alternatywy (opcjonalnie)"]
}

Zasady:
- sentence MUSI zawierać dokładnie jedno ____
- missing NIE może być ogólne typu 'travel'/'place' i nie może zawierać nawiasów
- hint ma być po polsku, krótki, bez nawiasów
- Bez markdown i bez dodatkowego tekstu.
`.trim();
    }

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
      max_output_tokens: 320,
    });

    const text = (response.output_text || "").trim();
    const parsed = safeParseJson(text);

    if (!parsed.ok) {
      const stub = makeStubExercise({ level: userLevel, type, language });
      const exercise = await prisma.exercise.create({
        data: {
          userId,
          type: stub.type,
          prompt: stub.prompt,
          solution: stub.solution,
          metadata: { topic, level: userLevel, ...stub.metadata, source: "ai_invalid_json_fallback" },
        },
        select: { id: true, type: true, prompt: true, solution: true, metadata: true, createdAt: true },
      });
      return res.status(201).json(exercise);
    }

    const data = parsed.value;

    // --- multiple_choice ---
    if (type === "multiple_choice") {
      const options = data?.options;
      const sol = normalizeChoiceLetter(data?.solution);
      const p = safeStr(data?.prompt, 2000);

      if (!p || !isValidOptions(options) || !sol) {
        const stub = makeStubExercise({ level: userLevel, type: "multiple_choice", language });
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
          prompt: p,
          solution: sol,
          metadata: {
            topic,
            level: userLevel,
            source: "ai",
            options: options.map((x) => safeStr(x, 300)),
          },
        },
        select: { id: true, type: true, prompt: true, solution: true, metadata: true, createdAt: true },
      });

      return res.status(201).json(exercise);
    }

    // --- translate PL->EN ---
    if (type === "translate") {
      const sourceText = safeStr(data?.sourceText, 400);
      const baseSolution = safeStr(data?.solution, 2000);

      if (!sourceText || !baseSolution) {
        const stub = makeStubExercise({ level: userLevel, type: "translate", language });
        const exercise = await prisma.exercise.create({
          data: {
            userId,
            type: "translate",
            prompt: stub.prompt,
            solution: stub.solution,
            metadata: { topic, level: userLevel, ...stub.metadata, source: "ai_missing_fields_fallback" },
          },
          select: { id: true, type: true, prompt: true, solution: true, metadata: true, createdAt: true },
        });
        return res.status(201).json(exercise);
      }

      const solutions = normalizeSolutions(baseSolution, data?.solutions);
      const uiPrompt = `Przetłumacz na ${language.toUpperCase()}: „${sourceText}”`;

      const exercise = await prisma.exercise.create({
        data: {
          userId,
          type: "translate",
          prompt: uiPrompt.slice(0, 2000),
          solution: baseSolution,
          metadata: {
            topic,
            level: userLevel,
            source: "ai",
            sourceText,
            direction: "pl_en",
            ...(solutions ? { solutions } : {}),
          },
        },
        select: { id: true, type: true, prompt: true, solution: true, metadata: true, createdAt: true },
      });

      return res.status(201).json(exercise);
    }

    // --- translate EN->PL ---
    if (type === "translate_en_pl") {
      const sourceText = safeStr(data?.sourceText, 400);
      const baseSolution = safeStr(data?.solution, 2000);

      if (!sourceText || !baseSolution) {
        const stub = makeStubExercise({ level: userLevel, type: "translate_en_pl", language });
        const exercise = await prisma.exercise.create({
          data: {
            userId,
            type: "translate_en_pl",
            prompt: stub.prompt,
            solution: stub.solution,
            metadata: { topic, level: userLevel, ...stub.metadata, source: "ai_missing_fields_fallback" },
          },
          select: { id: true, type: true, prompt: true, solution: true, metadata: true, createdAt: true },
        });
        return res.status(201).json(exercise);
      }

      const solutions = normalizeSolutions(baseSolution, data?.solutions);
      const uiPrompt = `Przetłumacz na PL: „${sourceText}”`;

      const exercise = await prisma.exercise.create({
        data: {
          userId,
          type: "translate_en_pl",
          prompt: uiPrompt.slice(0, 2000),
          solution: baseSolution,
          metadata: {
            topic,
            level: userLevel,
            source: "ai",
            sourceText,
            direction: "en_pl",
            ...(solutions ? { solutions } : {}),
          },
        },
        select: { id: true, type: true, prompt: true, solution: true, metadata: true, createdAt: true },
      });

      return res.status(201).json(exercise);
    }

    // --- fill_blank ---
    const sentence = safeStr(data?.sentence, 600);
    const missing = safeStr(data?.missing, 120);
    const hint = safeStr(data?.hint, 60);

    if (
      !sentence ||
      !missing ||
      !hint ||
      !hasExactlyOneBlank(sentence) ||
      !isGoodMissing(missing) ||
      !isGoodHint(hint)
    ) {
      const stub = makeStubExercise({ level: userLevel, type: "fill_blank", language });
      const exercise = await prisma.exercise.create({
        data: {
          userId,
          type: "fill_blank",
          prompt: stub.prompt,
          solution: stub.solution,
          metadata: { topic, level: userLevel, ...stub.metadata, source: "ai_bad_fill_blank_fallback" },
        },
        select: { id: true, type: true, prompt: true, solution: true, metadata: true, createdAt: true },
      });
      return res.status(201).json(exercise);
    }

    const solutions = normalizeSolutions(missing, data?.solutions);
    const uiPrompt = `Uzupełnij lukę: ${sentence}\nPodpowiedź (PL): ${hint}`;

    const exercise = await prisma.exercise.create({
      data: {
        userId,
        type: "fill_blank",
        prompt: uiPrompt.slice(0, 2000),
        solution: missing,
        metadata: {
          topic,
          level: userLevel,
          source: "ai",
          sentence,
          missing,
          hint,
          ...(solutions ? { solutions } : {}),
        },
      },
      select: { id: true, type: true, prompt: true, solution: true, metadata: true, createdAt: true },
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
      select: { id: true, type: true, prompt: true, solution: true, metadata: true, createdAt: true },
    });

    if (!exercise) return res.status(404).json({ error: "Exercise not found" });
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
  const language = profile?.language ?? "en";

  const stub = makeStubExercise({ level, type: normalizeType(type), language });

  const exercise = await prisma.exercise.create({
    data: {
      userId,
      type: stub.type,
      prompt: stub.prompt,
      solution: stub.solution,
      metadata: stub.metadata,
    },
    select: { id: true, type: true, prompt: true, solution: true, metadata: true, createdAt: true },
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
    select: { id: true, type: true, prompt: true, metadata: true, createdAt: true },
  });

  return res.status(201).json(exercise);
}
