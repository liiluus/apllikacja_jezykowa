import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getProgress } from "../controllers/progress.controller.js";

const router = Router();

router.get("/", requireAuth, getProgress);

export default router;
