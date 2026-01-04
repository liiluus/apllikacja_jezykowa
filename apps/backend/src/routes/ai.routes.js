import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { aiPing, aiChat, aiGetHistory, aiClearHistory } from "../controllers/ai.controller.js";

const router = Router();

router.post("/ping", aiPing);

router.get("/history", requireAuth, aiGetHistory);
router.delete("/history", requireAuth, aiClearHistory);
router.post("/chat", requireAuth, aiChat);

export default router;
