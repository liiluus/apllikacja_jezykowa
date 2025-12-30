import { openai } from "../ai/openaiClient.js";
import { prisma } from "../db/prisma.js";

/**
 * Prosty test czy OpenAI działa
 * POST /api/ai/ping
 */
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

/**
 * GET /api/ai/history?limit=20
 * Zwraca ostatnie wiadomości usera z DB
 */
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
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    // odwracamy, żeby było od najstarszych -> najnowszych
    return res.json({ messages: messages.reverse() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "History load failed",
      details: err?.message || String(err),
    });
  }
}

/**
 * DELETE /api/ai/history
 * Czyści historię usera z DB
 */
export async function aiClearHistory(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await prisma.chatMessage.deleteMany({
      where: { userId },
    });

    return res.json({ ok: true, deleted: result.count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "History clear failed",
      details: err?.message || String(err),
    });
  }
}

/**
 * Chatbot (z JWT) – MVP
 * POST /api/ai/chat
 * Body: { message: string, history?: Array<{role:"user"|"assistant", content:string}> }
 */
export async function aiChat(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { message, history = [] } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    // ograniczenie długości wiadomości (koszty + bezpieczeństwo)
    const msg = message.trim().slice(0, 500);

    // tylko ostatnie 10 wiadomości (żeby nie zjadało budżetu)
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

    // profil usera (jeśli masz tabelę profile)
    const profile = await prisma.profile.findUnique({ where: { userId } });
    const level = profile?.level ?? "A1";
    const language = profile?.language ?? "en";
    const goal = profile?.goal ?? "general";

    const system = `
Jesteś asystentem do nauki języka (${language}). Poziom ucznia: ${level}. Cel: ${goal}.
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

    // Zapisz do DB: user msg + assistant reply
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

    return res.status(status).json({
      error: "AI chat failed",
      details: msg,
    });
  }
}
