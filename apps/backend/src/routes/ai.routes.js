import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { aiPing, aiChat, aiGetHistory, aiClearHistory } from "../controllers/ai.controller.js";

const router = Router();

// ping może być bez JWT (opcjonalnie)
router.post("/ping", aiPing);

// wszystko “użytkownikowe” z JWT
router.get("/history", requireAuth, aiGetHistory);
router.delete("/history", requireAuth, aiClearHistory);
router.post("/chat", requireAuth, aiChat);

export default router;
