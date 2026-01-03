import { prisma } from "../db/prisma.js";

/**
 * GET /api/profile
 * Zwraca profil zalogowanego usera
 */
export async function getProfile(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        language: true,
        level: true,
        goal: true,
        dailyGoal: true, // <-- NOWE
      },
    });

    return res.json({
      profile: profile || { language: "en", level: "A1", goal: null, dailyGoal: 10 },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load profile" });
  }
}

/**
 * PATCH /api/profile
 * Body: { level?, language?, goal?, dailyGoal? }
 */
export async function updateProfile(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { level, language, goal, dailyGoal } = req.body || {};

    // walidacja dailyGoal: 1..100
    let dg = undefined;
    if (dailyGoal !== undefined) {
      const n = Number(dailyGoal);
      if (!Number.isFinite(n)) {
        return res.status(400).json({ error: "dailyGoal must be a number" });
      }
      dg = Math.min(Math.max(Math.floor(n), 1), 100);
    }

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        ...(level && { level }),
        ...(language && { language }),
        ...(goal !== undefined && { goal }),
        ...(dg !== undefined && { dailyGoal: dg }), // <-- NOWE
      },
      create: {
        userId,
        level: level || "A1",
        language: language || "en",
        goal: goal ?? null,
        dailyGoal: dg ?? 10, // <-- NOWE
      },
      select: {
        language: true,
        level: true,
        goal: true,
        dailyGoal: true, // <-- NOWE
      },
    });

    return res.json({ profile });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
}
