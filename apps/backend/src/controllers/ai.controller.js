import { openai } from "../ai/openaiClient.js";
import { prisma } from "../db/prisma.js";

const ALLOWED_LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

function normalizeLevel(x) {
  if (!x) return null;
  const up = String(x).trim().toUpperCase();
  return ALLOWED_LEVELS.has(up) ? up : null;
}

function extractLevelFromText(text) {
  if (!text) return null;
  const m = String(text).match(/\b(?:poziom|level)?\s*(A1|A2|B1|B2|C1|C2)\b/i);
  return m ? normalizeLevel(m[1]) : null;
}

function wantsExerciseIntent(lower) {
  return (
    lower.includes("ćwiczenie") ||
    lower.includes("cwiczenie") ||
    lower.includes("exercise") ||
    lower.includes("fill_blank") ||
    lower.includes("translate") ||
    lower.includes("uzupełnij") ||
    lower.includes("uzupelnij") ||
    lower.includes("quiz") ||
    lower.includes("multiple_choice") ||
    lower.includes("multiple choice") ||
    lower.includes("abcd") ||
    lower.includes("test")
  );
}

function inferTopic(lower) {
  let topic = "daily";
  if (lower.includes("travel") || lower.includes("podró") || lower.includes("podroz")) topic = "travel";
  if (lower.includes("grammar") || lower.includes("gramat")) topic = "grammar";
  if (lower.includes("biznes") || lower.includes("business")) topic = "business";
  if (lower.includes("food") || lower.includes("jedzenie")) topic = "food";
  if (lower.includes("work") || lower.includes("praca")) topic = "work";
  return topic;
}

function inferType(lower) {
  if (
    lower.includes("quiz") ||
    lower.includes("multiple_choice") ||
    lower.includes("multiple choice") ||
    lower.includes("abcd") ||
    lower.includes("test")
  ) {
    return "multiple_choice";
  }
  if (lower.includes("fill") || lower.includes("uzupe")) return "fill_blank";
  return "translate";
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();
  const block = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = block ? block[1].trim() : raw;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) return candidate.slice(start, end + 1);
  return candidate;
}

export async function aiPing(req, res) {
  try {
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: "Odpowiedz jednym zdaniem po polsku: OK, działa.",
      max_output_tokens: 50,
    });

    return res.json({ reply: response.output_text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "OpenAI call failed",
      details: err?.message || String(err),
    });
  }
}

export async function aiGetHistory(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const limitRaw = Number(req.query?.limit ?? 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;

    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, role: true, content: true, createdAt: true },
    });

    return res.json({ messages: messages.reverse() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "History load failed",
      details: err?.message || String(err),
    });
  }
}

export async function aiClearHistory(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await prisma.chatMessage.deleteMany({ where: { userId } });
    return res.json({ ok: true, deleted: result.count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "History clear failed",
      details: err?.message || String(err),
    });
  }
}

export async function aiChat(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { message, history = [] } = req.body || {};
    if (!message || !message.trim()) return res.status(400).json({ error: "message is required" });

    const msg = message.trim().slice(0, 500);
    const lower = msg.toLowerCase();

    const profile = await prisma.profile.findUnique({ where: { userId } });
    const profileLevel = normalizeLevel(profile?.level) || "A1";
    const language = profile?.language ?? "en";
    const goal = profile?.goal ?? "general";

    const requestedLevel = extractLevelFromText(msg);
    const usedLevel = requestedLevel || profileLevel;

    const wantsExercise = wantsExerciseIntent(lower);

    if (wantsExercise) {
      const type = inferType(lower);
      const topic = inferTopic(lower);

      if (type !== "multiple_choice") {
        const exercisePrompt = `
Wygeneruj jedno krótkie ćwiczenie językowe.
Język docelowy: ${language}
Poziom: ${usedLevel}
Typ: ${type}
Temat: ${topic}

Zwróć WYŁĄCZNIE JSON w formacie:
{
  "prompt": "treść zadania",
  "solution": "poprawna odpowiedź"
}
Bez komentarzy i bez markdown.
`.trim();

        const aiResp = await openai.responses.create({
          model: "gpt-4o-mini",
          input: exercisePrompt,
          max_output_tokens: 220,
        });

        const raw = extractJsonObject(aiResp.output_text);

        let parsed = { prompt: "", solution: "" };
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = { prompt: raw, solution: "" };
        }

        const created = await prisma.exercise.create({
          data: {
            userId,
            type,
            prompt: (parsed.prompt || "Ćwiczenie").toString().slice(0, 2000),
            solution: (parsed.solution || "").toString().slice(0, 2000),
            metadata: { level: usedLevel, topic, source: "chat" },
          },
          select: { id: true, type: true, prompt: true, createdAt: true },
        });

        const assistantReply =
          `Jasne — oto ćwiczenie (${type}, temat: ${topic}, poziom: ${usedLevel}):\n\n` +
          `${created.prompt}\n\n` +
          `➡️ Przejdź do zakładki Ćwiczenia: /exercise\n` +
          `Jeśli chcesz inne: napisz np. "quiz travel B2" albo "ćwiczenie fill_blank C1 grammar".`;

        await prisma.chatMessage.createMany({
          data: [
            { userId, role: "user", content: msg },
            { userId, role: "assistant", content: assistantReply },
          ],
        });

        return res.json({ reply: assistantReply, exerciseId: created.id });
      }


      const quizPrompt = `
Wygeneruj jedno krótkie ćwiczenie typu quiz (ABCD).
Język docelowy: ${language}
Poziom: ${usedLevel}
Temat: ${topic}

Zwróć WYŁĄCZNIE JSON (bez markdown) w formacie:
{
  "prompt": "Pytanie / polecenie",
  "options": {
    "A": "opcja A",
    "B": "opcja B",
    "C": "opcja C",
    "D": "opcja D"
  },
  "answer": "A"
}

Zasady:
- answer musi być jedną literą: A/B/C/D
- options muszą mieć dokładnie A,B,C,D
`.trim();

      const aiResp = await openai.responses.create({
        model: "gpt-4o-mini",
        input: quizPrompt,
        max_output_tokens: 260,
      });

      const raw = extractJsonObject(aiResp.output_text);

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return res.status(500).json({ error: "AI returned invalid JSON", raw });
      }

      const q = String(parsed?.prompt || "").trim();
      const optionsObj = parsed?.options || {};
      const answer = String(parsed?.answer || "").trim().toUpperCase();

      const hasAllOptions =
        optionsObj &&
        typeof optionsObj === "object" &&
        ["A", "B", "C", "D"].every((k) => typeof optionsObj[k] === "string" && optionsObj[k].trim());

      if (!q || !hasAllOptions || !["A", "B", "C", "D"].includes(answer)) {
        return res.status(500).json({ error: "AI JSON missing fields", raw: parsed });
      }

      const optionsArr = [
        `A) ${optionsObj.A}`,
        `B) ${optionsObj.B}`,
        `C) ${optionsObj.C}`,
        `D) ${optionsObj.D}`,
      ];

      const prettyPrompt = `${q}\n\n${optionsArr.join("\n")}`;

      const created = await prisma.exercise.create({
        data: {
          userId,
          type: "multiple_choice",
          prompt: prettyPrompt.slice(0, 2000),
          solution: answer,
          metadata: {
            level: usedLevel,
            topic,
            source: "chat",
            options: optionsArr,
          },
        },
        select: { id: true, type: true, prompt: true, createdAt: true },
      });

      const assistantReply =
        `Jasne — oto quiz (temat: ${topic}, poziom: ${usedLevel}):\n\n` +
        `${created.prompt}\n\n` +
        `➡️ Przejdź do zakładki Ćwiczenia: /exercise`;

      await prisma.chatMessage.createMany({
        data: [
          { userId, role: "user", content: msg },
          { userId, role: "assistant", content: assistantReply },
        ],
      });

      return res.json({ reply: assistantReply, exerciseId: created.id });
    }

    const safeHistory = Array.isArray(history) ? history.slice(-10) : [];
    const cleanedHistory = safeHistory
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim()
      )
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 800) }));

    const system = `
Jesteś asystentem do nauki języka (${language}). Poziom ucznia: ${usedLevel}. Cel: ${goal}.
Zasady:
- Odpowiadaj krótko i jasno.
- Jeśli użytkownik zrobi błąd językowy: popraw i wyjaśnij w 1–2 zdaniach.
- Na końcu zawsze dodaj 1 krótkie ćwiczenie: jedno zdanie do uzupełnienia.
- Nie dawaj długich wykładów.
`.trim();

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: system },
        ...cleanedHistory,
        { role: "user", content: msg },
      ],
      max_output_tokens: 250,
    });

    const reply = (response.output_text || "").trim();

    await prisma.chatMessage.createMany({
      data: [
        { userId, role: "user", content: msg },
        { userId, role: "assistant", content: reply || "(brak odpowiedzi)" },
      ],
    });

    return res.json({ reply });
  } catch (err) {
    console.error(err);
    const msg = err?.message || String(err);
    const status = msg.includes("429") ? 429 : 500;

    return res.status(status).json({ error: "AI chat failed", details: msg });
  }
}
