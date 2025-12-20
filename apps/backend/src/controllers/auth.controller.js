import bcrypt from "bcrypt";
import { prisma } from "../db/prisma.js";
import { signToken } from "../utils/jwt.js";

export async function register(req, res) {
const { email, password, language = "en", level = "A1", goal = null } = req.body;

if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
}
if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "password must have at least 6 characters" });
}

const exists = await prisma.user.findUnique({ where: { email } });
if (exists) return res.status(409).json({ error: "user already exists" });

const passwordHash = await bcrypt.hash(password, 10);

const user = await prisma.user.create({
    data: {
    email,
    passwordHash,
    profile: { create: { language, level, goal } },
    },
    select: { id: true, email: true, createdAt: true, profile: true },
});

const token = signToken({ userId: user.id });
res.status(201).json({ token, user });
}

export async function login(req, res) {
const { email, password } = req.body;

if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
}

const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
});
if (!user) return res.status(401).json({ error: "invalid credentials" });

const ok = await bcrypt.compare(password, user.passwordHash);
if (!ok) return res.status(401).json({ error: "invalid credentials" });

const token = signToken({ userId: user.id });
res.json({
    token,
    user: { id: user.id, email: user.email, createdAt: user.createdAt, profile: user.profile },
});
}
