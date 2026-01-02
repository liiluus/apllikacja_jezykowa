import { prisma } from "../db/prisma.js";

export async function getProfile(req, res) {
const userId = req.user.userId;

const profile = await prisma.profile.findUnique({
    where: { userId },
});

if (!profile) {
    return res.status(404).json({ message: "Profil nie istnieje" });
}

res.json({ profile });
}

export async function updateProfile(req, res) {
const userId = req.user.userId;
const { language, level, goal } = req.body;

const profile = await prisma.profile.update({
        where: { userId },
        data: {
        language,
        level,
        goal,
    },
});

res.json({ profile });
}