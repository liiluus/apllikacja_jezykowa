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
      },
    });

    return res.json({
      profile: profile || { language: "en", level: "A1", goal: null },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load profile" });
  }
}

/**
 * PATCH /api/profile
 * Body: { level?, language?, goal? }
 */
export async function updateProfile(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { level, language, goal } = req.body || {};

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        ...(level && { level }),
        ...(language && { language }),
        ...(goal !== undefined && { goal }),
      },
      create: {
        userId,
        level: level || "A1",
        language: language || "en",
        goal: goal ?? null,
      },
      select: {
        language: true,
        level: true,
        goal: true,
      },
    });

    return res.json({ profile });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
}
