import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import exerciseRoutes from "./routes/exercise.routes.js";
import attemptRoutes from "./routes/attempt.routes.js";
import progressRoutes from "./routes/progress.routes.js";
import aiRoutes from "./routes/ai.routes.js";

dotenv.config();

console.log("OPENAI KEY exists?", Boolean(process.env.OPENAI_API_KEY));

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
res.json({ ok: true, service: "backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api", profileRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/ai", aiRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
console.log(`API running on http://localhost:${PORT}`);
});