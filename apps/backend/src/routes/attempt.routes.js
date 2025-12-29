import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createAttempt } from "../controllers/attempt.controller.js";

const router = Router();

router.post("/", requireAuth, createAttempt);

export default router;